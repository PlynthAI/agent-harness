import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Every fixture is a throwaway git repository under the OS temp folder.
const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'mutation-runner.mjs');

const sandboxes = [];
test.after(() => {
  for (const dir of sandboxes) rmSync(dir, { recursive: true, force: true });
});

function git(cwd, ...args) {
  const result = spawnSync('git', ['-c', 'user.name=fixture', '-c', 'user.email=fixture@example.invalid', ...args], {
    cwd, encoding: 'utf8', windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

// A small project: calc.mjs is committed and then edited, so the file under
// mutation is dirty, as a candidate in progress usually is. check-all covers
// add and sub; check-add covers add only; nothing covers greet.
const CALC_COMMITTED = 'export const add = (a, b) => a + b;\nexport const sub = (a, b) => a - b;\n';
const CALC = `${CALC_COMMITTED}export const greet = (name) => 'hi ' + name;\n`;

function fixture(extraFiles = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'mutation-runner-'));
  sandboxes.push(root);
  const files = {
    'src/calc.mjs': CALC_COMMITTED,
    'check-all.mjs': "import { add, sub } from './src/calc.mjs';\nprocess.exit(add(2, 3) === 5 && sub(5, 3) === 2 ? 0 : 1);\n",
    'check-add.mjs': "import { add } from './src/calc.mjs';\nprocess.exit(add(2, 3) === 5 ? 0 : 1);\n",
    ...extraFiles,
  };
  for (const [relative, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    writeFileSync(path.join(root, relative), text);
  }
  git(root, 'init', '-q');
  git(root, 'config', 'core.autocrlf', 'false');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'fixture');
  writeFileSync(path.join(root, 'src/calc.mjs'), CALC);
  writeFileSync(path.join(root, 'notes.txt'), 'untracked\n');
  return root;
}

function writeMutants(root, mutants, selections) {
  const file = path.join(root, '..', `${path.basename(root)}-mutants.json`);
  sandboxes.push(file);
  writeFileSync(file, JSON.stringify({ selections, mutants }, null, 2));
  return file;
}

const SELECTIONS = [
  { name: 'all', command: 'node check-all.mjs' },
  { name: 'add', command: 'node check-add.mjs' },
];

const MUTANTS = [
  { id: 'M1', path: 'src/calc.mjs', anchor: 'add = (a, b) => a + b', replacement: 'add = (a, b) => a - b', heldOut: false },
  { id: 'M2', path: 'src/calc.mjs', anchor: "'hi '", replacement: "'yo '", heldOut: false },
  { id: 'M3', path: 'src/calc.mjs', anchor: 'sub = (a, b) => a - b', replacement: 'sub = (a, b) => a + b', heldOut: true },
];

function run(root, ...args) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8', timeout: 120000, windowsHide: true });
  assert.equal(result.error, undefined, 'the runner finishes');
  return { status: result.status, out: result.stdout + result.stderr };
}

test('a run scores the gate and the held-out set apart and leaves the checkout as it found it', () => {
  const root = fixture();
  const mutants = writeMutants(root, MUTANTS, SELECTIONS);
  const out = path.join(root, '..', `${path.basename(root)}-results.json`);
  sandboxes.push(out);
  const statusBefore = git(root, 'status', '--porcelain');
  const head = git(root, 'rev-parse', 'HEAD').trim();

  const result = run(root, mutants, '--out', out);
  assert.equal(result.status, 0, result.out);

  const report = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(report.head, head);
  assert.deepEqual(report.dirty, [' M src/calc.mjs', '?? notes.txt']);
  assert.deepEqual(
    report.mutants.map(({ id, heldOut, detectedBy }) => ({ id, heldOut, detectedBy })),
    [
      { id: 'M1', heldOut: false, detectedBy: ['all', 'add'] },
      { id: 'M2', heldOut: false, detectedBy: [] },
      { id: 'M3', heldOut: true, detectedBy: ['all'] },
    ],
  );
  assert.deepEqual(report.scores, {
    gate: { all: { detected: 1, total: 2 }, add: { detected: 1, total: 2 } },
    heldOut: { all: { detected: 1, total: 1 }, add: { detected: 0, total: 1 } },
  });
  assert.equal(readFileSync(path.join(root, 'src/calc.mjs'), 'utf8'), CALC);
  assert.equal(git(root, 'status', '--porcelain'), statusBefore);
});

