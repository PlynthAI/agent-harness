import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildReviewArgs, classifyNativeRun, resolveOcrInvocation, runNativeSlot } from '../scripts/native-slot.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = (name) => join(here, 'fixtures', name);
const fixture = (name) => JSON.parse(readFileSync(fixturePath(name), 'utf8'));

const COMPLETE = fixture('run-complete.json');
const PARTIAL = fixture('run-partial.json');
const FAILED = fixture('run-failed.json');
const EMPTY = fixture('run-empty.json');
const WAIVED = fixture('run-waived.json');
const RANGE = fixture('run-range.json');
const RANGE_FAILED = fixture('run-range-failed.json');
const SCOPE = fixture('scope-excluded.json');

const commitOf = (result) => ({ mode: 'commit', commit: result.manifest.input.resolved_head });
const tempOut = () => mkdtempSync(join(tmpdir(), 'slot-02-'));

// A stand-in for spawnSync that records the call and writes the JSON result the
// CLI would have written to --output.
function fakeCli({ result = null, status = 0, stdout = '', stderr = '', error = null, seen = () => {} } = {}) {
  return (command, args, options) => {
    seen({ command, args, options });
    if (result !== null) {
      const outputPath = args[args.indexOf('--output') + 1];
      writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');
    }
    return { status, stdout, stderr, error, signal: null };
  };
}

test('a real completed manifest over full coverage is the completed review', () => {
  const record = classifyNativeRun({ candidate: commitOf(COMPLETE), result: COMPLETE, exitCode: 0 });
  assert.equal(record.outcome, 'complete');
  assert.equal(record.complete, true);
  assert.equal(record.coverage.selected, 2);
  assert.equal(record.coverage.completed, 2);
  assert.equal(record.coverage.failed, 0);
  assert.equal(record.candidate.match, true);
  assert.equal(record.candidate.evidence, 'resolved');
  assert.equal(record.ocr.provider, 'openrouter');
  assert.equal(record.ocr.version, 'v1.12.7');
  assert.equal(record.ocr.terminal_state, 'complete');
  assert.equal(record.findings.count, 0);
});

test('the slot record carries the run token usage and configured concurrency', () => {
  const record = classifyNativeRun({ candidate: commitOf(COMPLETE), result: COMPLETE, exitCode: 0 });
  assert.deepEqual(record.usage, { total_tokens: 44992, input_tokens: 42266, output_tokens: 2726, cache_read_tokens: 15751 });
  assert.equal(record.ocr.configured_concurrency, 1);
});

test('a result without token usage records null usage and still completes', () => {
  const bare = structuredClone(COMPLETE);
  for (const field of ['total_tokens', 'input_tokens', 'output_tokens', 'cache_read_tokens']) delete bare.summary[field];
  delete bare.manifest.execution.configured_concurrency;
  const record = classifyNativeRun({ candidate: commitOf(bare), result: bare, exitCode: 0 });
  assert.equal(record.outcome, 'complete');
  assert.deepEqual(record.usage, { total_tokens: null, input_tokens: null, output_tokens: null, cache_read_tokens: null });
  assert.equal(record.ocr.configured_concurrency, null);
});

test('exit 0 with a partial manifest is not a completed review', () => {
  const record = classifyNativeRun({ candidate: commitOf(PARTIAL), result: PARTIAL, exitCode: 0 });
  assert.equal(record.outcome, 'partial');
  assert.equal(record.complete, false);
  // The summary counts selected items, including the ones the manifest records
  // as failed, so coverage has to come from the manifest.
  assert.equal(PARTIAL.summary.files_reviewed, 3);
  assert.equal(record.coverage.selected, 3);
  assert.equal(record.coverage.completed, 1);
  assert.equal(record.coverage.failed, 2);
  assert.equal(record.coverage.reviewed, 1);
  assert.deepEqual([...record.coverage.unreviewed].sort(), ['checks/install.ps1', 'checks/run-all.ps1']);
  assert.match(record.notes.join(' '), /summary\.files_reviewed \(3\)/);
  assert.match(record.reasons.join(' '), /1 of 3 selected item\(s\) were reviewed: 2 failed, 0 waived, 2 unreviewed/);
});

test('an all-failed manifest is a failed execution, not a review', () => {
  const record = classifyNativeRun({ candidate: commitOf(FAILED), result: FAILED, exitCode: 1 });
  assert.equal(record.outcome, 'failed');
  assert.equal(record.complete, false);
  assert.equal(record.coverage.completed, 0);
  assert.equal(record.coverage.failed, 3);
  assert.deepEqual(record.coverage.failed_items.map((item) => item.classification), ['budget', 'budget', 'budget']);
});

test('the candidate in the result must be the requested one', () => {
  const record = classifyNativeRun({ candidate: { mode: 'commit', commit: 'b'.repeat(40) }, result: COMPLETE, exitCode: 0 });
  assert.equal(record.outcome, 'candidate-mismatch');
  assert.equal(record.complete, false);
  assert.equal(record.candidate.match, false);
  assert.match(record.reasons.join(' '), /but commit b{40} was requested/);
});

test('a conflicting resolved hash cannot be rescued by the requested echo', () => {
  const echoed = structuredClone(COMPLETE);
  const requested = echoed.manifest.input.resolved_head;
  echoed.manifest.input.resolved_head = 'e'.repeat(40);
  assert.equal(echoed.manifest.input.requested_head, requested, 'the manifest still echoes the request');
  const record = classifyNativeRun({ candidate: { mode: 'commit', commit: requested }, result: echoed, exitCode: 0 });
  assert.equal(record.outcome, 'candidate-mismatch');
  assert.equal(record.complete, false);
  assert.equal(record.candidate.resolved_head, 'e'.repeat(40));
});

test('an echoed request without a resolved commit is not resolution evidence', () => {
  const echoed = structuredClone(COMPLETE);
  const requested = echoed.manifest.input.resolved_head;
  delete echoed.manifest.input.resolved_head;
  assert.equal(echoed.manifest.input.requested_head, requested, 'the echo is all that remains');
  const record = classifyNativeRun({ candidate: { mode: 'commit', commit: requested }, result: echoed, exitCode: 0 });
  assert.equal(record.outcome, 'malformed');
  assert.equal(record.complete, false);
  assert.equal(record.candidate.resolved, null);
  assert.equal(record.candidate.resolved_head, null);
  assert.equal(record.candidate.requested_echo, requested);
  assert.equal(record.candidate.evidence, 'requested-echo-only');
  assert.equal(record.candidate.match, false);
  assert.match(record.reasons.join(' '), /no resolved commit/);
  assert.match(record.reasons.join(' '), /an echo is not evidence of resolution/);
});

