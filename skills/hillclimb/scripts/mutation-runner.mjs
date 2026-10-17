#!/usr/bin/env node
// Mutation runner for hillclimb verification measures.
//
// Seeds each frozen defect (a mutant) into the checkout in turn, runs every
// selection against it and records which selections detect it (exit non-zero).
// Mutants apply to the bytes read at the start, and those bytes go back in a
// `finally`. After the run, git status and the content of every dirty,
// untracked and mutated file must match the starting state (ignored files are
// out of scope).
//
// A hard kill runs no `finally`, so before each mutant is applied its original
// bytes and a journal go to the git directory. Every invocation first restores
// a file an interrupted run left mutated, unless that run is still alive.
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { constants } from 'node:os';
import path from 'node:path';

const DEFAULT_TIMEOUT_SECONDS = 600;

const USAGE = [
  'usage: mutation-runner.mjs <mutants.json> --out <results.json> [--checkout DIR] [--timeout SECS]',
  '       mutation-runner.mjs <mutants.json> --dry-run [--checkout DIR]',
  '',
  '  <mutants.json>  the frozen measure: { "selections": [{ "name", "command" }],',
  '                  "mutants": [{ "id", "path", "anchor", "replacement", "heldOut" }] }',
  '                  path is relative to the checkout; anchor must occur exactly once',
  '                  in it; command runs from the checkout root through the platform',
  '                  shell: cmd.exe on Windows (quote with double quotes), sh elsewhere',
  '  --out FILE      write the JSON results here, outside the checkout',
  '  --checkout DIR  the git checkout to mutate (default: current directory)',
  '  --dry-run       validate the file and every anchor; mutate and run nothing',
  `  --timeout SECS  stop a selection that runs longer, with its whole process tree,`,
  `                  and record it as timedOut: failing unmutated, detecting a mutant`,
  `                  (default ${DEFAULT_TIMEOUT_SECONDS})`,
  '',
  'Every invocation, --dry-run included, first restores a file that an interrupted',
  'run left mutated (journal: <git-dir>/mutation-runner-pending.json, original bytes',
  'beside it in mutation-runner-pending.original). It refuses while that run is alive',
  'or when the file changed since; then settle the file by hand.',
  '',
  'Exit 0 when every selection passed unmutated and the checkout ends as it started;',
  '1 when the unmutated run fails or the checkout changed; 2 for bad input.',
  '',
].join('\n');

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function hashOf(file) {
  try {
    return sha256(readFileSync(file));
  } catch {
    return null;
  }
}

function outside(root, file) {
  const relative = path.relative(root, file);
  return relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative);
}

class InputError extends Error {}
const usageError = (message) => new InputError(`${message}\n\n${USAGE}`);

function parseArgs(argv) {
  const options = { checkout: process.cwd(), dryRun: false, help: false, timeout: String(DEFAULT_TIMEOUT_SECONDS) };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--out' || arg === '--checkout' || arg === '--timeout') {
      const value = argv[++i];
      if (!value) throw usageError(`${arg} needs a value`);
      options[arg.slice(2)] = value;
    } else if (arg.startsWith('-')) throw usageError(`unknown argument: ${arg}`);
    else if (options.mutants) throw usageError(`unexpected argument: ${arg}`);
    else options.mutants = arg;
  }
  if (options.help) return options;
  if (!options.mutants) throw usageError('the mutant file is required');
  if (!options.dryRun && !options.out) throw usageError('--out is required unless --dry-run');
  options.timeoutMs = Number(options.timeout) * 1000;
  if (!(options.timeoutMs > 0) || !Number.isFinite(options.timeoutMs)) throw usageError(`--timeout must be a positive number of seconds, not ${options.timeout}`);
  options.checkout = path.resolve(options.checkout);
  if (options.out) {
    options.out = path.resolve(options.out);
    if (!outside(options.checkout, options.out)) throw new InputError(`--out ${options.out} is inside the checkout, where writing it would change the state the run checks`);
    if (!existsSync(path.dirname(options.out))) throw new InputError(`the folder for --out does not exist: ${path.dirname(options.out)}`);
  }
  return options;
}

