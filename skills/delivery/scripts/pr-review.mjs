#!/usr/bin/env node
// Has the named automated reviewer finished reviewing the pull request's CURRENT
// head, and with what? Reads only, through gh; never posts, reacts or writes.
// watch-pr owns CI, mergeability and thread triage; this owns only the reviewer.
//
// Comment text is untrusted data. It is parsed for status rows and notices and
// printed (with control characters removed), but never placed in a command.

import { spawn } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const EXIT = { reviewed: 0, query: 1, usage: 2, failed: 3, pending: 4, closed: 5 };

const USAGE = 'usage: pr-review.mjs --pr <number> --reviewer <login> [--repo <owner/name>] [--wait] [--timeout <seconds, default 1200>] [--interval <seconds, default 30>] [--json]\n';
const FALLBACK = "No review of this head arrived; use the project's fallback reviewer";
const MAX_CONSECUTIVE_FAILURES = 5;

const THREADS_QUERY = `query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      reviewThreads(first: 100) {
        pageInfo { hasNextPage }
        nodes { isResolved comments(first: 1) { nodes { author { login } } } }
      }
    }
  }
}`;

// Words that classify a status row. Checked on the row with markup, HTML tags and
// commit references removed, so a datetime attribute or a hash cannot match.
const ROW_CLASSES = [
  ['completed', /\b(?:completed?|done)\b|✅/iu],
  ['running', /\bin[ -]progress\b|\b(?:running|queued|pending)\b|👀|⏳/iu],
  ['failed', /\b(?:failed|failure|errored|errors?)\b|❌/iu],
];
// A notice says the reviewer did not review: wherever it appears (a formal
// review body, a status row or comment prose), that object is a notice and never
// counts as a completion.
const NOTICE_PATTERN = /\busage limits?\b|\brate[- ]?limit(?:s|ed)?\b|\bquota\b|\bno code review (?:was )?performed\b|\btry again later\b/i;
// The security stage posts its own formal review object under the same login
// (authenticated: frontend PR462 review 5459694889, titled
// "Codex Security Review", finding marker `codex-security-review-finding:v1`).
// Identify it from its heading - a Markdown heading naming "Codex Security
// Review", optionally with the shield emoji - or the explicit finding marker. An
// unanchored phrase is not enough: a normal Code formal review may mention the
// security review in prose, and a generic formal review with no stage marker
// stays a code completion.
const SECURITY_FORMAL_PATTERN = /codex-security-review-finding:v1|^#{1,6}\s*(?:🛡️\s*)?Codex Security Review\b/imu;
// A status row belongs to a named stage. The real reviewer posts a Code Review
// row and a Security Review row in one summary comment, each with its own status
// and commit, so a completion only counts for the stage whose exact label it
// carries. Recognise the labels we have seen; anything else stays an unknown
// stage and is never treated as the code review's completion.
const STAGE_LABELS = [['code', /\bcode review\b/iu], ['security', /\bsecurity review\b/iu]];
const HEAD_READS = 3;
const RECEIPT_MARKER = '<!-- codex-review-receipt:v1 -->';
const CODE_RECEIPT = /^Codex Review: Didn't find any major issues\.(?:[ \t]+[^\r\n]*)?$/u;
const SECURITY_RECEIPT = 'Security review completed. No security issues were found in this pull request.';
// A code review can carry its finding in the formal review body, marked
// `codex-code-review-finding:v1`, with no inline comment and so no thread to
// resolve (authenticated: backend PR1147 review 5556511304, a P1 on head
// 7d59d33). Each priority badge in such a body is one finding; a marked body
// with no badge still counts as one.
const CODE_FINDING_MARKER = 'codex-code-review-finding:v1';
const PRIORITY_BADGE = /!\[P\d+ Badge\]/gu;
// Codex posts a transient failed row on a new head before the real run starts,
// so --wait rechecks a failed state this many more times before ending on it.
const FAILED_GRACE_POLLS = 2;

class QueryError extends Error {}

export function normalizeLogin(login) {
  return String(login ?? '').trim().toLowerCase().replace(/\[bot\]$/, '');
}

// Printing untrusted text: drop control characters (terminal escapes) and cap length.
function clean(text, max = 200) {
  const line = String(text ?? '').replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').trim();
  return line.length > max ? `${line.slice(0, max - 3)}...` : line;
}

function firstLine(body) {
  const line = String(body ?? '').split(/\r?\n/).map((part) => part.trim()).find((part) => part !== '') ?? '';
  return clean(line);
}