test('a non-unique or missing anchor refuses the whole set before anything runs', () => {
  const root = fixture({ 'mark.mjs': "import { writeFileSync } from 'node:fs';\nwriteFileSync('ran.txt', 'x');\n" });
  const mutants = writeMutants(root, [
    MUTANTS[0],
    { id: 'M4', path: 'src/calc.mjs', anchor: '(a, b) =>', replacement: '(b, a) =>', heldOut: false },
    { id: 'M5', path: 'src/calc.mjs', anchor: 'mul = ', replacement: 'div = ', heldOut: true },
  ], [{ name: 'mark', command: 'node mark.mjs' }]);
  const out = path.join(root, '..', `${path.basename(root)}-results.json`);

  for (const args of [['--dry-run'], ['--out', out]]) {
    const result = run(root, mutants, ...args);
    assert.equal(result.status, 2, result.out);
    assert.match(result.out, /M4: anchor found 2 times/);
    assert.match(result.out, /M5: anchor found 0 times/);
    assert.doesNotMatch(result.out, /M1:/);
  }
  assert.equal(existsSync(path.join(root, 'ran.txt')), false, 'no selection ran');
  assert.equal(existsSync(out), false, 'no results were written');
  assert.equal(readFileSync(path.join(root, 'src/calc.mjs'), 'utf8'), CALC);
});

test('a selection that fails unmutated stops the run before any mutant is scored', () => {
  const root = fixture();
  const mutants = writeMutants(root, MUTANTS, [...SELECTIONS, { name: 'red', command: 'node -e "process.exit(3)"' }]);
  const out = path.join(root, '..', `${path.basename(root)}-results.json`);
  sandboxes.push(out);

  const result = run(root, mutants, '--out', out);
  assert.equal(result.status, 1, result.out);
  assert.match(result.out, /unmutated run failed \(red\)/);
  const report = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(report.control.red.exit, 3);
  assert.deepEqual(report.mutants, []);
});

// A mutant that makes a selection loop forever is caught by the time limit,
// which stops the selection's whole process tree and puts the file back.
const LOOP = 'let i = 0;\nwhile (i < 3) i += 1;\n';

