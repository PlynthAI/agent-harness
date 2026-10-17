// Fixture coverage for scripts/skillopt_review.py. Case-set validation needs
// only Python; the engine cases need the pinned SkillOpt environment and are
// skipped, by name, when it has not been set up on this machine.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const runner = resolve(here, '..', 'scripts', 'skillopt_review.py');
const python = process.env.HARNESS_TEST_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

function enginePython() {
  if (process.env.HARNESS_SKILLOPT_PYTHON) return process.env.HARNESS_SKILLOPT_PYTHON;
  const common = spawnSync('git', ['-C', here, 'rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8' });
  if (common.status !== 0) return '';
  const venv = join(dirname(common.stdout.trim()), '.local', 'workspace', 'artifacts', 'skillopt-review', 'engine', '.venv');
  return process.platform === 'win32' ? join(venv, 'Scripts', 'python.exe') : join(venv, 'bin', 'python');
}
const engine = enginePython();
const noEngine = existsSync(engine) ? false : `pinned SkillOpt engine not set up (${engine || 'no path'})`;

const SKILL = '---\nname: demo\n---\n# Demo\n\nAnswer the question.\n';

function task(id, split, n, tag = 'rule:wrap-answer', extra = {}) {
  return { id, group: `g-${id}`, split, intent: `Question ${id} about topic ${n}`,
    reference_kind: 'exact', reference: `ans${n}`, tags: [tag], ...extra };
}

function cases(overrides = {}) {
  return {
    format: 'harness.skillopt.cases.v1', skill: 'demo', issue: 'Answers are not wrapped.',
    reviewed: false, context: ['AGENTS.md'],
    tasks: [task('t1', 'train', 1), task('t2', 'train', 2), task('v1', 'val', 3), task('v2', 'val', 4),
      task('x1', 'test', 5), task('x2', 'test', 6)],
    ...overrides,
  };
}

function fixture(caseSet = cases()) {
  const root = mkdtempSync(join(tmpdir(), 'skillopt-review-'));
  const src = join(root, 'src');
  mkdirSync(join(src, 'config'), { recursive: true });
  mkdirSync(join(src, 'skills', 'demo'), { recursive: true });
  writeFileSync(join(src, 'config', 'install-map.json'), '{}');
  writeFileSync(join(src, 'skills', 'demo', 'SKILL.md'), SKILL);
  writeFileSync(join(src, 'AGENTS.md'), 'Shared policy.\n');
  writeFileSync(join(root, 'cases.json'), JSON.stringify(caseSet));
  return { root, src, ws: join(root, 'ws'), cases: join(root, 'cases.json'),
    done: () => rmSync(root, { recursive: true, force: true }) };
}

function run(fx, command, extra = [], env = {}) {
  const args = [runner, command, '--source', fx.src, '--cases', fx.cases, ...extra];
  if (command === 'run') args.push('--workspace', fx.ws, '--engine-python', engine);
  const r = spawnSync(python, args, { encoding: 'utf8', env: { ...process.env, ...env } });
  return { status: r.status, out: `${r.stdout}\n${r.stderr}` };
}

function runRecord(fx, out) {
  const id = JSON.parse(out.trim().split('\n').filter((l) => l.startsWith('{')).pop()).run;
  return join(fx.ws, 'runs', id);
}

function packets(fx) {
  const dir = join(fx.src, '.local', 'proposals');
  return existsSync(dir) ? readdirSync(dir) : [];
}

function rejects(caseSet, pattern, extra = []) {
  const fx = fixture(caseSet);
  try {
    const r = run(fx, 'check', extra);
    assert.equal(r.status, 2, r.out);
    assert.match(r.out, pattern);
  } finally { fx.done(); }
}

test('a reviewed-shape case set is accepted and summarised', () => {
  const fx = fixture();
  try {
    const r = run(fx, 'check');
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /skill demo, 2 train \/ 2 val \/ 2 test/);
  } finally { fx.done(); }
});

test('an incident split across train and holdout is rejected as a leak', () => {
  const c = cases();
  c.tasks[2].group = 'g-t1';
  rejects(c, /group 'g-t1' spans train and val/);
});

test('the same intent in two splits is rejected as a leak', () => {
  const c = cases();
  c.tasks[4].intent = c.tasks[0].intent;
  rejects(c, /same intent appears in train and test/);
});

test('fewer than two validation or test tasks is rejected', () => {
  const c = cases();
  c.tasks = c.tasks.filter((t) => t.id !== 'x2');
  rejects(c, /test has 1 task\(s\); at least 2/);
});

test('a judge that only checks answer shape is rejected', () => {
  const c = cases();
  c.tasks[0] = { ...c.tasks[0], reference_kind: 'rule', judge: { checks: [{ op: 'min_chars', arg: 10 }] } };
  rejects(c, /only the shape of the answer/);
});

test('an unscored task kind is rejected', () => {
  const c = cases();
  c.tasks[0] = { ...c.tasks[0], reference_kind: 'rubric' };
  rejects(c, /reference_kind must be 'rule' or 'exact'/);
});