// Commit references in a row: `abc1234`, [abc1234](...), or .../commit/abc1234.
function commitRefs(row) {
  const refs = [];
  for (const pattern of [/`([0-9a-f]{7,40})`/gi, /\[([0-9a-f]{7,40})\]/gi, /\/commits?\/([0-9a-f]{7,40})\b/gi]) {
    for (const match of row.matchAll(pattern)) refs.push(match[1].toLowerCase());
  }
  return refs;
}

function classifyRow(row) {
  const text = row
    .replace(/<[^>]*>/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/\]\([^)]*\)/g, ']');
  const matched = ROW_CLASSES.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
  return matched.length === 1 ? matched[0] : null;
}

// Which stage a row's label names. The first cell carries the label; markup,
// links and status cells are stripped first, and the match is on the exact
// label phrase, so a "Security Review" row is never read as a code review.
function rowStage(row) {
  const label = String(row ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]/g, ' ')
    .split('|')[1] ?? '';
  return STAGE_LABELS.find(([, pattern]) => pattern.test(label))?.[0] ?? 'other';
}

// A row naming the head is classified by the stage it labels, and only a code
// row's status can complete the review. A row whose status does not classify
// (a two-class row like "Completed with errors", or an unknown word) is not a
// completion; the caller records it as unclassifiable and never promotes it.
function classifyStageRow(line) {
  const status = classifyRow(line);
  return { stage: rowStage(line), status };
}

// Split one comment into status rows and prose. A row is a Markdown table line
// (it starts with a pipe and is not the header separator); every other line is
// prose. Rows naming the head are classified.
function splitComment(body, head) {
  const rows = [];
  const prose = [];
  for (const raw of String(body ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith('|') || line.split('|').length < 3) { if (line) prose.push(line); continue; }
    if (/^\|[\s|:-]+\|?$/.test(line)) continue;
    const namesHead = commitRefs(line).some((ref) => head.startsWith(ref));
    rows.push({ line, namesHead, ...(namesHead ? classifyStageRow(line) : { stage: null, status: null }) });
  }
  return { rows, prose };
}

function completionReceipt(body) {
  const text = String(body ?? '');
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines[0] !== RECEIPT_MARKER || text.split(RECEIPT_MARKER).length !== 2 || NOTICE_PATTERN.test(text)) return null;
  const fields = lines.filter((line) => /^\*\*Reviewed commit:/i.test(line));
  const commit = fields.length === 1 ? /^\*\*Reviewed commit:\*\* `([0-9a-f]{7,40})`$/i.exec(fields[0])?.[1].toLowerCase() : null;
  if (!commit) return null;
  const code = CODE_RECEIPT.test(lines[1] ?? '') && !SECURITY_FORMAL_PATTERN.test(text) && !lines.includes(SECURITY_RECEIPT);
  const security = /^#{1,6}\s*(?:🛡️\s*)?Codex Security Review\b/iu.test(lines[1] ?? '') && lines[2] === SECURITY_RECEIPT && !lines.some((line) => CODE_RECEIPT.test(line));
  return code !== security ? { commit, stage: code ? 'code' : 'security' } : null;
}

function bodyFindingCount(body) {
  const text = String(body ?? '');
  if (!text.includes(CODE_FINDING_MARKER)) return 0;
  return Math.max(1, text.match(PRIORITY_BADGE)?.length ?? 0);
}

function reviewerReceipt(comment, reviewer) {
  if (normalizeLogin(comment?.user?.login) !== reviewer) return null;
  const app = comment.performed_via_github_app;
  if (app && normalizeLogin(app.slug) !== reviewer) return null;
  return completionReceipt(comment.body);
}

function flattenPages(value, label) {
  if (!Array.isArray(value)) throw new QueryError(`${label}: expected a list`);
  return value.every(Array.isArray) ? value.flat() : value;
}

/**
 * Work out the reviewer's state for the head from what gh returned. Pure.
 */