const TREE = [
  "import { spawn } from 'node:child_process';",
  "import { existsSync, renameSync, writeFileSync } from 'node:fs';",
  "import { add } from './src/calc.mjs';",
  "if (process.env.TREE_PHASE === 'mutant' && add(2, 3) === 5) process.exit(0);",
  'const level = Number(process.argv[2] ?? 0);',
  'const marker = `${process.env.TREE_MARKER}-${level}`;',
  "writeFileSync(`${marker}.tmp`, JSON.stringify({ pid: process.pid, parent: process.ppid, startedAt: new Date().toISOString(), checkout: process.cwd() }));",
  'renameSync(`${marker}.tmp`, marker);',
  "if (level < 2) spawn(process.execPath, ['tree.mjs', String(level + 1)], { stdio: 'ignore', windowsHide: true });",
  'setInterval(() => {}, 1000);',
  '',
].join('\n');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function running(pid) {
  try {
    process.kill(pid, 0);
    // An orphan killed on Linux may await reaping by init; it is stopped.
    if (process.platform === 'linux' && readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ')[1].startsWith('Z ')) return false;
    return true;
  } catch (error) {
    if (error.code === 'ESRCH' || error.code === 'ENOENT') return false;
    throw error;
  }
}

async function startTree(root, phase, timeout) {
  const mutants = writeMutants(root, [MUTANTS[0]], [{ name: 'tree', command: 'node tree.mjs' }]);
  const out = path.join(root, '..', `${path.basename(root)}-results.json`);
  const marker = path.join(root, '..', `${path.basename(root)}-tree`);
  const markers = [0, 1, 2].map((level) => `${marker}-${level}`);
  sandboxes.push(out, ...markers, ...markers.map((file) => `${file}.tmp`));
  const runner = spawn(process.execPath, [script, mutants, '--out', out, '--timeout', String(timeout)], {
    cwd: root, env: { ...process.env, TREE_MARKER: marker, TREE_PHASE: phase }, windowsHide: true, stdio: 'ignore',
  });
  const exited = new Promise((resolve) => runner.once('exit', (code, signal) => resolve({ code, signal })));
  const cleanup = async () => {
    // Every PID here comes from this fixture's child handle or identity marker.
    if (running(runner.pid)) {
      if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(runner.pid), '/T', '/F'], { windowsHide: true });
      else runner.kill('SIGKILL');
    }
    for (const file of [...markers].reverse()) {
      if (!existsSync(file)) continue;
      const { pid } = JSON.parse(readFileSync(file, 'utf8'));
      if (running(pid)) {
        if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true });
        else process.kill(pid, 'SIGKILL');
      }
    }
    await exited;
  };
  try {
    let deadline;
    while (!markers.every(existsSync)) {
      assert.equal(runner.exitCode, null, 'the runner remains alive until its fixture starts');
      assert.equal(runner.signalCode, null, 'the runner was not killed before its fixture started');
      // Git preflight and the control run precede this selection. Its first
      // marker starts the descendant budget, rather than unrelated startup.
      if (existsSync(markers[0])) deadline ??= Date.now() + 5000;
      if (deadline) assert.ok(Date.now() < deadline, 'all fixture descendants started');
      await delay(20);
    }
    return { runner, exited, cleanup, out, descendants: markers.map((file) => JSON.parse(readFileSync(file, 'utf8'))) };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

test('timeout stops the selection descendants, preserves unrelated processes and restores mutant bytes', async (t) => {
  const root = fixture({ 'tree.mjs': TREE });
  const statusBefore = git(root, 'status', '--porcelain');
  const unrelated = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore', windowsHide: true });
  const unrelatedExited = new Promise((resolve) => unrelated.once('exit', resolve));
  let tree;
  try {
    tree = await startTree(root, 'mutant', 1);
    t.diagnostic(JSON.stringify({ runner: tree.runner.pid, checkout: root, descendants: tree.descendants, unrelated: unrelated.pid }));
    const result = await Promise.race([tree.exited, delay(4000).then(() => null)]);
    assert.ok(result, 'timeout finishes the runner without descendants holding its pipes open');
    assert.equal(result.code, 0);
    assert.deepEqual(tree.descendants.filter(({ pid }) => running(pid)), [], 'all owned descendants stopped');
    assert.equal(running(unrelated.pid), true, 'an unrelated process stays alive');
    const report = JSON.parse(readFileSync(tree.out, 'utf8'));
    assert.equal(report.mutants[0].selections.tree.timedOut, true);
    assert.deepEqual(report.mutants[0].detectedBy, ['tree']);
    assert.equal(report.checkoutUnchanged, true);
    assert.equal(readFileSync(path.join(root, 'src/calc.mjs'), 'utf8'), CALC);
    assert.equal(git(root, 'status', '--porcelain'), statusBefore);
    assert.equal(existsSync(path.join(root, '.git', 'mutation-runner-pending.json')), false);
    assert.equal(existsSync(path.join(root, '.git', 'mutation-runner-pending.original')), false);
  } finally {
    if (tree) await tree.cleanup();
    unrelated.kill('SIGKILL');
    await unrelatedExited;
  }
});

for (const [phase, signal] of [['control', 'SIGTERM'], ['mutant', 'SIGINT']]) {
  test(`cancellation during ${phase} stops descendants, preserves unrelated processes and restores bytes`, {
    skip: process.platform === 'win32' && 'Windows Node process signals forcibly terminate instead of invoking signal handlers',
  }, async (t) => {
    const root = fixture({ 'tree.mjs': TREE });
    const statusBefore = git(root, 'status', '--porcelain');
    const unrelated = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore', windowsHide: true });
    const unrelatedExited = new Promise((resolve) => unrelated.once('exit', resolve));
    let tree;
    try {
      tree = await startTree(root, phase, 30);
      t.diagnostic(JSON.stringify({ signal, phase, runner: tree.runner.pid, checkout: root, descendants: tree.descendants, unrelated: unrelated.pid }));
      tree.runner.kill(signal);
      const result = await Promise.race([tree.exited, delay(4000).then(() => null)]);
      assert.ok(result, 'cancellation finishes the runner');
      assert.equal(result.code, 128 + os.constants.signals[signal]);
      assert.deepEqual(tree.descendants.filter(({ pid }) => running(pid)), [], 'all owned descendants stopped');
      assert.equal(running(unrelated.pid), true, 'an unrelated process stays alive');
      assert.equal(readFileSync(path.join(root, 'src/calc.mjs'), 'utf8'), CALC);
      assert.equal(git(root, 'status', '--porcelain'), statusBefore);
      assert.equal(existsSync(path.join(root, '.git', 'mutation-runner-pending.json')), false);
      assert.equal(existsSync(path.join(root, '.git', 'mutation-runner-pending.original')), false);
    } finally {
      if (tree) await tree.cleanup();
      unrelated.kill('SIGKILL');
      await unrelatedExited;
    }
  });
}

test('normal completion stops background descendants in the owned POSIX process group', {
  skip: process.platform === 'win32' && 'Windows taskkill needs a live root process; POSIX group completion is covered here',
}, async (t) => {
  const completingTree = TREE.replace('setInterval(() => {}, 1000);', "if (level === 0) setInterval(() => { if (existsSync(`${process.env.TREE_MARKER}-2`)) process.exit(0); }, 20); else setInterval(() => {}, 1000);");
  const root = fixture({ 'tree.mjs': completingTree });
  const tree = await startTree(root, 'mutant', 30);
  try {
    t.diagnostic(JSON.stringify({ runner: tree.runner.pid, checkout: root, descendants: tree.descendants }));
    const result = await Promise.race([tree.exited, delay(4000).then(() => null)]);
    assert.ok(result, 'the runner completes');
    assert.equal(result.code, 0);
    assert.deepEqual(tree.descendants.filter(({ pid }) => running(pid)), [], 'background descendants stopped on completion');
    assert.equal(JSON.parse(readFileSync(tree.out, 'utf8')).checkoutUnchanged, true);
  } finally {
    await tree.cleanup();
  }
});

test('a selection that outlives the time limit is stopped and detects the mutant', { timeout: 60000 }, () => {
  const root = fixture({ 'loop.mjs': LOOP });
  const mutants = writeMutants(root, [{ id: 'L1', path: 'loop.mjs', anchor: 'i += 1', replacement: 'i += 0', heldOut: false }], [{ name: 'loop', command: 'node loop.mjs' }]);
  const out = path.join(root, '..', `${path.basename(root)}-results.json`);
  sandboxes.push(out);
  const started = Date.now();

  const result = spawnSync(process.execPath, [script, mutants, '--out', out, '--timeout', '1'], { cwd: root, encoding: 'utf8', timeout: 30000, windowsHide: true });
  assert.equal(result.error, undefined, 'the runner finishes');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.ok(Date.now() - started < 20000, 'the limit, not the test timeout, ended the selection');
  const report = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(report.control.loop.timedOut, undefined);
  assert.equal(report.mutants[0].selections.loop.timedOut, true);
  assert.deepEqual(report.mutants[0].detectedBy, ['loop']);
  assert.deepEqual(report.scores.gate, { loop: { detected: 1, total: 1 } });
  assert.equal(readFileSync(path.join(root, 'loop.mjs'), 'utf8'), LOOP);
  assert.equal(existsSync(path.join(root, '.git', 'mutation-runner-pending.json')), false, 'no journal is left');
});

test('a selection that outlives the time limit unmutated stops the run before any mutant is scored', { timeout: 60000 }, () => {
  const root = fixture();
  const mutants = writeMutants(root, MUTANTS, [{ name: 'hang', command: 'node -e "setInterval(() => {}, 1000)"' }]);
  const out = path.join(root, '..', `${path.basename(root)}-results.json`);
  sandboxes.push(out);

  const result = spawnSync(process.execPath, [script, mutants, '--out', out, '--timeout', '1'], { cwd: root, encoding: 'utf8', timeout: 30000, windowsHide: true });
  assert.equal(result.error, undefined, 'the runner finishes');
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout + result.stderr, /unmutated run failed \(hang\)/);
  const report = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(report.control.hang.timedOut, true);
  assert.deepEqual(report.mutants, []);
});

