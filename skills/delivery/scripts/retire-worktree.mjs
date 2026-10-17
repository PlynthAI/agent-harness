#!/usr/bin/env node
// Guarded retirement of merged worktrees and leftover branches. The default is
// a plan that changes nothing; --apply acts. There is no force and no flag to
// skip a check: a refusal is the correct result for anything not proven merged,
// clean, released by its runtime and unused.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  UNAVAILABLE, ancestorsOf, baseHistory, classifyRuntime, codexHomeOf, defaultBase, dirtyState, findLinks, firstLine,
  freeBytes, git, ignoredTopLevel, isInside, isMainScript, listWorktrees, mentionsPath,
  mergedProof, readPullRequests, refExists, removeLinkEntry, resolveDeps, resolveRepo, samePath, toSlash, topLevelCount,
} from './worktree-facts.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

const USAGE = 'usage: retire-worktree.mjs [<worktree-path>...] [--branch <name>...] [--repo <path>] [--base <branch>] [--remote <name>] [--released "<evidence>"] [--apply] [--json]\n';

// Each runtime's own retirement route, from the worktree-retirement reference.
const ROUTES = {
  'codex-app': 'archive it from its owning Codex chat (app archive_worktree)',
  'claude-desktop': 'archive the owning session in the Claude desktop app, which removes its worktree',
  'claude-cli': 'exit the owning Claude Code session with ExitWorktree remove',
};

const short = (sha) => (sha ? sha.slice(0, 7) : '(none)');

// Writes this recent mean someone may still be working in the folder.
const ACTIVITY_WINDOW_MS = 15 * 60 * 1000;

