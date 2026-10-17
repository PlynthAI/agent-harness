// Fixture coverage for scripts/doc-bench.mjs, the document bench's key check,
// prompt renderer and scorer. The fixture is an invented four-question key; no
// model is called anywhere in this suite.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const script = resolve(here, '..', 'scripts', 'doc-bench.mjs');

function key(overrides = {}) {
  return {
    format: 'harness.docbench.key.v1',
    subject: 'demo-repo',
    commit: '0123456789abcdef0123456789abcdef01234567',
    documents: ['ARCHITECTURE.md'],
    questions: [
      { id: 'where-01', kind: 'where', split: 'core', question: 'Which folder holds the HTTP handlers?',
        match: 'exact', accept: ['src/http'] },
      { id: 'name-01', kind: 'name', split: 'core', question: 'What is the function that parses a request body?',
        match: 'exact', accept: ['parseBody'] },
      { id: 'departure-01', kind: 'departure', split: 'core', question: 'Where are database migrations kept?',
        match: 'contains', accept: ['db/changes'], reject: ['migrations/'] },
      { id: 'heldout-01', kind: 'where', split: 'heldout', question: 'Which folder holds the end-to-end tests?',
        match: 'exact', accept: ['e2e', 'tests/e2e'] },
    ],
    ...overrides,
  };
}

function scratch() {
  const root = mkdtempSync(join(tmpdir(), 'doc-bench-'));
  return { root, done: () => rmSync(root, { recursive: true, force: true }) };
}

function writeKey(dir, value = key()) {
  const path = join(dir, 'key.json');
  writeFileSync(path, JSON.stringify(value, null, 2));
  return path;
}

// One saved runner reply. `answers` maps prompt numbers to [answer, confidence].
function reply(answers) {
  return JSON.stringify({ answers: Object.entries(answers).map(([id, [answer, confidence]]) => ({ id, answer, confidence })) });
}

function writeRuns(dir, arms) {
  const answersDir = join(dir, 'answers');
  for (const [arm, runs] of Object.entries(arms)) {
    mkdirSync(join(answersDir, arm), { recursive: true });
    runs.forEach((text, i) => writeFileSync(join(answersDir, arm, `${i + 1}.txt`), text));
  }
  return answersDir;
}

const ALL_RIGHT = reply({ q1: ['src/http', 'high'], q2: ['parseBody', 'high'], q3: ['db/changes', 'high'], q4: ['tests/e2e', 'low'] });

function run(args) {
  const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout, out: `${r.stdout}\n${r.stderr}` };
}

test('a well-formed key passes the check and reports its questions by kind and split', (t) => {
  const s = scratch(); t.after(s.done);
  const r = run(['check', writeKey(s.root)]);
  assert.equal(r.status, 0, r.out);
  const report = JSON.parse(r.stdout);
  assert.deepEqual(report.questions, { total: 4, core: 3, heldout: 1 });
  assert.deepEqual(report.byKind, { where: 2, name: 1, departure: 1 });
});

test('a key the bench cannot trust is rejected with the reason', (t) => {
  const s = scratch(); t.after(s.done);
  const q = key().questions;
  const cases = [
    [{ commit: 'main' }, /commit/],
    [{ questions: [...q, { ...q[0] }] }, /duplicate id where-01/],
    [{ questions: q.filter((x) => x.split === 'core') }, /held-out/],
    [{ questions: q.filter((x) => x.kind !== 'name') }, /core question of kind name/],
    [{ questions: [...q, { ...q[0], id: 'odd-01', kind: 'style' }] }, /kind/],
    [{ questions: [...q, { ...q[0], id: 'empty-01', accept: [] }] }, /accept/],
    [{ questions: [...q, { ...q[1], id: 'rej-01', reject: ['x'] }] }, /reject/],
  ];
  for (const [overrides, pattern] of cases) {
    const r = run(['check', writeKey(s.root, key(overrides))]);
    assert.equal(r.status, 2, `${pattern}: ${r.out}`);
    assert.match(r.out, pattern);
  }
});

