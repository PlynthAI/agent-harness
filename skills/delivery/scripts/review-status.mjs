#!/usr/bin/env node
// Post or read the two review statuses on a commit: `harness/review` (the
// independent reviewer is clean on this head) and `harness/ocr` (OCR is clean on
// this head or on an ancestor whose later commits the reviewer covered). Rulesets
// require both, so auto-merge stays armed only over a clean review; a repository
// without required checks has its agent merge read them instead.
//
// `post` reads the round's triage record (code-review's finding-triage owns its
// contract) and the OCR slot record it names; it never reruns a review. `read`
// prints the latest state of both contexts. Writes go only through
// `gh api --method POST repos/{repo}/statuses/{sha} --input <file>`.

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const EXIT = { success: 0, failure: 1, usage: 2, query: 3 };
export const CONTEXTS = { review: 'harness/review', ocr: 'harness/ocr' };

const USAGE = 'usage: review-status.mjs post --repo <owner/name> --sha <head> --triage <triage.json> [--target-url <url>] [--gh <command>]\n'
  + '       review-status.mjs read --repo <owner/name> --sha <head> [--gh <command>]\n';
const SHA = /^[0-9a-f]{40}$/;
const SETTLED = new Set(['fix', 'decline', 'follow-up']);
const DESCRIPTION_MAX = 140;

class QueryError extends Error {}

// Status descriptions are capped; record text is printed only after control
// characters are removed.
function describe(text) {
  const line = String(text ?? '').replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').replace(/\s+/g, ' ').trim();
  return line.length > DESCRIPTION_MAX ? `${line.slice(0, DESCRIPTION_MAX - 3)}...` : line;
}

const short = (sha) => String(sha ?? '').slice(0, 7);
const sha40 = (value) => (typeof value === 'string' && SHA.test(value.toLowerCase()) ? value.toLowerCase() : null);

/**
 * The one place that knows the triage record's shape (code-review's
 * finding-triage owns the contract):
 * { ocrCommit, ocrRecord, reviewedHead, round2: { head, houseRules } | null,
 *   findings: [{ source, severity, summary, disposition, reason }] }.
 * `ocrCommit` is round 1's commit and `ocrRecord` the path of native-slot's
 * record for it; `reviewedHead` is the last commit the reviewer checked;
 * `round2.head` is the last commit round 2 (or the after-push scoped check)
 * covered after `ocrCommit`.
 */
export function parseTriage(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('the triage record is not a JSON object');
  if (!Array.isArray(record.findings)) throw new Error('the triage record has no findings list');
  return {
    reviewedHead: sha40(record.reviewedHead),
    ocrCommit: sha40(record.ocrCommit),
    ocrRecord: typeof record.ocrRecord === 'string' && record.ocrRecord.trim() ? record.ocrRecord.trim() : null,
    round2Head: sha40(record.round2?.head),
    round2HouseRules: typeof record.round2?.houseRules === 'string' && record.round2.houseRules.trim() ? record.round2.houseRules.trim() : null,
    findings: record.findings.map((finding) => ({
      source: String(finding?.source ?? ''),
      severity: String(finding?.severity ?? ''),
      summary: String(finding?.summary ?? ''),
      disposition: String(finding?.disposition ?? 'open'),
      reason: String(finding?.reason ?? '').trim(),
    })),
  };
}

// A finding is settled when it is fixed (and checked at reviewedHead), or
// declined or deferred with a reason. Anything else is open.
function unsettled(findings) {
  const open = findings.filter((finding) => !SETTLED.has(finding.disposition) || (finding.disposition !== 'fix' && !finding.reason));
  return open.find((finding) => finding.severity === 'blocker') ?? open[0] ?? null;
}

function openReason(finding) {
  const what = finding.disposition === 'decline' || finding.disposition === 'follow-up'
    ? `${finding.disposition} without a reason`
    : 'open';
  return `${finding.severity || 'unrated'} ${finding.source || 'unsourced'} finding ${what}: ${finding.summary || '(no summary)'}`;
}

const status = (state, description) => ({ state, description: describe(description) });

/** `harness/review`: the reviewer checked this head and every finding is settled. */
export function assessReview(triage, sha) {
  if (!triage.reviewedHead) return status('failure', 'triage record names no reviewed head');
  if (triage.reviewedHead !== sha) return status('failure', `reviewer checked ${short(triage.reviewedHead)}, not this head ${short(sha)}`);
  const open = unsettled(triage.findings);
  if (open) return status('failure', openReason(open));
  return status('success', `reviewer clean on ${short(sha)}; ${triage.findings.length} finding(s) settled`);
}