function git(checkout, ...args) {
  const result = spawnSync('git', args, { cwd: checkout, windowsHide: true });
  if (result.status !== 0) throw new InputError(`git ${args.join(' ')} failed in ${checkout}: ${result.stderr.toString('utf8').trim()}`);
  return result.stdout.toString('utf8');
}

const porcelain = (checkout) => git(checkout, 'status', '--porcelain').split('\n').filter(Boolean);

// Hash every dirty, untracked and mutated file: git status alone does not see
// a change to a file that was already dirty or untracked.
function snapshot(checkout, paths) {
  const listed = git(checkout, 'ls-files', '-z', '-m', '-o', '--exclude-standard').split('\0').filter(Boolean);
  const files = new Set([...listed.map((p) => path.resolve(checkout, p)), ...paths]);
  return new Map([...files].map((file) => [file, hashOf(file)]));
}

const backupOf = (journal) => journal.replace(/\.json$/, '.original');

// The mutant in place now, so a signal handler can put it back.
let active = null;
let activeChild = null;
let interrupted = false;
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    if (interrupted) return;
    interrupted = true;
    const finish = () => {
      if (active) {
        restore(active);
        console.error(`interrupted; restored ${active.path}`);
      }
      process.exit(128 + constants.signals[signal]);
    };
    if (activeChild) {
      activeChild.once('close', finish);
      stop(activeChild);
    } else finish();
  });
}

function restore({ file, original, journal }) {
  writeFileSync(file, original);
  rmSync(journal, { force: true });
  rmSync(backupOf(journal), { force: true });
}

function alive(pid) {
  if (!Number.isInteger(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

function recover(journal, checkout) {
  const backup = backupOf(journal);
  if (!existsSync(journal)) {
    rmSync(backup, { force: true });
    return;
  }
  let pending;
  try {
    pending = JSON.parse(readFileSync(journal, 'utf8'));
  } catch {
    throw new InputError(`${journal} is unreadable, most likely cut short by a kill while it was written. A journal is written in full before its mutant is applied, so no mutant was applied: delete it${existsSync(backup) ? ` and ${backup}` : ''}, then rerun.`);
  }
  if (pending.pid !== process.pid && alive(pending.pid)) {
    throw new InputError(`a mutation run (pid ${pending.pid}) is in progress in this checkout with mutant ${pending.id} applied to ${pending.path}. Wait for it or stop it. If that pid is not a mutation run, restore ${pending.path} from ${backup} by hand, then delete ${journal} and ${backup}.`);
  }
  const file = path.resolve(checkout, pending.path);
  const current = hashOf(file);
  if (current === pending.originalSha256) {
    rmSync(journal);
    rmSync(backup, { force: true });
    return;
  }
  const original = existsSync(backup) ? readFileSync(backup) : null;
  const intact = original !== null && sha256(original) === pending.originalSha256;
  if (intact && current === pending.mutatedSha256) {
    restore({ file, original, journal });
    console.log(`restored ${pending.path}, left mutated by an interrupted run (mutant ${pending.id})`);
    return;
  }
  throw new InputError(intact
    ? `${pending.path} changed after an interrupted run applied mutant ${pending.id}, so it was left alone. Its original bytes are in ${backup}: compare, keep what you want, then delete ${journal} and ${backup}.`
    : `${journal} has no intact backup of ${pending.path} (expected ${backup}). Settle the file by hand from version control, then delete the journal.`);
}

// The measure is checked whole before anything runs: a partial run would
// leave missing records, and missing records make the assessment incomplete.
function loadMeasure(file, checkout) {
  let measure;
  try {
    measure = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new InputError(`cannot read ${file}: ${error.message}`);
  }
  const { selections, mutants } = measure ?? {};
  const problems = [];
  if (!Array.isArray(selections) || selections.length === 0) problems.push('selections must be a non-empty list');
  else for (const s of selections) {
    if (typeof s?.name !== 'string' || !s.name || typeof s.command !== 'string' || !s.command) problems.push(`selection ${JSON.stringify(s)} needs a name and a command`);
    else if (selections.filter((other) => other?.name === s.name).length > 1) problems.push(`selection ${s.name}: duplicate name`);
  }
  if (!Array.isArray(mutants) || mutants.length === 0) problems.push('mutants must be a non-empty list');
  const ids = new Set();
  for (const m of Array.isArray(mutants) ? mutants : []) {
    const label = `mutant ${m?.id ?? JSON.stringify(m)}`;
    if (typeof m?.id !== 'string' || !m.id) { problems.push(`${label}: id must be a string`); continue; }
    if (ids.has(m.id)) problems.push(`${label}: duplicate id`);
    ids.add(m.id);
    if (typeof m.path !== 'string' || typeof m.anchor !== 'string' || !m.anchor || typeof m.replacement !== 'string') {
      problems.push(`${label}: needs path, a non-empty anchor and a replacement`);
      continue;
    }
    if (typeof m.heldOut !== 'boolean') problems.push(`${label}: heldOut must be true or false`);
    const file = path.resolve(checkout, m.path);
    if (outside(checkout, file)) {
      problems.push(`${label}: ${m.path} is outside the checkout`);
      continue;
    }
    let bytes;
    try {
      bytes = readFileSync(file);
    } catch {
      problems.push(`${label}: cannot read ${m.path}`);
      continue;
    }
    const count = occurrences(bytes, Buffer.from(m.anchor, 'utf8'));
    if (count !== 1) problems.push(anchorProblem(label, m, bytes, count));
  }
  if (problems.length) throw new InputError(`refusing ${file}:\n  ${problems.join('\n  ')}`);
  return { selections, mutants };
}

function anchorProblem(label, mutant, bytes, count) {
  const hint = count === 0 && bytes.includes('\r\n') && !mutant.anchor.includes('\r\n') ? ' (the file uses CRLF line endings)' : '';
  return `${label}: anchor found ${count} times in ${mutant.path}, expected exactly once${hint}`;
}

function occurrences(haystack, needle) {
  let count = 0;
  for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + 1)) count += 1;
  return count;
}

// Byte-level replacement: line endings and encoding elsewhere stay untouched.
function mutate(bytes, mutant) {
  const needle = Buffer.from(mutant.anchor, 'utf8');
  const count = occurrences(bytes, needle);
  if (count !== 1) throw new InputError(anchorProblem(`mutant ${mutant.id}`, mutant, bytes, count));
  const at = bytes.indexOf(needle);
  return Buffer.concat([bytes.subarray(0, at), Buffer.from(mutant.replacement, 'utf8'), bytes.subarray(at + needle.length)]);
}

const TAIL_BYTES = 64 * 1024;

// Every POSIX selection has its own process group. Killing only the shell
// leaves its descendants alive, often holding the output pipes open.
// Windows keeps its hidden shell and uses taskkill's owned-tree route.
function stop(child) {
  if (!child.pid) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true });
  else {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
  }
}