test('a time limit that is not a positive number is refused', () => {
  const root = fixture();
  const mutants = writeMutants(root, [MUTANTS[0]], SELECTIONS);
  const result = run(root, mutants, '--dry-run', '--timeout', 'soon');
  assert.equal(result.status, 2, result.out);
  assert.match(result.out, /--timeout must be a positive number of seconds/);
});

test('a mutant path outside the checkout is refused', () => {
  const root = fixture();
  const mutants = writeMutants(root, [{ ...MUTANTS[0], path: '../outside.mjs' }], SELECTIONS);
  const result = run(root, mutants, '--dry-run');
  assert.equal(result.status, 2, result.out);
  assert.match(result.out, /outside the checkout/);
});

test('a results path inside the checkout or in a missing folder is refused before anything runs', () => {
  const root = fixture({ 'mark.mjs': "import { writeFileSync } from 'node:fs';\nwriteFileSync('ran.txt', 'x');\n" });
  const mutants = writeMutants(root, [MUTANTS[0]], [{ name: 'mark', command: 'node mark.mjs' }]);

  const inside = run(root, mutants, '--out', path.join(root, 'results.json'));
  assert.equal(inside.status, 2, inside.out);
  assert.match(inside.out, /inside the checkout/);
  const missing = run(root, mutants, '--out', path.join(root, '..', `${path.basename(root)}-missing`, 'results.json'));
  assert.equal(missing.status, 2, missing.out);
  assert.match(missing.out, /does not exist/);
  assert.equal(existsSync(path.join(root, 'ran.txt')), false, 'no selection ran');
});