export function assess({ reviewer, pr, reviews, pullComments, issueComments, threads, threadsTruncated, receiptCommits = new Map() }) {
  const who = normalizeLogin(reviewer);
  const head = String(pr.headRefOid).toLowerCase();
  const byReviewer = (item) => normalizeLogin(item?.user?.login) === who;
  const evidence = [];
  const notes = [];
  const notices = [];

  // Formal reviews on any head can be notices; only notice-free ones on this head
  // are completions. A body marked as a code finding is never a notice, since its
  // finding text may itself mention rate limits or quotas.
  const headReviews = [];
  for (const review of reviews.filter(byReviewer)) {
    const body = String(review.body ?? '');
    if (!body.includes(CODE_FINDING_MARKER) && NOTICE_PATTERN.test(body)) {
      notices.push({ id: review.id, url: review.html_url ?? null, time: review.submitted_at ?? null, firstLine: firstLine(review.body) });
    } else if (String(review.commit_id).toLowerCase() === head) {
      const security = SECURITY_FORMAL_PATTERN.test(String(review.body ?? ''));
      headReviews.push(review);
      evidence.push({
        kind: 'formal-review',
        id: review.id,
        url: review.html_url ?? null,
        time: review.submitted_at ?? null,
        status: 'completed',
        stage: security ? 'security' : 'code',
      });
    }
  }
  // Only a code-stage formal review completes the review. The security object
  // stays visible as evidence but cannot stand in for the code stage.
  const codeHeadReviews = headReviews.filter((review) => !SECURITY_FORMAL_PATTERN.test(String(review.body ?? '')));
  const headReviewIds = new Set(headReviews.map((review) => review.id));
  const bodyFindings = codeHeadReviews.reduce((sum, review) => sum + bodyFindingCount(review.body), 0);
  const findings = pullComments.filter((comment) => headReviewIds.has(comment.pull_request_review_id)).length + bodyFindings;

  // Status rows, by stage. `codeStatus` is the only status that can complete the
  // review; the others stay visible and can still report running or failed.
  const codeStatus = new Set();
  const stageStatuses = new Set();
  for (const comment of issueComments.filter(byReviewer)) {
    const time = comment.updated_at ?? comment.created_at ?? null;
    const receipt = reviewerReceipt(comment, who);
    if (receipt && (receipt.commit.length === 40 ? receipt.commit : receiptCommits.get(receipt.commit)) === head) {
      stageStatuses.add('completed');
      if (receipt.stage === 'code') codeStatus.add('completed');
      evidence.push({ kind: 'issue-comment-receipt', id: comment.id, url: comment.html_url ?? null, time, status: 'completed', stage: receipt.stage });
    }
    const { rows, prose } = splitComment(comment.body, head);
    // At most one notice per comment: the first notice row, else the first notice line of prose.
    let notice = null;
    for (const row of rows) {
      if (NOTICE_PATTERN.test(row.line)) {
        notice ??= { id: comment.id, url: comment.html_url ?? null, time, firstLine: clean(row.line) };
        continue;
      }
      if (!row.namesHead) continue;
      if (row.status === null) {
        notes.push(`could not classify a status row naming this head in comment ${comment.id}: ${clean(row.line, 160)}`);
        continue;
      }
      stageStatuses.add(row.status);
      if (row.stage === 'code') codeStatus.add(row.status);
      evidence.push({ kind: 'status-row', id: comment.id, url: comment.html_url ?? null, time, status: row.status, stage: row.stage });
    }
    const noticeLine = prose.find((line) => NOTICE_PATTERN.test(line));
    if (!notice && noticeLine) notice = { id: comment.id, url: comment.html_url ?? null, time: comment.created_at ?? time, firstLine: clean(noticeLine) };
    if (notice) notices.push(notice);
  }

  // The completion is the code stage's. If code has not completed, report the
  // other stages' activity so a wait still sees running or failed honestly.
  let state = 'not-started';
  if (codeHeadReviews.length > 0 || codeStatus.has('completed')) state = 'reviewed';
  else if (stageStatuses.has('running')) state = 'running';
  else if (stageStatuses.has('failed')) state = 'failed';
  if (codeStatus.size > 1) notes.push(`code review status rows for this head disagree (${[...codeStatus].join(', ')}); completed outranks running, which outranks failed`);
  if (state === 'reviewed' && codeHeadReviews.length === 0) notes.push('completion is known from code review issue-comment evidence only');

  const unresolved = threads.filter((node) => node && node.isResolved === false);
  const starter = (node) => normalizeLogin(node?.comments?.nodes?.[0]?.author?.login);
  // The query reads the first 100 threads. When there are more, the counts above
  // cover only that page, so a clean pass cannot be claimed: an open finding may
  // sit beyond it. `threadsComplete` carries that limit into the exit gate.
  const threadsComplete = !threadsTruncated;
  if (!threadsComplete) notes.push('more than 100 review threads; thread counts cover the first 100, so the pass is unknown');
  const unresolvedFromReviewer = unresolved.filter((node) => starter(node) === who).length;
  const openFindings = unresolved.length > 0 || unresolvedFromReviewer > 0;
  if (state === 'reviewed' && openFindings) {
    notes.push(`the code review is done, but ${unresolvedFromReviewer} unresolved thread(s) from ${reviewer} and ${unresolved.length} in total are open; exit is non-zero until they are resolved`);
  }
  if (state === 'reviewed' && bodyFindings > 0) {
    notes.push(`the code review of this head has ${bodyFindings} finding(s) in its review body, which has no thread to resolve; read and settle each one (babysit step 8): exit stays non-zero on this head`);
  }

  return {
    state,
    head: pr.headRefOid,
    prState: pr.state,
    isDraft: Boolean(pr.isDraft),
    findings,
    bodyFindings,
    unresolvedThreads: unresolvedFromReviewer,
    unresolvedThreadsTotal: unresolved.length,
    threadsComplete,
    notices,
    evidence,
    notes,
  };
}