test('the adapter refuses a ref it cannot pin before any invocation', () => {
  assert.throws(
    () => buildReviewArgs({ candidate: { mode: 'commit', commit: 'main' }, outputPath: 'result.json' }),
    /full immutable commit hash/,
  );
  assert.throws(
    () => buildReviewArgs({ candidate: { mode: 'range', from: 'main', to: 'HEAD' }, outputPath: 'result.json' }),
    /full immutable commit hashes/,
  );
  const outDir = tempOut();
  try {
    let invoked = 0;
    assert.throws(
      () => runNativeSlot({ candidate: { mode: 'commit', commit: 'HEAD' }, outDir, ocrCommand: 'ocr', spawn: () => { invoked += 1; } }),
      /immutable commit hash/,
    );
    assert.equal(invoked, 0, 'nothing may be spawned for a candidate that cannot be pinned');
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('a range is pinned to the diff base the run actually used', () => {
  const diffBase = RANGE.manifest.input.resolved_base;
  const head = RANGE.manifest.input.resolved_head;
  const ok = classifyNativeRun({ candidate: { mode: 'range', from: diffBase, to: head }, result: RANGE, exitCode: 0 });
  assert.equal(ok.outcome, 'complete');
  assert.equal(ok.candidate.match, true);
  assert.equal(ok.candidate.resolved_base, diffBase);
  assert.equal(ok.candidate.evidence, 'resolved');

  // The named branch endpoint is not the diff base. A merge-base range must not
  // be silently equated with the ref the caller passed.
  const endpoint = 'b853afd0'.padEnd(40, '0');
  const divergent = classifyNativeRun({ candidate: { mode: 'range', from: endpoint, to: head }, result: RANGE, exitCode: 0 });
  assert.equal(divergent.outcome, 'candidate-mismatch');
  assert.equal(divergent.complete, false);
  assert.match(divergent.reasons.join(' '), /diffed from its merge base/);
  assert.match(divergent.reasons.join(' '), new RegExp(diffBase));
});

test('zero selected paths is a stated skip, not a completed slot', () => {
  const record = classifyNativeRun({ candidate: commitOf(EMPTY), result: EMPTY, exitCode: 0 });
  assert.equal(EMPTY.status, 'complete');
  assert.equal(record.outcome, 'empty-coverage');
  assert.equal(record.complete, false);
  assert.equal(record.coverage.selected, 0);
  assert.match(record.reasons.join(' '), /no review was executed/);
});

test('the empty selection names the excluded paths when a scope snapshot is supplied', () => {
  const record = classifyNativeRun({ candidate: commitOf(EMPTY), result: EMPTY, exitCode: 0, scope: SCOPE });
  assert.equal(record.coverage.excluded.available, true);
  assert.deepEqual(record.coverage.excluded.files.map((file) => file.path), ['docs/notes.md', 'skills/open-code-review/SKILL.md']);
  assert.deepEqual(record.coverage.excluded.files.map((file) => file.reason), ['unsupported_ext', 'unsupported_ext']);
  assert.match(record.reasons.join(' '), /excluded 2 path\(s\)/);
});

test('a run that reports terminal state skipped is a skip', () => {
  const skipped = structuredClone(COMPLETE);
  skipped.manifest.terminal_state = 'skipped';
  const record = classifyNativeRun({ candidate: commitOf(skipped), result: skipped, exitCode: 0 });
  assert.equal(record.outcome, 'skipped');
  assert.equal(record.complete, false);
});

test('a mixed waived and reviewed scope is a coverage limit, not a completed review', () => {
  const record = classifyNativeRun({ candidate: commitOf(WAIVED), result: WAIVED, exitCode: 0 });
  assert.equal(record.outcome, 'partial');
  assert.equal(record.complete, false);
  assert.equal(record.coverage.reviewed, 1);
  assert.equal(record.coverage.waived, 1);
  assert.deepEqual(record.coverage.waived_items, ['skills/skills-list/tests/list-skills.test.mjs']);
  assert.deepEqual(record.coverage.unreviewed, ['skills/skills-list/tests/list-skills.test.mjs']);
  assert.match(record.notes.join(' '), /waived rather than reviewed/);
  assert.match(record.reasons.join(' '), /1 of 2 selected item\(s\) were reviewed: 0 failed, 1 waived, 1 unreviewed/);
});

test('an all-waived scope is a skip, never a completed review', () => {
  const allWaived = structuredClone(WAIVED);
  const completed = allWaived.manifest.coverage.completed.pop();
  allWaived.manifest.coverage.waived.push(completed);
  allWaived.manifest.terminal_state = 'complete';
  const record = classifyNativeRun({ candidate: commitOf(allWaived), result: allWaived, exitCode: 0 });
  assert.equal(allWaived.status, 'complete');
  assert.equal(record.outcome, 'skipped');
  assert.equal(record.complete, false);
  assert.equal(record.coverage.reviewed, 0);
  assert.equal(record.coverage.waived, 2);
  assert.match(record.reasons.join(' '), /every selected item was waived/);
});

test('a run that does not finish inside the deadline is a timeout', () => {
  const record = classifyNativeRun({ candidate: commitOf(COMPLETE), timedOut: true });
  assert.equal(record.outcome, 'timeout');
  assert.equal(record.complete, false);
  assert.equal(record.ocr.timed_out, true);
});

test('a missing CLI is reported rather than assumed', () => {
  const missing = new Error('spawnSync ocr ENOENT');
  missing.code = 'ENOENT';
  const record = classifyNativeRun({ candidate: commitOf(COMPLETE), spawnError: missing });
  assert.equal(record.outcome, 'missing-cli');
  assert.equal(record.complete, false);
  assert.match(record.reasons.join(' '), /command was not found/);
});

test('unreadable output at exit 0 is malformed, never complete', () => {
  const absent = classifyNativeRun({ candidate: commitOf(COMPLETE), result: null, exitCode: 0 });
  assert.equal(absent.outcome, 'malformed');
  assert.equal(absent.complete, false);

  const noManifest = classifyNativeRun({ candidate: commitOf(COMPLETE), result: { status: 'failed', message: 'Review failed' }, exitCode: 1 });
  assert.equal(noManifest.outcome, 'error');
  assert.match(noManifest.reasons.join(' '), /carried no run manifest/);

  const oldBuild = classifyNativeRun({ candidate: commitOf(COMPLETE), result: null, exitCode: 1, stderr: 'unknown flag: --output' });
  assert.match(oldBuild.reasons.join(' '), /predates --output/);

  const noChecklist = structuredClone(COMPLETE);
  delete noChecklist.manifest.coverage.selected;
  const unreadable = classifyNativeRun({ candidate: commitOf(noChecklist), result: noChecklist, exitCode: 0 });
  assert.equal(unreadable.outcome, 'malformed');
  assert.match(unreadable.reasons.join(' '), /no readable coverage checklists/);
});

test('a manifest that says complete while the process exited non-zero is surfaced', () => {
  const record = classifyNativeRun({ candidate: commitOf(COMPLETE), result: COMPLETE, exitCode: 3 });
  assert.equal(record.outcome, 'error');
  assert.equal(record.complete, false);
  assert.match(record.reasons.join(' '), /exited 3/);
});

test('the invocation hands the CLI a fixed candidate as an argument array', () => {
  const commit = 'd'.repeat(40);
  const repo = 'repo with spaces';
  const outputPath = 'out dir/native result.json';
  const args = buildReviewArgs({ candidate: { mode: 'commit', commit }, repo, context: 'issue 42: the exporter must honour the project timezone', outputPath, timeoutMinutes: 20, maxTokensBudget: 400000, concurrency: 2 });

  assert.equal(args[0], 'review');
  assert.equal(args[args.indexOf('--commit') + 1], commit);
  assert.equal(args[args.indexOf('--audience') + 1], 'agent');
  assert.equal(args[args.indexOf('--format') + 1], 'json');
  assert.equal(args[args.indexOf('--output') + 1], outputPath, 'a path with a space stays one argument');
  assert.equal(args[args.indexOf('--repo') + 1], repo);
  assert.equal(args[args.indexOf('--background') + 1], 'issue 42: the exporter must honour the project timezone');
  assert.equal(args[args.indexOf('--timeout') + 1], '20');
  assert.equal(args[args.indexOf('--max-tokens-budget') + 1], '400000');
  assert.equal(args[args.indexOf('--concurrency') + 1], '2');
  assert.equal(args.includes('--from'), false);
  for (const flag of ['--model', '--provider', '--effort']) {
    assert.equal(args.includes(flag), false, `${flag} must come from the installed configuration, not the adapter`);
  }

  const ranged = buildReviewArgs({ candidate: { mode: 'range', from: 'a'.repeat(40), to: 'f'.repeat(40) }, contextFile: 'context file.md', outputPath });
  assert.equal(ranged[ranged.indexOf('--from') + 1], 'a'.repeat(40));
  assert.equal(ranged[ranged.indexOf('--to') + 1], 'f'.repeat(40));
  assert.equal(ranged[ranged.indexOf('--background-file') + 1], 'context file.md');
  assert.equal(ranged.includes('--background'), false);
  assert.equal(ranged.includes('--commit'), false);

  const fromFile = classifyNativeRun({
    candidate: commitOf(COMPLETE),
    request: { contextFile: 'context file.md' },
    result: COMPLETE,
    exitCode: 0,
  });
  assert.equal(fromFile.requested.context, true, 'a context file counts as supplied context');
  assert.equal(fromFile.requested.context_file, 'context file.md');
});

test('the adapter keeps the raw output and classifies the run from its manifest', () => {
  const outDir = tempOut();
  try {
    let call = null;
    const record = runNativeSlot({
      candidate: commitOf(PARTIAL),
      outDir,
      ocrCommand: 'custom-ocr',
      context: 'checks/install-recovery.ps1 - interrupted apply and rollback',
      spawn: fakeCli({ result: PARTIAL, status: 0, stdout: 'summary line\n', stderr: 'warning line\n', seen: (info) => { call = info; } }),
    });
    assert.equal(record.outcome, 'partial');
    assert.equal(record.complete, false);
    assert.equal(call.command, 'custom-ocr');
    assert.equal(call.options.shell, false);
    assert.equal(record.ocr.invocation.source, 'caller');
    assert.equal(record.requested.deadline_minutes, null, 'an unbounded run is distinguishable from a bounded one');
    assert.equal(existsSync(record.raw.result), true);
    assert.equal(existsSync(record.raw.record), true);
    assert.equal(existsSync(record.raw.run_record), true);
    assert.equal(readFileSync(record.raw.stdout, 'utf8'), 'summary line\n');
    assert.equal(readFileSync(record.raw.stderr, 'utf8'), 'warning line\n');
    assert.equal(JSON.parse(readFileSync(record.raw.record, 'utf8')).outcome, 'partial');
    assert.equal(record.ocr.exit_code, 0);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('a CLI that fails without a manifest keeps its raw stderr', () => {
  const outDir = tempOut();
  try {
    const record = runNativeSlot({ candidate: commitOf(COMPLETE), outDir, ocrCommand: 'ocr', spawn: fakeCli({ status: 2, stderr: 'provider error: unauthorized\n' }) });
    assert.equal(record.outcome, 'error');
    assert.equal(record.complete, false);
    assert.equal(readFileSync(record.raw.stderr, 'utf8'), 'provider error: unauthorized\n');
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('a run killed at the adapter deadline is a timeout', () => {
  const outDir = tempOut();
  try {
    const expired = new Error('spawnSync ocr ETIMEDOUT');
    expired.code = 'ETIMEDOUT';
    const record = runNativeSlot({ candidate: commitOf(COMPLETE), outDir, ocrCommand: 'ocr', deadlineMinutes: 30, spawn: fakeCli({ status: null, error: expired }) });
    assert.equal(record.outcome, 'timeout');
    assert.equal(record.ocr.timed_out, true);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('a reused output directory cannot feed a stale result into a fresh run', () => {
  const outDir = tempOut();
  try {
    const first = runNativeSlot({ candidate: commitOf(COMPLETE), outDir, ocrCommand: 'ocr', spawn: fakeCli({ result: COMPLETE, status: 0 }) });
    assert.equal(first.outcome, 'complete');

    // The second run produces nothing and still exits 0: the previous run's
    // result must not be read as this one's.
    const second = runNativeSlot({ candidate: commitOf(COMPLETE), outDir, ocrCommand: 'ocr', spawn: fakeCli({ status: 0 }) });
    assert.equal(second.outcome, 'malformed');
    assert.equal(second.complete, false);
    assert.equal(second.raw.result, null, 'no result file was written, so no dangling path is published');
    assert.equal(existsSync(first.raw.result), true, 'the earlier evidence stays in place');
    assert.equal(existsSync(first.raw.run_record), true);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('the CLI is resolved to a real executable and runs without a shell', (t) => {
  const override = resolveOcrInvocation('custom-ocr');
  assert.equal(override.command, 'custom-ocr');
  assert.deepEqual(override.argv, []);
  assert.equal(override.source, 'caller');

  // `--ocr ocr` names the default command. On Windows that name is the npm
  // `ocr.cmd` shim, which spawnSync cannot run with shell:false, so it resolves
  // exactly like the default instead of being handed to spawn as-is.
  assert.deepEqual(resolveOcrInvocation('ocr'), resolveOcrInvocation());

  const resolved = resolveOcrInvocation();
  if (resolved.source === 'path') {
    t.skip('the ocr package is not installed beside this adapter');
    return;
  }
  assert.notEqual(resolved.source, 'path');
  assert.equal(existsSync(resolved.command), true, `${resolved.command} exists`);
  const version = spawnSync(resolved.command, [...resolved.argv, '--version'], { encoding: 'utf8', shell: false, windowsHide: true });
  assert.equal(version.status, 0, version.stderr);
  assert.match(version.stdout, /open-code-review/i);
});

test('a deliberate skip is recorded without invoking the CLI', () => {
  const outDir = tempOut();
  try {
    let invoked = 0;
    const record = runNativeSlot({
      candidate: commitOf(COMPLETE),
      outDir,
      skipReason: 'the candidate is prose only; native OCR excludes Markdown by extension',
      spawn: () => { invoked += 1; },
    });
    assert.equal(invoked, 0);
    assert.equal(record.outcome, 'skipped');
    assert.equal(record.complete, false);
    assert.equal(record.raw.result, null);
    assert.match(record.reasons.join(' '), /excludes Markdown by extension/);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('a real failed range manifest is pinned to the base it resolved and stays failed', () => {
  const base = RANGE_FAILED.manifest.input.resolved_base;
  const head = RANGE_FAILED.manifest.input.resolved_head;
  assert.equal(RANGE_FAILED.manifest.input.mode, 'range', 'the capture is a range run');
  assert.equal(RANGE_FAILED.manifest.input.requested_from, base, 'the capture resolved its requested base');

  // Exit zero changes nothing: no item was reviewed, so the slot did not complete.
  const atZero = classifyNativeRun({ candidate: { mode: 'range', from: base, to: head }, result: RANGE_FAILED, exitCode: 0 });
  assert.equal(atZero.outcome, 'failed');
  assert.equal(atZero.complete, false);
  assert.equal(atZero.candidate.mode, 'range');
  assert.equal(atZero.candidate.match, true);
  assert.equal(atZero.candidate.evidence, 'resolved');
  assert.equal(atZero.coverage.selected, 2);
  assert.equal(atZero.coverage.completed, 0);
  assert.equal(atZero.coverage.reviewed, 0);
  assert.equal(atZero.coverage.failed, 2);
  assert.deepEqual(atZero.coverage.failed_items.map((item) => item.classification), ['budget', 'budget']);
  assert.match(atZero.reasons.join(' '), /all 2 selected item\(s\) failed/);
  assert.equal(atZero.ocr.terminal_state, 'failed');
  assert.equal(atZero.ocr.version, 'v1.12.7');

  // The same capture stays failed on the non-zero exit too.
  const atExitOne = classifyNativeRun({ candidate: { mode: 'range', from: base, to: head }, result: RANGE_FAILED, exitCode: 1 });
  assert.equal(atExitOne.outcome, 'failed');

  // Pinning the range to a base the run did not use is still a mismatch.
  const divergent = classifyNativeRun({ candidate: { mode: 'range', from: 'f'.repeat(40), to: head }, result: RANGE_FAILED, exitCode: 0 });
  assert.equal(divergent.outcome, 'candidate-mismatch');
  assert.equal(divergent.complete, false);
});

test('a malformed bound is refused instead of silently dropping the guard', () => {
  const outRoot = tempOut();
  const outDir = join(outRoot, 'api-out');
  try {
    let invoked = 0;
    const spawn = () => { invoked += 1; return { status: 0, stdout: '', stderr: '', error: null }; };
    const badBounds = [
      { deadlineMinutes: Number('30m') },
      { deadlineMinutes: 0 },
      { deadlineMinutes: -5 },
      { deadlineMinutes: '30' },
      { timeoutMinutes: Number('30m') },
      { timeoutMinutes: -1 },
      { timeoutMinutes: Infinity },
      { timeoutMinutes: '0' },
      { maxTokensBudget: -1 },
      { maxTokensBudget: 1.5 },
      { maxTokensBudget: Number('400k') },
      { maxTokensBudget: Infinity },
      { maxTokensBudget: '0' },
      { concurrency: 0 },
      { concurrency: 2.5 },
    ];
    for (const bounds of badBounds) {
      assert.throws(
        () => runNativeSlot({ candidate: commitOf(COMPLETE), outDir, ocrCommand: 'custom-ocr', ...bounds, spawn }),
        /must be a (?:positive|nonnegative)/,
        `${JSON.stringify(bounds)} must be refused`,
      );
    }
    assert.equal(invoked, 0, 'nothing may be spawned for a malformed bound');
    assert.equal(existsSync(outDir), false, 'the refusal happens before the output directory is created');
  } finally {
    rmSync(outRoot, { recursive: true, force: true });
  }
});

test('the CLI entry refuses a malformed bound with a usage error before anything runs', () => {
  const outRoot = tempOut();
  const outDir = join(outRoot, 'nested-out');
  try {
    const cli = join(here, '..', 'scripts', 'native-slot.mjs');
    // The skip reason makes this spawn-free even if the refusal regressed.
    const run = spawnSync(process.execPath, [cli, '--out', outDir, '--commit', 'a'.repeat(40), '--skip', 'probe', '--deadline', '30m'], { encoding: 'utf8', shell: false });
    assert.equal(run.status, 2, run.stderr);
    assert.match(run.stderr, /--deadline must be a positive number/);
    assert.match(run.stderr, /usage: native-slot\.mjs/);
    assert.equal(existsSync(outDir), false);

    const hashOnly = join(outRoot, 'hash-only');
    const ok = spawnSync(process.execPath, [cli, '--out', hashOnly, '--commit', 'a'.repeat(40), '--skip', 'probe', '--timeout', '20'], { encoding: 'utf8', shell: false });
    assert.equal(ok.status, 1, ok.stderr);
    assert.equal(existsSync(join(hashOnly, 'slot-02.json')), true);
  } finally {
    rmSync(outRoot, { recursive: true, force: true });
  }
});

test('valid bounds reach the CLI and the deadline is recorded', () => {
  const outDir = tempOut();
  try {
    let call = null;
    const record = runNativeSlot({
      candidate: commitOf(COMPLETE),
      outDir,
      ocrCommand: 'custom-ocr',
      timeoutMinutes: 20,
      maxTokensBudget: 400000,
      concurrency: 2,
      deadlineMinutes: 30,
      spawn: fakeCli({ result: COMPLETE, status: 0, seen: (info) => { call = info; } }),
    });
    assert.equal(record.outcome, 'complete');
    assert.equal(call.args[call.args.indexOf('--timeout') + 1], '20');
    assert.equal(call.args[call.args.indexOf('--max-tokens-budget') + 1], '400000');
    assert.equal(call.args[call.args.indexOf('--concurrency') + 1], '2');
    assert.equal(call.options.timeout, 30 * 60000, 'the adapter deadline bounds the spawn itself');
    assert.equal(record.requested.timeout_minutes, 20);
    assert.equal(record.requested.max_tokens_budget, 400000);
    assert.equal(record.requested.concurrency, 2);
    assert.equal(record.requested.deadline_minutes, 30, 'the requested deadline is recorded, not implied');
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('an explicit caller binding reaches OCR unchanged and is recorded with matching execution', () => {
  const outDir = tempOut();
  try {
    const provider = 'caller provider';
    const model = 'caller/model "variant"';
    const result = structuredClone(COMPLETE);
    result.manifest.execution.provider = provider;
    result.manifest.execution.model = model;
    let call;
    const record = runNativeSlot({
      candidate: commitOf(COMPLETE), outDir, provider, model, ocrCommand: 'custom-ocr',
      spawn: fakeCli({ result, seen: (info) => { call = info; } }),
    });
    assert.equal(call.args[call.args.indexOf('--provider') + 1], provider);
    assert.equal(call.args[call.args.indexOf('--model') + 1], model);
    assert.equal(call.options.shell, false);
    assert.equal(call.args.includes('--effort'), false);
    assert.equal(record.requested.provider, provider);
    assert.equal(record.requested.model, model);
    assert.equal(record.ocr.provider, provider);
    assert.equal(record.ocr.model, model);
    assert.equal(record.complete, true);
    assert.deepEqual(JSON.parse(readFileSync(record.raw.record, 'utf8')), record);

    for (const binding of [{ provider }, { model }]) {
      const args = buildReviewArgs({ candidate: commitOf(COMPLETE), outputPath: 'out.json', ...binding });
      for (const field of ['provider', 'model']) {
        assert.equal(args.includes(`--${field}`), field in binding, 'each override is independently optional');
      }
      const bound = classifyNativeRun({ candidate: commitOf(COMPLETE), request: binding, result, exitCode: 0 });
      assert.equal(bound.complete, true, 'only the supplied field must match');
    }
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('missing or conflicting manifest execution cannot complete an explicitly bound review', () => {
  const request = { provider: 'caller-provider', model: 'caller/model' };
  for (const field of ['provider', 'model']) {
    for (const actual of [undefined, null, '', 'different-binding']) {
      const result = structuredClone(COMPLETE);
      Object.assign(result.manifest.execution, request);
      result.manifest.execution[field] = actual;
      // Summary metadata is not proof of execution, even when it echoes the request.
      Object.assign(result.summary, request);
      const record = classifyNativeRun({ candidate: commitOf(COMPLETE), request, result, exitCode: 0 });
      assert.equal(record.outcome, 'error', `${field}=${actual} must not complete`);
      assert.equal(record.complete, false);
      assert.equal(record.candidate.match, true);
      assert.equal(record.coverage.reviewed, 2);
      assert.match(record.reasons.join(' '), new RegExp(`requested ${field}`));
      assert.match(record.reasons.join(' '), /manifest\.execution/);
    }
  }
  const absent = structuredClone(COMPLETE);
  delete absent.manifest.execution;
  const bound = classifyNativeRun({ candidate: commitOf(COMPLETE), request, result: absent, exitCode: 0 });
  assert.equal(bound.complete, false);
  assert.equal(bound.outcome, 'error');
  assert.equal(classifyNativeRun({ candidate: commitOf(COMPLETE), result: absent, exitCode: 0 }).complete, true,
    'an unbound caller retains configured-profile behavior');
});

test('invalid explicit bindings are refused before output or spawn', () => {
  const outRoot = tempOut();
  const outDir = join(outRoot, 'not-created');
  try {
    let invoked = 0;
    for (const field of ['provider', 'model']) {
      for (const value of ['', ' \t ', 0, false, {}, []]) {
        const binding = { [field]: value };
        assert.throws(() => buildReviewArgs({ candidate: commitOf(COMPLETE), outputPath: 'out.json', ...binding }),
          new RegExp(`--${field} must be a nonempty string`));
        assert.throws(() => runNativeSlot({ candidate: commitOf(COMPLETE), outDir, ...binding,
          spawn: () => { invoked += 1; } }), new RegExp(`--${field} must be a nonempty string`));
      }
    }
    assert.equal(invoked, 0);
    assert.equal(existsSync(outDir), false);
    const cli = join(here, '..', 'scripts', 'native-slot.mjs');
    for (const field of ['provider', 'model']) {
      const run = spawnSync(process.execPath, [cli, '--out', outDir, '--commit', 'a'.repeat(40), '--skip', 'probe', `--${field}`, ' '],
        { encoding: 'utf8', shell: false });
      assert.equal(run.status, 2);
      assert.match(run.stderr, new RegExp(`--${field} must be a nonempty string`));
    }
    assert.equal(existsSync(outDir), false);
  } finally {
    rmSync(outRoot, { recursive: true, force: true });
  }
});

test('the CLI entry binds a fake OCR execution and refuses its mismatch without network', () => {
  const outRoot = tempOut();
  try {
    const moduleRoot = join(outRoot, 'node_modules');
    const packageDir = join(moduleRoot, '@alibaba-group', 'open-code-review');
    mkdirSync(join(packageDir, 'bin'), { recursive: true });
    writeFileSync(join(packageDir, 'package.json'), JSON.stringify({ name: '@alibaba-group/open-code-review', version: '0.0.0' }));
    const fixtureFile = join(outRoot, 'result.json');
    const capturedArgs = join(outRoot, 'args.json');
    writeFileSync(join(packageDir, 'bin', 'ocr.js'), `
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.writeFileSync(process.env.SLOT_TEST_ARGS, JSON.stringify(args));
fs.copyFileSync(process.env.SLOT_TEST_RESULT, args[args.indexOf('--output') + 1]);
`);
    const provider = 'caller-provider';
    const model = 'caller/model "quoted"';
    const result = structuredClone(COMPLETE);
    Object.assign(result.manifest.execution, { provider, model });
    const cli = join(here, '..', 'scripts', 'native-slot.mjs');
    const args = [cli, '--out', join(outRoot, 'run'), '--commit', COMPLETE.manifest.input.resolved_head,
      '--provider', provider, '--model', model, '--max-tokens-budget', '0', '--timeout', '0'];
    const env = { ...process.env, NODE_PATH: moduleRoot, APPDATA: '', ProgramFiles: '', HOME: '',
      SLOT_TEST_ARGS: capturedArgs, SLOT_TEST_RESULT: fixtureFile, OCR_NO_UPDATE: '1' };
    writeFileSync(fixtureFile, JSON.stringify(result));
    const run = spawnSync(process.execPath, args, { encoding: 'utf8', shell: false, env });
    assert.equal(run.status, 0, run.stderr);
    const record = JSON.parse(run.stdout);
    assert.equal(record.complete, true);
    assert.equal(record.requested.provider, provider);
    assert.equal(record.requested.model, model);
    assert.equal(record.requested.max_tokens_budget, 0);
    assert.equal(record.requested.timeout_minutes, 0);
    assert.equal(record.requested.deadline_minutes, null);
    const forwarded = JSON.parse(readFileSync(capturedArgs, 'utf8'));
    assert.equal(forwarded[forwarded.indexOf('--provider') + 1], provider);
    assert.equal(forwarded[forwarded.indexOf('--model') + 1], model);
    assert.equal(forwarded[forwarded.indexOf('--max-tokens-budget') + 1], '0');
    assert.equal(forwarded[forwarded.indexOf('--timeout') + 1], '0');
    result.manifest.execution.model = 'another-model';
    writeFileSync(fixtureFile, JSON.stringify(result));
    const mismatch = spawnSync(process.execPath, args, { encoding: 'utf8', shell: false, env });
    assert.equal(mismatch.status, 1, mismatch.stderr);
    const rejected = JSON.parse(mismatch.stdout);
    assert.equal(rejected.outcome, 'error');
    assert.equal(rejected.complete, false);
    assert.equal(rejected.ocr.exit_code, 0);
    assert.equal(rejected.coverage.reviewed, 2);
  } finally {
    rmSync(outRoot, { recursive: true, force: true });
  }
});

test('zero is an explicit unlimited token budget and omission keeps the configured CLI default', () => {
  const outDir = tempOut();
  try {
    let call;
    const record = runNativeSlot({ candidate: commitOf(COMPLETE), outDir, maxTokensBudget: 0,
      ocrCommand: 'custom-ocr', spawn: fakeCli({ result: COMPLETE, seen: (info) => { call = info; } }) });
    assert.equal(record.complete, true);
    assert.equal(record.requested.max_tokens_budget, 0);
    assert.equal(call.args[call.args.indexOf('--max-tokens-budget') + 1], '0');
    const args = buildReviewArgs({ candidate: commitOf(COMPLETE), outputPath: 'result.json', maxTokensBudget: 0 });
    assert.equal(args[args.indexOf('--max-tokens-budget') + 1], '0');
    const omitted = runNativeSlot({ candidate: commitOf(COMPLETE), outDir, ocrCommand: 'custom-ocr',
      spawn: fakeCli({ result: COMPLETE, seen: (info) => { call = info; } }) });
    assert.equal(omitted.complete, true);
    assert.equal(omitted.requested.max_tokens_budget, null);
    assert.equal(omitted.requested.provider, null);
    assert.equal(omitted.requested.model, null);
    assert.equal(call.args.includes('--max-tokens-budget'), false);
    assert.equal(call.args.includes('--provider'), false);
    assert.equal(call.args.includes('--model'), false);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('OCR resolved binding trims whitespace and strips only the final model token suffix', async (t) => {
  const outDir = tempOut();
  try {
    const cases = [
      { provider: ' \tcaller-provider\n', model: ' caller/model ', resolvedModel: 'caller/model' },
      { provider: 'caller-provider', model: 'caller/model[1000m]', resolvedModel: 'caller/model' },
      { provider: '\u0085caller-provider\u0085', model: '\u0085caller/model[25m]\u0085', resolvedModel: 'caller/model' },
      { provider: 'caller-provider', model: 'caller/model[1m][2m]', resolvedModel: 'caller/model[1m]' },
    ];
    for (const { provider, model, resolvedModel } of cases) {
      await t.test(JSON.stringify({ provider, model }), () => {
        const result = structuredClone(COMPLETE);
        Object.assign(result.manifest.execution, { provider: 'caller-provider', model: resolvedModel });
        let call;
        const record = runNativeSlot({ candidate: commitOf(COMPLETE), outDir, provider, model, ocrCommand: 'custom-ocr',
          spawn: fakeCli({ result, seen: (info) => { call = info; } }) });
        assert.equal(record.complete, true, `${JSON.stringify({ provider, model })} is the same resolved identity`);
        assert.equal(record.requested.provider, provider, 'requested binding remains unchanged');
        assert.equal(record.requested.model, model, 'requested suffix remains unchanged');
        assert.equal(call.args[call.args.indexOf('--provider') + 1], provider);
        assert.equal(call.args[call.args.indexOf('--model') + 1], model);
        assert.equal(record.ocr.provider, 'caller-provider');
        assert.equal(record.ocr.model, resolvedModel);
      });
    }
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('OCR binding equivalence does not replace slashes or hyphens or broaden suffix removal', () => {
  const pairs = [
    ['caller/model', 'caller-model'],
    ['caller-model', 'caller/model'],
    ['caller/model[1M]', 'caller/model'],
    ['caller/model[1.5m]', 'caller/model'],
    ['caller/model[1m]extra', 'caller/model'],
    ['caller/model[1m][2m]', 'caller/model'],
    ['caller/model-1m', 'caller/model'],
    ['caller/model/1m', 'caller/model'],
    ['\ufeffcaller/model', 'caller/model'],
    ['[1m]', ''],
  ];
  for (const [model, actualModel] of pairs) {
    const result = structuredClone(COMPLETE);
    Object.assign(result.manifest.execution, { provider: 'caller-provider', model: actualModel });
    const record = classifyNativeRun({ candidate: commitOf(COMPLETE), request: { provider: 'caller-provider', model }, result, exitCode: 0 });
    assert.equal(record.complete, false, `${model} must not match ${actualModel}`);
    assert.equal(record.outcome, 'error');
  }
  const providerResult = structuredClone(COMPLETE);
  Object.assign(providerResult.manifest.execution, { provider: 'caller-provider', model: 'caller/model' });
  const providerMismatch = classifyNativeRun({ candidate: commitOf(COMPLETE),
    request: { provider: 'caller/provider', model: 'caller/model' }, result: providerResult, exitCode: 0 });
  assert.equal(providerMismatch.complete, false, 'provider punctuation remains part of its identity');
});

test('empty CLI token budgets cannot silently select unlimited usage', () => {
  const outRoot = tempOut();
  try {
    const cli = join(here, '..', 'scripts', 'native-slot.mjs');
    for (const value of ['', ' ', '\t\n', '\ufeff']) {
      const outDir = join(outRoot, `invalid-${value.length}`);
      // The explicit skip prevents any OCR invocation even if validation regresses.
      const run = spawnSync(process.execPath, [cli, '--out', outDir, '--commit', 'a'.repeat(40),
        '--skip', 'probe', '--max-tokens-budget', value], { encoding: 'utf8', shell: false });
      assert.equal(run.status, 2, `${JSON.stringify(value)} must be a usage error`);
      assert.match(run.stderr, /--max-tokens-budget must be a nonnegative whole number/);
      assert.equal(existsSync(outDir), false, 'invalid budget creates no output');
    }
    for (const budgetArgs of [[], ['--max-tokens-budget', '0'], ['--max-tokens-budget', ' 0 '], ['--max-tokens-budget', '1e3']]) {
      const run = spawnSync(process.execPath, [cli, '--out', join(outRoot, 'valid'), '--commit', 'a'.repeat(40),
        '--skip', 'probe', ...budgetArgs], { encoding: 'utf8', shell: false });
      assert.equal(run.status, 1, run.stderr);
      const record = JSON.parse(run.stdout);
      assert.equal(record.requested.max_tokens_budget, budgetArgs.length ? Number(budgetArgs[1]) : null);
    }
  } finally {
    rmSync(outRoot, { recursive: true, force: true });
  }
});

test('Go-whitespace-only explicit bindings fail before output or invocation', () => {
  const outRoot = tempOut();
  try {
    const outDir = join(outRoot, 'never-created');
    let invoked = 0;
    for (const field of ['provider', 'model']) {
      for (const value of ['\u0085', '\u0085\t\u3000\u0085']) {
        assert.throws(() => buildReviewArgs({ candidate: commitOf(COMPLETE), outputPath: 'out.json', [field]: value }),
          new RegExp(`--${field} must be a nonempty string`));
        assert.throws(() => runNativeSlot({ candidate: commitOf(COMPLETE), outDir, [field]: value,
          ocrCommand: 'custom-ocr', spawn: () => { invoked += 1; } }), new RegExp(`--${field} must be a nonempty string`));
        const cli = join(here, '..', 'scripts', 'native-slot.mjs');
        const run = spawnSync(process.execPath, [cli, '--out', outDir, '--commit', 'a'.repeat(40), '--skip', 'probe', `--${field}`, value],
          { encoding: 'utf8', shell: false });
        assert.equal(run.status, 2, run.stderr);
        assert.match(run.stderr, new RegExp(`--${field} must be a nonempty string`));
      }
      const args = buildReviewArgs({ candidate: commitOf(COMPLETE), outputPath: 'out.json', [field]: '\ufeff' });
      assert.equal(args[args.indexOf(`--${field}`) + 1], '\ufeff', 'Go leaves BOM significant and the caller string stays intact');
    }
    assert.equal(invoked, 0);
    assert.equal(existsSync(outDir), false);
  } finally {
    rmSync(outRoot, { recursive: true, force: true });
  }
});

test('explicit zero disables the native timeout while omission keeps the configured default', () => {
  const outRoot = tempOut();
  try {
    let call;
    const record = runNativeSlot({ candidate: commitOf(COMPLETE), outDir: join(outRoot, 'zero'), timeoutMinutes: 0,
      ocrCommand: 'custom-ocr', spawn: fakeCli({ result: COMPLETE, seen: (info) => { call = info; } }) });
    assert.equal(record.complete, true);
    assert.equal(record.requested.timeout_minutes, 0);
    assert.equal(record.requested.deadline_minutes, null);
    assert.equal(call.args[call.args.indexOf('--timeout') + 1], '0');
    assert.equal(Object.hasOwn(call.options, 'timeout'), false, 'native zero does not add an adapter deadline');
    const omitted = runNativeSlot({ candidate: commitOf(COMPLETE), outDir: join(outRoot, 'omitted'),
      ocrCommand: 'custom-ocr', spawn: fakeCli({ result: COMPLETE, seen: (info) => { call = info; } }) });
    assert.equal(omitted.requested.timeout_minutes, null);
    assert.equal(call.args.includes('--timeout'), false);
    const cli = join(here, '..', 'scripts', 'native-slot.mjs');
    for (const value of ['', ' ', '\t\n', '\ufeff', '-1', 'Infinity', 'NaN', '30m']) {
      const outDir = join(outRoot, 'invalid');
      const run = spawnSync(process.execPath, [cli, '--out', outDir, '--commit', 'a'.repeat(40),
        '--skip', 'probe', '--timeout', value], { encoding: 'utf8', shell: false });
      assert.equal(run.status, 2, JSON.stringify(value) + ' must be a usage error');
      assert.match(run.stderr, /--timeout must be a nonnegative number/);
      assert.equal(existsSync(outDir), false, 'invalid timeout creates no output');
    }
  } finally {
    rmSync(outRoot, { recursive: true, force: true });
  }
});


test('the installation check rejects fnm shadowing and accepts a stable prefix without changing files', (t) => {
  if (process.platform !== 'win32') {
    t.skip('PowerShell and Windows npm shims are specific to this host check');
    return;
  }
  const powershell = spawnSync('where.exe', ['pwsh.exe'], { encoding: 'utf8', shell: false });
  assert.equal(powershell.status, 0, 'the harness Windows checks require PowerShell');
  const pwsh = powershell.stdout.trim().split(/\r?\n/)[0];
  const root = tempOut();
  try {
    const stable = join(root, 'stable npm');
    const shadow = join(root, 'fnm runtime');
    const packageDir = join(stable, 'node_modules', '@alibaba-group', 'open-code-review');
    mkdirSync(join(packageDir, 'bin'), { recursive: true });
    mkdirSync(shadow, { recursive: true });
    writeFileSync(join(packageDir, 'package.json'), JSON.stringify({ name: '@alibaba-group/open-code-review', version: '1.12.11' }));
    const maintainedVersion = 'open-code-review v1.12.11+sol-streaming (a758d9c) windows/amd64';
    writeFileSync(join(packageDir, 'bin', 'ocr.js'), 'console.log(' + JSON.stringify(maintainedVersion) + ');');
    const psQuote = (value) => value.replaceAll("'", "''");
    writeFileSync(join(stable, 'ocr.ps1'), "& '" + psQuote(process.execPath) + "' '" + psQuote(join(packageDir, 'bin', 'ocr.js')) + "' @args\nexit $LASTEXITCODE\n");
    writeFileSync(join(shadow, 'ocr.ps1'), "Write-Output 'open-code-review v1.12.12 (182898c) windows/amd64'\n");
    writeFileSync(join(stable, 'npm.ps1'), "Get-Content -LiteralPath (Join-Path $PSScriptRoot 'prefix.txt')\n");
    const prefixFile = join(stable, 'prefix.txt');
    writeFileSync(prefixFile, shadow);
    const checker = join(here, '..', '..', '..', 'config', 'ocr', 'check-install.ps1');
    const adapter = join(here, '..', 'scripts', 'native-slot.mjs');
    const fixtureFiles = [join(stable, 'ocr.ps1'), join(shadow, 'ocr.ps1'), join(stable, 'npm.ps1'), join(packageDir, 'bin', 'ocr.js')];
    const before = fixtureFiles.map((file) => readFileSync(file, 'utf8'));
    const env = { ...process.env, NODE_PATH: join(stable, 'node_modules'), APPDATA: '', ProgramFiles: '', HOME: '', OCR_NO_UPDATE: '1',
      PATH: [shadow, stable, dirname(process.execPath), dirname(pwsh), join(process.env.SystemRoot, 'System32')].join(';') };
    const args = ['-NoProfile', '-File', checker, '-Prefix', stable, '-AdapterPath', adapter];
    const rejected = spawnSync(pwsh, args, { encoding: 'utf8', shell: false, env });
    assert.equal(rejected.status, 1, rejected.stderr);
    const failed = JSON.parse(rejected.stdout);
    assert.equal(failed.status, 'fail');
    assert.deepEqual(failed.issues.map((issue) => issue.code).sort(), ['npm-prefix-mismatch', 'shell-prefix-mismatch', 'version-mismatch']);
    assert.match(failed.shell.version, /v1\.12\.12/);
    assert.match(failed.adapter.version, /sol-streaming/);
    assert.deepEqual(fixtureFiles.map((file) => readFileSync(file, 'utf8')), before, 'diagnosis does not rewrite package or shell files');
    writeFileSync(prefixFile, stable);
    env.PATH = [stable, dirname(process.execPath), dirname(pwsh), join(process.env.SystemRoot, 'System32')].join(';');
    const accepted = spawnSync(pwsh, args, { encoding: 'utf8', shell: false, env });
    assert.equal(accepted.status, 0, accepted.stderr);
    const passed = JSON.parse(accepted.stdout);
    assert.equal(passed.status, 'pass');
    assert.deepEqual(passed.issues, []);
    assert.equal(passed.shell.version, maintainedVersion);
    assert.equal(passed.adapter.version, maintainedVersion);
    assert.deepEqual(fixtureFiles.map((file) => readFileSync(file, 'utf8')), before, 'a successful check is read only too');
    const legacyPwsh = join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const legacy = spawnSync(legacyPwsh, ['-NoProfile', '-File', checker, '-Prefix', stable], { encoding: 'utf8', shell: false, env });
    assert.equal(legacy.status, 0, legacy.stderr);
    assert.equal(JSON.parse(legacy.stdout).status, 'pass', 'default adapter resolution also works in Windows PowerShell');
    for (const setup of [
      "function global:ocr { Write-Output 'open-code-review v1.12.12 (182898c) windows/amd64' }",
      "Set-Alias -Name ocr -Value '" + psQuote(join(shadow, 'ocr.ps1')) + "'",
    ]) {
      const ordinary = spawnSync(pwsh, ['-NoProfile', '-Command', setup + '; ocr --version'], { encoding: 'utf8', shell: false, env });
      assert.equal(ordinary.status, 0, ordinary.stderr);
      assert.match(ordinary.stdout, /v1\.12\.12/, 'ordinary ocr observes the shadowing command');
      const command = setup + "; & '" + psQuote(checker) + "' -Prefix '" + psQuote(stable) + "' -AdapterPath '" + psQuote(adapter) + "'";
      const shadowed = spawnSync(pwsh, ['-NoProfile', '-Command', command], { encoding: 'utf8', shell: false, env });
      assert.equal(shadowed.status, 1, 'a shadowing alias or function cannot qualify the ordinary command');
      const diagnostic = JSON.parse(shadowed.stdout);
      assert.equal(diagnostic.status, 'fail');
      assert.deepEqual(diagnostic.issues.map((issue) => issue.code), ['shell-command-shadowed']);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
