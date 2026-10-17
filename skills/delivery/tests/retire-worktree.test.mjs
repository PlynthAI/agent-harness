import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { run } from '../scripts/retire-worktree.mjs';

const isWin = process.platform === 'win32';
const tempBase = fs.realpathSync.native(os.tmpdir());
const PREFIX = 'retire-worktree-';

function git(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed in ${cwd}: ${result.stderr}`);
  return result.stdout.trim();
}

const gitOk = (cwd, ...args) => spawnSync('git', args, { cwd, encoding: 'utf8' }).status === 0;

// Remove only a directory this file created with mkdtemp, unlinking every link
// entry first so a recursive delete can never reach a link's target.
function removeOwnTemp(dir) {
  assert.ok(dir.startsWith(tempBase) && path.basename(dir).startsWith(PREFIX), `refusing to remove ${dir}`);
  const unlinkAll = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (fs.lstatSync(full).isSymbolicLink()) {
        if (isWin) { try { fs.rmdirSync(full); } catch { fs.unlinkSync(full); } } else fs.unlinkSync(full);
      } else if (entry.isDirectory()) unlinkAll(full);
    }
  };
  unlinkAll(dir);
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
}

function makeLink(target, link) {
  fs.mkdirSync(path.dirname(link), { recursive: true });
  fs.symlinkSync(target, link, isWin ? 'junction' : 'dir');
}

// A fake gh plus real git. `hooks.before` and `hooks.after` run around each real
// command, so a test can make another writer act at an exact moment.
function fakeExec(prs, hooks = {}) {
  return (file, args, opts = {}) => {
    if (file === 'gh') {
      if (prs === null) return { status: 1, stdout: '', stderr: 'gh: could not reach GitHub' };
      return { status: 0, stdout: JSON.stringify(prs), stderr: '' };
    }
    hooks.before?.(file, args);
    const result = spawnSync(file, args, { encoding: 'utf8', ...opts });
    hooks.after?.(file, args);
    return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '', error: result.error };
  };
}

const HOUR = 3600 * 1000;

function commit(dir, file, content, message) {
  fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  fs.writeFileSync(path.join(dir, file), content);
  git(dir, 'add', file);
  git(dir, 'commit', '-q', '-m', message);
  return git(dir, 'rev-parse', 'HEAD');
}

const configure = (dir, name) => {
  for (const [key, value] of [['user.email', `${name}@example.invalid`], ['user.name', name], ['commit.gpgsign', 'false'], ['core.autocrlf', 'false']]) {
    git(dir, 'config', key, value);
  }
};

function setup(t, { gitignore = 'node_modules/\n.state/\n' } = {}) {
  const root = fs.realpathSync.native(fs.mkdtempSync(path.join(tempBase, PREFIX)));
  t.after(() => removeOwnTemp(root));
  const fx = { root, remote: path.join(root, 'remote.git'), repo: path.join(root, 'repo'), hub: path.join(root, 'hub') };
  git(root, 'init', '-q', '--bare', '-b', 'main', fx.remote);
  git(root, 'init', '-q', '-b', 'main', fx.repo);
  configure(fx.repo, 'Test');
  fs.writeFileSync(path.join(fx.repo, '.gitignore'), gitignore);
  git(fx.repo, 'add', '.gitignore');
  commit(fx.repo, 'README.md', 'base\n', 'base');
  git(fx.repo, 'remote', 'add', 'origin', fx.remote);
  git(fx.repo, 'push', '-q', '-u', 'origin', 'main');
  git(fx.repo, 'remote', 'set-head', 'origin', 'main');
  // A second clone stands in for GitHub merging pull requests.
  git(root, 'clone', '-q', fx.remote, fx.hub);
  configure(fx.hub, 'Hub');
  fx.wt = (name) => path.join(root, 'wts', name);
  fx.addWorktree = (name, branch, at = fx.wt(name)) => {
    git(fx.repo, 'worktree', 'add', '-q', '-b', branch, at, 'main');
    return at;
  };
  fx.hubMerge = (branch, mode = 'merge') => {
    git(fx.hub, 'fetch', '-q', 'origin');
    git(fx.hub, 'checkout', '-q', 'main');
    git(fx.hub, 'merge', '-q', '--ff-only', 'origin/main');
    if (mode === 'squash') {
      git(fx.hub, 'merge', '-q', '--squash', `origin/${branch}`);
      git(fx.hub, 'commit', '-q', '-m', `squash ${branch}`);
    } else {
      git(fx.hub, 'merge', '-q', '--no-ff', '-m', `merge ${branch}`, `origin/${branch}`);
    }
    git(fx.hub, 'push', '-q', 'origin', 'main');
    return git(fx.hub, 'rev-parse', 'HEAD');
  };
  // A worktree whose branch carries one commit, pushed and merged on the hub.
  fx.mergedWorktree = (name, branch, mode = 'merge') => {
    const at = fx.addWorktree(name, branch);
    const tip = commit(at, `${name}.txt`, `${name}\n`, name);
    git(at, 'push', '-q', '-u', 'origin', branch);
    const mergeCommit = fx.hubMerge(branch, mode);
    return { path: at, tip, mergeCommit };
  };
  return fx;
}

// The clock defaults to an hour after setup, so the fixture's own fresh files do
// not read as recent activity; the recent-activity tests set it explicitly.
async function retire(fx, args, { prs = [], processes = [], lister, prune, cwd = fx.root, pid = 1_000_001, platform = process.platform, hooks, now = () => Date.now() + HOUR } = {}) {
  const out = [];
  const err = [];
  const pruneCalls = [];
  const code = await run([...args, '--json'], {
    exec: fakeExec(prs, hooks),
    cwd,
    pid,
    platform,
    env: { CODEX_HOME: path.join(fx.root, 'codex-home') },
    homedir: path.join(fx.root, 'home'),
    now,
    listProcesses: lister ?? (() => ({ ok: true, processes })),
    pruneIndexes: prune ?? (() => { pruneCalls.push(true); return { ran: true, ok: true, output: 'released 0 indexes' }; }),
    stdout: (text) => out.push(text),
    stderr: (text) => err.push(text),
  });
  const text = out.join('');
  let report = null;
  try { report = JSON.parse(text); } catch { /* usage errors print no report */ }
  return { code, report, err: err.join(''), pruneCalls };
}

async function retireText(fx, args, options = {}) {
  const out = [];
  const code = await run(args, {
    exec: fakeExec(options.prs ?? []),
    cwd: fx.root,
    pid: 1_000_001,
    env: {},
    homedir: path.join(fx.root, 'home'),
    now: () => Date.now() + HOUR,
    listProcesses: () => ({ ok: true, processes: [] }),
    pruneIndexes: () => ({ ran: true, ok: true, output: '' }),
    stdout: (text) => out.push(text),
    stderr: (text) => out.push(text),
  });
  return { code, text: out.join('') };
}

const registered = (fx, p) => {
  const list = git(fx.repo, 'worktree', 'list', '--porcelain');
  const norm = (value) => (isWin ? value.replace(/\\/g, '/').toLowerCase() : value);
  return list.split('\n').some((line) => line.startsWith('worktree ') && norm(line.slice(9)) === norm(p));
};
const localBranch = (fx, name) => gitOk(fx.repo, 'rev-parse', '--verify', '--quiet', `refs/heads/${name}`);
const remoteBranch = (fx, name) => git(fx.repo, 'ls-remote', '--heads', 'origin', name) !== '';

function snapshot(dir) {
  const files = {};
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else files[path.relative(dir, full)] = fs.readFileSync(full).toString('base64');
    }
  };
  walk(dir);
  return files;
}

test('a plain merged clean worktree is fully retired without moving the canonical checkout', async (t) => {
  const fx = setup(t);
  const merged = fx.mergedWorktree('a', 'feat/a');
  const mainBefore = git(fx.repo, 'rev-parse', 'HEAD');
  assert.notEqual(mainBefore, git(fx.hub, 'rev-parse', 'HEAD'), 'main checkout starts behind');

  const result = await retire(fx, [merged.path, '--repo', fx.repo, '--apply']);
  assert.equal(result.code, 0, JSON.stringify(result.report, null, 2) + result.err);
  const [target] = result.report.targets;
  assert.equal(target.status, 'retired');
  assert.equal(fs.existsSync(merged.path), false, 'folder removed');
  assert.equal(fs.existsSync(path.join(fx.root, 'wts')), false, 'the parent left empty is removed too');
  assert.equal(registered(fx, merged.path), false, 'registration removed');
  assert.equal(localBranch(fx, 'feat/a'), false, 'local branch deleted');
  assert.equal(remoteBranch(fx, 'feat/a'), false, 'remote branch deleted at the proven tip');
  assert.equal(git(fx.repo, 'rev-parse', 'HEAD'), mainBefore, 'canonical checkout belongs to its owner');
  assert.equal(result.pruneCalls.length, 1, 'code indexes released once');
  assert.equal(typeof target.freeBytes.before, 'number');
  assert.equal(typeof target.freeBytes.after, 'number');
});

test('plan mode reports every step and changes nothing', async (t) => {
  const fx = setup(t);
  const merged = fx.mergedWorktree('a', 'feat/a');
  const mainBefore = git(fx.repo, 'rev-parse', 'HEAD');

  const result = await retire(fx, [merged.path, '--repo', fx.repo]);
  assert.equal(result.code, 0, JSON.stringify(result.report, null, 2));
  assert.equal(result.report.mode, 'plan');
  assert.equal(result.report.targets[0].status, 'retireable');
  assert.ok(result.report.targets[0].actions.some((action) => /git worktree remove/.test(action.detail) && action.done === false));
  assert.ok(fs.existsSync(merged.path));
  assert.ok(registered(fx, merged.path));
  assert.ok(localBranch(fx, 'feat/a'));
  assert.ok(remoteBranch(fx, 'feat/a'));
  assert.equal(git(fx.repo, 'rev-parse', 'HEAD'), mainBefore);
  assert.equal(result.pruneCalls.length, 0);

  const text = await retireText(fx, [merged.path, '--repo', fx.repo]);
  assert.equal(text.code, 0);
  assert.match(text.text, /would/i);
  assert.match(text.text, /ancestry/);
});

test('links are unlinked first: an outside target and every file in it survive byte for byte', async (t) => {
  const fx = setup(t, { gitignore: 'node_modules/\ndata\ninner\n' });
  const merged = fx.mergedWorktree('a', 'feat/a');
  const shared = path.join(fx.root, 'shared');
  const sharedDeps = path.join(fx.root, 'shared-deps');
  fs.mkdirSync(path.join(shared, 'sub'), { recursive: true });
  fs.writeFileSync(path.join(shared, 'a.txt'), 'shared data\n');
  fs.writeFileSync(path.join(shared, 'sub', 'b.bin'), Buffer.from([0, 1, 2, 3, 254, 255]));
  fs.mkdirSync(sharedDeps);
  fs.writeFileSync(path.join(sharedDeps, 'index.js'), 'module.exports = 1;\n');
  makeLink(shared, path.join(merged.path, 'data'));
  // Nested inside an ignored folder, where a recursive delete would reach it first.
  makeLink(sharedDeps, path.join(merged.path, 'node_modules', 'pkg'));
  // A link whose target is inside the worktree goes with it.
  fs.mkdirSync(path.join(merged.path, 'src'));
  fs.writeFileSync(path.join(merged.path, 'src', 'kept-by-git.txt'), 'x\n');
  git(merged.path, 'add', 'src');
  git(merged.path, 'commit', '-q', '-m', 'src');
  git(merged.path, 'push', '-q');
  fx.hubMerge('feat/a');
  makeLink(path.join(merged.path, 'src'), path.join(merged.path, 'inner'));
  const before = { shared: snapshot(shared), sharedDeps: snapshot(sharedDeps) };

  const result = await retire(fx, [merged.path, '--repo', fx.repo, '--apply']);
  assert.equal(result.code, 0, JSON.stringify(result.report, null, 2) + result.err);
  const [target] = result.report.targets;
  assert.equal(target.links.unlinked, 3);
  const outside = target.links.outside.map((item) => path.resolve(item.target)).sort();
  assert.deepEqual(outside, [shared, sharedDeps].map((item) => path.resolve(item)).sort());
  assert.equal(fs.existsSync(merged.path), false);
  assert.deepEqual(snapshot(shared), before.shared, 'outside folder unchanged');
  assert.deepEqual(snapshot(sharedDeps), before.sharedDeps, 'folder behind a nested link unchanged');
});

describe('refusals leave the target untouched', () => {
  let fx;
  const contexts = [];
  before(() => {
    const fakeT = { after: (fn) => contexts.push(fn) };
    fx = setup(fakeT);
    // Every branch here sits on main, so its merged proof is ancestry and only
    // the check under test can refuse it.
    for (const name of ['dirty', 'untracked', 'inside', 'locked', 'live', 'x-1', 'self', 'moved', 'unreadable', 'good', 'outer', 'fresh']) fx.addWorktree(name, `feat/${name}`);
    // A checkout nested in an ignored folder of another one: removing the outer
    // folder would take the inner checkout's files with it.
    git(fx.repo, 'worktree', 'add', '-q', '--detach', path.join(fx.wt('outer'), '.state', 'inner'), 'main');
    fs.writeFileSync(path.join(fx.wt('dirty'), 'README.md'), 'edited\n');
    fs.writeFileSync(path.join(fx.wt('untracked'), 'notes.txt'), 'mine\n');
    fx.addWorktree('unmerged', 'feat/unmerged');
    commit(fx.wt('unmerged'), 'u.txt', 'u\n', 'unmerged work');
    git(fx.repo, 'worktree', 'lock', '--reason', 'pinned', fx.wt('locked'));
    fx.desktop = path.join(fx.root, '.claude-worktrees', 'repo', 'cd');
    fx.addWorktree('cd', 'feat/cd', fx.desktop);
  });
  after(() => { for (const fn of contexts) fn(); });

  const refused = (result, pattern) => {
    assert.equal(result.code, 1, JSON.stringify(result.report, null, 2));
    const [target] = result.report.targets;
    assert.equal(target.status, 'refused');
    assert.match(target.reason, pattern);
    return target;
  };

  test('tracked edits', async () => {
    const target = refused(await retire(fx, [fx.wt('dirty'), '--repo', fx.repo, '--apply']), /not clean/);
    assert.match(target.reason, /README\.md/);
    assert.ok(fs.existsSync(fx.wt('dirty')));
  });

  test('untracked files', async () => {
    refused(await retire(fx, [fx.wt('untracked'), '--repo', fx.repo, '--apply']), /notes\.txt/);
    assert.ok(fs.existsSync(path.join(fx.wt('untracked'), 'notes.txt')));
  });

  test('no merged proof', async () => {
    refused(await retire(fx, [fx.wt('unmerged'), '--repo', fx.repo, '--apply']), /not proven merged.*no pull request/);
    assert.ok(localBranch(fx, 'feat/unmerged'));
  });

  test('the main checkout', async () => {
    refused(await retire(fx, [fx.repo, '--repo', fx.repo, '--apply']), /main checkout/);
  });

  test('a path that is not a registered worktree', async () => {
    refused(await retire(fx, [path.join(fx.root, 'nowhere'), '--repo', fx.repo]), /not a registered worktree/);
  });

  test('the calling directory is inside it', async () => {
    refused(await retire(fx, [fx.wt('inside'), '--repo', fx.repo, '--apply'], { cwd: path.join(fx.wt('inside'), 'sub') }), /working directory/);
    assert.ok(fs.existsSync(fx.wt('inside')));
  });

  test('a worktree that contains another registered worktree', async () => {
    refused(await retire(fx, [fx.wt('outer'), '--repo', fx.repo, '--apply']), /contains another registered worktree/);
    assert.ok(fs.existsSync(path.join(fx.wt('outer'), '.state', 'inner', 'README.md')));
  });

  test('a locked worktree', async () => {
    refused(await retire(fx, [fx.wt('locked'), '--repo', fx.repo, '--apply']), /locked/);
    assert.ok(fs.existsSync(fx.wt('locked')));
  });

  test('a runtime-owned path without --released names the runtime route', async () => {
    const target = refused(await retire(fx, [fx.desktop, '--repo', fx.repo]), /claude-desktop/);
    assert.match(target.reason, /archive/i);
    const released = await retire(fx, [fx.desktop, '--repo', fx.repo, '--released', 'session cd archived in the app']);
    assert.equal(released.code, 0, JSON.stringify(released.report, null, 2));
    assert.equal(released.report.released, 'session cd archived in the app');
    assert.ok(fs.existsSync(fx.desktop));
  });

  test('a live process whose command line names the folder', async () => {
    const backslashed = fx.wt('live').replace(/\//g, '\\');
    const target = refused(await retire(fx, [fx.wt('live'), '--repo', fx.repo, '--apply'], {
      processes: [{ pid: 4242, ppid: 1, command: `node "${backslashed}\\server.js" --port 3000` }],
    }), /live process/);
    assert.match(target.reason, /4242/);
    assert.ok(fs.existsSync(fx.wt('live')));
  });

  test('a process naming x-10 does not hold x-1, and this process and its ancestors are excluded', async () => {
    const result = await retire(fx, [fx.wt('x-1'), fx.wt('self'), '--repo', fx.repo], {
      pid: 500,
      processes: [
        { pid: 600, ppid: 1, command: `node ${fx.wt('x-1')}0/server.js` },
        { pid: 400, ppid: 1, command: `bash -c "node retire-worktree.mjs ${fx.wt('self')}"` },
        { pid: 500, ppid: 400, command: `node retire-worktree.mjs ${fx.wt('self')}` },
      ],
    });
    assert.equal(result.code, 0, JSON.stringify(result.report, null, 2));
    assert.deepEqual(result.report.targets.map((item) => item.status), ['retireable', 'retireable']);
  });

  test('an unreadable process list refuses unless the owner released it', async () => {
    const lister = () => ({ ok: false, error: 'access denied', processes: [] });
    refused(await retire(fx, [fx.wt('unreadable'), '--repo', fx.repo], { lister }), /liveness check is incomplete/);
    const released = await retire(fx, [fx.wt('unreadable'), '--repo', fx.repo, '--released', 'owner confirmed'], { lister });
    assert.equal(released.code, 0, JSON.stringify(released.report, null, 2));
  });

  test('without readable working directories, recent activity inside refuses and older activity passes', async () => {
    // Windows never exposes another process's working directory, so a shell
    // sitting in the folder is invisible; recent writes are the remaining signal.
    const lister = () => ({ ok: true, cwdReadable: false, processes: [] });
    const minutes = (count) => () => Date.now() + count * 60 * 1000;
    const recent = refused(await retire(fx, [fx.wt('fresh'), '--repo', fx.repo], { lister, now: minutes(5) }), /recent activity at \d{4}-\d\d-\d\dT[^ ]+ \(.+\) and process working directories are not readable on this platform; rerun with --released/);
    assert.equal(recent.checks.at(-1).check, 'liveness');

    const older = await retire(fx, [fx.wt('fresh'), '--repo', fx.repo], { lister, now: minutes(20) });
    assert.equal(older.code, 0, JSON.stringify(older.report, null, 2));
    const passed = older.report.targets[0].checks.find((check) => check.check === 'liveness');
    assert.match(passed.detail, /newest change was at .* older than 15 minutes/);

    const released = await retire(fx, [fx.wt('fresh'), '--repo', fx.repo, '--released', 'owner closed the shell'], { lister, now: minutes(5) });
    assert.equal(released.code, 0, JSON.stringify(released.report, null, 2));
    assert.match(released.report.targets[0].checks.find((check) => check.check === 'liveness').detail, /--released/);
    assert.ok(fs.existsSync(fx.wt('fresh')));
  });

  test('a tip that moves between the checks and the action', async () => {
    // The liveness read is the last check before acting; another writer commits then.
    const lister = () => { commit(fx.wt('moved'), 'late.txt', 'late\n', 'late work'); return { ok: true, processes: [] }; };
    refused(await retire(fx, [fx.wt('moved'), '--repo', fx.repo, '--apply'], { lister }), /changed/);
    assert.ok(fs.existsSync(path.join(fx.wt('moved'), 'late.txt')));
    assert.ok(localBranch(fx, 'feat/moved'));
  });

  test('one refusal does not stop the other targets', async () => {
    const result = await retire(fx, [fx.wt('dirty'), fx.wt('good'), '--repo', fx.repo, '--apply']);
    assert.equal(result.code, 1);
    assert.deepEqual(result.report.targets.map((item) => item.status), ['refused', 'retired']);
    assert.equal(fs.existsSync(fx.wt('good')), false);
    assert.ok(fs.existsSync(fx.wt('dirty')));
  });
});

test('squash proof deletes the branch only at the proven tip', async (t) => {
  const fx = setup(t);
  const squashed = fx.mergedWorktree('sq', 'feat/sq', 'squash');
  const prs = [{ number: 12, state: 'MERGED', headRefName: 'feat/sq', headRefOid: squashed.tip, mergeCommit: { oid: squashed.mergeCommit }, baseRefName: 'main', isDraft: false }];
  // A second branch whose pull request merged an earlier head; its newer commit is not covered.
  const later = fx.mergedWorktree('later', 'feat/later', 'squash');
  prs.push({ number: 13, state: 'MERGED', headRefName: 'feat/later', headRefOid: later.tip, mergeCommit: { oid: later.mergeCommit }, baseRefName: 'main', isDraft: false });
  commit(later.path, 'more.txt', 'more\n', 'after the merge');
  git(fx.repo, 'worktree', 'remove', later.path);

  const result = await retire(fx, [squashed.path, '--branch', 'feat/later', '--repo', fx.repo, '--apply'], { prs });
  assert.equal(result.code, 1, 'the later branch is refused');
  const [worktree, branch] = result.report.targets;
  assert.equal(worktree.status, 'retired', JSON.stringify(worktree, null, 2));
  assert.equal(worktree.proof.proof, 'squash');
  assert.ok(worktree.actions.some((action) => /squash/.test(action.detail) && /feat\/sq/.test(action.detail) && action.done));
  assert.equal(localBranch(fx, 'feat/sq'), false);
  assert.equal(remoteBranch(fx, 'feat/sq'), false);

  assert.equal(branch.status, 'refused');
  assert.match(branch.reason, /1 commit after merged head #13/);
  assert.ok(localBranch(fx, 'feat/later'));
});

test('a remote branch at a different commit is left and reported', async (t) => {
  const fx = setup(t);
  const merged = fx.mergedWorktree('r', 'feat/r');
  git(fx.hub, 'checkout', '-q', '-b', 'feat/r', 'origin/feat/r');
  commit(fx.hub, 'extra.txt', 'someone else\n', 'pushed by someone else');
  git(fx.hub, 'push', '-q', 'origin', 'feat/r');

  const result = await retire(fx, [merged.path, '--repo', fx.repo, '--apply']);
  assert.equal(result.code, 0, JSON.stringify(result.report, null, 2));
  assert.equal(localBranch(fx, 'feat/r'), false);
  assert.equal(remoteBranch(fx, 'feat/r'), true, 'remote branch kept');
  assert.ok(result.report.targets[0].actions.some((action) => /origin\/feat\/r/.test(action.detail) && /left/.test(action.detail)));
});

test('--branch retires a leftover local branch and its remote', async (t) => {
  const fx = setup(t);
  // Made and merged elsewhere; the main checkout's HEAD has not caught up.
  git(fx.hub, 'checkout', '-q', '-b', 'leftover');
  const tip = commit(fx.hub, 'left.txt', 'left\n', 'leftover work');
  git(fx.hub, 'push', '-q', 'origin', 'leftover');
  fx.hubMerge('leftover');
  git(fx.repo, 'fetch', '-q', 'origin');
  git(fx.repo, 'branch', '--no-track', 'leftover', tip);

  const result = await retire(fx, ['--branch', 'leftover', '--repo', fx.repo, '--apply']);
  assert.equal(result.code, 0, JSON.stringify(result.report, null, 2));
  assert.equal(result.report.targets[0].kind, 'branch');
  assert.equal(localBranch(fx, 'leftover'), false);
  assert.equal(remoteBranch(fx, 'leftover'), false);
});

// A branch made and merged on the hub, then copied into the main checkout as a
// leftover local branch with no upstream.
function leftoverBranch(fx, name, mode = 'merge') {
  git(fx.hub, 'checkout', '-q', '-b', name);
  const tip = commit(fx.hub, `${name}.txt`, `${name}\n`, `${name} work`);
  git(fx.hub, 'push', '-q', 'origin', name);
  const mergeCommit = fx.hubMerge(name, mode);
  git(fx.repo, 'fetch', '-q', 'origin');
  git(fx.repo, 'branch', '--no-track', name, tip);
  return { tip, mergeCommit };
}

test('a local branch that advances between the proof and the delete is left in place', async (t) => {
  const fx = setup(t);
  // Squash proof, where nothing in git itself would stop a forced delete.
  const { tip, mergeCommit } = leftoverBranch(fx, 'leftover', 'squash');
  const prs = [{ number: 21, state: 'MERGED', headRefName: 'leftover', headRefOid: tip, mergeCommit: { oid: mergeCommit }, baseRefName: 'main', isDraft: false }];
  let advanced = null;
  const hooks = {
    before: (file, args) => {
      if (file !== 'git' || advanced) return;
      const deleting = (args.includes('update-ref') && args.includes('-d')) || (args.includes('branch') && (args.includes('-d') || args.includes('-D')));
      if (!deleting) return;
      // Another writer commits on the branch at the last moment.
      advanced = git(fx.repo, 'commit-tree', `${tip}^{tree}`, '-p', tip, '-m', 'late work');
      git(fx.repo, 'update-ref', 'refs/heads/leftover', advanced);
    },
  };

  const result = await retire(fx, ['--branch', 'leftover', '--repo', fx.repo, '--apply'], { prs, hooks });
  assert.ok(advanced, 'the delete was attempted');
  assert.equal(result.code, 1, JSON.stringify(result.report, null, 2));
  const [target] = result.report.targets;
  assert.equal(target.status, 'refused');
  assert.match(target.reason, new RegExp(`left in place: moved to ${advanced.slice(0, 7)}`));
  assert.equal(git(fx.repo, 'rev-parse', 'refs/heads/leftover'), advanced, 'the advanced branch survives');
  assert.ok(remoteBranch(fx, 'leftover'), 'the remote is not touched after a local refusal');
});

test('a remote branch that advances before the push is left in place by the lease', async (t) => {
  const fx = setup(t);
  leftoverBranch(fx, 'leftover');
  let pushedBySomeoneElse = null;
  const hooks = {
    before: (file, args) => {
      if (file !== 'git' || pushedBySomeoneElse || !args.includes('push')) return;
      git(fx.hub, 'checkout', '-q', 'leftover');
      pushedBySomeoneElse = commit(fx.hub, 'later.txt', 'later\n', 'pushed meanwhile');
      git(fx.hub, 'push', '-q', 'origin', 'leftover');
    },
  };

  const result = await retire(fx, ['--branch', 'leftover', '--repo', fx.repo, '--apply'], { hooks });
  assert.ok(pushedBySomeoneElse, 'the remote delete was attempted');
  assert.equal(result.code, 1, JSON.stringify(result.report, null, 2));
  const [target] = result.report.targets;
  assert.equal(target.status, 'refused');
  assert.match(target.reason, new RegExp(`left in place: moved to ${pushedBySomeoneElse.slice(0, 7)}`));
  assert.equal(localBranch(fx, 'leftover'), false, 'the local branch was at its proven tip and is deleted');
  assert.equal(git(fx.repo, 'ls-remote', 'origin', 'refs/heads/leftover').split('\t')[0], pushedBySomeoneElse, 'the remote branch keeps the new commit');
});

test('residue is not removed through a parent folder replaced by a junction', async (t) => {
  const fx = setup(t);
  const merged = fx.mergedWorktree('a', 'feat/a');
  const sibling = path.join(fx.root, 'sibling');
  fs.mkdirSync(path.join(sibling, 'a'), { recursive: true });
  fs.writeFileSync(path.join(sibling, 'a', 'precious.txt'), 'keep me\n');
  let swapped = false;
  const hooks = {
    after: (file, args) => {
      if (file !== 'git' || swapped || !(args.includes('worktree') && args.includes('remove'))) return;
      // The worktree is gone; its parent is swapped for a link to a sibling
      // folder, so the old path now names someone else's files.
      fs.rmdirSync(path.join(fx.root, 'wts'));
      makeLink(sibling, path.join(fx.root, 'wts'));
      swapped = true;
    },
  };

  const result = await retire(fx, [merged.path, '--repo', fx.repo, '--apply'], { hooks });
  assert.ok(swapped, 'the parent was swapped after removal');
  assert.equal(result.code, 1, JSON.stringify(result.report, null, 2));
  const [target] = result.report.targets;
  assert.equal(target.status, 'failed');
  assert.match(target.reason, /the path now resolves elsewhere/);
  assert.equal(fs.readFileSync(path.join(sibling, 'a', 'precious.txt'), 'utf8'), 'keep me\n', 'the sibling is untouched');
  assert.ok(fs.existsSync(path.join(fx.root, 'wts')), 'the link itself is left alone');
});

test('tracked internal and external directory and file links retire without touching external bytes', async (t) => {
  const fx = setup(t);
  git(fx.repo, 'config', 'core.symlinks', 'true');
  const at = fx.addWorktree('tl', 'feat/tl');
  const shared = path.join(fx.root, 'shared');
  fs.mkdirSync(path.join(shared, 'fixtures'), { recursive: true });
  fs.writeFileSync(path.join(shared, 'fixtures', 'data.bin'), Buffer.from([0, 1, 254, 255]));
  fs.writeFileSync(path.join(shared, 'source.txt'), 'external file\n');
  fs.mkdirSync(path.join(at, 'fixtures'));
  fs.writeFileSync(path.join(at, 'fixtures', 'internal.txt'), 'internal\n');
  const links = [
    ['internal-dir', 'fixtures', 'dir'],
    ['external-dir', path.join(shared, 'fixtures').replace(/\\/g, '/'), 'dir'],
    ['internal-file', 'README.md', 'file'],
    ['external-file', path.join(shared, 'source.txt').replace(/\\/g, '/'), 'file'],
    ['link-text-with-space', 'missing target ', 'file'],
  ];
  try {
    for (const [name, target, type] of links) fs.symlinkSync(target, path.join(at, name), type);
  } catch (error) {
    if (!isWin || error.code !== 'EPERM') throw error;
    t.skip('real Windows symlinks require Developer Mode or symlink privileges');
    return;
  }
  git(at, 'add', '.');
  git(at, 'commit', '-q', '-m', 'tracked link');
  for (const [name, target] of links) {
    assert.ok(git(at, 'ls-files', '-s', name).startsWith('120000 '), `${name} is a real tracked symlink`);
    const blob = spawnSync('git', ['show', `HEAD:${name}`], { cwd: at });
    assert.equal(blob.status, 0);
    assert.deepEqual(blob.stdout, Buffer.from(target), `${name} has the exact committed link text`);
  }
  git(at, 'push', '-q', '-u', 'origin', 'feat/tl');
  fx.hubMerge('feat/tl');
  const before = snapshot(shared);
  const plan = await retire(fx, [at, '--repo', fx.repo]);
  assert.equal(plan.code, 0, JSON.stringify(plan.report, null, 2));
  assert.equal(plan.report.targets[0].status, 'retireable');
  for (const [name] of links) assert.ok(fs.lstatSync(path.join(at, name)).isSymbolicLink(), 'plan leaves links intact');
  let sawRemoval = false;
  const hooks = {
    before: (file, args) => {
      if (file !== 'git' || !args.includes('worktree') || !args.includes('remove')) return;
      sawRemoval = true;
      assert.equal(args.includes('--force'), false, 'normal Git removal');
      for (const [name, target] of links) {
        assert.ok(fs.lstatSync(path.join(at, name)).isFile(), 'all actual links are removed before recursive removal');
        assert.deepEqual(fs.readFileSync(path.join(at, name)), Buffer.from(target), 'exact link text is materialized');
      }
      assert.deepEqual(snapshot(shared), before, 'unlinking preserved external bytes');
    },
  };

  const result = await retire(fx, [at, '--repo', fx.repo, '--apply'], { hooks });
  assert.equal(result.code, 0, JSON.stringify(result.report, null, 2));
  assert.equal(result.report.targets[0].links.unlinked, links.length);
  assert.ok(sawRemoval);
  assert.equal(fs.existsSync(at), false);
  assert.equal(registered(fx, at), false);
  assert.equal(localBranch(fx, 'feat/tl'), false);
  assert.equal(remoteBranch(fx, 'feat/tl'), false);
  assert.deepEqual(snapshot(shared), before, 'external directory and file bytes survive retirement');
  assert.equal(git(fx.repo, 'config', 'core.symlinks'), 'true', 'no persistent config change');
});

test('tracked-link conversion preflight preserves every original link when unsupported', async (t) => {
  for (const kind of ['configured-filter', 'literal-set-filter', 'built-in-encoding', 'attributes-link']) await t.test(kind, async (t) => {
    const fx = setup(t);
    git(fx.repo, 'config', 'core.symlinks', 'true');
    const at = fx.addWorktree('conversion', 'feat/conversion');
    const marker = path.join(fx.root, 'filter-executed');
    if (kind === 'configured-filter' || kind === 'literal-set-filter') {
      const driverName = kind === 'literal-set-filter' ? 'set' : 'uppercase';
      const driver = path.join(fx.root, 'uppercase.mjs');
      fs.writeFileSync(driver, `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(marker)}, 'executed'); process.stdout.write(fs.readFileSync(0, 'utf8').toUpperCase());\n`);
      git(at, 'config', `filter.${driverName}.clean`, `"${process.execPath.replace(/\\/g, '/')}" "${driver.replace(/\\/g, '/')}"`);
      fs.writeFileSync(path.join(at, '.gitattributes'), `z-converted-link filter=${driverName}\n`);
    } else if (kind === 'built-in-encoding') {
      fs.writeFileSync(path.join(at, '.gitattributes'), 'z-converted-link working-tree-encoding=UTF-16LE\n');
    }
    const links = [
      ['a-plain-link', 'README.md'],
      ['z-converted-link', kind === 'built-in-encoding' ? 'README.mdX' : 'README.md'],
    ];
    if (kind === 'attributes-link') links.push(['.gitattributes', 'README.md']);
    try {
      for (const [name, target] of links) fs.symlinkSync(target, path.join(at, name), 'file');
    } catch (error) {
      if (!isWin || error.code !== 'EPERM') throw error;
      t.skip('real Windows symlinks require Developer Mode or symlink privileges');
      return;
    }
    git(at, 'add', '.');
    git(at, 'commit', '-q', '-m', 'tracked conversion links');
    for (const [name] of links) assert.ok(git(at, 'ls-files', '-s', name).startsWith('120000 '));
    git(at, 'push', '-q', '-u', 'origin', 'feat/conversion');
    fx.hubMerge('feat/conversion');
    assert.equal(git(at, 'status', '--porcelain'), '', 'original symlinks are clean');
    assert.equal(fs.existsSync(marker), false, 'Git did not run the filter for symlinks');

    const result = await retire(fx, [at, '--repo', fx.repo, '--apply']);
    assert.equal(result.code, 1, JSON.stringify(result.report, null, 2));
    const [target] = result.report.targets;
    assert.equal(target.status, 'refused', JSON.stringify(target, null, 2));
    assert.match(target.reason, kind.endsWith('filter') ? /filter/ : kind === 'attributes-link' ? /\.gitattributes/ : /conversion/);
    assert.equal(target.links.unlinked, 0, 'preflight finishes before the first unlink');
    for (const [name, text] of links) {
      assert.ok(fs.lstatSync(path.join(at, name)).isSymbolicLink());
      assert.equal(fs.readlinkSync(path.join(at, name)), text);
    }
    assert.ok(registered(fx, at));
    assert.ok(localBranch(fx, 'feat/conversion'));
    assert.ok(remoteBranch(fx, 'feat/conversion'));
    assert.equal(fs.existsSync(marker), false, 'the configured clean filter never executes during preflight');
  });
});

test('case-insensitive attributes alias refuses under Darwin policy before unlinking', async (t) => {
  const fx = setup(t);
  git(fx.repo, 'config', 'core.symlinks', 'true');
  const at = fx.addWorktree('alias', 'feat/alias');
  const links = ['.GITATTRIBUTES', 'readme-link'];
  try {
    for (const name of links) fs.symlinkSync('README.md', path.join(at, name), 'file');
  } catch (error) {
    if (!isWin || error.code !== 'EPERM') throw error;
    t.skip('real Windows symlinks require Developer Mode or symlink privileges');
    return;
  }
  if (!fs.existsSync(path.join(at, '.gitattributes'))) {
    t.skip('this case requires a case-insensitive filesystem');
    return;
  }
  assert.ok(fs.lstatSync(path.join(at, '.gitattributes')).isSymbolicLink(), 'lowercase Git lookup resolves the same actual entry');
  git(at, 'add', '.');
  git(at, 'commit', '-q', '-m', 'tracked attributes alias');
  assert.ok(git(at, 'ls-files', '-s', '.GITATTRIBUTES').startsWith('120000 '));
  git(at, 'push', '-q', '-u', 'origin', 'feat/alias');
  fx.hubMerge('feat/alias');
  t.diagnostic(`native filesystem platform=${process.platform}; reported retirement policy=darwin (platform simulation when different)`);

  const result = await retire(fx, [at, '--repo', fx.repo, '--apply'], { platform: 'darwin' });
  assert.equal(result.code, 1, JSON.stringify(result.report, null, 2));
  const [target] = result.report.targets;
  assert.equal(target.status, 'refused');
  assert.match(target.reason, /tracked \.gitattributes link/);
  assert.equal(target.links.unlinked, 0);
  for (const name of links) {
    assert.ok(fs.lstatSync(path.join(at, name)).isSymbolicLink());
    assert.equal(fs.readlinkSync(path.join(at, name)), 'README.md');
  }
  assert.ok(registered(fx, at));
  assert.ok(localBranch(fx, 'feat/alias'));
  assert.ok(remoteBranch(fx, 'feat/alias'));
});

test('POSIX literal backslash names cannot alias indexed slash paths and hide local work', { skip: isWin ? 'native POSIX filenames unavailable on Windows; real-Git regression not executed' : false }, async (t) => {
  const fx = setup(t);
  git(fx.repo, 'config', 'core.symlinks', 'true');
  const at = fx.addWorktree('literal', 'feat/literal');
  fs.mkdirSync(path.join(at, 'a'));
  const literal = path.join(at, 'a\\b');
  const nested = path.join(at, 'a', 'b');
  fs.writeFileSync(path.join(at, 'original.txt'), 'original bytes\n');
  fs.writeFileSync(path.join(at, 'changed.txt'), 'changed bytes\n');
  fs.symlinkSync('original.txt', literal, 'file');
  fs.symlinkSync('changed.txt', nested, 'file');
  git(at, 'add', '.');
  git(at, 'commit', '-q', '-m', 'distinct POSIX link names');
  git(at, 'push', '-q', '-u', 'origin', 'feat/literal');
  fx.hubMerge('feat/literal');
  git(at, 'update-index', '--skip-worktree', 'a\\b');
  fs.unlinkSync(literal);
  fs.symlinkSync('changed.txt', literal, 'file');
  assert.equal(git(at, 'status', '--porcelain'), '', 'the index flag hides this actual link edit');

  const result = await retire(fx, [at, '--repo', fx.repo, '--apply']);
  assert.equal(result.code, 1, JSON.stringify(result.report, null, 2));
  assert.equal(result.report.targets[0].status, 'refused');
  assert.match(result.report.targets[0].reason, /does not match its indexed link target/);
  assert.equal(result.report.targets[0].links.unlinked, 0);
  assert.equal(fs.readlinkSync(literal), 'changed.txt', 'the hidden local edit survives');
  assert.equal(fs.readlinkSync(nested), 'changed.txt', 'the distinct slash-path link survives');
  assert.ok(registered(fx, at));
  assert.ok(localBranch(fx, 'feat/literal'));
});

test('tracked link changes during blob reading retain a structured batch report', async (t) => {
  for (const kind of ['disappeared', 'regular-file']) await t.test(kind, async (t) => {
    const fx = setup(t);
    git(fx.repo, 'config', 'core.symlinks', 'true');
    const completed = fx.mergedWorktree('completed', 'feat/completed');
    const at = fx.addWorktree('race', 'feat/race');
    const changed = path.join(at, 'a-race-link');
    const survivor = path.join(at, 'z-survivor-link');
    try {
      fs.symlinkSync('README.md', changed, 'file');
      fs.symlinkSync('README.md', survivor, 'file');
    } catch (error) {
      if (!isWin || error.code !== 'EPERM') throw error;
      t.skip('real Windows symlinks require Developer Mode or symlink privileges');
      return;
    }
    git(at, 'add', '.');
    git(at, 'commit', '-q', '-m', 'tracked race links');
    git(at, 'push', '-q', '-u', 'origin', 'feat/race');
    fx.hubMerge('feat/race');
    const readmeBefore = fs.readFileSync(path.join(at, 'README.md'));
    let injected = false;
    const hooks = {
      after: (file, args) => {
        if (injected || file !== 'git' || !args.includes('cat-file')) return;
        injected = true;
        fs.unlinkSync(changed);
        if (kind === 'regular-file') fs.writeFileSync(changed, 'concurrent writer\n');
      },
    };
    const result = await retire(fx, [completed.path, at, '--repo', fx.repo, '--apply'], { hooks });
    assert.ok(injected, 'the tracked entry changed immediately after its blob was read');
    assert.equal(result.code, 1, JSON.stringify(result.report, null, 2));
    assert.equal(result.report.targets[0].status, 'retired', 'earlier batch result is retained');
    const target = result.report.targets[1];
    assert.equal(target.status, 'refused');
    assert.match(target.reason, /cannot inspect|changed/);
    assert.equal(target.links.unlinked, 0, 'the helper unlinked no entries in the changed checkout');
    assert.ok(fs.lstatSync(survivor).isSymbolicLink());
    assert.equal(fs.readlinkSync(survivor), 'README.md');
    if (kind === 'regular-file') assert.equal(fs.readFileSync(changed, 'utf8'), 'concurrent writer\n');
    else assert.equal(fs.existsSync(changed), false);
    assert.ok(registered(fx, at));
    assert.ok(localBranch(fx, 'feat/race'));
    assert.deepEqual(fs.readFileSync(path.join(at, 'README.md')), readmeBefore, 'target bytes are unchanged');
  });
});

test('parent substitution during tracked-link preparation preserves external bytes', async (t) => {
  for (const ancestor of [false, true]) await t.test(ancestor ? 'ancestor' : 'parent', async (t) => {
    const fx = setup(t);
    git(fx.repo, 'config', 'core.symlinks', 'true');
    const at = fx.addWorktree('race', 'feat/race');
    const parent = path.join(at, 'nested');
    fs.mkdirSync(parent);
    try { fs.symlinkSync('../README.md', path.join(parent, 'tracked-link'), 'file'); } catch (error) {
      if (!isWin || error.code !== 'EPERM') throw error;
      t.skip('real Windows symlinks require Developer Mode or symlink privileges');
      return;
    }
    git(at, 'add', 'nested');
    git(at, 'commit', '-q', '-m', 'tracked nested link');
    git(at, 'push', '-q', '-u', 'origin', 'feat/race');
    fx.hubMerge('feat/race');
    const shared = path.join(fx.root, 'shared');
    fs.mkdirSync(path.join(shared, 'race', 'nested'), { recursive: true });
    fs.writeFileSync(path.join(shared, 'precious.txt'), 'keep shared bytes\n');
    const before = snapshot(shared);
    const cwd = process.cwd();
    const write = fs.writeFileSync;
    let attempted = false;
    let blocked = false;
    fs.writeFileSync = (file, ...args) => {
      if (!attempted && typeof file === 'string' && path.basename(file) === 'tracked-link') {
        attempted = true;
        const replaced = ancestor ? path.dirname(at) : parent;
        try {
          fs.renameSync(replaced, path.join(fx.root, 'parked'));
        } catch (error) {
          if (!isWin || !['EPERM', 'EACCES', 'EBUSY'].includes(error.code)) throw error;
          blocked = true;
        }
        if (!blocked) makeLink(shared, replaced);
      }
      return write(file, ...args);
    };
    let result;
    try { result = await retire(fx, [at, '--repo', fx.repo, '--apply']); }
    finally { fs.writeFileSync = write; }
    assert.ok(attempted, 'the substitution was attempted after unlink and before materialization');
    assert.deepEqual(snapshot(shared), before, 'no file is created through a replaced parent or ancestor');
    assert.equal(process.cwd(), cwd, 'the caller working directory is restored');
    if (isWin) assert.ok(blocked, 'Windows prevents moving the bound directory or its ancestor');
    if (blocked) assert.equal(result.report.targets[0].status, 'retired', 'denied substitution still permits retirement');
    else assert.equal(result.report.targets[0].status, 'failed', 'changed paths prevent Git removal');
  });
});

test('index flags cannot hide a locally changed tracked link from retirement', async (t) => {
  for (const flag of ['--assume-unchanged', '--skip-worktree']) await t.test(flag, async (t) => {
    const fx = setup(t);
    git(fx.repo, 'config', 'core.symlinks', 'true');
    const at = fx.addWorktree('hidden', 'feat/hidden');
    const link = path.join(at, 'readme-link');
    try { fs.symlinkSync('README.md', link, 'file'); } catch (error) {
      if (!isWin || error.code !== 'EPERM') throw error;
      t.skip('real Windows symlinks require Developer Mode or symlink privileges');
      return;
    }
    commit(at, 'different.txt', 'keep local target\n', 'target');
    git(at, 'add', 'readme-link');
    git(at, 'commit', '-q', '-m', 'tracked link');
    assert.ok(git(at, 'ls-files', '-s', 'readme-link').startsWith('120000 '));
    git(at, 'push', '-q', '-u', 'origin', 'feat/hidden');
    fx.hubMerge('feat/hidden');
    git(at, 'update-index', flag, 'readme-link');
    fs.unlinkSync(link);
    fs.symlinkSync('different.txt', link, 'file');
    assert.equal(git(at, 'status', '--porcelain'), '', 'the index flag hides the local edit from status');

    const result = await retire(fx, [at, '--repo', fx.repo, '--apply']);
    assert.equal(result.code, 1, JSON.stringify(result.report, null, 2));
    assert.equal(result.report.targets[0].status, 'refused');
    assert.equal(result.report.targets[0].actions.length, 0);
    assert.equal(fs.readlinkSync(link), 'different.txt', 'the hidden local edit survives');
    assert.ok(registered(fx, at));
    assert.equal(fs.readFileSync(path.join(at, 'different.txt'), 'utf8'), 'keep local target\n');
  });
});

test('a link replaced after inspection refuses before unlinking or removal', async (t) => {
  const fx = setup(t, { gitignore: 'data\n' });
  const merged = fx.mergedWorktree('a', 'feat/a');
  const shared = path.join(fx.root, 'shared');
  const other = path.join(fx.root, 'other');
  for (const dir of [shared, other]) {
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'precious.txt'), `${path.basename(dir)}\n`);
  }
  const link = path.join(merged.path, 'data');
  makeLink(shared, link);
  const before = { shared: snapshot(shared), other: snapshot(other) };
  let statuses = 0;
  const hooks = {
    after: (file, args) => {
      if (file !== 'git' || !args.includes('status') || args.includes('--ignored') || ++statuses !== 2) return;
      if (isWin) fs.rmdirSync(link); else fs.unlinkSync(link);
      makeLink(other, link);
    },
  };
  const result = await retire(fx, [merged.path, '--repo', fx.repo, '--apply'], { hooks });
  assert.equal(result.code, 1, JSON.stringify(result.report, null, 2));
  const [target] = result.report.targets;
  assert.equal(target.status, 'refused');
  assert.match(target.reason, /link.*changed/);
  assert.equal(target.links.unlinked, 0);
  assert.ok(fs.lstatSync(link).isSymbolicLink());
  assert.ok(registered(fx, merged.path));
  assert.deepEqual(snapshot(shared), before.shared);
  assert.deepEqual(snapshot(other), before.other);
});

test('a worktree or ancestor swapped for a link after recheck is preserved', async (t) => {
  for (const ancestor of [false, true]) await t.test(ancestor ? 'ancestor' : 'worktree', async (t) => {
    const fx = setup(t);
    const merged = fx.mergedWorktree('a', 'feat/a');
    const shared = path.join(fx.root, 'shared');
    fs.mkdirSync(shared);
    fs.writeFileSync(path.join(shared, 'precious.txt'), 'keep me\n');
    const before = snapshot(shared);
    const replaced = ancestor ? path.dirname(merged.path) : merged.path;
    let statuses = 0;
    const hooks = {
      after: (file, args) => {
        if (file !== 'git' || !args.includes('status') || args.includes('--ignored') || ++statuses !== 2) return;
        fs.renameSync(replaced, path.join(fx.root, 'parked'));
        makeLink(shared, replaced);
      },
    };
    const result = await retire(fx, [merged.path, '--repo', fx.repo, '--apply'], { hooks });
    assert.equal(result.code, 1, JSON.stringify(result.report, null, 2));
    assert.equal(result.report.targets[0].status, 'refused');
    assert.match(result.report.targets[0].reason, /path now resolves elsewhere/);
    assert.deepEqual(snapshot(shared), before);
    assert.ok(fs.lstatSync(replaced).isSymbolicLink());
    assert.ok(registered(fx, merged.path));
  });
});

test('--branch refuses a branch another worktree has checked out', async (t) => {
  const fx = setup(t);
  fx.addWorktree('busy', 'feat/busy');
  const result = await retire(fx, ['--branch', 'feat/busy', '--repo', fx.repo, '--apply']);
  assert.equal(result.code, 1);
  assert.match(result.report.targets[0].reason, /checked out/);
  assert.ok(localBranch(fx, 'feat/busy'));
});

test('a failing index release is reported and is not fatal', async (t) => {
  const fx = setup(t);
  const merged = fx.mergedWorktree('a', 'feat/a');
  const result = await retire(fx, [merged.path, '--repo', fx.repo, '--apply'], { prune: () => { throw new Error('cbm exploded'); } });
  assert.equal(result.code, 0, JSON.stringify(result.report, null, 2));
  assert.equal(result.report.indexes.ok, false);
  assert.match(result.report.indexes.output, /cbm exploded/);
  assert.equal(fs.existsSync(merged.path), false);
});

test('usage errors exit 2 and there is no flag to force or skip a check', async (t) => {
  const fx = setup(t);
  assert.equal((await retire(fx, [])).code, 2);
  assert.equal((await retire(fx, ['--force', fx.repo])).code, 2);
  assert.equal((await retire(fx, ['--skip-liveness', fx.repo])).code, 2);
});
