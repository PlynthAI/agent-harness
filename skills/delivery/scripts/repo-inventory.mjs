#!/usr/bin/env node
// Read-only inventory of a repository's worktrees, leftover local branches and
// open pull requests, each with a merged proof and a suggested bucket. The
// bucket is advice: liveness and ownership are still the caller's to confirm
// through each runtime's own route before anything is retired.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  UNAVAILABLE, aheadBehind, baseHistory, classifyRuntime, codexHomeOf, commitTimes, defaultBase, dirtyState, firstLine, git,
  isInside, isMainScript, listWorktrees, mergedProof, newestTranscript, prsForBranch, readBranches,
  readPullRequests, refExists, resolveDeps, resolveRepo, treeSize, upstreamState,
} from './worktree-facts.mjs';

const USAGE = 'usage: repo-inventory.mjs [--repo <path>] [--base <branch>] [--remote <name>] [--json] [--sizes] [--chats] [--no-fetch]\n';

const BUCKET_ORDER = ['main', 'current', 'hold-uncommitted', 'hold-open-pr', 'retire', 'review'];
const SHORT_RUNTIME = { main: 'main', 'codex-app': 'codex', 'claude-desktop': 'desktop', 'claude-cli': 'cli', plain: 'plain' };

function parseArgs(argv) {
  const options = { repo: null, base: null, remote: 'origin', json: false, sizes: false, chats: false, fetch: true };
  const value = (index, flag) => {
    const next = argv[index + 1];
    if (next === undefined || next.startsWith('--')) throw new Error(`${flag} needs a value`);
    return next;
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--repo') { options.repo = value(index, token); index += 1; }
    else if (token === '--base') { options.base = value(index, token); index += 1; }
    else if (token === '--remote') { options.remote = value(index, token); index += 1; }
    else if (token === '--json') options.json = true;
    else if (token === '--sizes') options.sizes = true;
    else if (token === '--chats') options.chats = true;
    else if (token === '--no-fetch') options.fetch = false;
    else if (token === '--help' || token === '-h') options.help = true;
    else throw new Error(`unknown argument ${token}`);
  }
  return options;
}

function bucketFor({ isMain, current, dirty, openPr, proof }) {
  if (isMain) return 'main';
  if (current) return 'current';
  if (dirty !== 'clean') return 'hold-uncommitted';
  if (openPr) return 'hold-open-pr';
  if (proof !== 'none') return 'retire';
  return 'review';
}

function prLabel(prs, branch) {
  if (!branch) return '-';
  if (!prs) return 'unknown';
  const mine = prsForBranch(prs, branch);
  const shown = mine.find((item) => item.state === 'OPEN') ?? mine[0];
  return shown ? `#${shown.number} ${shown.state}` : '-';
}