/**
 * `harness/ocr`: OCR's record is complete for the round 1 commit, its findings
 * are settled, and the commit is this head or an ancestor whose later commits
 * round 2 covered (round2.head is this head, with the house rules it applied).
 * `isAncestor` returns true, false or an error message. An `empty-coverage`
 * record passes: OCR's house scope
 * selected none of the changed paths (a generated-file-only change), so there
 * was nothing for it to review.
 */
export function assessOcr(triage, sha, slot, isAncestor) {
  if (!triage.ocrCommit) return status('failure', 'triage record names no OCR commit');
  if (!triage.ocrRecord) return status('failure', 'triage record names no OCR record');
  if (slot.error) return status('failure', `OCR record unreadable: ${slot.error}`);
  const record = slot.record;
  const outOfScope = record.outcome === 'empty-coverage';
  if (record.complete !== true && !outOfScope) return status('failure', `OCR record is not complete (${record.outcome ?? 'no outcome'})`);
  if (record.candidate?.match !== true) return status('failure', 'OCR record does not match its requested commit');
  if (sha40(record.candidate?.resolved_head) !== triage.ocrCommit) {
    return status('failure', `OCR record reviewed ${short(record.candidate?.resolved_head) || 'nothing'}, not ${short(triage.ocrCommit)}`);
  }
  const open = unsettled(triage.findings.filter((finding) => finding.source === 'ocr'));
  if (open) return status('failure', openReason(open));
  const clean = outOfScope ? 'OCR scope selects no changed path' : 'OCR clean';
  if (triage.ocrCommit === sha) return status('success', `${clean} on ${short(sha)}`);
  const ancestry = isAncestor(triage.ocrCommit, sha);
  if (ancestry !== true) {
    return status('failure', ancestry === false
      ? `OCR commit ${short(triage.ocrCommit)} is not an ancestor of ${short(sha)}`
      : `cannot check OCR ancestry: ${ancestry}`);
  }
  if (triage.round2Head !== sha) {
    return status('failure', `round 2 covers ${triage.round2Head ? `to ${short(triage.round2Head)}` : 'nothing'}, not the commits after OCR ${short(triage.ocrCommit)} to ${short(sha)}`);
  }
  if (!triage.round2HouseRules) return status('failure', 'round 2 names no house rules it applied to the commits after OCR');
  return status('success', `${clean} on ${short(triage.ocrCommit)}; round 2 covered later commits to ${short(sha)}`);
}

function readJson(path) {
  try {
    return { record: JSON.parse(readFileSync(path, 'utf8')) };
  } catch (error) {
    return { error: error.code === 'ENOENT' ? `missing ${path}` : `${path}: ${error.message}` };
  }
}