// Output is kept as bytes and decoded once at the end; invalid UTF-8 (a
// console code page, say) becomes U+FFFD instead of an exception. A selection
// past the time limit is stopped and counts as failing.
function runSelection(command, checkout, timeoutMs) {
  return new Promise((resolve) => {
    const started = performance.now();
    const chunks = [];
    let kept = 0;
    const keep = (chunk) => {
      chunks.push(chunk);
      kept += chunk.length;
      while (kept - chunks[0].length >= TAIL_BYTES) kept -= chunks.shift().length;
    };
    const child = spawn(command, { cwd: checkout, shell: true, windowsHide: true, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    activeChild = child;
    // A shell can complete while a background descendant still owns its pipes.
    // Stop the owned group on exit, before waiting for those pipes to close.
    child.once('exit', () => { if (process.platform !== 'win32') stop(child); });
    child.stdout.on('data', keep);
    child.stderr.on('data', keep);
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      stop(child);
    }, timeoutMs);
    const finish = (exit, signal, error) => {
      clearTimeout(timer);
      if (activeChild === child) activeChild = null;
      const lines = Buffer.concat(chunks).toString('utf8').split(/\r?\n/).filter((line) => line.trim());
      resolve({ exit, signal, ms: Math.round(performance.now() - started), tail: lines.slice(-20), ...(timedOut ? { timedOut } : {}), ...(error ? { error } : {}) });
    };
    child.on('error', (error) => finish(null, null, error.message));
    child.on('close', (exit, signal) => finish(exit, signal ?? null));
  });
}

async function runSelections(selections, checkout, timeoutMs) {
  const results = {};
  for (const { name, command } of selections) results[name] = await runSelection(command, checkout, timeoutMs);
  return results;
}