test('context outside the evaluated source is rejected', () => {
  rejects(cases({ context: ['../outside.md'] }), /context path escapes the source/);
});

test('a model-backed run refuses an unreviewed case set', () => {
  rejects(cases(), /needs a reviewed case set/, ['--backend', 'codex']);
});

test('a model-backed optimizer alone still needs a reviewed case set', () => {
  const fx = fixture();
  try {
    const r = run(fx, 'run', ['--optimizer-backend', 'claude']);
    assert.equal(r.status, 2, r.out);
    assert.match(r.out, /needs a reviewed case set/);
  } finally { fx.done(); }
});

test('an unknown backend is rejected rather than run as mock', () => {
  rejects(cases({ reviewed: true }), /unknown backend codx/, ['--backend', 'codx']);
});

test('a judge op the pilot cannot score safely is rejected', () => {
  const c = cases();
  c.tasks[0] = { ...c.tasks[0], reference_kind: 'rule',
    judge: { checks: [{ op: 'contains', arg: 'x' }, { op: 'tool_called', arg: 'Bash' }] } };
  rejects(c, /unsupported judge op\(s\) tool_called/);
});

test('a folder without the install map is not treated as the harness source', () => {
  const fx = fixture();
  try {
    rmSync(join(fx.src, 'config', 'install-map.json'));
    const r = run(fx, 'check');
    assert.equal(r.status, 2, r.out);
    assert.match(r.out, /is not the harness source/);
  } finally { fx.done(); }
});

test('a gated improvement is staged as a review packet and never touches the source', { skip: noEngine }, () => {
  const fx = fixture();
  try {
    const r = run(fx, 'run');
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /demo: candidate/);
    assert.equal(readFileSync(join(fx.src, 'skills', 'demo', 'SKILL.md'), 'utf8'), SKILL);
    const [packet] = packets(fx);
    assert.ok(packet, 'a packet is staged');
    const dir = join(fx.src, '.local', 'proposals', packet);
    assert.match(readFileSync(join(dir, 'SKILL.md.patch'), 'utf8'), /^\+- Always wrap the final answer/m);
    const result = JSON.parse(readFileSync(join(dir, 'result.json'), 'utf8'));
    assert.equal(result.test_candidate > result.test_baseline, true);
    assert.equal(result.settings.backend, 'mock');
  } finally { fx.done(); }
});

test('an unchanged source and case set is skipped without a model call', { skip: noEngine }, () => {
  const fx = fixture();
  try {
    assert.equal(run(fx, 'run').status, 0);
    const again = run(fx, 'run');
    assert.equal(again.status, 0, again.out);
    assert.match(again.out, /skipped without a model call/);
    writeFileSync(join(fx.src, 'AGENTS.md'), 'Changed policy.\n');
    assert.doesNotMatch(run(fx, 'run').out, /skipped/);
  } finally { fx.done(); }
});

test('a candidate that does not improve the untouched test split is not staged', { skip: noEngine }, () => {
  const c = cases();
  c.tasks = c.tasks.map((t) => (t.split === 'test' ? { ...t, tags: ['rule:__harmful__'] } : t));
  const fx = fixture(c);
  try {
    const r = run(fx, 'run');
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /rejected-on-test/);
    assert.deepEqual(packets(fx), []);
  } finally { fx.done(); }
});

test('a source nested inside another repository keeps its packet in its own .local', { skip: noEngine }, () => {
  const fx = fixture();
  try {
    assert.equal(spawnSync('git', ['init', '--quiet', fx.root]).status, 0);
    const r = run(fx, 'run');
    assert.equal(r.status, 0, r.out);
    assert.equal(packets(fx).length, 1, r.out);
    assert.equal(existsSync(join(fx.root, '.local')), false, 'nothing is staged in the enclosing repository');
  } finally { fx.done(); }
});

test("the operator's SkillOpt overrides do not reach the engine", { skip: noEngine }, () => {
  const fx = fixture();
  try {
    const r = run(fx, 'run', [], { SKILLOPT_SLEEP_PROMPTS_PATH: join(fx.root, 'operator-prompts.json') });
    assert.equal(r.status, 0, r.out);
    const record = runRecord(fx, r.out);
    const engineResult = JSON.parse(readFileSync(join(record, 'engine-result.json'), 'utf8'));
    assert.match(engineResult.prompts_path, /[\\/]home[\\/]prompts\.json$/);
    assert.doesNotMatch(engineResult.prompts_path, /operator-prompts/);
    assert.ok(existsSync(join(record, 'sandbox', 'project', 'skills', 'demo', 'SKILL.md')), 'the sandbox is kept with the run');
  } finally { fx.done(); }
});

test('a second run waits for the one holding the lock', { skip: noEngine }, () => {
  const fx = fixture();
  try {
    mkdirSync(join(fx.ws, 'runs'), { recursive: true });
    writeFileSync(join(fx.ws, 'runs', '.lock'), '{}');
    const r = run(fx, 'run');
    assert.equal(r.status, 2, r.out);
    assert.match(r.out, /one run at a time/);
  } finally { fx.done(); }
});