function gitIsAncestor(ancestor, head) {
  const result = spawnSync('git', ['merge-base', '--is-ancestor', ancestor, head], { encoding: 'utf8', windowsHide: true });
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  return describe(result.stderr || result.error?.message || `git exited ${result.status}`);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (command === '--help' || command === '-h') return { help: true };
  if (command !== 'post' && command !== 'read') throw new Error('the first argument is post or read');
  const args = { command, repo: null, sha: null, triage: null, targetUrl: null, gh: 'gh' };
  const flags = { '--repo': 'repo', '--sha': 'sha', '--gh': 'gh', ...(command === 'post' ? { '--triage': 'triage', '--target-url': 'targetUrl' } : {}) };
  for (let index = 0; index < rest.length; index += 2) {
    const key = flags[rest[index]];
    if (!key) throw new Error(`unknown argument ${rest[index]}`);
    if (index + 1 >= rest.length) throw new Error(`${rest[index]} needs a value`);
    args[key] = rest[index + 1];
  }
  if (!/^[\w.-]+\/[\w.-]+$/.test(args.repo ?? '')) throw new Error('--repo must be owner/name');
  args.sha = sha40(args.sha);
  if (!args.sha) throw new Error('--sha must be a full 40-character commit hash');
  if (command === 'post' && !args.triage) throw new Error('post needs --triage');
  if (args.targetUrl && !/^https?:\/\//.test(args.targetUrl)) throw new Error('--target-url must be an http(s) URL');
  return args;
}

async function gh(deps, args) {
  const result = await deps.exec(args);
  if (result.code !== 0) throw new QueryError(`gh ${args.slice(0, 3).join(' ')} exited ${result.code}: ${describe(result.stderr) || 'no message'}`);
  return result.stdout;
}

async function post(deps, args) {
  let triage = null;
  let triageError = null;
  const loaded = readJson(args.triage);
  try {
    if (loaded.error) throw new Error(loaded.error);
    triage = parseTriage(loaded.record);
  } catch (error) {
    triageError = `triage record unreadable: ${error.message}`;
  }
  const results = triage
    ? {
        [CONTEXTS.review]: assessReview(triage, args.sha),
        // A relative OCR record path resolves against the checkout (the working directory).
        [CONTEXTS.ocr]: assessOcr(triage, args.sha, triage.ocrRecord ? readJson(resolve(triage.ocrRecord)) : {}, deps.isAncestor),
      }
    : { [CONTEXTS.review]: status('failure', triageError), [CONTEXTS.ocr]: status('failure', triageError) };

  const dir = mkdtempSync(join(tmpdir(), 'review-status-'));
  try {
    // Failures first: a failed write after a success must not leave a known failure unpublished.
    const ordered = Object.entries(results).sort(([, a], [, b]) => (a.state === 'success') - (b.state === 'success'));
    for (const [context, result] of ordered) {
      const file = join(dir, `${context.replace('/', '-')}.json`);
      const body = { state: result.state, context, description: result.description, ...(args.targetUrl ? { target_url: args.targetUrl } : {}) };
      writeFileSync(file, JSON.stringify(body), 'utf8');
      await gh(deps, ['api', '--method', 'POST', `repos/${args.repo}/statuses/${args.sha}`, '--input', file]);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  deps.stdout(`${JSON.stringify({ repo: args.repo, sha: args.sha, posted: results }, null, 2)}\n`);
  return Object.values(results).every((result) => result.state === 'success') ? EXIT.success : EXIT.failure;
}

async function read(deps, args) {
  let combined;
  try {
    // The combined status lists 30 contexts by default; 100 is its page maximum.
    combined = JSON.parse(await gh(deps, ['api', `repos/${args.repo}/commits/${args.sha}/status`, '--method', 'GET', '-f', 'per_page=100']));
  } catch (error) {
    if (error instanceof QueryError) throw error;
    throw new QueryError(`gh api commit status: unreadable JSON (${error.message})`);
  }
  const statuses = Array.isArray(combined?.statuses) ? combined.statuses : [];
  const latest = (context) => statuses
    .filter((row) => row?.context === context)
    .sort((a, b) => String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? '')))[0];
  const states = Object.fromEntries(Object.values(CONTEXTS).map((context) => {
    const row = latest(context);
    return [context, row
      ? { state: row.state, description: describe(row.description), target_url: row.target_url ?? null, updated_at: row.updated_at ?? null }
      : { state: 'missing' }];
  }));
  deps.stdout(`${JSON.stringify({ repo: args.repo, sha: args.sha, statuses: states }, null, 2)}\n`);
  return Object.values(states).every((row) => row.state === 'success') ? EXIT.success : EXIT.failure;
}

/**
 * @param {string[]} argv
 * @param {{exec: (args: string[]) => Promise<{code: number, stdout: string, stderr: string}>,
 *   isAncestor: (ancestor: string, head: string) => true | false | string,
 *   stdout: (text: string) => void, stderr: (text: string) => void}} deps
 */
export async function run(argv, deps) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    deps.stderr(`${error.message}\n${USAGE}`);
    return EXIT.usage;
  }
  if (args.help) {
    deps.stdout(USAGE);
    return EXIT.success;
  }
  try {
    return await (args.command === 'post' ? post : read)({ ...deps, exec: (ghArgs) => deps.exec(ghArgs, args.gh) }, args);
  } catch (error) {
    if (!(error instanceof QueryError)) throw error;
    deps.stderr(`query error: ${error.message}\n`);
    return EXIT.query;
  }
}

// `--gh` names the gh executable; a .js, .mjs or .cjs file runs under this node.
function exec(args, command) {
  const [file, prefix] = /\.[cm]?js$/i.test(command) ? [process.execPath, [command]] : [command, []];
  return new Promise((done) => {
    let child;
    try {
      child = spawn(file, [...prefix, ...args], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, shell: false });
    } catch (error) {
      done({ code: -1, stdout: '', stderr: error.message });
      return;
    }
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => done({ code: -1, stdout, stderr: error.message }));
    child.on('close', (code) => done({ code: code ?? -1, stdout, stderr }));
  });
}

// Compare real paths: Node runs a linked script from its real file, so through a
// junction or symlink the invoked path differs and main() would silently not run.
if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = await run(process.argv.slice(2), {
    exec,
    isAncestor: gitIsAncestor,
    stdout: (text) => process.stdout.write(text),
    stderr: (text) => process.stderr.write(text),
  });
}