async function ghJson(deps, args) {
  let result;
  try {
    result = await deps.exec(args);
  } catch (error) {
    throw new QueryError(`gh ${args[0]} ${args[1]}: ${error.message}`);
  }
  if (result.code !== 0) {
    throw new QueryError(`gh ${args[0]} ${args[1]} exited ${result.code}: ${clean(result.stderr) || 'no message'}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new QueryError(`gh ${args[0]} ${args[1]}: unreadable JSON (${error.message})`);
  }
}

// One consistent read: evidence is collected for a head, then the head is read
// again. If it moved meanwhile, the evidence may mix two heads, so it is thrown
// away and collected again.
async function readOnce(deps, context) {
  const { repo, pr } = context;
  let moved = null;
  for (let attempt = 1; attempt <= HEAD_READS; attempt += 1) {
    const collected = await collect(deps, context);
    const confirm = await ghJson(deps, ['pr', 'view', String(pr), '--repo', repo, '--json', 'headRefOid']);
    const now = String(confirm?.headRefOid ?? '');
    if (now.toLowerCase() === String(collected.head).toLowerCase()) return collected;
    moved = `${String(collected.head).slice(0, 7)} to ${now.slice(0, 7) || '(none)'}`;
  }
  throw new QueryError(`head kept moving: it changed while evidence was collected on ${HEAD_READS} reads in a row (last from ${moved})`);
}

async function collect(deps, { repo, pr, reviewer }) {
  const view = await ghJson(deps, ['pr', 'view', String(pr), '--repo', repo, '--json', 'headRefOid,state,isDraft,url']);
  if (!/^[0-9a-f]{40}$/i.test(String(view?.headRefOid ?? ''))) throw new QueryError('gh pr view: no head commit in the response');
  const rest = (path) => ['api', '--paginate', '--slurp', `repos/${repo}/${path}?per_page=100`];
  const [owner, name] = repo.split('/');
  const [reviews, pullComments, issueComments, graph] = await Promise.all([
    ghJson(deps, rest(`pulls/${pr}/reviews`)),
    ghJson(deps, rest(`pulls/${pr}/comments`)),
    ghJson(deps, rest(`issues/${pr}/comments`)),
    ghJson(deps, ['api', 'graphql', '-f', `query=${THREADS_QUERY}`, '-f', `owner=${owner}`, '-f', `name=${name}`, '-F', `number=${pr}`]),
  ]);
  const threadData = graph?.data?.repository?.pullRequest?.reviewThreads;
  if (!threadData || !Array.isArray(threadData.nodes)) throw new QueryError('gh api graphql: no review threads in the response');
  const comments = flattenPages(issueComments, 'issue comments');
  const receiptCommits = new Map();
  for (const comment of comments) {
    const receipt = reviewerReceipt(comment, normalizeLogin(reviewer));
    if (!receipt || receipt.commit.length === 40 || !String(view.headRefOid).toLowerCase().startsWith(receipt.commit) || receiptCommits.has(receipt.commit)) continue;
    const resolved = await ghJson(deps, ['api', `repos/${repo}/commits/${receipt.commit}`]);
    const sha = String(resolved?.sha ?? '').toLowerCase();
    if (!/^[0-9a-f]{40}$/.test(sha) || !sha.startsWith(receipt.commit)) throw new QueryError('gh api commits: no unambiguous receipt commit in the response');
    receiptCommits.set(receipt.commit, sha);
  }
  return {
    ...assess({
      reviewer,
      pr: view,
      reviews: flattenPages(reviews, 'reviews'),
      pullComments: flattenPages(pullComments, 'review comments'),
      issueComments: comments,
      receiptCommits,
      threads: threadData.nodes,
      threadsTruncated: Boolean(threadData.pageInfo?.hasNextPage),
    }),
    checkedAt: new Date(deps.clock.now()).toISOString(),
  };
}

function parseArgs(argv) {
  const args = { wait: false, json: false, timeout: 1200, interval: 30, repo: null, pr: null, reviewer: null, help: false };
  const value = (index, flag) => {
    if (index + 1 >= argv.length) throw new Error(`${flag} needs a value`);
    return argv[index + 1];
  };
  const seconds = (text, flag) => {
    const number = Number(text);
    if (!Number.isFinite(number) || number <= 0) throw new Error(`${flag} must be a positive number of seconds`);
    return number;
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--pr') {
      const text = value(index, token);
      if (!/^[1-9]\d*$/.test(text)) throw new Error('--pr must be a pull request number');
      args.pr = Number(text);
      index += 1;
    } else if (token === '--reviewer') { args.reviewer = value(index, token).trim(); index += 1; }
    else if (token === '--repo') {
      args.repo = value(index, token);
      if (!/^[\w.-]+\/[\w.-]+$/.test(args.repo)) throw new Error('--repo must be owner/name');
      index += 1;
    } else if (token === '--timeout') { args.timeout = seconds(value(index, token), token); index += 1; }
    else if (token === '--interval') { args.interval = seconds(value(index, token), token); index += 1; }
    else if (token === '--wait') args.wait = true;
    else if (token === '--json') args.json = true;
    else if (token === '--help' || token === '-h') args.help = true;
    else throw new Error(`unknown argument ${token}`);
  }
  if (!args.help && (args.pr === null || !args.reviewer)) throw new Error('--pr and --reviewer are required');
  return args;
}

function exitFor(result) {
  // Exit 0 means the caller's pass: the code review finished and no open finding
  // is left. A finished review with unresolved threads or a review-body finding
  // is still pending, so the caller never arms a merge over an open finding.
  if (result.state === 'reviewed') {
    const open = result.unresolvedThreads > 0 || result.unresolvedThreadsTotal > 0 || result.bodyFindings > 0;
    return open || result.threadsComplete === false ? EXIT.pending : EXIT.reviewed;
  }
  if (result.state === 'failed') return EXIT.failed;
  if (result.prState && result.prState !== 'OPEN') return EXIT.closed;
  return EXIT.pending;
}

function humanReport(result, reviewer) {
  const lines = [`State: ${result.state}`];
  if (result.timedOut && result.state !== 'failed') lines.push(FALLBACK);
  lines.push(`Head: ${result.head} (PR #${result.pr}, ${result.prState}${result.isDraft ? ', draft' : ''})`);
  lines.push(`Findings: ${result.findings}${result.bodyFindings > 0 ? ` (${result.bodyFindings} in the review body)` : ''}`);
  lines.push(`Unresolved threads: ${result.unresolvedThreads} from ${reviewer}, ${result.unresolvedThreadsTotal} in total`);
  const openThreads = result.unresolvedThreads > 0 || result.unresolvedThreadsTotal > 0;
  if (result.state === 'reviewed' && (openThreads || result.bodyFindings > 0 || result.threadsComplete === false)) {
    const why = result.bodyFindings > 0 ? 'the review body has a finding'
      : openThreads ? 'an open thread remains' : 'the thread list is incomplete';
    lines.push(`Pass: no, the review is done but ${why}`);
  }
  // Notices never change the state; the latest one is enough here, --json lists all.
  const latest = [...result.notices].sort((a, b) => String(b.time).localeCompare(String(a.time)))[0];
  lines.push(latest
    ? `Notices: ${result.notices.length} (not reviews); latest ${latest.time}: ${latest.firstLine}`
    : 'Notices: 0');
  for (const item of result.evidence) lines.push(`Evidence: ${item.kind} ${item.status} ${item.time ?? ''} ${item.url ?? item.id}`.replace(/\s+/g, ' ').trim());
  for (const note of result.notes) lines.push(`Note: ${note}`);
  lines.push(`Checked: ${result.checkedAt}`);
  return `${lines.join('\n')}\n`;
}

/**
 * @param {string[]} argv
 * @param {{exec: (args: string[]) => Promise<{code: number, stdout: string, stderr: string}>,
 *   clock: {now: () => number, sleep: (ms: number) => Promise<void>},
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
    return EXIT.reviewed;
  }

  const queryFailure = (message) => {
    deps.stderr(`query error: ${message}\n`);
    if (args.json) deps.stdout(`${JSON.stringify({ state: 'error', error: message }, null, 2)}\n`);
    return EXIT.query;
  };

  let repo;
  try {
    repo = args.repo ?? (await ghJson(deps, ['repo', 'view', '--json', 'nameWithOwner'])).nameWithOwner;
    if (!/^[\w.-]+\/[\w.-]+$/.test(String(repo ?? ''))) throw new QueryError('gh repo view: could not resolve the repository here; pass --repo');
  } catch (error) {
    if (!(error instanceof QueryError)) throw error;
    return queryFailure(error.message);
  }

  const context = { repo, pr: args.pr, reviewer: args.reviewer };
  const deadline = deps.clock.now() + args.timeout * 1000;
  const headChanges = [];
  let result = null;
  let failures = 0;
  let failedReads = 0;
  let lastPrinted = null;
  let timedOut = false;

  // One read without --wait. With --wait, the head is re-read on every poll and
  // the loop ends on a terminal state, a closed pull request or the deadline.
  for (;;) {
    let fresh = false;
    try {
      const read = await readOnce(deps, context);
      failures = 0;
      fresh = true;
      if (result && read.head !== result.head) {
        headChanges.push({ from: result.head, to: read.head, at: read.checkedAt });
        failedReads = 0;
        if (args.wait) deps.stderr(`${read.checkedAt}  head changed from ${result.head.slice(0, 7)} to ${read.head.slice(0, 7)}; waiting on the new head\n`);
      }
      result = read;
    } catch (error) {
      if (!(error instanceof QueryError)) throw error;
      failures += 1;
      if (!args.wait || failures >= MAX_CONSECUTIVE_FAILURES) {
        return queryFailure(args.wait ? `${failures} consecutive gh failures; last: ${error.message}` : error.message);
      }
      deps.stderr(`${new Date(deps.clock.now()).toISOString()}  gh failed (${failures} in a row; giving up at ${MAX_CONSECUTIVE_FAILURES}): ${error.message}\n`);
    }

    if (fresh) {
      const key = `${result.head}:${result.state}`;
      if (args.wait && key !== lastPrinted) {
        deps.stderr(`${result.checkedAt}  ${result.state} on ${result.head.slice(0, 7)}${result.state === 'reviewed' ? ` (${result.findings} findings)` : ''}\n`);
        lastPrinted = key;
      }
      // A failed state ends the wait only once it has held through the grace
      // polls on the same head; a running or completed row meanwhile replaces it.
      failedReads = result.state === 'failed' ? failedReads + 1 : 0;
      const failedFinal = failedReads > FAILED_GRACE_POLLS;
      if (args.wait && result.state === 'failed' && !failedFinal) {
        deps.stderr(`${result.checkedAt}  failed on ${result.head.slice(0, 7)}; rechecking (${failedReads} of ${FAILED_GRACE_POLLS}) before treating it as final\n`);
      }
      const terminal = result.state === 'reviewed' || (result.state === 'failed' && (failedFinal || !args.wait)) || result.prState !== 'OPEN';
      if (terminal) break;
    }
    if (!args.wait) break;
    const remaining = deadline - deps.clock.now();
    if (remaining <= 0) {
      timedOut = true;
      break;
    }
    await deps.clock.sleep(Math.min(args.interval * 1000, remaining));
  }

  if (!result) return queryFailure('no successful read before the timeout');
  const report = { repo, pr: args.pr, reviewer: args.reviewer, ...result, timedOut, headChanges };
  deps.stdout(args.json ? `${JSON.stringify(report, null, 2)}\n` : humanReport(report, args.reviewer));
  return exitFor(report);
}

function exec(args) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn('gh', args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, shell: false });
    } catch (error) {
      resolve({ code: -1, stdout: '', stderr: error.message });
      return;
    }
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => resolve({ code: -1, stdout, stderr: error.message }));
    child.on('close', (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

async function main() {
  return run(process.argv.slice(2), {
    exec,
    clock: { now: () => Date.now(), sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)) },
    stdout: (text) => process.stdout.write(text),
    stderr: (text) => process.stderr.write(text),
  });
}

// Compare real paths: Node runs a linked script from its real file, so through a
// junction or symlink the invoked path differs and main() would silently not run.
if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = await main();
}