const failed = (result) => result.timedOut || result.exit !== 0;

function score(records, selections) {
  const scores = {};
  for (const { name } of selections) {
    scores[name] = { detected: records.filter((r) => r.detectedBy.includes(name)).length, total: records.length };
  }
  return scores;
}

async function main(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write(USAGE);
    return 0;
  }
  const { checkout } = options;
  const head = git(checkout, 'rev-parse', 'HEAD').trim();
  const journal = path.resolve(checkout, git(checkout, 'rev-parse', '--git-path', 'mutation-runner-pending.json').trim());
  const backup = backupOf(journal);
  recover(journal, checkout);
  const { selections, mutants } = loadMeasure(options.mutants, checkout);
  if (options.dryRun) {
    console.log(`dry run: ${mutants.length} mutant(s) and ${selections.length} selection(s) valid against ${checkout}`);
    return 0;
  }
  const dirty = porcelain(checkout);
  const paths = [...new Set(mutants.map((m) => path.resolve(checkout, m.path)))];
  const originals = new Map(paths.map((file) => [file, readFileSync(file)]));
  const hashes = snapshot(checkout, paths);

  const report = {
    mutantFile: path.resolve(options.mutants),
    mutantFileSha256: sha256(readFileSync(options.mutants)),
    checkout,
    head,
    dirty,
    node: process.version,
    startedAt: new Date().toISOString(),
    control: await runSelections(selections, checkout, options.timeoutMs),
    mutants: [],
  };
  const controlFailed = Object.entries(report.control).filter(([, r]) => failed(r)).map(([name]) => name);
  for (const mutant of controlFailed.length ? [] : mutants) {
    const file = path.resolve(checkout, mutant.path);
    const original = originals.get(file);
    if (!readFileSync(file).equals(original)) {
      report.stoppedBefore = mutant.id;
      console.error(`${mutant.path} changed before mutant ${mutant.id} was applied; no further mutant runs`);
      break;
    }
    const mutated = mutate(original, mutant);
    writeFileSync(backup, original);
    writeFileSync(journal, JSON.stringify({ pid: process.pid, id: mutant.id, path: mutant.path, originalSha256: sha256(original), mutatedSha256: sha256(mutated) }));
    active = { file, original, journal, path: mutant.path };
    let results;
    try {
      writeFileSync(file, mutated);
      results = await runSelections(selections, checkout, options.timeoutMs);
    } finally {
      restore(active);
      active = null;
    }
    const detectedBy = Object.entries(results).filter(([, r]) => failed(r)).map(([name]) => name);
    report.mutants.push({ id: mutant.id, path: mutant.path, heldOut: mutant.heldOut, detectedBy, selections: results });
  }
  report.scores = {
    gate: score(report.mutants.filter((m) => !m.heldOut), selections),
    heldOut: score(report.mutants.filter((m) => m.heldOut), selections),
  };

  const after = porcelain(checkout);
  const changes = [
    ...dirty.filter((line) => !after.includes(line)).map((line) => `git status lost: ${line}`),
    ...after.filter((line) => !dirty.includes(line)).map((line) => `git status gained: ${line}`),
    ...[...hashes].filter(([file, hash]) => hashOf(file) !== hash).map(([file]) => `content changed: ${path.relative(checkout, file)}`),
  ];
  report.finishedAt = new Date().toISOString();
  report.checkoutUnchanged = changes.length === 0;
  report.changes = changes;
  writeFileSync(options.out, `${JSON.stringify(report, null, 2)}\n`);

  for (const line of changes) console.error(`checkout changed: ${line}`);
  if (controlFailed.length) {
    console.error(`unmutated run failed (${controlFailed.join(', ')}); no mutant was applied, since detection would mean nothing`);
    return 1;
  }
  const line = (scores) => Object.entries(scores).map(([name, s]) => `${name} ${s.detected}/${s.total}`).join(', ');
  console.log(`gate: ${line(report.scores.gate)}; held-out: ${line(report.scores.heldOut)}; results ${options.out}`);
  return changes.length || report.stoppedBefore ? 1 : 0;
}

main(process.argv.slice(2)).then(
  (code) => { process.exitCode = code; },
  (error) => {
    if (!(error instanceof InputError)) throw error;
    console.error(error.message);
    process.exitCode = 2;
  },
);
