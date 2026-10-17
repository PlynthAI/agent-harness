import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { run } from '../scripts/repo-inventory.mjs';

const isWin = process.platform === 'win32';
const tempBase = fs.realpathSync.native(os.tmpdir());

function git(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed in ${cwd}: ${result.stderr}`);
  return result.stdout.trim();
}

// Remove only a directory this file created with mkdtemp, unlinking every link
// entry first so a recursive delete can never reach a link's target.
function removeOwnTemp(dir) {
  assert.ok(dir.startsWith(tempBase) && path.basename(dir).startsWith('repo-inventory-'), `refusing to remove ${dir}`);
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

function fakeExec(prs) {
  return (file, args, opts = {}) => {
    if (file === 'gh') {
      if (prs === null) return { status: 1, stdout: '', stderr: 'gh: could not reach GitHub' };
      return { status: 0, stdout: JSON.stringify(prs), stderr: '' };
    }
    const result = spawnSync(file, args, { encoding: 'utf8', ...opts });
    return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '', error: result.error };
  };
}

const norm = (p) => {
  const slashed = p.replace(/\\/g, '/').replace(/\/$/, '');
  return isWin ? slashed.toLowerCase() : slashed;
};

function commit(dir, file, content, message) {
  fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  fs.writeFileSync(path.join(dir, file), content);
  git(dir, 'add', file);
  git(dir, 'commit', '-q', '-m', message);
  return git(dir, 'rev-parse', 'HEAD');
}

const pr = (number, state, headRefName, headRefOid, mergeOid = null, isDraft = false) => ({
  number, state, headRefName, headRefOid, mergeCommit: mergeOid ? { oid: mergeOid } : null, baseRefName: 'main', isDraft,
});

// One repository with a worktree for every state the inventory distinguishes.
const fx = {};

before(() => {
  fx.root = fs.realpathSync.native(fs.mkdtempSync(path.join(tempBase, 'repo-inventory-')));
  const { root } = fx;
  fx.remote = path.join(root, 'remote.git');
  fx.repo = path.join(root, 'repo');
  fx.codexHome = path.join(root, 'codex-home');
  fx.home = path.join(root, 'home');
  git(root, 'init', '-q', '--bare', '-b', 'main', fx.remote);
  git(root, 'init', '-q', '-b', 'main', fx.repo);
  for (const [key, value] of [['user.email', 'test@example.invalid'], ['user.name', 'Test'], ['commit.gpgsign', 'false'], ['core.autocrlf', 'false']]) {
    git(fx.repo, 'config', key, value);
  }
  fs.writeFileSync(path.join(fx.repo, '.gitignore'), 'node_modules/\n.claude/\n');
  git(fx.repo, 'add', '.gitignore');
  commit(fx.repo, 'README.md', 'base\n', 'base');
  git(fx.repo, 'remote', 'add', 'origin', fx.remote);
  git(fx.repo, 'push', '-q', '-u', 'origin', 'main');
  git(fx.repo, 'remote', 'set-head', 'origin', 'main');

  // A second clone stands in for GitHub merging pull requests.
  fx.hub = path.join(root, 'hub');
  git(root, 'clone', '-q', fx.remote, fx.hub);
  for (const [key, value] of [['user.email', 'hub@example.invalid'], ['user.name', 'Hub'], ['commit.gpgsign', 'false']]) git(fx.hub, 'config', key, value);

  const wt = (name) => path.join(root, 'wts', name);
  fx.wt = wt;
  const branchWorktree = (name, branch) => {
    git(fx.repo, 'worktree', 'add', '-q', '-b', branch, wt(name), 'main');
    return wt(name);
  };
  const hubMerge = (branch, mode) => {
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

  const anc = branchWorktree('anc', 'feat/anc');
  commit(anc, 'anc.txt', 'anc\n', 'anc');
  git(anc, 'push', '-q', '-u', 'origin', 'feat/anc');
  hubMerge('feat/anc', 'merge');

  const sq = branchWorktree('sq', 'feat/sq');
  fx.sqTip = commit(sq, 'sq.txt', 'sq\n', 'sq');
  git(sq, 'push', '-q', '-u', 'origin', 'feat/sq');
  fx.sqMerge = hubMerge('feat/sq', 'squash');

  const late = branchWorktree('late', 'feat/late');
  fx.lateMergedHead = commit(late, 'late.txt', 'one\n', 'late one');
  git(late, 'push', '-q', '-u', 'origin', 'feat/late');
  fx.lateMerge = hubMerge('feat/late', 'squash');
  commit(late, 'late.txt', 'two\n', 'late two');
  commit(late, 'late.txt', 'three\n', 'late three');

  const unm = branchWorktree('unm', 'feat/unm');
  fx.unmTip = commit(unm, 'unm.txt', 'unm\n', 'unm');

  const closed = branchWorktree('closed', 'feat/closed');
  fx.closedTip = commit(closed, 'closed.txt', 'closed\n', 'closed');

  const open = branchWorktree('open', 'feat/open');
  fx.openTip = commit(open, 'open.txt', 'open\n', 'open');
  git(open, 'push', '-q', '-u', 'origin', 'feat/open');

  const wip = branchWorktree('wip', 'feat/wip');
  fs.writeFileSync(path.join(wip, 'README.md'), 'edited\n');

  const scr = branchWorktree('scr', 'feat/scr');
  fs.writeFileSync(path.join(scr, 'notes.txt'), 'scratch\n');

  // Detached at the squash-merged pull request's head: only ancestry can prove a
  // detached head, so this must not borrow the branch's squash proof.
  git(fx.repo, 'worktree', 'add', '-q', '--detach', wt('det'), fx.sqTip);

  const gone = branchWorktree('gone', 'feat/gone');
  commit(gone, 'gone.txt', 'gone\n', 'gone');
  git(gone, 'push', '-q', '-u', 'origin', 'feat/gone');
  git(fx.hub, 'push', '-q', 'origin', '--delete', 'feat/gone');

  git(fx.repo, 'worktree', 'add', '-q', '--detach', wt('here'), 'main');

  // Runtime roots, each detached at main.
  fx.runtimePaths = {
    'codex-app': path.join(root, '.codex-worktrees', 'h1', 'repo'),
    'codex-home': path.join(fx.codexHome, 'worktrees', 'h2', 'repo'),
    'claude-desktop': path.join(root, '.claude-worktrees', 'repo', 'cd'),
    'claude-cli': path.join(fx.repo, '.claude', 'worktrees', 'cli'),
  };
  for (const target of Object.values(fx.runtimePaths)) git(fx.repo, 'worktree', 'add', '-q', '--detach', target, 'main');

  // x-1 and x-10 differ only by a suffix; a prefix match would confuse them.
  for (const name of ['x-1', 'x-10']) git(fx.repo, 'worktree', 'add', '-q', '--detach', wt(name), 'main');
  fx.shared = path.join(root, 'shared');
  fs.mkdirSync(fx.shared);
  fs.writeFileSync(path.join(fx.shared, 'big.bin'), Buffer.alloc(200 * 1024, 7));
  makeLink(fx.shared, path.join(wt('x-1'), 'node_modules', 'shared'));

  git(fx.repo, 'branch', 'leftover', 'main');
  git(fx.repo, 'branch', 'keep', fx.unmTip);

  fx.prs = [
    pr(12, 'MERGED', 'feat/sq', fx.sqTip, fx.sqMerge),
    pr(13, 'MERGED', 'feat/late', fx.lateMergedHead, fx.lateMerge),
    pr(14, 'CLOSED', 'feat/closed', fx.closedTip),
    pr(15, 'OPEN', 'feat/open', fx.openTip, null, true),
    pr(16, 'OPEN', 'feat/elsewhere', 'f'.repeat(40)),
  ];
});

after(() => { if (fx.root) removeOwnTemp(fx.root); });

async function inventory(args, { prs = fx.prs, cwd = fx.wt('here') } = {}) {
  const out = [];
  const err = [];
  const code = await run(args, {
    exec: fakeExec(prs),
    cwd,
    env: { CODEX_HOME: fx.codexHome },
    homedir: fx.home,
    now: () => Date.now(),
    stdout: (text) => out.push(text),
    stderr: (text) => err.push(text),
  });
  return { code, out: out.join(''), err: err.join('') };
}

const findWorktree = (report, p) => report.worktrees.find((item) => norm(item.path) === norm(p));

describe('repo inventory', () => {
  let report;
  before(async () => {
    const result = await inventory(['--repo', fx.repo, '--json']);
    assert.equal(result.code, 0, result.err);
    report = JSON.parse(result.out);
  });

  test('ancestry, squash, unmerged and later-commit worktrees get distinct merged proof', () => {
    const anc = findWorktree(report, fx.wt('anc'));
    assert.equal(anc.merged.proof, 'ancestry');
    assert.equal(anc.bucket, 'retire');

    const sq = findWorktree(report, fx.wt('sq'));
    assert.equal(sq.merged.proof, 'squash');
    assert.equal(sq.merged.pr, 12);
    assert.equal(sq.bucket, 'retire');
    assert.equal(sq.pr, '#12 MERGED');

    const late = findWorktree(report, fx.wt('late'));
    assert.equal(late.merged.proof, 'none');
    assert.match(late.merged.reason, /2 commits after merged head #13/);
    assert.equal(late.bucket, 'review');

    const unm = findWorktree(report, fx.wt('unm'));
    assert.equal(unm.merged.proof, 'none');
    assert.match(unm.merged.reason, /no pull request/);
    assert.equal(unm.bucket, 'review');

    const closed = findWorktree(report, fx.wt('closed'));
    assert.equal(closed.merged.proof, 'none');
    assert.match(closed.merged.reason, /#14 closed unmerged/);
  });

  test('an open pull request holds its worktree', () => {
    const open = findWorktree(report, fx.wt('open'));
    assert.equal(open.pr, '#15 OPEN');
    assert.equal(open.bucket, 'hold-open-pr');
    assert.equal(open.upstream, 'pushed');
  });

  test('tracked edits are wip and untracked-only content is scratch', () => {
    const wip = findWorktree(report, fx.wt('wip'));
    assert.equal(wip.dirty, 'wip:1');
    assert.equal(wip.bucket, 'hold-uncommitted');
    const scr = findWorktree(report, fx.wt('scr'));
    assert.equal(scr.dirty, 'scratch:1');
    assert.equal(scr.bucket, 'hold-uncommitted');
    assert.equal(findWorktree(report, fx.wt('anc')).dirty, 'clean');
  });

  test('a detached head proves only by ancestry, never by a branch pull request', () => {
    const det = findWorktree(report, fx.wt('det'));
    assert.equal(det.branch, 'detached');
    assert.equal(det.merged.proof, 'none');
    assert.match(det.merged.reason, /detached/);
    const here = findWorktree(report, fx.wt('x-10'));
    assert.equal(here.branch, 'detached');
    assert.equal(here.merged.proof, 'ancestry');
  });

  test('a deleted remote branch shows as a gone upstream; an unpushed one as none', () => {
    assert.equal(findWorktree(report, fx.wt('gone')).upstream, 'gone');
    assert.equal(findWorktree(report, fx.wt('unm')).upstream, 'none');
    const late = findWorktree(report, fx.wt('late'));
    assert.equal(late.upstream, 'ahead 2');
  });

  test('ahead and behind are counted against the remote base', () => {
    const unm = findWorktree(report, fx.wt('unm'));
    assert.equal(unm.ahead, 1);
    assert.equal(unm.behind, 4, 'a merged commit, its merge commit and two squash commits landed after feat/unm branched');
  });

  test('runtime is read from the worktree path', () => {
    assert.equal(findWorktree(report, fx.repo).runtime, 'main');
    assert.equal(findWorktree(report, fx.repo).bucket, 'main');
    assert.equal(findWorktree(report, fx.runtimePaths['codex-app']).runtime, 'codex-app');
    assert.equal(findWorktree(report, fx.runtimePaths['codex-home']).runtime, 'codex-app');
    assert.equal(findWorktree(report, fx.runtimePaths['claude-desktop']).runtime, 'claude-desktop');
    assert.equal(findWorktree(report, fx.runtimePaths['claude-cli']).runtime, 'claude-cli');
    assert.equal(findWorktree(report, fx.wt('anc')).runtime, 'plain');
  });

  test('the calling directory marks its worktree current', () => {
    const here = findWorktree(report, fx.wt('here'));
    assert.equal(here.current, true);
    assert.equal(here.bucket, 'current');
    assert.equal(findWorktree(report, fx.wt('anc')).current, false);
  });

  test('local branches with no worktree are listed with their own proof', () => {
    const names = report.branches.map((item) => item.name);
    assert.ok(names.includes('leftover'));
    assert.ok(names.includes('keep'));
    assert.equal(names.includes('feat/anc'), false, 'a branch checked out in a worktree is not a leftover');
    const leftover = report.branches.find((item) => item.name === 'leftover');
    assert.equal(leftover.merged.proof, 'ancestry');
    assert.equal(leftover.bucket, 'retire');
    assert.equal(report.branches.find((item) => item.name === 'keep').bucket, 'review');
  });

  test('open pull requests say whether anything local exists for them', () => {
    const open = report.openPullRequests.find((item) => item.number === 15);
    assert.equal(open.draft, true);
    assert.equal(open.local, 'worktree');
    assert.equal(report.openPullRequests.find((item) => item.number === 16).local, 'none');
  });

  test('the JSON report has a stable shape', () => {
    for (const key of ['repo', 'remote', 'base', 'fetched', 'pullRequests', 'notes', 'worktrees', 'branches', 'openPullRequests']) {
      assert.ok(key in report, `missing ${key}`);
    }
    assert.equal(report.remote, 'origin');
    assert.equal(report.base, 'main');
    assert.equal(report.fetched, true);
    assert.equal(report.pullRequests, 'available');
    const sample = findWorktree(report, fx.wt('sq'));
    for (const key of ['path', 'runtime', 'branch', 'head', 'ageDays', 'dirty', 'locked', 'prunable', 'upstream', 'ahead', 'behind', 'pr', 'merged', 'current', 'bucket']) {
      assert.ok(key in sample, `worktree is missing ${key}`);
    }
    assert.equal(sample.head, fx.sqTip.slice(0, 7));
    assert.equal(sample.ageDays, 0);
  });
});

test('when gh fails, pull request fields are unknown and the report still completes', async () => {
  const json = await inventory(['--repo', fx.repo, '--json', '--no-fetch'], { prs: null });
  assert.equal(json.code, 0, json.err);
  const report = JSON.parse(json.out);
  assert.equal(report.pullRequests, 'unavailable');
  assert.equal(report.fetched, false);
  const sq = findWorktree(report, fx.wt('sq'));
  assert.equal(sq.pr, 'unknown');
  assert.equal(sq.merged.proof, 'none');
  assert.match(sq.merged.reason, /pull request data unavailable/);
  assert.equal(findWorktree(report, fx.wt('anc')).merged.proof, 'ancestry');

  const text = await inventory(['--repo', fx.repo, '--no-fetch'], { prs: null });
  assert.equal(text.code, 0);
  assert.equal((text.out.match(/pull request data unavailable/gi) || []).length + (text.err.match(/pull request data unavailable/gi) || []).length, 1, 'said once');
});

test('the plain-text report leads each table with the bucket', async () => {
  const result = await inventory(['--repo', fx.repo, '--no-fetch']);
  assert.equal(result.code, 0, result.err);
  const headers = result.out.split('\n').filter((line) => /^BUCKET\s/.test(line));
  assert.equal(headers.length, 2, 'worktree and branch tables');
  assert.match(result.out, /^retire\s+.*feat\/sq/m);
  assert.match(result.out, /Open pull requests/);
});

test('--sizes does not follow a link out of the worktree', async () => {
  const result = await inventory(['--repo', fx.repo, '--json', '--no-fetch', '--sizes']);
  const report = JSON.parse(result.out);
  const x1 = findWorktree(report, fx.wt('x-1'));
  assert.equal(typeof x1.size, 'number');
  assert.ok(x1.size > 0 && x1.size < 100 * 1024, `size ${x1.size} must not include the 200 KB link target`);
});

test('--chats matches x-1 and x-10 by exact path, in every spelling', async (t) => {
  if (spawnSync('rg', ['--version']).error) { t.skip('rg is not installed'); return; }
  const x1 = fx.wt('x-1');
  const x10 = fx.wt('x-10');
  const projects = path.join(fx.home, '.claude', 'projects', 'p');
  const sessions = path.join(fx.home, '.codex', 'sessions', '2026');
  fs.mkdirSync(projects, { recursive: true });
  fs.mkdirSync(sessions, { recursive: true });
  // The newer transcript mentions only x-10, JSON-escaped with backslashes.
  const escaped = JSON.stringify({ cwd: `${x10.replace(/\//g, '\\')}\\src` });
  const newer = path.join(projects, 'newer.jsonl');
  fs.writeFileSync(newer, `${escaped}\n`);
  // The older one mentions x-1 with forward slashes.
  const older = path.join(sessions, 'older.jsonl');
  fs.writeFileSync(older, `{"cmd":"cd ${x1.replace(/\\/g, '/')}/src"}\n`);
  const past = new Date(Date.now() - 3 * 86400 * 1000);
  fs.utimesSync(older, past, past);

  const result = await inventory(['--repo', fx.repo, '--json', '--no-fetch', '--chats']);
  const report = JSON.parse(result.out);
  assert.equal(norm(findWorktree(report, x10).chat.file), norm(newer));
  assert.equal(norm(findWorktree(report, x1).chat.file), norm(older));
  assert.equal(findWorktree(report, fx.wt('anc')).chat, null);
});

test('usage errors exit 2 and a non-repository exits 1', async () => {
  assert.equal((await inventory(['--bogus'])).code, 2);
  const notRepo = path.join(fx.root, 'home');
  fs.mkdirSync(notRepo, { recursive: true });
  // The temp root may itself sit inside a repository (run-all points TEMP at
  // .local/checks), so stop git's discovery at the fixture root.
  const ceiling = process.env.GIT_CEILING_DIRECTORIES;
  process.env.GIT_CEILING_DIRECTORIES = fx.root;
  let result;
  try { result = await inventory(['--repo', notRepo, '--no-fetch']); }
  finally { if (ceiling === undefined) delete process.env.GIT_CEILING_DIRECTORIES; else process.env.GIT_CEILING_DIRECTORIES = ceiling; }
  assert.equal(result.code, 1);
  assert.match(result.err, /not a git repository/i);
});