// The unmutated run here rewrites the first mutant's anchor and touches files
// that were already dirty or untracked, which a status check alone misses.
test('a selection that changes the checkout stops the run and names what changed', () => {
  const root = fixture({
    'untidy.mjs': [
      "import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';",
      "writeFileSync('stray.txt', 'x');",
      "appendFileSync('notes.txt', 'more\\n');",
      "writeFileSync('src/calc.mjs', readFileSync('src/calc.mjs', 'utf8').replace('a + b', 'b + a'));",
      '',
    ].join('\n'),
  });
  const mutants = writeMutants(root, [MUTANTS[0]], [{ name: 'untidy', command: 'node untidy.mjs' }]);
  const out = path.join(root, '..', `${path.basename(root)}-results.json`);
  sandboxes.push(out);

  const result = run(root, mutants, '--out', out);
  assert.equal(result.status, 1, result.out);
  assert.match(result.out, /before mutant M1/);
  assert.match(result.out, /git status gained: \?\? stray\.txt/);
  assert.match(result.out, /content changed: src[\\/]calc\.mjs/);
  assert.match(result.out, /content changed: notes\.txt/);
  const report = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(report.checkoutUnchanged, false);
  assert.deepEqual(report.mutants, [], 'no mutant was applied to bytes the run had already changed');
});

// A hard kill (Task Manager, taskkill /F, SIGKILL, a closed terminal) runs no
// `finally`. The next invocation must put the original bytes back before it
// does anything else, but never under a run that is still alive.
const SLOW = [
  "import { writeFileSync } from 'node:fs';",
  "import { add } from './src/calc.mjs';",
  'if (add(2, 3) !== 5) { writeFileSync(process.env.MUTANT_RUNNING, String(process.pid)); setTimeout(() => {}, 120000); }',
  '',
].join('\n');

