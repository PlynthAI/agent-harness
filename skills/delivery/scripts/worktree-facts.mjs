// Shared, read-only facts about a repository's worktrees, branches and pull
// requests, used by repo-inventory.mjs and retire-worktree.mjs so both tools
// prove "merged" the same way. Nothing here deletes; the only filesystem
// change is removeLinkEntry, which removes one link entry and never a target.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function defaultExec(file, args, opts = {}) {
  const result = spawnSync(file, args, { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, windowsHide: true, ...opts });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '', error: result.error };
}

export function resolveDeps(deps = {}) {
  const exec = deps.exec ?? defaultExec;
  return {
    exec,
    cwd: deps.cwd ?? process.cwd(),
    env: deps.env ?? process.env,
    homedir: deps.homedir ?? os.homedir(),
    now: deps.now ?? Date.now,
    pid: deps.pid ?? process.pid,
    platform: deps.platform ?? process.platform,
    stdout: deps.stdout ?? ((text) => process.stdout.write(text)),
    stderr: deps.stderr ?? ((text) => process.stderr.write(text)),
    listProcesses: deps.listProcesses ?? (() => listProcesses({ exec, platform: deps.platform ?? process.platform })),
    pruneIndexes: deps.pruneIndexes,
  };
}

export const firstLine = (text) => String(text ?? '').split(/\r?\n/).find((line) => line.trim()) ?? '';

// quotepath=off keeps non-ASCII paths readable instead of octal-escaped.
export function git(exec, cwd, args) {
  const result = exec('git', ['-c', 'core.quotepath=off', ...args], { cwd });
  return {
    ok: result.status === 0,
    status: result.status,
    out: String(result.stdout ?? '').replace(/[\r\n\t ]+$/, ''),
    err: String(result.stderr ?? '').trim() || (result.error ? result.error.message : ''),
  };
}

// Paths: git prints forward slashes on Windows, people and process command lines
// use backslashes, and drive letters vary in case. Only a Windows drive path is
// compared case-insensitively; POSIX paths are case-sensitive.
export const toSlash = (p) => String(p).replace(/\\/g, '/');
export const isDrivePath = (p) => /^[A-Za-z]:[\\/]/.test(String(p));

export function normPath(p) {
  let slashed = toSlash(path.resolve(String(p)));
  if (slashed.length > 1 && slashed.endsWith('/') && !/^[A-Za-z]:\/$/.test(slashed)) slashed = slashed.slice(0, -1);
  return isDrivePath(slashed) ? slashed.toLowerCase() : slashed;
}

export const samePath = (a, b) => normPath(a) === normPath(b);

export function isInside(child, parent) {
  const c = normPath(child);
  const p = normPath(parent);
  return c === p || c.startsWith(p.endsWith('/') ? p : `${p}/`);
}

