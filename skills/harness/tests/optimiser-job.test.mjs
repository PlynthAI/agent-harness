import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The producer is the input side of this contract, so the fixtures publish
// through it rather than hand-writing a record that might not match it.
import { enqueueLearning, LIMITS } from '../../../hooks/learning-queue.mjs';
import {
  COMPLETION_FILE,
  COMPLETION_SCHEMA,
  completeJob,
  normaliseKey,
  readCompletion,
  readEvent,
  runCommand,
  statusOf,
} from '../scripts/optimiser-job.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const scriptPath = join(here, '..', 'scripts', 'optimiser-job.mjs');

/** One disposable workspace: a queue the producer owns and a proposal route. */
function workspace(t) {
  const root = mkdtempSync(join(tmpdir(), 'optimiser-job-'));
  const queue = join(root, 'queue');
  const proposals = join(root, 'proposals');
  mkdirSync(queue);
  mkdirSync(proposals);
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { root, queue, proposals, packetOf: (key) => join(proposals, key) };
}

function request(overrides = {}) {
  return {
    schema_version: 'CodexLearningRequest.v1',
    project: 'fixture-harness',
    run: 'run-1',
    candidate: 'candidate-1',
    transition_kind: 'task-completed',
    task: 'a finished fixture task',
    skills: ['delivery'],
    evidence: ['checks/run-all.ps1'],
    trace: [],
    ...overrides,
  };
}

function publish(queue, overrides = {}) {
  const published = enqueueLearning(queue, request(overrides));
  assert.equal(published.outcome, 'published');
  return published.event_key;
}

function write(text, path) {
  writeFileSync(path, text, 'utf8');
  return path;
}