async function startMidMutant(root) {
  const mutants = writeMutants(root, [MUTANTS[0]], [{ name: 'slow', command: 'node slow.mjs' }]);
  const out = path.join(root, '..', `${path.basename(root)}-results.json`);
  const marker = path.join(root, '..', `${path.basename(root)}-running`);
  sandboxes.push(out, marker);
  const runner = spawn(process.execPath, [script, mutants, '--out', out], {
    cwd: root, env: { ...process.env, MUTANT_RUNNING: marker }, windowsHide: true, stdio: 'ignore', detached: process.platform !== 'win32',
  });
  const exited = new Promise((resolve) => runner.on('exit', resolve));
  for (let waited = 0; !existsSync(marker); waited += 100) {
    assert.ok(waited < 60000, 'the mutant selection started');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  let killed = false;
  // On Windows a tree kill can end the selection first, and the runner then
  // restores the file before it dies: kill the runner alone, then the selection.
  const kill = async () => {
    if (killed) return;
    killed = true;
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(runner.pid), '/F'], { windowsHide: true });
      await exited;
      spawnSync('taskkill', ['/pid', readFileSync(marker, 'utf8'), '/T', '/F'], { windowsHide: true });
    } else {
      process.kill(-runner.pid, 'SIGKILL');
      await exited;
      // Selections own separate groups now, so the fixture's hard runner kill
      // deliberately leaves one alive. Release that known child separately.
      const selectionPid = Number(readFileSync(marker, 'utf8'));
      if (running(selectionPid)) process.kill(selectionPid, 'SIGKILL');
    }
  };
  return { mutants, kill };
}

test('a runner killed mid-mutant leaves a file the next invocation restores, never under a live run', async () => {
  const root = fixture({ 'slow.mjs': SLOW });
  const statusBefore = git(root, 'status', '--porcelain');
  const { mutants, kill } = await startMidMutant(root);
  try {
    const during = run(root, mutants, '--dry-run');
    assert.equal(during.status, 2, during.out);
    assert.match(during.out, /in progress/);
    assert.notEqual(readFileSync(path.join(root, 'src/calc.mjs'), 'utf8'), CALC, 'the live mutant stays in place');
  } finally {
    await kill();
  }
  assert.notEqual(readFileSync(path.join(root, 'src/calc.mjs'), 'utf8'), CALC, 'the kill landed while the mutant was applied');
  const next = run(root, mutants, '--dry-run');
  assert.equal(next.status, 0, next.out);
  assert.match(next.out, /restored src\/calc\.mjs/);
  assert.equal(readFileSync(path.join(root, 'src/calc.mjs'), 'utf8'), CALC);
  assert.equal(git(root, 'status', '--porcelain'), statusBefore);
});

test('a file edited after a killed run is left, with its journal, for a person to settle', async () => {
  const root = fixture({ 'slow.mjs': SLOW });
  const { mutants, kill } = await startMidMutant(root);
  await kill();
  writeFileSync(path.join(root, 'src/calc.mjs'), 'edited by hand\n');
  const journal = path.join(root, '.git', 'mutation-runner-pending.json');
  const journalBytes = readFileSync(journal);

  const result = run(root, mutants, '--dry-run');
  assert.equal(result.status, 2, result.out);
  assert.match(result.out, /changed after an interrupted run/);
  assert.match(result.out, /mutation-runner-pending\.original/);
  assert.equal(readFileSync(path.join(root, 'src/calc.mjs'), 'utf8'), 'edited by hand\n');
  assert.deepEqual(readFileSync(journal), journalBytes);
});

test('a truncated journal is refused with what to do about it', () => {
  const root = fixture();
  const mutants = writeMutants(root, [MUTANTS[0]], SELECTIONS);
  writeFileSync(path.join(root, '.git', 'mutation-runner-pending.json'), '{"pid": 12');

  const result = run(root, mutants, '--dry-run');
  assert.equal(result.status, 2, result.out);
  assert.match(result.out, /no mutant was applied/);
  assert.equal(readFileSync(path.join(root, 'src/calc.mjs'), 'utf8'), CALC);
});

