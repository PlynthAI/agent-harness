import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The CLI runs as a child process against a real git repository, with a stub
// `--gh` that records each call and the JSON it was given.
const SCRIPT = fileURLToPath(new URL('../scripts/review-status.mjs', import.meta.url));
const REPO = 'acme/widgets';
let root;
let stub;
const sha = {};

function git(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, `git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout.trim();
}

before(() => {
  root = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'review-status-test-')));
  git(root, 'init', '-q', '-b', 'main');
  for (const [key, value] of [['user.email', 'test@example.invalid'], ['user.name', 'test'], ['commit.gpgsign', 'false']]) git(root, 'config', key, value);
  // base <- round1 (OCR's commit) <- fix (round 2 head); side branches off base.
  for (const name of ['base', 'round1', 'fix']) {
    git(root, 'commit', '-q', '--allow-empty', '-m', name);
    sha[name] = git(root, 'rev-parse', 'HEAD');
  }
  git(root, 'checkout', '-q', '-b', 'side', sha.base);
  git(root, 'commit', '-q', '--allow-empty', '-m', 'side');
  sha.side = git(root, 'rev-parse', 'HEAD');
  stub = path.join(root, 'gh-stub.mjs');
  fs.writeFileSync(stub, [
    "import { appendFileSync, readFileSync } from 'node:fs';",
    'const args = process.argv.slice(2);',
    "const input = args.indexOf('--input');",
    "appendFileSync(process.env.STUB_GH_LOG, JSON.stringify({ args, body: input >= 0 ? JSON.parse(readFileSync(args[input + 1], 'utf8')) : null }) + '\\n');",
    "if (args[0] === 'api' && args[1].endsWith('/status')) process.stdout.write(process.env.STUB_GH_STATUS ?? '{}');",
  ].join('\n'));
});

after(() => fs.rmSync(root, { recursive: true, force: true, maxRetries: 5 }));

let caseId = 0;
function cli(args, { status } = {}) {
  const log = path.join(root, `gh-${caseId += 1}.log`);
  fs.writeFileSync(log, '');
  const result = spawnSync(process.execPath, [SCRIPT, ...args, '--gh', stub], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, STUB_GH_LOG: log, STUB_GH_STATUS: JSON.stringify(status ?? {}) },
  });
  const calls = fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
  return { code: result.status, stdout: result.stdout, stderr: result.stderr, calls };
}

// A native-slot record for one commit; `overrides` replaces top-level fields.
function slotRecord(commit, overrides = {}) {
  const file = path.join(root, `slot-02-${caseId}-${commit.slice(0, 7)}.json`);
  fs.writeFileSync(file, JSON.stringify({
    schema_version: 'ocr.slot-02/v1',
    outcome: 'complete',
    complete: true,
    candidate: { mode: 'commit', resolved_head: commit, match: true },
    ...overrides,
  }));
  return path.basename(file);
}

function triage(record) {
  const file = path.join(root, `triage-${caseId}.json`);
  fs.writeFileSync(file, JSON.stringify(record));
  return file;
}

function post(head, record) {
  return cli(['post', '--repo', REPO, '--sha', head, '--triage', triage(record), '--target-url', 'https://example.invalid/evidence']);
}

const posted = (calls) => Object.fromEntries(calls.map((call) => [call.body.context, call.body]));

test('a clean round 1 on the head posts two successes and exits 0', () => {
  const result = post(sha.round1, {
    ocrCommit: sha.round1,
    ocrRecord: slotRecord(sha.round1),
    reviewedHead: sha.round1,
    round2: null,
    findings: [{ source: 'reviewer', severity: 'nit', summary: 'naming', disposition: 'decline', reason: 'matches the module' }],
  });
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.calls.length, 2);
  for (const call of result.calls) {
    assert.deepEqual(call.args.slice(0, 4), ['api', '--method', 'POST', `repos/${REPO}/statuses/${sha.round1}`]);
    assert.equal(call.args[4], '--input');
  }
  const bodies = posted(result.calls);
  assert.equal(bodies['harness/review'].state, 'success');
  assert.equal(bodies['harness/ocr'].state, 'success');
  assert.equal(bodies['harness/ocr'].target_url, 'https://example.invalid/evidence');
});

test('a round 2 fix head over the round 1 OCR commit posts two successes', () => {
  const result = post(sha.fix, {
    ocrCommit: sha.round1,
    ocrRecord: slotRecord(sha.round1),
    reviewedHead: sha.fix,
    round2: { head: sha.fix, houseRules: 'rule.json' },
    findings: [{ source: 'ocr', severity: 'blocker', summary: 'null deref', disposition: 'fix' }],
  });
  assert.equal(result.code, 0, result.stderr);
  const bodies = posted(result.calls);
  assert.equal(bodies['harness/review'].state, 'success');
  assert.equal(bodies['harness/ocr'].state, 'success');
});

test('round 2 coverage without its house rules fails harness/ocr', () => {
  const result = post(sha.fix, {
    ocrCommit: sha.round1,
    ocrRecord: slotRecord(sha.round1),
    reviewedHead: sha.fix,
    round2: { head: sha.fix },
    findings: [],
  });
  assert.equal(result.code, 1);
  const bodies = posted(result.calls);
  assert.equal(bodies['harness/review'].state, 'success');
  assert.equal(bodies['harness/ocr'].state, 'failure');
  assert.match(bodies['harness/ocr'].description, /names no house rules/);
});

test('a missing OCR record fails harness/ocr only and exits 1', () => {
  const result = post(sha.round1, { ocrCommit: sha.round1, ocrRecord: 'no-such-slot.json', reviewedHead: sha.round1, findings: [] });
  assert.equal(result.code, 1);
  const bodies = posted(result.calls);
  assert.equal(bodies['harness/review'].state, 'success');
  assert.equal(bodies['harness/ocr'].state, 'failure');
  assert.match(bodies['harness/ocr'].description, /missing/);
  assert.equal(result.calls[0].body.context, 'harness/ocr', 'the failure is posted before the success');
});

test('an incomplete OCR record fails harness/ocr', () => {
  const result = post(sha.round1, {
    ocrCommit: sha.round1,
    ocrRecord: slotRecord(sha.round1, { outcome: 'partial', complete: false }),
    reviewedHead: sha.round1,
    findings: [],
  });
  assert.equal(result.code, 1);
  assert.match(posted(result.calls)['harness/ocr'].description, /not complete \(partial\)/);
});

test('an OCR scope that selects no changed path passes harness/ocr', () => {
  const result = post(sha.round1, {
    ocrCommit: sha.round1,
    ocrRecord: slotRecord(sha.round1, { outcome: 'empty-coverage', complete: false }),
    reviewedHead: sha.round1,
    findings: [],
  });
  assert.equal(result.code, 0);
  assert.match(posted(result.calls)['harness/ocr'].description, /selects no changed path/);
});

test('a reviewed head behind the pushed head fails both contexts', () => {
  const result = post(sha.fix, { ocrCommit: sha.round1, ocrRecord: slotRecord(sha.round1), reviewedHead: sha.round1, round2: null, findings: [] });
  assert.equal(result.code, 1);
  const bodies = posted(result.calls);
  assert.equal(bodies['harness/review'].state, 'failure');
  assert.match(bodies['harness/review'].description, /not this head/);
  assert.equal(bodies['harness/ocr'].state, 'failure');
  assert.match(bodies['harness/ocr'].description, /round 2 covers nothing/);
});

test('round 2 coverage short of the head fails harness/ocr even when the reviewer saw the head', () => {
  const result = post(sha.fix, {
    ocrCommit: sha.round1,
    ocrRecord: slotRecord(sha.round1),
    reviewedHead: sha.fix,
    round2: { head: sha.round1 },
    findings: [],
  });
  assert.equal(result.code, 1);
  const bodies = posted(result.calls);
  assert.equal(bodies['harness/review'].state, 'success');
  assert.equal(bodies['harness/ocr'].state, 'failure');
  assert.match(bodies['harness/ocr'].description, /round 2 covers to /);
});

test('an open blocker fails its context and a long summary is capped at 140 characters', () => {
  const result = post(sha.round1, {
    ocrCommit: sha.round1,
    ocrRecord: slotRecord(sha.round1),
    reviewedHead: sha.round1,
    findings: [
      { source: 'reviewer', severity: 'nit', summary: 'spacing', disposition: 'decline' },
      { source: 'reviewer', severity: 'blocker', summary: 'x'.repeat(300), disposition: 'open' },
    ],
  });
  assert.equal(result.code, 1);
  const bodies = posted(result.calls);
  assert.equal(bodies['harness/review'].state, 'failure');
  assert.match(bodies['harness/review'].description, /^blocker reviewer finding open: x+\.\.\.$/);
  assert.equal(bodies['harness/review'].description.length, 140);
  assert.equal(bodies['harness/ocr'].state, 'success');
});

test('an OCR commit that is not an ancestor of the head fails harness/ocr', () => {
  const result = post(sha.fix, { ocrCommit: sha.side, ocrRecord: slotRecord(sha.side), reviewedHead: sha.fix, round2: { head: sha.fix }, findings: [] });
  assert.equal(result.code, 1);
  const bodies = posted(result.calls);
  assert.equal(bodies['harness/review'].state, 'success');
  assert.equal(bodies['harness/ocr'].state, 'failure');
  assert.match(bodies['harness/ocr'].description, /not an ancestor/);
});

test('an unreadable triage record posts two failures', () => {
  const result = cli(['post', '--repo', REPO, '--sha', sha.round1, '--triage', path.join(root, 'absent.json')]);
  assert.equal(result.code, 1);
  const bodies = posted(result.calls);
  assert.equal(bodies['harness/review'].state, 'failure');
  assert.equal(bodies['harness/ocr'].state, 'failure');
  assert.equal(bodies['harness/ocr'].target_url, undefined);
});

const row = (context, state, updated_at = '2026-10-17T10:00:00Z') => ({ context, state, description: `${state} here`, target_url: null, updated_at });

test('read with one context pending exits 1 and prints both states', () => {
  const result = cli(['read', '--repo', REPO, '--sha', sha.fix], {
    status: { state: 'pending', statuses: [row('harness/review', 'success'), row('harness/ocr', 'pending'), row('ci', 'success')] },
  });
  assert.equal(result.code, 1);
  assert.deepEqual(result.calls.map((call) => call.args), [['api', `repos/${REPO}/commits/${sha.fix}/status`, '--method', 'GET', '-f', 'per_page=100']]);
  const printed = JSON.parse(result.stdout).statuses;
  assert.equal(printed['harness/review'].state, 'success');
  assert.equal(printed['harness/ocr'].state, 'pending');
});

test('read exits 0 only when both contexts are success, and a missing one is reported', () => {
  const both = cli(['read', '--repo', REPO, '--sha', sha.fix], { status: { statuses: [row('harness/review', 'success'), row('harness/ocr', 'success')] } });
  assert.equal(both.code, 0, both.stderr);
  const none = cli(['read', '--repo', REPO, '--sha', sha.fix], { status: { statuses: [row('harness/review', 'success')] } });
  assert.equal(none.code, 1);
  assert.equal(JSON.parse(none.stdout).statuses['harness/ocr'].state, 'missing');
});

test('usage errors exit 2 without calling gh', () => {
  for (const args of [['post', '--repo', REPO, '--sha', sha.fix], ['read', '--repo', REPO, '--sha', 'abc1234'], ['merge']]) {
    const result = cli(args);
    assert.equal(result.code, 2, args.join(' '));
    assert.equal(result.calls.length, 0);
  }
});