function digestOf(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/** A packet holding one artefact, which is what a resume finds. */
function draftFor(space, key, name = 'proposal.md', text = '# draft\n') {
  mkdirSync(space.packetOf(key), { recursive: true });
  return write(text, join(space.packetOf(key), name));
}

function complete(space, key, artifacts, options = {}) {
  const { outcome = 'proposal', now, eventSha256 } = options;
  return completeJob({
    queueDir: space.queue,
    packetRoot: space.proposals,
    key,
    outcome,
    artifacts,
    expectedEventSha256: eventSha256,
    ...(now === undefined ? {} : { now }),
  });
}

function status(space, key) {
  return statusOf({ queueDir: space.queue, packetRoot: space.proposals, key });
}

test('the published record is the job input, read at its stable key', (t) => {
  const space = workspace(t);
  const key = publish(space.queue);
  const record = readEvent(space.queue, key);
  assert.equal(record.ok, true);
  assert.equal(record.event.identity.project, 'fixture-harness');
  assert.equal(record.event.event_key, key);
  assert.equal(record.event_sha256, digestOf(record.eventPath));
  assert.equal(record.event_bytes, statSync(record.eventPath).size);
});

test('an unpublished key is reported missing rather than created', (t) => {
  const space = workspace(t);
  const record = readEvent(space.queue, 'a'.repeat(64));
  assert.equal(record.ok, false);
  assert.equal(record.failure.code, 'record-missing');
  assert.deepEqual(readdirSync(space.queue), []);
});

test('a key that is not a digest is refused, and its upper-case copy is the same key', (t) => {
  const space = workspace(t);
  const key = publish(space.queue);
  assert.equal(normaliseKey(key.toUpperCase()), key);
  assert.equal(normaliseKey('not-a-digest'), null);
  assert.equal(statusOf({ queueDir: space.queue, packetRoot: space.proposals, key: 'not-a-digest' }).outcome, 'rejected');
  assert.equal(statusOf({ queueDir: space.queue, key }).outcome, 'rejected');
  assert.equal(statusOf({ queueDir: space.queue, packetRoot: space.proposals, key: key.toUpperCase() }).outcome, 'new');
});

test('a record whose bytes change under the same key stops being the completed input', (t) => {
  const space = workspace(t);
  const key = publish(space.queue);
  const artifact = draftFor(space, key);
  const examined = readEvent(space.queue, key);
  assert.equal(complete(space, key, [artifact], { eventSha256: examined.event_sha256 }).outcome, 'completed');
  assert.equal(status(space, key).outcome, 'completed');

  // The identity is untouched, so the producer's own reader still accepts the
  // record; only the byte fingerprint shows that the input moved on.
  const eventPath = join(space.queue, `${key}.json`);
  const event = JSON.parse(readFileSync(eventPath, 'utf8'));
  write(`${JSON.stringify({ ...event, task: 'a different task' }, null, 2)}\n`, eventPath);
  assert.equal(readEvent(space.queue, key).ok, true);

  const after = status(space, key);
  assert.equal(after.outcome, 'stale');
  assert.deepEqual(after.reasons.map((reason) => reason.code), ['record-bytes-changed']);
});

test('a packet with drafts and no marker is resumable and is not complete', (t) => {
  const space = workspace(t);
  const key = publish(space.queue);
  draftFor(space, key, 'proposal.md', '# half a packet\n');
  const state = status(space, key);
  assert.equal(state.outcome, 'partial');
  assert.notEqual(state.outcome, 'completed');
  assert.equal(readCompletion(space.packetOf(key)), null);
});

test('an absent packet is new, and completion is refused when there is nothing to complete', (t) => {
  const space = workspace(t);
  const key = publish(space.queue);
  assert.equal(status(space, key).outcome, 'new');
  const examined = readEvent(space.queue, key);
  const refused = complete(space, key, [write('draft\n', join(space.root, 'draft.md'))], {
    eventSha256: examined.event_sha256,
  });
  assert.equal(refused.outcome, 'refused');
  assert.equal(refused.failure.code, 'packet-missing');
  assert.throws(() => statSync(space.packetOf(key)), { code: 'ENOENT' });
});

test('a completed packet reports the record bytes and every artefact it names', (t) => {
  const space = workspace(t);
  const key = publish(space.queue);
  const artifact = draftFor(space, key);
  const examined = readEvent(space.queue, key);
  const completed = complete(space, key, [artifact], { eventSha256: examined.event_sha256 });
  assert.equal(completed.outcome, 'completed');
  assert.equal(completed.completion.schema_version, COMPLETION_SCHEMA);

  const marker = readCompletion(space.packetOf(key));
  assert.equal(marker.ok, true);
  assert.equal(marker.marker.event_key, key);
  assert.equal(marker.marker.event_sha256, readEvent(space.queue, key).event_sha256);
  assert.equal(marker.marker.outcome, 'proposal');
  assert.equal(marker.marker.artifacts.length, 1);
  assert.equal(marker.marker.artifacts[0].path, resolve(artifact));
  assert.equal(marker.marker.artifacts[0].sha256, digestOf(artifact));
  assert.equal(marker.marker.artifacts[0].bytes, statSync(artifact).size);
  assert.equal(Number.isNaN(Date.parse(marker.marker.completed_at)), false);
  assert.equal(status(space, key).outcome, 'completed');
});

test('the same completion on a later attempt is reused rather than rewritten', (t) => {
  const space = workspace(t);
  const key = publish(space.queue);
  const artifact = draftFor(space, key);
  const examined = readEvent(space.queue, key);
  assert.equal(
    complete(space, key, [artifact], {
      outcome: 'proposal',
      now: '2026-09-20T00:00:00Z',
      eventSha256: examined.event_sha256,
    }).outcome,
    'completed'
  );
  const markerPath = join(space.packetOf(key), COMPLETION_FILE);
  const before = readFileSync(markerPath);

  const second = complete(space, key, [artifact], {
    outcome: 'proposal',
    now: '2026-09-27T12:30:00Z',
    eventSha256: examined.event_sha256,
  });
  assert.equal(second.outcome, 'already-complete');
  assert.deepEqual(readFileSync(markerPath), before);
});

test('completion requires the digest returned by the initial read', (t) => {
  const space = workspace(t);
  const key = publish(space.queue);
  const artifact = draftFor(space, key);

  const missing = complete(space, key, [artifact], {});
  assert.equal(missing.outcome, 'rejected');
  assert.deepEqual(missing.errors.map((error) => [error.code, error.field]), [
    ['invalid-value', 'event_sha256'],
  ]);

  const malformed = complete(space, key, [artifact], { eventSha256: 'not-a-digest' });
  assert.equal(malformed.outcome, 'rejected');
  assert.deepEqual(malformed.errors.map((error) => [error.code, error.field]), [
    ['invalid-value', 'event_sha256'],
  ]);
  assert.equal(readCompletion(space.packetOf(key)), null);
});

test('a valid record that changed before completion is refused without publication', (t) => {
  const space = workspace(t);
  const key = publish(space.queue);
  const examined = readEvent(space.queue, key);
  const artifact = draftFor(space, key, 'proposal.md', '# based on the initial read\n');

  const eventPath = join(space.queue, `${key}.json`);
  const event = JSON.parse(readFileSync(eventPath, 'utf8'));
  write(`${JSON.stringify({ ...event, task: 'the input moved on' }, null, 2)}\n`, eventPath);
  const changed = readEvent(space.queue, key);
  assert.equal(changed.ok, true);
  assert.notEqual(changed.event_sha256, examined.event_sha256);

  const refused = complete(space, key, [artifact], { eventSha256: examined.event_sha256 });
  assert.equal(refused.outcome, 'refused');
  assert.equal(refused.failure.code, 'record-bytes-changed');
  assert.equal(readCompletion(space.packetOf(key)), null);
  assert.equal(status(space, key).outcome, 'partial');
});

test('an unchanged record completes with its retained digest and reuses the same completion', (t) => {
  const space = workspace(t);
  const key = publish(space.queue);
  const examined = readEvent(space.queue, key);
  const artifact = draftFor(space, key);

  const first = complete(space, key, [artifact], { eventSha256: examined.event_sha256 });
  assert.equal(first.outcome, 'completed');
  assert.equal(first.completion.event_sha256, examined.event_sha256);
  assert.equal(status(space, key).outcome, 'completed');

  const retry = complete(space, key, [artifact], {
    eventSha256: examined.event_sha256,
    now: '2026-09-27T12:30:00Z',
  });
  assert.equal(retry.outcome, 'already-complete');
});

test('a different result under the same event is a conflict and the marker is not replaced', (t) => {
  const space = workspace(t);
  const key = publish(space.queue);
  const artifact = draftFor(space, key);
  const examined = readEvent(space.queue, key);
  complete(space, key, [artifact], { eventSha256: examined.event_sha256 });
  const markerPath = join(space.packetOf(key), COMPLETION_FILE);
  const before = readFileSync(markerPath);

  const conflict = complete(space, key, [artifact], {
    outcome: 'no-lesson',
    eventSha256: examined.event_sha256,
  });
  assert.equal(conflict.outcome, 'conflict');
  assert.equal(conflict.existing.outcome, 'proposal');
  assert.deepEqual(readFileSync(markerPath), before);
});

test('a missing artefact makes the completion stale', (t) => {
  const space = workspace(t);
  const key = publish(space.queue);
  const artifact = draftFor(space, key);
  const examined = readEvent(space.queue, key);
  complete(space, key, [artifact], { eventSha256: examined.event_sha256 });
  rmSync(artifact);
  const after = status(space, key);
  assert.equal(after.outcome, 'stale');
  assert.deepEqual(after.reasons.map((reason) => reason.code), ['artifact-unreadable']);
});

test('a changed artefact makes the completion stale', (t) => {
  const space = workspace(t);
  const key = publish(space.queue);
  const artifact = draftFor(space, key);
  const examined = readEvent(space.queue, key);
  complete(space, key, [artifact], { eventSha256: examined.event_sha256 });
  writeFileSync(artifact, '# draft\nand a later paragraph\n', 'utf8');
  const after = status(space, key);
  assert.equal(after.outcome, 'stale');
  assert.deepEqual(after.reasons.map((reason) => reason.code), ['artifact-changed']);
});

test('a recorded no-lesson result is a completed result', (t) => {
  const space = workspace(t);
  const key = publish(space.queue);
  const note = draftFor(space, key, 'no-lesson.md', 'nothing reusable was established\n');
  const examined = readEvent(space.queue, key);
  assert.equal(
    complete(space, key, [note], { outcome: 'no-lesson', eventSha256: examined.event_sha256 }).outcome,
    'completed'
  );
  assert.equal(status(space, key).outcome, 'completed');
  assert.equal(readCompletion(space.packetOf(key)).marker.outcome, 'no-lesson');
});

test('a project finding may name an artefact outside the packet', (t) => {
  const space = workspace(t);
  const key = publish(space.queue);
  const note = draftFor(space, key, 'note.md', 'the finding went to the project route\n');
  const finding = write('the project owns this\n', join(space.root, 'project-finding.md'));
  const examined = readEvent(space.queue, key);
  assert.equal(
    complete(space, key, [note, finding], { outcome: 'finding', eventSha256: examined.event_sha256 }).outcome,
    'completed'
  );
  const paths = readCompletion(space.packetOf(key)).marker.artifacts.map((artifact) => artifact.path);
  assert.deepEqual(paths, [note, resolve(finding)]);
});

test('completion needs at least one artefact, and refuses more than the producer bounds', (t) => {
  const space = workspace(t);
  const key = publish(space.queue);
  draftFor(space, key);
  const examined = readEvent(space.queue, key);
  assert.equal(complete(space, key, [], { eventSha256: examined.event_sha256 }).outcome, 'rejected');
  const many = Array.from({ length: LIMITS.references + 1 }, () => join(space.packetOf(key), 'proposal.md'));
  const tooMany = complete(space, key, many, { eventSha256: examined.event_sha256 });
  assert.equal(tooMany.outcome, 'rejected');
  assert.equal(tooMany.errors[0].code, 'too-many-entries');
});

test('an artefact that does not exist refuses the completion and writes no marker', (t) => {
  const space = workspace(t);
  const key = publish(space.queue);
  draftFor(space, key);
  const examined = readEvent(space.queue, key);
  const refused = complete(space, key, [join(space.packetOf(key), 'absent.md')], {
    eventSha256: examined.event_sha256,
  });
  assert.equal(refused.outcome, 'refused');
  assert.equal(refused.failure.code, 'artifact-missing');
  assert.equal(readCompletion(space.packetOf(key)), null);
});

test('an oversized marker is refused before publication and a smaller retry completes', (t) => {
  const space = workspace(t);
  const key = publish(space.queue);
  const examined = readEvent(space.queue, key);
  draftFor(space, key);

  // The same shape the reviewer reproduced: a deep evidence route makes the
  // serialized absolute paths cross the producer's record-byte limit.
  let deep = join(space.root, 'evidence');
  for (let index = 0; index < 10; index += 1) deep = join(deep, 'segment-'.padEnd(36, 'x'));
  mkdirSync(deep, { recursive: true });
  const artifacts = [];
  for (let index = 0; index < LIMITS.references; index += 1) {
    const path = join(deep, `evidence-${String(index).padStart(2, '0')}.md`);
    write(`evidence ${index}\n`, path);
    artifacts.push(path);
  }

  const refused = complete(space, key, artifacts, { eventSha256: examined.event_sha256 });
  assert.equal(refused.outcome, 'refused');
  assert.equal(refused.failure.code, 'marker-too-large');
  assert.equal(refused.failure.field, 'artifacts');
  assert.equal(readCompletion(space.packetOf(key)), null);
  assert.equal(status(space, key).outcome, 'partial');

  const smaller = complete(space, key, artifacts.slice(0, 2), { eventSha256: examined.event_sha256 });
  assert.equal(smaller.outcome, 'completed');
  const marker = readCompletion(space.packetOf(key));
  assert.equal(marker.ok, true);
  assert.equal(marker.marker.artifacts.length, 2);
  assert.equal(status(space, key).outcome, 'completed');
  assert.deepEqual(readdirSync(space.packetOf(key)).sort(), [
    'completion.json',
    'proposal.md',
  ]);
});

test('a malformed marker is stale rather than a completed job', (t) => {
  const space = workspace(t);
  const key = publish(space.queue);
  const artifact = draftFor(space, key);
  const examined = readEvent(space.queue, key);
  complete(space, key, [artifact], { eventSha256: examined.event_sha256 });
  const markerPath = join(space.packetOf(key), COMPLETION_FILE);
  const marker = JSON.parse(readFileSync(markerPath, 'utf8'));
  write(`${JSON.stringify({ ...marker, extra: 'unexpected' }, null, 2)}\n`, markerPath);

  const after = status(space, key);
  assert.equal(after.outcome, 'stale');
  assert.equal(after.failure.code, 'marker-unexpected-field');
  assert.notEqual(after.outcome, 'completed');
});

test('a corrupt record makes the job unusable rather than complete', (t) => {
  const space = workspace(t);
  const key = publish(space.queue);
  const artifact = draftFor(space, key);
  const examined = readEvent(space.queue, key);
  complete(space, key, [artifact], { eventSha256: examined.event_sha256 });
  write('{ not json\n', join(space.queue, `${key}.json`));
  const after = status(space, key);
  assert.equal(after.outcome, 'unusable');
  assert.equal(after.failure.code, 'record-invalid-json');
});

test('two events keep independent packets', (t) => {
  const space = workspace(t);
  const first = publish(space.queue, { run: 'run-a' });
  const second = publish(space.queue, { run: 'run-b' });
  assert.notEqual(first, second);
  const examined = readEvent(space.queue, first);
  assert.equal(
    complete(space, first, [draftFor(space, first)], { eventSha256: examined.event_sha256 }).outcome,
    'completed'
  );
  assert.equal(status(space, first).outcome, 'completed');
  assert.equal(status(space, second).outcome, 'new');
});

test('the helper leaves the queue untouched and no temporary behind', (t) => {
  const space = workspace(t);
  const key = publish(space.queue);
  const before = readdirSync(space.queue).map((name) => [name, statSync(join(space.queue, name)).size]);
  const artifact = draftFor(space, key);
  const examined = readEvent(space.queue, key);
  complete(space, key, [artifact], {
    outcome: 'proposal',
    now: '2026-09-20T00:00:00Z',
    eventSha256: examined.event_sha256,
  });
  status(space, key);
  const after = readdirSync(space.queue).map((name) => [name, statSync(join(space.queue, name)).size]);
  assert.deepEqual(after, before);
  assert.deepEqual(readdirSync(space.packetOf(key)).sort(), ['completion.json', 'proposal.md']);
});

test('the json result maps to the exit code a caller reads', (t) => {
  const space = workspace(t);
  const key = publish(space.queue);
  const read = runCommand({ command: 'read', values: { queue: space.queue, key } });
  assert.equal(read.exitCode, 0);
  const readAnswer = JSON.parse(read.stdout);
  assert.equal(readAnswer.outcome, 'record');

  const fresh = runCommand({ command: 'status', values: { queue: space.queue, 'packet-root': space.proposals, key } });
  assert.equal(fresh.exitCode, 1);
  assert.equal(JSON.parse(fresh.stdout).outcome, 'new');

  const artifact = draftFor(space, key);
  const resumable = runCommand({ command: 'status', values: { queue: space.queue, 'packet-root': space.proposals, key } });
  assert.equal(resumable.exitCode, 1);
  assert.equal(JSON.parse(resumable.stdout).outcome, 'partial');

  const done = runCommand({
    command: 'complete',
    values: {
      queue: space.queue,
      'packet-root': space.proposals,
      key,
      outcome: 'proposal',
      'event-sha256': readAnswer.event_sha256,
      artifact,
    },
  });
  assert.equal(done.exitCode, 0);
  const settled = runCommand({ command: 'status', values: { queue: space.queue, 'packet-root': space.proposals, key } });
  assert.equal(settled.exitCode, 0);
  assert.equal(JSON.parse(settled.stdout).outcome, 'completed');

  assert.equal(runCommand({ command: 'status', values: { queue: space.queue, 'packet-root': space.proposals, key: 'x' } }).exitCode, 2);
  assert.equal(runCommand({ command: 'scan', values: {} }).exitCode, 2);
  assert.equal(runCommand({ command: 'complete', values: { queue: space.queue, 'packet-root': space.proposals, key } }).exitCode, 2);
});

test('the command line reads one record and reports the same identity', (t) => {
  const space = workspace(t);
  const key = publish(space.queue);
  const run = spawnSync(process.execPath, [scriptPath, 'read', '--queue', space.queue, '--key', key], { encoding: 'utf8' });
  assert.equal(run.status, 0);
  const answer = JSON.parse(run.stdout);
  assert.equal(answer.outcome, 'record');
  assert.equal(answer.event_key, key);
  assert.equal(answer.event.identity.run, 'run-1');

  const missing = spawnSync(process.execPath, [scriptPath, 'read', '--queue', space.queue, '--key', 'b'.repeat(64)], { encoding: 'utf8' });
  assert.equal(missing.status, 1);
  assert.equal(JSON.parse(missing.stdout).outcome, 'unusable');
});