export function pathSpellings(p) {
  const forward = toSlash(p).replace(/\/+$/, '');
  return [...new Set([forward, forward.replace(/\//g, '\\'), forward.replace(/\//g, '\\\\')])];
}

// A path counts as mentioned only when a separator, quote, space or the end of
// the text follows it, so x-1 is not found inside x-10.
const PATH_END = new Set(['/', '\\', '"', "'", '`', ' ', '\t', '\r', '\n', ',', ';', ')', ']', '}']);

export function mentionsPath(text, p) {
  if (!text) return false;
  const fold = isDrivePath(p);
  const hay = fold ? String(text).toLowerCase() : String(text);
  for (const spelling of pathSpellings(p)) {
    const needle = fold ? spelling.toLowerCase() : spelling;
    for (let at = hay.indexOf(needle); at !== -1; at = hay.indexOf(needle, at + 1)) {
      const next = hay[at + needle.length];
      if (next === undefined || PATH_END.has(next)) return true;
    }
  }
  return false;
}

export function resolveRepo(exec, start) {
  if (!fs.existsSync(start)) return { ok: false, error: `${start} does not exist` };
  const top = git(exec, start, ['rev-parse', '--show-toplevel']);
  if (!top.ok) return { ok: false, error: `${start} is not a git repository: ${firstLine(top.err)}` };
  return { ok: true, path: top.out };
}

export function parseWorktrees(text) {
  const items = [];
  let current = null;
  for (const field of String(text).split('\0')) {
    if (field === '') { if (current) items.push(current); current = null; continue; }
    const space = field.indexOf(' ');
    const key = space === -1 ? field : field.slice(0, space);
    const value = space === -1 ? '' : field.slice(space + 1);
    if (key === 'worktree') {
      if (current) items.push(current);
      current = { path: value, head: null, branch: null, detached: false, locked: false, lockReason: '', prunable: false, bare: false };
    } else if (!current) continue;
    else if (key === 'HEAD') current.head = value;
    else if (key === 'branch') current.branch = value.replace(/^refs\/heads\//, '');
    else if (key === 'detached') current.detached = true;
    else if (key === 'locked') { current.locked = true; current.lockReason = value; }
    else if (key === 'prunable') current.prunable = true;
    else if (key === 'bare') current.bare = true;
  }
  if (current) items.push(current);
  return items;
}

export function listWorktrees(exec, repo) {
  const result = git(exec, repo, ['worktree', 'list', '--porcelain', '-z']);
  if (!result.ok) return { ok: false, error: firstLine(result.err), items: [] };
  return { ok: true, items: parseWorktrees(result.out) };
}

export function defaultBase(exec, repo, remote) {
  const head = git(exec, repo, ['symbolic-ref', '--quiet', '--short', `refs/remotes/${remote}/HEAD`]);
  if (head.ok && head.out.startsWith(`${remote}/`)) return head.out.slice(remote.length + 1);
  return 'main';
}

export function refExists(exec, repo, ref) {
  const result = git(exec, repo, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
  return result.ok ? result.out : null;
}

export function isAncestor(exec, repo, commit, of) {
  return git(exec, repo, ['merge-base', '--is-ancestor', commit, of]).status === 0;
}

// One read of the base's history answers every ancestry question as a lookup;
// a merge-base call per worktree and branch cost most of the inventory's time.
export function baseHistory(exec, repo, baseRef) {
  const result = git(exec, repo, ['rev-list', baseRef]);
  if (!result.ok) return (commit) => isAncestor(exec, repo, commit, baseRef);
  const commits = new Set(result.out.split('\n'));
  return (commit) => commits.has(commit);
}

export function commitTimes(exec, repo, commits) {
  const times = new Map();
  const unique = [...new Set(commits.filter(Boolean))];
  if (!unique.length) return times;
  const result = git(exec, repo, ['show', '--no-patch', '--no-walk=unsorted', '--format=%H %ct', ...unique]);
  for (const line of result.out.split('\n')) {
    const [oid, time] = line.trim().split(' ');
    if (oid && time) times.set(oid, Number(time));
  }
  return times;
}

export function countRange(exec, repo, range) {
  const result = git(exec, repo, ['rev-list', '--count', range]);
  return result.ok ? Number(result.out) : null;
}

export function aheadBehind(exec, repo, tip, baseRef) {
  const result = git(exec, repo, ['rev-list', '--left-right', '--count', `${baseRef}...${tip}`]);
  if (!result.ok) return { ahead: null, behind: null };
  const [behind, ahead] = result.out.split(/\s+/).map(Number);
  return { ahead, behind };
}

export const PR_FIELDS = 'number,state,headRefName,headRefOid,mergeCommit,baseRefName,isDraft';

// One bulk read: every per-branch question is answered from this list, so a
// repository with hundreds of worktrees still makes a single gh call.
export function readPullRequests(exec, repo) {
  const result = exec('gh', ['pr', 'list', '--state', 'all', '--limit', '3000', '--json', PR_FIELDS], { cwd: repo });
  if (result.error || result.status !== 0) {
    return { ok: false, prs: null, error: firstLine(result.stderr) || result.error?.message || `gh exited ${result.status}` };
  }
  try {
    const prs = JSON.parse(result.stdout);
    if (!Array.isArray(prs)) throw new Error('not a list');
    return { ok: true, prs };
  } catch (error) {
    return { ok: false, prs: null, error: `gh returned unreadable output (${error.message})` };
  }
}

export function prsForBranch(prs, branch) {
  if (!prs || !branch) return [];
  return prs.filter((item) => item.headRefName === branch).sort((a, b) => b.number - a.number);
}

export const UNAVAILABLE = 'pull request data unavailable';

/**
 * Prove that a tip is on <remote>/<base>.
 * ancestry: the tip itself is an ancestor of the base.
 * squash: a MERGED pull request for this branch recorded exactly this tip as its
 * head and its merge commit is on the base. A merged pull request does not cover
 * commits made after it, and patch similarity is never proof.
 */
export function mergedProof({ exec, repo, tip, branch, baseRef, prs, onBase = (commit) => isAncestor(exec, repo, commit, baseRef) }) {
  const none = (reason) => ({ proof: 'none', pr: null, reason });
  if (!tip) return none('no head commit');
  if (onBase(tip)) return { proof: 'ancestry', pr: null, reason: `tip is on ${baseRef}` };
  if (!branch) return none(`detached head is not on ${baseRef}`);
  if (!prs) return none(UNAVAILABLE);
  const mine = prsForBranch(prs, branch);
  if (mine.length === 0) return none('no pull request');
  for (const item of mine) {
    if (item.state === 'MERGED' && item.headRefOid === tip && item.mergeCommit?.oid && onBase(item.mergeCommit.oid)) {
      return { proof: 'squash', pr: item.number, reason: `PR #${item.number} merged this exact tip and its merge commit is on ${baseRef}` };
    }
  }
  const merged = mine.find((item) => item.state === 'MERGED');
  if (merged) {
    if (merged.headRefOid === tip) return none(`merge commit of PR #${merged.number} is not on ${baseRef}`);
    if (merged.headRefOid && refExists(exec, repo, merged.headRefOid) && isAncestor(exec, repo, merged.headRefOid, tip)) {
      const later = countRange(exec, repo, `${merged.headRefOid}..${tip}`);
      return none(`${later} commit${later === 1 ? '' : 's'} after merged head #${merged.number}`);
    }
    return none(`tip differs from merged head #${merged.number}`);
  }
  const open = mine.find((item) => item.state === 'OPEN');
  if (open) return none(`PR #${open.number} is open`);
  return none(`PR #${mine[0].number} closed unmerged`);
}

export function readBranches(exec, repo) {
  const format = '%(refname:short)%00%(objectname)%00%(upstream:short)%00%(upstream:track)%00%(committerdate:unix)';
  const result = git(exec, repo, ['for-each-ref', `--format=${format}`, 'refs/heads']);
  const branches = new Map();
  if (!result.ok) return branches;
  for (const line of result.out.split('\n').filter(Boolean)) {
    const [name, tip, upstream, track, date] = line.split('\0');
    branches.set(name, { name, tip, upstream, track, date: Number(date) });
  }
  return branches;
}

export function upstreamState({ exec, repo, remote, branch, info }) {
  if (!branch || !info) return 'none';
  if (info.upstream) {
    if (/gone/.test(info.track)) return 'gone';
    const ahead = Number(/ahead (\d+)/.exec(info.track)?.[1] ?? 0);
    const behind = Number(/behind (\d+)/.exec(info.track)?.[1] ?? 0);
    if (ahead > 0) return `ahead ${ahead}`;
    if (behind > 0) return `behind ${behind}`;
    return 'pushed';
  }
  // No tracking configured: a branch pushed without -u still counts as pushed.
  const remoteTip = refExists(exec, repo, `refs/remotes/${remote}/${branch}`);
  if (!remoteTip) return 'none';
  if (remoteTip === info.tip) return 'pushed';
  const ahead = countRange(exec, repo, `${remoteTip}..${info.tip}`);
  return ahead > 0 ? `ahead ${ahead}` : 'differs';
}

function statusEntries(exec, dir, extra = []) {
  const result = git(exec, dir, ['status', '--porcelain=v1', '-z', '--no-renames', ...extra]);
  if (!result.ok) return null;
  return result.out.split('\0').filter(Boolean).map((entry) => ({ code: entry.slice(0, 2), file: entry.slice(3) }));
}

export function dirtyState(exec, dir) {
  const entries = statusEntries(exec, dir);
  if (!entries) return { state: 'unreadable', tracked: [], untracked: [] };
  const tracked = entries.filter((item) => item.code !== '??').map((item) => item.file);
  const untracked = entries.filter((item) => item.code === '??').map((item) => item.file);
  const state = tracked.length ? `wip:${tracked.length}` : untracked.length ? `scratch:${untracked.length}` : 'clean';
  return { state, tracked, untracked };
}

export function ignoredTopLevel(exec, dir) {
  const entries = statusEntries(exec, dir, ['--ignored']) ?? [];
  const tops = new Set(entries.filter((item) => item.code === '!!').map((item) => item.file.split('/')[0]));
  return [...tops].sort();
}

export function codexHomeOf(env, homedir) {
  return env.CODEX_HOME || path.join(homedir, '.codex');
}

export function classifyRuntime(worktreePath, { mainPath, codexHome }) {
  if (mainPath && samePath(worktreePath, mainPath)) return 'main';
  if (mainPath && isInside(worktreePath, path.join(mainPath, '.claude', 'worktrees'))) return 'claude-cli';
  const segments = normPath(worktreePath).split('/');
  if (segments.includes('.codex-worktrees')) return 'codex-app';
  if (codexHome && isInside(worktreePath, path.join(codexHome, 'worktrees'))) return 'codex-app';
  if (segments.includes('.claude-worktrees')) return 'claude-desktop';
  return 'plain';
}

// Walk without ever descending into a link: a junction or symlink can reach a
// shared root outside the tree, and following it would count or delete the
// target. Directories that cannot be read are reported, not skipped silently.
export function walkTree(root, visit) {
  const unreadable = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (error) { unreadable.push(`${dir} (${error.code ?? error.message})`); continue; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      let stat;
      try { stat = fs.lstatSync(full); } catch { continue; }
      visit(full, stat);
      if (!stat.isSymbolicLink() && stat.isDirectory()) stack.push(full);
    }
  }
  return { unreadable };
}

export function readLinkTarget(link) {
  let target;
  try { target = fs.readlinkSync(link); } catch { return null; }
  target = target.replace(/^\\\\\?\\/, '');
  return path.resolve(path.dirname(link), target);
}

// Every link entry in the tree, plus the newest entry outside .git by its own
// lstat time, which is the activity signal when process working directories
// cannot be read.
export function findLinks(root) {
  const links = [];
  let newest = null;
  const { unreadable } = walkTree(root, (full, stat) => {
    const relative = toSlash(path.relative(root, full));
    if (relative !== '.git' && !relative.startsWith('.git/') && (!newest || stat.mtimeMs > newest.mtimeMs)) {
      newest = { mtimeMs: stat.mtimeMs, path: relative };
    }
    if (!stat.isSymbolicLink()) return;
    const target = readLinkTarget(full);
    links.push({ path: full, target, inside: target ? isInside(target, root) : false });
  });
  return { links, unreadable, newest };
}

export function treeSize(root) {
  let bytes = 0;
  walkTree(root, (_full, stat) => { if (!stat.isDirectory()) bytes += stat.size; });
  return bytes;
}

// Remove one link entry, non-recursively. On Windows a directory junction or
// directory symlink is removed with rmdir, which deletes the entry and never
// touches the target; everything else is unlinked.
export function removeLinkEntry(link, platform = process.platform) {
  const stat = fs.lstatSync(link);
  if (!stat.isSymbolicLink()) throw new Error(`${link} is no longer a link; left in place`);
  if (platform === 'win32') {
    let isDirectory = null;
    try { isDirectory = fs.statSync(link).isDirectory(); } catch { isDirectory = null; }
    if (isDirectory === false) fs.unlinkSync(link);
    else {
      try { fs.rmdirSync(link); } catch (error) { if (isDirectory) throw error; fs.unlinkSync(link); }
    }
  } else {
    fs.unlinkSync(link);
  }
  let present = true;
  try { fs.lstatSync(link); } catch { present = false; }
  if (present) throw new Error(`${link} is still present after unlinking`);
}

export function topLevelCount(target) {
  try {
    const stat = fs.statSync(target);
    return stat.isDirectory() ? fs.readdirSync(target).length : 1;
  } catch {
    return null;
  }
}

export function listProcesses({ exec, platform = process.platform }) {
  if (platform === 'win32') {
    const command = 'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,CommandLine | ConvertTo-Json -Compress';
    const result = exec('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command]);
    if (result.error || result.status !== 0) return { ok: false, error: firstLine(result.stderr) || result.error?.message || 'process list unreadable', processes: [] };
    try {
      const parsed = JSON.parse(result.stdout);
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      return {
        ok: true,
        cwdReadable: false,
        processes: rows.map((row) => ({ pid: row.ProcessId, ppid: row.ParentProcessId, command: row.CommandLine ?? '' })),
      };
    } catch (error) {
      return { ok: false, error: `process list unreadable (${error.message})`, processes: [] };
    }
  }
  const result = exec('ps', ['-A', '-o', 'pid=,ppid=,args=']);
  if (result.error || result.status !== 0) return { ok: false, error: firstLine(result.stderr) || result.error?.message || 'ps failed', processes: [] };
  const processes = [];
  for (const line of result.stdout.split('\n')) {
    const match = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line);
    if (!match) continue;
    const pid = Number(match[1]);
    let cwd = null;
    if (platform === 'linux') { try { cwd = fs.readlinkSync(`/proc/${pid}/cwd`); } catch { cwd = null; } }
    processes.push({ pid, ppid: Number(match[2]), command: match[3], cwd });
  }
  return { ok: true, cwdReadable: platform === 'linux', processes };
}

export function ancestorsOf(processes, pid) {
  const parent = new Map(processes.map((item) => [item.pid, item.ppid]));
  const chain = new Set([pid]);
  for (let at = parent.get(pid); at && !chain.has(at); at = parent.get(at)) chain.add(at);
  return chain;
}

export function newestTranscript({ exec, homedir, target }) {
  const roots = [path.join(homedir, '.claude', 'projects'), path.join(homedir, '.codex', 'sessions')].filter((root) => fs.existsSync(root));
  if (roots.length === 0) return null;
  const patterns = pathSpellings(target).flatMap((spelling) => ['/', '\\', '"'].map((end) => spelling + end));
  const args = ['-l', '-F', '--no-ignore', '--hidden', ...(isDrivePath(target) ? ['-i'] : []), ...patterns.flatMap((pattern) => ['-e', pattern]), ...roots];
  const result = exec('rg', args);
  if (result.error) return 'unknown';
  if (result.status === 1) return null;
  if (result.status !== 0) return 'unknown';
  let newest = null;
  for (const file of result.stdout.split(/\r?\n/).filter(Boolean)) {
    let mtime;
    try { mtime = fs.statSync(file).mtimeMs; } catch { continue; }
    if (!newest || mtime > newest.mtime) newest = { file, mtime };
  }
  return newest ? { file: newest.file, modified: new Date(newest.mtime).toISOString() } : null;
}

export function freeBytes(target) {
  for (let at = path.resolve(target); ; at = path.dirname(at)) {
    try {
      const stat = fs.statfsSync(at);
      return stat.bavail * stat.bsize;
    } catch {
      if (path.dirname(at) === at) return null;
    }
  }
}

export function isMainScript(metaUrl, fileURLToPath) {
  const invoked = process.argv[1];
  if (!invoked || !fs.existsSync(invoked)) return false;
  return fs.realpathSync(invoked) === fs.realpathSync(fileURLToPath(metaUrl));
}