// Where a path resolves and which of its parent folders are links. Compared
// before each delete, so a folder swapped for a link after the checks is seen.
function pathIdentity(target) {
  const realOf = (p) => { try { return fs.realpathSync.native(p); } catch { return null; } };
  const entryOf = (p) => { try { const stat = fs.lstatSync(p, { bigint: true }); return `${stat.dev}:${stat.ino}`; } catch { return null; } };
  const linked = [];
  const ancestors = [];
  let dir = path.dirname(path.resolve(target));
  for (;;) {
    ancestors.push(`${toSlash(dir)}:${entryOf(dir)}`);
    let isLink = null;
    try { isLink = fs.lstatSync(dir).isSymbolicLink(); } catch { isLink = null; }
    if (isLink !== false) linked.push(`${toSlash(dir)}${isLink ? '' : ' (missing)'}`);
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return { real: realOf(target), entry: entryOf(target), parentReal: realOf(path.dirname(path.resolve(target))), linked: linked.join(', '), ancestors: ancestors.join(', ') };
}

function identityChange(start, now, { self = true } = {}) {
  const differs = (a, b) => !(a && b && samePath(a, b));
  if (self && differs(start.real, now.real)) return `it resolved to ${start.real} at the start and to ${now.real ?? 'nothing'} now`;
  if (self && start.entry !== now.entry) return 'the folder entry was replaced since the checks';
  if (differs(start.parentReal, now.parentReal)) return `its parent resolved to ${start.parentReal} at the start and to ${now.parentReal ?? 'nothing'} now`;
  if (start.linked !== now.linked) return `links among its parent folders were [${start.linked || 'none'}] at the start and are [${now.linked || 'none'}] now`;
  if (start.ancestors !== now.ancestors) return 'an ancestor folder entry was replaced since the checks';
  return null;
}

function linkIdentity(link) {
  const stat = fs.lstatSync(link);
  if (!stat.isSymbolicLink()) throw new Error(`${link} is no longer a link`);
  return JSON.stringify([stat.dev, stat.ino, stat.ctimeMs, fs.readlinkSync(link, { encoding: 'buffer' }).toString('base64'), pathIdentity(path.dirname(link))]);
}

function parseArgs(argv) {
  const options = { paths: [], branches: [], repo: null, base: null, remote: 'origin', released: null, apply: false, json: false };
  const value = (index, flag) => {
    const next = argv[index + 1];
    if (next === undefined || next.startsWith('--') || next.trim() === '') throw new Error(`${flag} needs a value`);
    return next;
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--branch') { options.branches.push(value(index, token)); index += 1; }
    else if (token === '--repo') { options.repo = value(index, token); index += 1; }
    else if (token === '--base') { options.base = value(index, token); index += 1; }
    else if (token === '--remote') { options.remote = value(index, token); index += 1; }
    else if (token === '--released') { options.released = value(index, token); index += 1; }
    else if (token === '--apply') options.apply = true;
    else if (token === '--json') options.json = true;
    else if (token === '--help' || token === '-h') options.help = true;
    else if (token.startsWith('-')) throw new Error(`unknown argument ${token}`);
    else options.paths.push(token);
  }
  if (!options.help && options.paths.length === 0 && options.branches.length === 0) throw new Error('name at least one worktree path or --branch');
  return options;
}

function newTarget(kind, target) {
  return {
    kind, target, path: null, runtime: null, branch: null, tip: null, proof: null,
    status: null, reason: null, checks: [], ignored: [], lookFirst: [],
    links: { found: 0, unlinked: 0, outside: [] }, actions: [], freeBytes: { before: null, after: null },
  };
}

function recorder(ctx, t) {
  return {
    pass: (check, detail) => { t.checks.push({ check, ok: true, detail }); },
    refuse: (check, reason) => { t.checks.push({ check, ok: false, detail: reason }); t.status = 'refused'; t.reason = reason; return t; },
    fail: (step, reason) => { t.actions.push({ action: step, done: false, detail: reason }); t.status = 'failed'; t.reason = reason; return t; },
    act: (action, detail, done = ctx.apply) => { t.actions.push({ action, done, detail }); },
  };
}

function listChanges(dirty) {
  const items = [...dirty.tracked.map((file) => `changed ${file}`), ...dirty.untracked.map((file) => `untracked ${file}`)];
  return items.length > 20 ? `${items.slice(0, 20).join(', ')} and ${items.length - 20} more` : items.join(', ');
}

function remotePlan(ctx, t) {
  const remoteRef = `${ctx.remote}/${t.branch}`;
  const remoteTip = refExists(ctx.exec, ctx.main, `refs/remotes/${remoteRef}`);
  if (!remoteTip) return { kind: 'gone', detail: `${remoteRef} is already gone` };
  if (remoteTip !== t.tip) return { kind: 'left', detail: `left ${remoteRef}: it is at ${short(remoteTip)}, not the proven tip ${short(t.tip)}` };
  return { kind: 'delete', detail: `git push --force-with-lease=refs/heads/${t.branch}:${short(t.tip)} ${ctx.remote} :refs/heads/${t.branch} (${remoteRef} is at the proven tip; the lease keeps it if it moves first)` };
}

function localPlan(ctx, t) {
  const command = `git update-ref -d refs/heads/${t.branch} ${short(t.tip)}, which deletes it only while it points at the proven tip`;
  if (t.proof.proof === 'squash') return `${command}: squash proof via PR #${t.proof.pr}, whose commits are not ancestors of ${ctx.baseRef}`;
  return `${command}: the tip is on ${ctx.baseRef}`;
}

function planBranchActions(ctx, t, r) {
  if (!t.branch) return;
  r.act('local branch', localPlan(ctx, t), false);
  const remote = remotePlan(ctx, t);
  r.act('remote branch', remote.detail, false);
}

// Steps 10 and 11: the local branch, then its remote, each only at the proven tip.
function retireBranches(ctx, t, r) {
  const users = listWorktrees(ctx.exec, ctx.main).items.filter((item) => item.branch === t.branch);
  if (users.length) return r.refuse('local branch', `${t.branch} is checked out in ${users.map((item) => item.path).join(', ')}`);
  const moved = (where, tip) => `${where} left in place: moved to ${short(tip)} after the proof at ${short(t.tip)}`;
  const current = refExists(ctx.exec, ctx.main, `refs/heads/${t.branch}`);
  if (!current) r.act('local branch', `local branch ${t.branch} is already gone`);
  else if (current !== t.tip) return r.refuse('local branch', moved(t.branch, current));
  else {
    // One compare-and-delete: git removes the ref only while it still points at
    // the proven tip, so a commit landing after the proof is never lost.
    const deleted = git(ctx.exec, ctx.main, ['update-ref', '-d', `refs/heads/${t.branch}`, t.tip]);
    if (!deleted.ok) {
      const now = refExists(ctx.exec, ctx.main, `refs/heads/${t.branch}`);
      if (now && now !== t.tip) return r.refuse('local branch', moved(t.branch, now));
      return r.fail('local branch', `git update-ref -d refs/heads/${t.branch} failed: ${firstLine(deleted.err)}`);
    }
    // update-ref leaves the branch's tracking configuration; a missing section is fine.
    git(ctx.exec, ctx.main, ['config', '--remove-section', `branch.${t.branch}`]);
    r.act('local branch', t.proof.proof === 'squash'
      ? `deleted local branch ${t.branch} at the proven tip ${short(t.tip)}: squash proof via PR #${t.proof.pr}`
      : `deleted local branch ${t.branch} at the proven tip ${short(t.tip)}, which is on ${ctx.baseRef}`);
  }
  const remote = remotePlan(ctx, t);
  if (remote.kind === 'delete') {
    // The lease makes the remote delete conditional on the proven tip too.
    const pushed = git(ctx.exec, ctx.main, ['push', '--quiet', `--force-with-lease=refs/heads/${t.branch}:${t.tip}`, ctx.remote, `:refs/heads/${t.branch}`]);
    if (!pushed.ok) {
      const seen = git(ctx.exec, ctx.main, ['ls-remote', ctx.remote, `refs/heads/${t.branch}`]);
      const now = seen.ok ? seen.out.split(/\s+/)[0] : '';
      if (now && now !== t.tip) return r.refuse('remote branch', moved(`${ctx.remote}/${t.branch}`, now));
      return r.fail('remote branch', `git push --force-with-lease ${ctx.remote} :refs/heads/${t.branch} failed: ${firstLine(pushed.err)}`);
    }
    r.act('remote branch', `deleted ${ctx.remote}/${t.branch} at the proven tip ${short(t.tip)}`);
  } else {
    r.act('remote branch', remote.detail, false);
  }
  return t;
}

function retireWorktree(ctx, given) {
  const t = newTarget('worktree', given);
  const r = recorder(ctx, t);

  // 1. An exact registered worktree, never the main checkout, a locked one or
  // the one this process runs in.
  const absolute = path.resolve(ctx.cwd, given);
  let real = null;
  try { real = fs.realpathSync.native(absolute); } catch { real = null; }
  const listed = listWorktrees(ctx.exec, ctx.main).items;
  const index = listed.findIndex((item) => samePath(item.path, absolute) || (real && samePath(item.path, real)));
  if (index === -1) return r.refuse('registered', `${given} is not a registered worktree of ${ctx.main}`);
  const item = listed[index];
  Object.assign(t, { path: item.path, branch: item.branch, tip: item.head });
  if (index === 0) return r.refuse('registered', `${item.path} is the main checkout`);
  if (item.locked) return r.refuse('registered', `the worktree is locked${item.lockReason ? ` (${item.lockReason})` : ''}; its owner must unlock it`);
  if (item.prunable) return r.refuse('registered', 'the folder is missing and the registration is stale; inspect it with git worktree prune --dry-run --verbose');
  if (isInside(ctx.cwd, item.path)) return r.refuse('registered', `this process's working directory ${ctx.cwd} is inside the worktree; run from outside it`);
  if (item.branch && item.branch === ctx.base) return r.refuse('registered', `it has the base branch ${ctx.base} checked out`);
  // A checkout nested in an ignored folder would be deleted along with this one.
  const nested = listed.filter((entry) => entry !== item && !samePath(entry.path, item.path) && isInside(entry.path, item.path));
  if (nested.length) return r.refuse('registered', `it contains another registered worktree: ${nested.map((entry) => entry.path).join(', ')}`);
  try {
    if (fs.lstatSync(item.path).isSymbolicLink()) return r.refuse('registered', 'the worktree path is itself a link; retire it by hand');
  } catch { /* prunable is handled above */ }
  const identity = pathIdentity(item.path);
  r.pass('registered', `registered worktree on ${item.branch ?? 'a detached head'} at ${short(item.head)}`);

  // 2. A runtime that owns the folder retires it through its own route.
  t.runtime = classifyRuntime(item.path, { mainPath: ctx.main, codexHome: ctx.codexHome });
  if (ROUTES[t.runtime]) {
    if (!ctx.released) {
      return r.refuse('runtime', `${t.runtime} worktree: ${ROUTES[t.runtime]}. Use this Git route only once the owning session is archived or gone, and say so with --released "<evidence>"`);
    }
    r.pass('runtime', `${t.runtime} worktree released by the caller: ${ctx.released}`);
  } else {
    r.pass('runtime', 'plain worktree; no runtime owns it');
  }

  // 3. Merged proof against the freshly fetched base.
  t.proof = mergedProof({ exec: ctx.exec, repo: ctx.main, tip: item.head, branch: item.branch, baseRef: ctx.baseRef, prs: ctx.prs, onBase: ctx.onBase });
  if (t.proof.proof === 'none') return r.refuse('merged', `not proven merged: ${t.proof.reason}`);
  r.pass('merged', `${t.proof.proof}: ${t.proof.reason}`);

  // 4. Clean, tracked and untracked; ignored content goes with the folder.
  const dirty = dirtyState(ctx.exec, item.path);
  if (dirty.state === 'unreadable') return r.refuse('clean', 'git status could not be read in the worktree');
  if (dirty.state !== 'clean') return r.refuse('clean', `not clean: ${listChanges(dirty)}`);
  t.ignored = ignoredTopLevel(ctx.exec, item.path);
  t.lookFirst = t.ignored.filter((entry) => entry === '.state' || entry.startsWith('.env'));
  r.pass('clean', t.ignored.length ? `no changes; ignored entries go with the worktree: ${t.ignored.join(', ')}` : 'no changes and nothing ignored');

  const scan = findLinks(item.path);
  if (scan.unreadable.length) return r.refuse('links', `cannot read ${scan.unreadable.join(', ')}, so links inside cannot be ruled out`);
  t.links.found = scan.links.length;
  t.links.outside = scan.links.filter((link) => !link.inside).map((link) => ({ path: link.path, target: link.target }));
  const inspectedLinks = new Map();
  const inspectedParents = new Map();
  const trackedLinks = new Map();
  if (scan.links.length) {
    const files = git(ctx.exec, item.path, ['ls-files', '--stage', '-z']);
    if (!files.ok) return r.refuse('links', `git ls-files could not be read (${firstLine(files.err)}), so tracked links cannot be ruled out`);
    const tracked = new Map();
    for (const entry of files.out.split('\0').filter(Boolean)) {
      const match = /^(\d{6}) ([a-f0-9]+) (\d)\t([\s\S]+)$/.exec(entry);
      if (!match) return r.refuse('links', 'git index entries could not be read; nothing removed');
      tracked.set(match[4], { mode: match[1], oid: match[2], stage: match[3] });
    }
    for (const link of scan.links) {
      try { inspectedLinks.set(link.path, linkIdentity(link.path)); } catch (error) { return r.refuse('links', `cannot inspect ${link.path}: ${error.message}`); }
      const parent = path.dirname(link.path);
      inspectedParents.set(parent, pathIdentity(parent));
      const relative = path.relative(item.path, link.path).split(path.sep).join('/');
      const entry = tracked.get(relative);
      if (!entry) continue;
      if (entry.mode !== '120000' || entry.stage !== '0') return r.refuse('links', `${link.path} is tracked without a stage-0 symlink blob; nothing removed`);
      if (path.basename(link.path).toLowerCase() === '.gitattributes') {
        return r.refuse('links', `${relative} is a tracked .gitattributes link; materialization would change Git conversion rules; nothing removed`);
      }
      // The text helper trims output; a link blob must retain its exact bytes.
      const blob = ctx.exec('git', ['cat-file', 'blob', entry.oid], { cwd: item.path, encoding: null });
      if (blob.status !== 0 || !Buffer.isBuffer(blob.stdout)) return r.refuse('links', `cannot read the exact link blob for ${link.path}: ${firstLine(blob.stderr)}`);
      let actual;
      try { actual = fs.readlinkSync(link.path, { encoding: 'buffer' }); }
      catch (error) { return r.refuse('links', `cannot inspect ${link.path}; the entry changed or is unreadable: ${error.message}; nothing removed`); }
      const linkBytes = (bytes) => ctx.platform === 'win32' ? Buffer.from(bytes).map((byte) => byte === 0x5c ? 0x2f : byte) : bytes;
      if (!linkBytes(actual).equals(linkBytes(blob.stdout))) return r.refuse('links', `${link.path} does not match its indexed link target; local work preserved`);
      // Query attributes without invoking external clean/process drivers.
      const attrs = ctx.exec('git', ['check-attr', '-z', '--stdin', 'filter'], { cwd: item.path, input: `${relative}\0`, encoding: 'utf8' });
      const fields = String(attrs.stdout ?? '').split('\0');
      if (attrs.status !== 0 || fields.length !== 4 || fields[0] !== relative || fields[1] !== 'filter' || fields[3] !== '') {
        return r.refuse('links', `cannot read Git conversion attributes for ${relative}; nothing removed`);
      }
      if (!['unspecified', 'unset', 'set'].includes(fields[2])) {
        return r.refuse('links', `${relative} uses filter ${fields[2]}; external filters are not run for link preparation; nothing removed`);
      }
      // check-attr uses these words for both special values and literal driver
      // names. A configured driver under an ambiguous name must stay unrun.
      for (const command of ['clean', 'process']) {
        const driver = git(ctx.exec, item.path, ['config', '--get', `filter.${fields[2]}.${command}`]);
        if (driver.status === 0) return r.refuse('links', `${relative} may use configured filter ${fields[2]}; external filters are not run for link preparation; nothing removed`);
        if (driver.status !== 1) return r.refuse('links', `cannot read Git filter configuration for ${relative}; nothing removed`);
      }
      const converted = ctx.exec('git', ['-c', 'core.symlinks=false', 'hash-object', '--stdin', `--path=${relative}`], { cwd: item.path, input: blob.stdout, encoding: 'utf8' });
      if (converted.status !== 0 || String(converted.stdout ?? '').trim() !== entry.oid) {
        return r.refuse('links', `Git conversion would change the ordinary-file representation of ${relative}; nothing removed${converted.status !== 0 ? `: ${firstLine(converted.stderr)}` : ''}`);
      }
      trackedLinks.set(link.path, blob.stdout);
    }
  }

  // 5. Liveness: a process naming the folder holds it.
  const processes = ctx.processes();
  if (!processes.ok) {
    if (!ctx.released) return r.refuse('liveness', `liveness check is incomplete: the process list could not be read (${processes.error}); rerun with --released "<evidence>" once the owner confirms nothing uses it`);
    r.pass('liveness', `process list unreadable (${processes.error}); relying on --released`);
  } else {
    const excluded = ancestorsOf(processes.processes, ctx.pid);
    const live = processes.processes.filter((proc) => !excluded.has(proc.pid)
      && (mentionsPath(proc.command, item.path) || (proc.cwd && isInside(proc.cwd, item.path))));
    if (live.length) {
      return r.refuse('liveness', `live process uses it: ${live.map((proc) => `pid ${proc.pid} ${String(proc.command).slice(0, 160)}`).join('; ')}`);
    }
    if (processes.cwdReadable) r.pass('liveness', 'no process names it or works inside it');
    else if (ctx.released) r.pass('liveness', `no process command line names it; process working directories are not readable on this platform, so relying on --released`);
    else {
      // A shell or editor sitting in the folder is invisible here, so recent
      // writes inside it stand in for a working-directory check.
      const newest = scan.newest;
      const when = newest ? new Date(newest.mtimeMs).toISOString() : null;
      if (newest && ctx.now() - newest.mtimeMs < ACTIVITY_WINDOW_MS) {
        return r.refuse('liveness', `recent activity at ${when} (${newest.path}) and process working directories are not readable on this platform; rerun with --released "<evidence>" once the owner confirms nothing uses it`);
      }
      r.pass('liveness', `no process command line names it; process working directories are not readable on this platform, and ${newest ? `the newest change was at ${when} (${newest.path}), older than 15 minutes` : 'it holds no entries outside .git'}`);
    }
  }
  t.freeBytes.before = freeBytes(item.path);

  if (!ctx.apply) {
    const outside = t.links.outside.map((link) => link.target);
    const linkCount = `${t.links.found} link entr${t.links.found === 1 ? 'y' : 'ies'} (${t.links.found - outside.length} pointing inside the worktree, ${outside.length} outside)`;
    r.act('unlink', t.links.found ? `unlink ${linkCount} first${trackedLinks.size ? `; materialize ${trackedLinks.size} tracked link blobs as regular files` : ''}${outside.length ? `; outside targets kept: ${outside.join(', ')}` : ''}` : 'no links inside', false);
    r.act('remove', `git worktree remove ${item.path} (run from ${ctx.main})`, false);
    planBranchActions(ctx, t, r);
    t.status = 'retireable';
    return t;
  }

  // 6. Recheck immediately before acting.
  const now = listWorktrees(ctx.exec, ctx.main).items.find((entry) => samePath(entry.path, item.path));
  if (!now) return r.refuse('recheck', 'the registration changed: the worktree is no longer registered');
  if (now.locked) return r.refuse('recheck', 'the registration changed: the worktree is now locked');
  if (now.head !== item.head || now.branch !== item.branch) return r.refuse('recheck', `the tip changed from ${short(item.head)} to ${short(now.head)} since the checks`);
  if (dirtyState(ctx.exec, item.path).state !== 'clean') return r.refuse('recheck', 'the worktree changed: it is no longer clean');
  const changed = identityChange(identity, pathIdentity(item.path));
  if (changed) return r.refuse('recheck', `the path now resolves elsewhere: ${changed}; nothing removed`);

  // 7. Unlink every link entry before anything recursive can run.
  const links = findLinks(item.path);
  if (links.unreadable.length) return r.fail('unlink', `cannot read ${links.unreadable.join(', ')}; nothing removed`);
  try {
    if (links.links.length !== inspectedLinks.size || links.links.some((link) => inspectedLinks.get(link.path) !== linkIdentity(link.path))) {
      return r.refuse('recheck', 'link entries changed since inspection; nothing removed');
    }
  } catch (error) { return r.refuse('recheck', `link entries changed since inspection: ${error.message}; nothing removed`); }
  const outside = links.links.filter((link) => !link.inside).map((link) => ({ path: link.path, target: link.target, before: topLevelCount(link.target), after: null }));
  for (const link of links.links) {
    try {
      const changed = identityChange(identity, pathIdentity(item.path));
      if (changed) throw new Error(`the path now resolves elsewhere: ${changed}`);
      if (inspectedLinks.get(link.path) !== linkIdentity(link.path)) throw new Error('the link entry changed since inspection');
      const parent = path.dirname(link.path);
      const expected = inspectedParents.get(parent);
      const cwd = process.cwd();
      try {
        // Relative preparation stays in this directory if its old path moves.
        // Windows locks the current directory against movement while bound.
        process.chdir(parent);
        const bound = fs.statSync('.', { bigint: true });
        if (!bound.isDirectory() || `${bound.dev}:${bound.ino}` !== expected.entry || identityChange(expected, pathIdentity(parent))) {
          throw new Error('the link parent changed since inspection');
        }
        const name = path.basename(link.path);
        if (inspectedLinks.get(link.path) !== linkIdentity(name)) throw new Error('the bound link entry changed since inspection');
        removeLinkEntry(name, ctx.platform);
        t.links.unlinked += 1;
        // Exact Git blob representation; a concurrent final entry is preserved.
        if (trackedLinks.has(link.path)) fs.writeFileSync(name, trackedLinks.get(link.path), { flag: 'wx' });
      } finally {
        process.chdir(cwd);
      }
      const parentChanged = identityChange(expected, pathIdentity(parent));
      if (parentChanged) throw new Error(`the link parent changed: ${parentChanged}`);
    } catch (error) { return r.fail('unlink', `could not prepare ${link.path}: ${error.message}; stopped before removal`); }
  }
  for (const entry of outside) {
    entry.after = topLevelCount(entry.target);
    if (entry.after !== entry.before) {
      t.links.outside = outside;
      return r.fail('unlink', `LINK TARGET CHANGED: ${entry.target} had ${entry.before} top-level entries before unlinking and ${entry.after} after; stopped`);
    }
  }
  t.links.outside = outside;
  for (const [parent, expected] of inspectedParents) {
    const changed = identityChange(expected, pathIdentity(parent));
    if (changed) return r.fail('unlink', `the link parent changed: ${changed}; stopped before removal`);
  }
  const removeExec = trackedLinks.size
    ? (file, args, options) => ctx.exec(file, ['-c', 'core.symlinks=false', ...args], options)
    : ctx.exec;
  if (dirtyState(removeExec, item.path).state !== 'clean') return r.fail('unlink', 'the worktree is no longer clean after unlinking; stopped before removal');
  const beforeRemoval = identityChange(identity, pathIdentity(item.path));
  if (beforeRemoval) return r.fail('unlink', `the path now resolves elsewhere: ${beforeRemoval}; stopped before removal`);
  const remaining = findLinks(item.path);
  if (remaining.links.length || remaining.unreadable.length) return r.fail('unlink', `links remain after unlinking: ${remaining.links.map((link) => link.path).join(', ')}; stopped`);
  r.act('unlink', t.links.unlinked ? `unlinked ${t.links.unlinked} link entr${t.links.unlinked === 1 ? 'y' : 'ies'}${trackedLinks.size ? `; ${trackedLinks.size} exact tracked blobs are ordinary files` : ''}${outside.length ? `; outside targets intact: ${outside.map((entry) => entry.target).join(', ')}` : ''}` : 'no links inside');

  // 8. Normal git removal, from the main checkout, never forced.
  const removed = git(removeExec, ctx.main, ['worktree', 'remove', item.path]);
  if (!removed.ok) {
    const left = fs.existsSync(item.path) ? `; the folder ${item.path} is left in place` : '';
    return r.fail('remove', `git worktree remove failed: ${firstLine(removed.err)}${left}`);
  }
  r.act('remove', `git worktree remove ${item.path}`);

  // 9. Residue: once unregistered and link-free, what is left is ignored files.
  const stillRegistered = () => listWorktrees(ctx.exec, ctx.main).items.some((entry) => samePath(entry.path, item.path));
  if (fs.existsSync(item.path)) {
    if (stillRegistered()) return r.fail('residue', `${item.path} still exists and is still registered`);
    const changed = identityChange(identity, pathIdentity(item.path));
    if (changed) return r.fail('residue', `the path now resolves elsewhere: ${changed}; left in place`);
    const residueLinks = findLinks(item.path);
    if (residueLinks.links.length || residueLinks.unreadable.length) return r.fail('residue', `${item.path} still holds links or unreadable folders; left in place`);
    try { fs.rmSync(item.path, { recursive: true, maxRetries: 3 }); } catch (error) { return r.fail('residue', `could not remove residue ${item.path}: ${error.message}`); }
    r.act('residue', `removed residue left in ${item.path}`);
  }
  const parent = path.dirname(item.path);
  const parentChanged = identityChange(identity, pathIdentity(item.path), { self: false });
  if (parentChanged) return r.fail('residue', `the path now resolves elsewhere: ${parentChanged}; the parent folder is left in place`);
  try {
    if (!samePath(parent, ctx.main) && fs.readdirSync(parent).length === 0) {
      fs.rmdirSync(parent);
      r.act('residue', `removed the empty parent folder ${parent}`);
    }
  } catch { /* a parent that is not empty or not ours stays */ }
  if (fs.existsSync(item.path) || stillRegistered()) return r.fail('verify', `${item.path} or its registration is still present`);
  r.act('verify', 'folder and registration are gone');

  if (t.branch) {
    retireBranches(ctx, t, r);
    if (t.status) { t.freeBytes.after = freeBytes(item.path); return t; }
  }
  t.freeBytes.after = freeBytes(item.path);
  t.status = 'retired';
  return t;
}

function retireBranch(ctx, name) {
  const t = newTarget('branch', name);
  const r = recorder(ctx, t);
  t.branch = name;
  if (name === ctx.base) return r.refuse('branch', `${name} is the base branch`);
  t.tip = refExists(ctx.exec, ctx.main, `refs/heads/${name}`);
  if (!t.tip) return r.refuse('branch', `there is no local branch ${name}`);
  const users = listWorktrees(ctx.exec, ctx.main).items.filter((item) => item.branch === name);
  if (users.length) return r.refuse('branch', `${name} is checked out in ${users.map((item) => item.path).join(', ')}; retire that worktree instead`);
  r.pass('branch', `local branch at ${short(t.tip)} with no worktree`);
  t.proof = mergedProof({ exec: ctx.exec, repo: ctx.main, tip: t.tip, branch: name, baseRef: ctx.baseRef, prs: ctx.prs, onBase: ctx.onBase });
  if (t.proof.proof === 'none') return r.refuse('merged', `not proven merged: ${t.proof.reason}`);
  r.pass('merged', `${t.proof.proof}: ${t.proof.reason}`);
  if (!ctx.apply) {
    planBranchActions(ctx, t, r);
    t.status = 'retireable';
    return t;
  }
  retireBranches(ctx, t, r);
  if (!t.status) t.status = 'retired';
  return t;
}

function defaultPruneIndexes(exec) {
  return () => {
    const script = path.join(here, '..', '..', 'orchestrate-work', 'scripts', 'codebase-memory', 'cbm.ps1');
    if (!fs.existsSync(script)) return { ran: false, ok: true, output: `${script} not found; no indexes to release` };
    const result = exec('pwsh', ['-NoProfile', '-File', script, 'prune', '-Apply']);
    if (result.error) return { ran: false, ok: false, output: `pwsh is not available: ${result.error.message}` };
    return { ran: true, ok: result.status === 0, output: `${result.stdout}${result.stderr}`.trim() };
  };
}

function releaseIndexes(prune) {
  try {
    return prune();
  } catch (error) {
    return { ran: true, ok: false, output: error.message };
  }
}

function humanBytes(bytes) {
  if (bytes == null) return 'unknown';
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export function renderText(report) {
  const out = [];
  out.push(report.mode === 'plan' ? 'Plan only: nothing has been changed. Rerun with --apply to retire.' : 'Applied.');
  out.push(`Repository ${report.repo}`, `Base ${report.remote}/${report.base} (fetched now)`);
  if (report.released) out.push(`Released by the caller: ${report.released}`);
  for (const note of report.notes) out.push(`Note: ${note}`);
  for (const t of report.targets) {
    out.push('');
    out.push(t.kind === 'branch' ? `Branch ${t.target}` : `Worktree ${t.path ?? t.target}${t.runtime ? `  [${t.runtime}]` : ''}`);
    if (t.kind === 'worktree' && t.tip) out.push(`  ${t.branch ?? 'detached'} at ${short(t.tip)}`);
    for (const check of t.checks) out.push(`  ${check.ok ? 'ok     ' : 'REFUSED'}  ${check.check}: ${check.detail}`);
    for (const action of t.actions) {
      const label = report.mode === 'plan' ? 'would  ' : action.done ? 'done   ' : t.status === 'failed' && action.detail === t.reason ? 'FAILED ' : 'note   ';
      out.push(`  ${label}  ${action.detail}`);
    }
    if (t.lookFirst.length) out.push(`  look first: ${t.lookFirst.join(', ')} (ignored, goes with the worktree)`);
    if (t.freeBytes.before != null) out.push(`  free space: ${humanBytes(t.freeBytes.before)}${t.freeBytes.after != null ? ` before, ${humanBytes(t.freeBytes.after)} after` : ''}`);
    out.push(`  => ${t.status}${t.reason && t.status !== 'retired' && t.status !== 'retireable' ? `: ${t.reason}` : ''}`);
  }
  out.push('', `Main checkout: ${report.mainCheckout.detail}`);
  out.push(`Code indexes: ${report.indexes.ok === false ? 'release FAILED (not fatal): ' : ''}${report.indexes.output || (report.indexes.ran ? 'released' : 'not run')}`);
  const counts = {};
  for (const t of report.targets) counts[t.status] = (counts[t.status] ?? 0) + 1;
  out.push(`Result: ${Object.entries(counts).map(([status, count]) => `${count} ${status}`).join(', ')}`);
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

  // Without --repo, the first named worktree identifies its repository, so the
  // tool can run from outside every candidate.
  const firstPath = options.paths[0] && path.resolve(d.cwd, options.paths[0]);
  const start = options.repo ? path.resolve(d.cwd, options.repo) : firstPath && fs.existsSync(firstPath) ? firstPath : d.cwd;
  const repo = resolveRepo(d.exec, start);
  if (!repo.ok) { d.stderr(`${repo.error}\n`); return 1; }
  const listed = listWorktrees(d.exec, repo.path);
  if (!listed.ok || !listed.items.length) { d.stderr(`could not list worktrees: ${listed.error}\n`); return 1; }
  const main = listed.items[0].path;

  const fetched = git(d.exec, main, ['fetch', '--prune', '--quiet', options.remote]);
  if (!fetched.ok) { d.stderr(`could not fetch ${options.remote} (${firstLine(fetched.err)}); merged proof needs a fresh ${options.remote} branch, so nothing was checked\n`); return 1; }
  const base = options.base ?? defaultBase(d.exec, main, options.remote);
  const baseRef = `${options.remote}/${base}`;
  if (!refExists(d.exec, main, `refs/remotes/${baseRef}`)) { d.stderr(`${baseRef} not found; pass --remote and --base for this repository\n`); return 1; }

  const notes = [];
  const pullRequests = readPullRequests(d.exec, main);
  if (!pullRequests.ok) notes.push(`${UNAVAILABLE} (${pullRequests.error}): only ancestry can prove a merge`);

  let processCache = null;
  const ctx = {
    exec: d.exec, cwd: d.cwd, pid: d.pid, platform: d.platform, now: d.now, apply: options.apply, released: options.released,
    main, remote: options.remote, base, baseRef, prs: pullRequests.ok ? pullRequests.prs : null,
    codexHome: codexHomeOf(d.env, d.homedir),
    onBase: baseHistory(d.exec, main, baseRef),
    processes: () => { processCache ??= d.listProcesses(); return processCache; },
  };

  const targets = [];
  for (const given of options.paths) targets.push(retireWorktree(ctx, given));
  for (const name of options.branches) targets.push(retireBranch(ctx, name));

  const removedAny = targets.some((t) => t.kind === 'worktree' && t.actions.some((action) => action.action === 'remove' && action.done));
  const indexes = !options.apply
    ? { ran: false, ok: true, output: 'would release code indexes with cbm prune -Apply' }
    : removedAny ? releaseIndexes(d.pruneIndexes ?? defaultPruneIndexes(d.exec)) : { ran: false, ok: true, output: 'no worktree removed; nothing to release' };

  const goal = options.apply ? 'retired' : 'retireable';
  const report = {
    mode: options.apply ? 'apply' : 'plan',
    repo: main,
    remote: options.remote,
    base,
    released: options.released,
    notes,
    ok: targets.every((t) => t.status === goal),
    targets,
    mainCheckout: {
      action: 'left',
      detail: 'canonical checkout is unchanged; its owner controls base updates',
    },
    indexes,
  };
  d.stdout(options.json ? `${JSON.stringify(report, null, 2)}\n` : renderText(report));
  return report.ok ? 0 : 1;
}

if (isMainScript(import.meta.url, fileURLToPath)) {
  process.exitCode = await run(process.argv.slice(2));
}