export function collectInventory(d, { repoTop, remote, base: requestedBase, fetch, sizes, chats }) {
  const { exec } = d;
  const notes = [];
  let fetched = false;
  if (fetch) {
    const result = git(exec, repoTop, ['fetch', '--prune', '--quiet', remote]);
    fetched = result.ok;
    if (!result.ok) notes.push(`could not fetch ${remote} (${firstLine(result.err)}); merged proof uses the last fetched state`);
  }
  const base = requestedBase ?? defaultBase(exec, repoTop, remote);
  const baseRef = `${remote}/${base}`;
  if (!refExists(exec, repoTop, `refs/remotes/${baseRef}`)) {
    return { error: `${baseRef} not found in ${repoTop}; pass --remote and --base for this repository` };
  }

  const pullRequests = readPullRequests(exec, repoTop);
  const prs = pullRequests.ok ? pullRequests.prs : null;
  if (!prs) notes.push(`${UNAVAILABLE} (${pullRequests.error}): PR fields are unknown and squash proof cannot be made`);

  const listed = listWorktrees(exec, repoTop);
  if (!listed.ok) return { error: `could not list worktrees: ${listed.error}` };
  const branches = readBranches(exec, repoTop);
  const onBase = baseHistory(exec, repoTop, baseRef);
  const times = commitTimes(exec, repoTop, listed.items.map((item) => item.head));
  const mainPath = listed.items[0]?.path;
  const codexHome = codexHomeOf(d.env, d.homedir);
  const nowSeconds = d.now() / 1000;

  // The calling directory belongs to the deepest worktree that contains it: a
  // CLI worktree nests inside the main checkout.
  const containing = listed.items.filter((item) => isInside(d.cwd, item.path));
  const currentPath = containing.sort((a, b) => b.path.length - a.path.length)[0]?.path ?? null;

  const worktrees = listed.items.map((item, index) => {
    const isMain = index === 0;
    const branch = item.branch;
    const tip = item.head;
    const dirty = item.prunable ? { state: 'missing' } : dirtyState(exec, item.path);
    const time = times.get(tip) ?? NaN;
    const merged = mergedProof({ exec, repo: repoTop, tip, branch, baseRef, prs, onBase });
    const counts = tip ? aheadBehind(exec, repoTop, tip, baseRef) : { ahead: null, behind: null };
    const openPr = prsForBranch(prs, branch).some((pr) => pr.state === 'OPEN');
    const current = currentPath === item.path;
    const entry = {
      path: item.path,
      runtime: classifyRuntime(item.path, { mainPath, codexHome }),
      branch: branch ?? 'detached',
      head: tip ? tip.slice(0, 7) : null,
      ageDays: Number.isFinite(time) ? Math.max(0, Math.floor((nowSeconds - time) / 86400)) : null,
      dirty: dirty.state,
      locked: item.locked,
      prunable: item.prunable,
      upstream: branch ? upstreamState({ exec, repo: repoTop, remote, branch, info: branches.get(branch) }) : 'none',
      ahead: counts.ahead,
      behind: counts.behind,
      pr: prLabel(prs, branch),
      merged,
      current,
      bucket: bucketFor({ isMain, current, dirty: dirty.state, openPr, proof: merged.proof }),
    };
    if (sizes) entry.size = item.prunable ? null : treeSize(item.path);
    if (chats) entry.chat = newestTranscript({ exec, homedir: d.homedir, target: item.path });
    return entry;
  });

  const checkedOut = new Set(listed.items.map((item) => item.branch).filter(Boolean));
  const leftovers = [...branches.values()].filter((info) => !checkedOut.has(info.name)).map((info) => {
    const merged = mergedProof({ exec, repo: repoTop, tip: info.tip, branch: info.name, baseRef, prs, onBase });
    const openPr = prsForBranch(prs, info.name).some((pr) => pr.state === 'OPEN');
    return {
      name: info.name,
      head: info.tip.slice(0, 7),
      upstream: upstreamState({ exec, repo: repoTop, remote, branch: info.name, info }),
      pr: prLabel(prs, info.name),
      merged,
      lastCommit: new Date(info.date * 1000).toISOString().slice(0, 10),
      bucket: info.name === base ? 'main' : openPr ? 'hold-open-pr' : merged.proof !== 'none' ? 'retire' : 'review',
    };
  });

  const openPullRequests = (prs ?? []).filter((item) => item.state === 'OPEN').map((item) => ({
    number: item.number,
    branch: item.headRefName,
    draft: Boolean(item.isDraft),
    local: checkedOut.has(item.headRefName) ? 'worktree' : branches.has(item.headRefName) ? 'branch' : 'none',
  })).sort((a, b) => a.number - b.number);

  const byBucket = (a, b) => BUCKET_ORDER.indexOf(a.bucket) - BUCKET_ORDER.indexOf(b.bucket);
  return {
    repo: repoTop,
    remote,
    base,
    fetched,
    pullRequests: prs ? 'available' : 'unavailable',
    notes,
    worktrees: worktrees.sort(byBucket),
    branches: leftovers.sort(byBucket),
    openPullRequests,
  };
}

function table(header, rows) {
  const widths = header.map((title, column) => Math.max(title.length, ...rows.map((row) => String(row[column]).length)));
  const line = (cells) => cells.map((cell, column) => (column === cells.length - 1 ? String(cell) : String(cell).padEnd(widths[column]))).join('  ').trimEnd();
  return [line(header), ...rows.map(line)].join('\n');
}

function humanBytes(bytes) {
  if (bytes == null) return '-';
  const units = ['B', 'K', 'M', 'G', 'T'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)}${units[unit]}`;
}

const mergedLabel = (merged) => (merged.proof === 'squash' ? `squash#${merged.pr}` : merged.proof);
const baseLabel = (item) => (item.ahead == null ? '-' : `+${item.ahead}/-${item.behind}`);