test('the prompt carries the document and every question, never an answer or the split', (t) => {
  const s = scratch(); t.after(s.done);
  const doc = join(s.root, 'ARCHITECTURE.md');
  writeFileSync(doc, '# Demo architecture\n\nHandlers sit beside their routes.\n');
  const r = run(['prompt', writeKey(s.root), '--document', doc]);
  assert.equal(r.status, 0, r.out);
  assert.match(r.stdout, /ARCHITECTURE\.md/);
  assert.match(r.stdout, /Handlers sit beside their routes\./);
  // Questions are numbered in key order; the key's own ids can name a split or
  // an answer, so they never reach the runner.
  key().questions.forEach((q, i) => {
    assert.ok(r.stdout.includes(`q${i + 1}: ${q.question}`), q.id);
    assert.ok(!r.stdout.includes(q.id), `leaks id ${q.id}`);
    for (const answer of q.accept) assert.ok(!r.stdout.includes(answer), `leaks ${answer}`);
  });
  assert.doesNotMatch(r.stdout, /heldout|held-out/i);
  assert.match(r.stdout, /I don't know/);
});

test('the no-document arm gets the same questions and is told it has no document', (t) => {
  const s = scratch(); t.after(s.done);
  const keyPath = writeKey(s.root);
  const doc = join(s.root, 'ARCHITECTURE.md');
  writeFileSync(doc, 'Handlers sit beside their routes.\n');
  const none = run(['prompt', keyPath]);
  const withDoc = run(['prompt', keyPath, '--document', doc]);
  assert.equal(none.status, 0, none.out);
  assert.match(none.stdout, /no document/i);
  assert.doesNotMatch(none.stdout, /Handlers sit beside/);
  const questions = (text) => text.slice(text.indexOf('q1: '));
  assert.equal(questions(none.stdout), questions(withDoc.stdout));
});

test('the score and the confident wrong answers are reported separately, and "I don\'t know" is neither', (t) => {
  const s = scratch(); t.after(s.done);
  const answers = writeRuns(s.root, { current: [
    ALL_RIGHT,
    reply({ q1: ['src/handlers', 'high'], q2: ["I don't know", 'low'], q3: ['migrations/', 'low'], q4: ['e2e', 'high'] }),
  ] });
  const r = run(['score', writeKey(s.root), answers]);
  assert.equal(r.status, 0, r.out);
  const arm = JSON.parse(r.stdout).arms.current;
  // Worked by hand: run 1 gets 4 of 4, run 2 gets 1 of 4 (only q4), so 5 of 8.
  assert.equal(arm.runs, 2);
  assert.equal(arm.score, 0.625);
  assert.equal(arm.confidentWrong, 1);
  assert.equal(arm.unsureWrong, 1);
  assert.equal(arm.abstained, 1);
  assert.deepEqual(arm.byKind.where, { score: 0.75, confidentWrong: 1 });
  assert.deepEqual(arm.byKind.departure, { score: 0.5, confidentWrong: 0 });
  assert.deepEqual(arm.bySplit, { core: { score: 0.5, confidentWrong: 1 }, heldout: { score: 1, confidentWrong: 0 } });
  assert.deepEqual(arm.questions['where-01'], { correct: 1, confidentWrong: 1, unsureWrong: 0, abstained: 0 });
});

test('answers match through quoting, slashes and case, and a hedge naming a rejected answer is wrong', (t) => {
  const s = scratch(); t.after(s.done);
  const answers = writeRuns(s.root, { current: [
    reply({ q1: ['`src\\http\\`', 'high'], q2: ['"ParseBody"', 'high'], q3: ['They live in db/changes/.', 'high'], q4: ['./E2E/', 'high'] }),
    reply({ q1: ['src/http', 'high'], q2: ['parseBody', 'high'], q3: ['db/changes or migrations/', 'high'], q4: ['e2e', 'high'] }),
  ] });
  const arm = JSON.parse(run(['score', writeKey(s.root), answers]).stdout).arms.current;
  assert.deepEqual(arm.questions['departure-01'], { correct: 1, confidentWrong: 1, unsureWrong: 0, abstained: 0 });
  assert.equal(arm.score, 0.875);
});

test('a fenced reply is scored, and an unusable run is reported and left out rather than scored as wrong', (t) => {
  const s = scratch(); t.after(s.done);
  const fenced = `Here are my answers.\n\n\`\`\`json\n${ALL_RIGHT.replace('"high"', '"High"')}\n\`\`\`\n`;
  const missing = reply({ q1: ['src/http', 'high'], q2: ['parseBody', 'high'], q3: ['db/changes', 'high'] });
  const twice = reply({ q1: ['src/http', 'high'], q2: ['parseBody', 'high'], q3: ['db/changes', 'high'], q4: ['e2e', 'high'] })
    .replace('"id":"q4"', '"id":"q1"');
  const unsure = reply({ q1: ['src/http', 'maybe'], q2: ['parseBody', 'high'], q3: ['db/changes', 'high'], q4: ['e2e', 'high'] });
  const answers = writeRuns(s.root, { current: [fenced, missing, 'I could not read the document.', twice, unsure] });
  const r = run(['score', writeKey(s.root), answers]);
  assert.equal(r.status, 1, r.out);
  const arm = JSON.parse(r.stdout).arms.current;
  assert.equal(arm.runs, 1);
  assert.equal(arm.score, 1);
  assert.deepEqual(arm.invalid.map((x) => x.file), ['2.txt', '3.txt', '4.txt', '5.txt']);
  assert.match(arm.invalid[0].reason, /q4/);
  assert.match(arm.invalid[2].reason, /q1/);
  assert.match(arm.invalid[3].reason, /confidence/);
});

test('an entry with no answer, a non-text answer or an unknown confidence is unusable even when it would read as an abstention', (t) => {
  const s = scratch(); t.after(s.done);
  const rest = { q2: ['parseBody', 'high'], q3: ['db/changes', 'high'], q4: ['e2e', 'high'] };
  const bare = JSON.stringify({ answers: [{ id: 'q1' }, ...JSON.parse(reply(rest)).answers] });
  const nonText = reply({ q1: [42, 'high'], ...rest });
  const maybeAbstain = reply({ q1: ["I don't know", 'maybe'], ...rest });
  const noConfidenceAbstain = JSON.stringify({ answers: [{ id: 'q1', answer: "I don't know" }, ...JSON.parse(reply(rest)).answers] });
  const answers = writeRuns(s.root, { current: [ALL_RIGHT, bare, nonText, maybeAbstain, noConfidenceAbstain] });
  const r = run(['score', writeKey(s.root), answers]);
  assert.equal(r.status, 1, r.out);
  const arm = JSON.parse(r.stdout).arms.current;
  assert.equal(arm.runs, 1);
  assert.equal(arm.abstained, 0);
  assert.deepEqual(arm.invalid.map((x) => x.file), ['2.txt', '3.txt', '4.txt', '5.txt']);
  assert.match(arm.invalid[0].reason, /q1: answer/);
  assert.match(arm.invalid[1].reason, /q1: answer/);
  assert.match(arm.invalid[2].reason, /q1: confidence/);
  assert.match(arm.invalid[3].reason, /q1: confidence/);
});

test('the report names questions known without a document, flags unstable arms and pins the key it scored', (t) => {
  const s = scratch(); t.after(s.done);
  const dunno = ["I don't know", 'low'];
  const none = reply({ q1: dunno, q2: ['parseBody', 'high'], q3: dunno, q4: dunno });
  const wrong = ['nowhere', 'low'];
  // In five current runs every question except q2 is right two or three times.
  const current = [
    reply({ q1: ['src/http', 'high'], q2: ['parseBody', 'high'], q3: ['db/changes', 'high'], q4: ['e2e', 'high'] }),
    reply({ q1: ['src/http', 'high'], q2: ['parseBody', 'high'], q3: ['db/changes', 'high'], q4: ['e2e', 'high'] }),
    reply({ q1: wrong, q2: ['parseBody', 'high'], q3: ['db/changes', 'high'], q4: wrong }),
    reply({ q1: wrong, q2: ['parseBody', 'high'], q3: wrong, q4: wrong }),
    reply({ q1: wrong, q2: ['parseBody', 'high'], q3: wrong, q4: wrong }),
  ];
  const keyPath = writeKey(s.root);
  const r = run(['score', keyPath, writeRuns(s.root, { none: [none, none, none], current })]);
  assert.equal(r.status, 0, r.out);
  const report = JSON.parse(r.stdout);
  assert.deepEqual(report.knownWithoutDocument, ['name-01']);
  assert.deepEqual(report.arms.none.unstable, []);
  assert.equal(report.arms.none.addRuns, false);
  assert.deepEqual(report.arms.current.unstable, ['where-01', 'departure-01', 'heldout-01']);
  assert.equal(report.arms.current.addRuns, false);
  assert.equal(report.keySha256, createHash('sha256').update(readFileSync(keyPath)).digest('hex'));
});

test('more than three unstable questions asks for more runs of that arm', (t) => {
  const s = scratch(); t.after(s.done);
  const wrong = ['nowhere', 'low'];
  const allWrong = reply({ q1: wrong, q2: wrong, q3: wrong, q4: wrong });
  const r = run(['score', writeKey(s.root), writeRuns(s.root, { current: [ALL_RIGHT, ALL_RIGHT, allWrong, allWrong, allWrong] })]);
  const arm = JSON.parse(r.stdout).arms.current;
  assert.equal(arm.unstable.length, 4);
  assert.equal(arm.addRuns, true);
  assert.equal(JSON.parse(r.stdout).knownWithoutDocument, null);
});