function chatLabel(chat) {
  if (chat === 'unknown') return 'unknown';
  return chat ? chat.modified.slice(0, 10) : '-';
}

export function renderText(report, { sizes, chats }) {
  const out = [];
  out.push(`Repository ${report.repo}`);
  out.push(`Base ${report.remote}/${report.base} (${report.fetched ? 'fetched now' : 'not fetched'})`);
  for (const note of report.notes) out.push(`Note: ${note}`);

  out.push('', `Worktrees (${report.worktrees.length})`);
  const header = ['BUCKET', 'RUNTIME', 'BRANCH', 'DIRTY', 'UPSTREAM', 'BASE', 'PR', 'MERGED', 'AGE'];
  if (sizes) header.push('SIZE');
  if (chats) header.push('CHAT');
  header.push('PATH');
  out.push(table(header, report.worktrees.map((item) => {
    const flags = [item.locked && 'locked', item.prunable && 'prunable'].filter(Boolean);
    const row = [item.bucket, SHORT_RUNTIME[item.runtime] ?? item.runtime, item.branch, item.dirty, item.upstream, baseLabel(item), item.pr, mergedLabel(item.merged), item.ageDays == null ? '-' : `${item.ageDays}d`];
    if (sizes) row.push(humanBytes(item.size));
    if (chats) row.push(chatLabel(item.chat));
    row.push(item.path + (flags.length ? ` [${flags.join(', ')}]` : ''));
    return row;
  })));

  // Reasons only where they decide something: an open pull request explains
  // itself, and the unavailable-data reason is already a note.
  const reasons = report.worktrees
    .filter((item) => ['review', 'hold-uncommitted'].includes(item.bucket) && item.merged.proof === 'none' && item.merged.reason !== UNAVAILABLE)
    .map((item) => [item.branch === 'detached' ? item.path.split('/').slice(-2).join('/') : item.branch, item.merged.reason]);
  if (reasons.length) out.push('', 'Not proven merged', table(['WHAT', 'WHY'], reasons));

  out.push('', `Local branches with no worktree (${report.branches.length})`);
  if (report.branches.length) {
    out.push(table(['BUCKET', 'BRANCH', 'UPSTREAM', 'PR', 'MERGED', 'LAST'], report.branches.map((item) => [
      item.bucket, item.name, item.upstream, item.pr, mergedLabel(item.merged), item.lastCommit,
    ])));
  }

  out.push('', `Open pull requests (${report.pullRequests === 'available' ? report.openPullRequests.length : 'unknown'})`);
  if (report.openPullRequests.length) {
    out.push(table(['PR', 'DRAFT', 'LOCAL', 'BRANCH'], report.openPullRequests.map((item) => [`#${item.number}`, item.draft ? 'draft' : '-', item.local, item.branch])));
  }

  const counts = {};
  for (const item of [...report.worktrees, ...report.branches]) counts[item.bucket] = (counts[item.bucket] ?? 0) + 1;
  out.push('', `Buckets: ${BUCKET_ORDER.filter((bucket) => counts[bucket]).map((bucket) => `${bucket} ${counts[bucket]}`).join(', ')}`);
  out.push('retire means merged and clean; confirm liveness through the runtime before retiring.');
  return `${out.join('\n')}\n`;
}

export async function run(argv, deps = {}) {
  const d = resolveDeps(deps);
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    d.stderr(`${error.message}\n${USAGE}`);
    return 2;
  }
  if (options.help) { d.stdout(USAGE); return 0; }
  const start = options.repo ? path.resolve(d.cwd, options.repo) : d.cwd;
  const repo = resolveRepo(d.exec, start);
  if (!repo.ok) { d.stderr(`${repo.error}\n`); return 1; }
  const report = collectInventory(d, { repoTop: repo.path, remote: options.remote, base: options.base, fetch: options.fetch, sizes: options.sizes, chats: options.chats });
  if (report.error) { d.stderr(`${report.error}\n`); return 1; }
  d.stdout(options.json ? `${JSON.stringify(report, null, 2)}\n` : renderText(report, options));
  return 0;
}

if (isMainScript(import.meta.url, fileURLToPath)) {
  process.exitCode = await run(process.argv.slice(2));
}
