/**
 * Focused fixtures for the bounded learning-event producer.
 *
 * Every case runs against a disposable queue directory, a disposable request
 * file and, where the behaviour needs one, a real child process. Nothing here
 * reads or writes a live queue, the Codex home, a project workspace or a
 * configuration file: the queue path is always supplied explicitly.
 *
 * The suite pins the properties that are easy to break quietly: one identity
 * publishes one record, a retry never changes published bytes, a raced or rival
 * publisher is never replaced, an interrupted producer can be retried from the
 * caller's own evidence, a temporary file is never promoted, a corrupt record
 * is never a duplicate success, an unusable queue is a recoverable missed event
 * rather than a weaker write, and no field outside the allowlist - a secret, an
 * environment dump or a success flag - reaches a record.
 */

import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import {
  EVENT_SCHEMA,
  LIMITS,
  REQUEST_SCHEMA,
  RESULT_SCHEMA,
  TRANSITION_KINDS,
  buildEvent,
  discardTemp,
  enqueueLearning,
  eventKey,
  runCommand,
  serializeEvent,
} from "../learning-queue.mjs";

const modulePath = fileURLToPath(new URL("../learning-queue.mjs", import.meta.url));
const moduleUrl = pathToFileURL(modulePath).href;
const hooksDir = fileURLToPath(new URL("..", import.meta.url));
const sourceRoot = dirname(hooksDir);
const referencePath = fileURLToPath(new URL("../../skills/delivery/references/learning-events.md", import.meta.url));

const EVENT_KEYS = ["event_key", "evidence", "identity", "recorded_at", "schema_version", "skills", "task", "trace"];
const FIRST_NOW = "2026-09-20T07:00:00.000Z";
const LATER_NOW = "2026-09-20T11:22:33.444Z";
/**
 * The contract's required fields and their identity subset, written here rather
 * than imported: a fixture that reads the implementation's own list cannot
 * notice that list changing under it.
 */
const REQUIRED_NAMES = ["project", "run", "candidate", "transition_kind", "evidence"];
const IDENTITY_NAMES = ["project", "run", "candidate", "transition_kind"];

function fixture(t, { queueName = "queue", createQueue = true } = {}) {
  const temp = mkdtempSync(join(tmpdir(), "learning-queue-"));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const queue = join(temp, queueName);
  if (createQueue) mkdirSync(queue, { recursive: true });
  return { temp, queue };
}

function requestFor(overrides = {}) {
  return {
    schema_version: REQUEST_SCHEMA,
    project: "example-org/alpha",
    run: "issue-776",
    candidate: "1debd26c3c9c821ce30382588dfd290def6f41d5",
    transition_kind: "task-completed",
    task: "issue-776",
    skills: ["implement", "code-review"],
    evidence: ["plans/issue-776/current.json", ".local/artifacts/issue-776/checks.log"],
    trace: ["packet/run-776.jsonl#L120-L140"],
    ...overrides,
  };
}

function writeRequest(directory, name, request) {
  const path = join(directory, `${name}.json`);
  writeFileSync(path, `${JSON.stringify(request, null, 2)}\n`);
  return path;
}

function runCli(args) {
  return spawnSync(process.execPath, [modulePath, ...args], { encoding: "utf8", windowsHide: true });
}

function currentWindowsPrincipal() {
  // Codex can inherit Admin's environment while executing under a sandbox token.
  // ACL fixtures must deny the effective process identity, not USERNAME.
  // The Windows binary is named by path: a Git Bash PATH puts the Unix whoami
  // first, which rejects these switches.
  const whoami = join(process.env.SystemRoot || "C:\\Windows", "System32", "whoami.exe");
  const output = execFileSync(whoami, ["/user", "/fo", "csv", "/nh"], {
    encoding: "utf8", windowsHide: true,
  });
  const sid = output.match(/\bS-1-\d+(?:-\d+)+\b/)?.[0];
  assert.ok(sid, "whoami must report the effective Windows SID for the ACL fixture");
  return `*${sid}`;
}

/** The CLI's own JSON on stdout, parsed; the exit code stays available. */
function cli(args) {
  const result = runCli(args);
  assert.notEqual(result.stdout, "", `no response on stdout; stderr was ${result.stderr}`);
  return { ...JSON.parse(result.stdout), exit_code: result.status, stderr: result.stderr };
}

function digest(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function queueFiles(queue) {
  return readdirSync(queue).sort();
}

function fieldErrors(response) {
  return response.errors.map((error) => `${error.code}:${error.field ?? "-"}`).sort();
}

/** Child process helper: resolve with its streams and exit status. */
function spawnChild(scriptPath, args) {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [scriptPath, ...args], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code, signal) => resolvePromise({ code, signal, stdout, stderr }));
  });
}

async function waitForBarrier(signals, outcomes, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (!signals.every((path) => existsSync(path))) {
    if (outcomes.length >= signals.length) {
      throw new Error(`every producer exited before the barrier: ${JSON.stringify(outcomes.map((o) => o.stderr))}`);
    }
    if (Date.now() > deadline) throw new Error("timed out waiting for the producer barrier");
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 5));
  }
}

/* ---------------------------------------------------------------- records */

test("a verified transition publishes the canonical record for its identity", (t) => {
  const f = fixture(t);
  const request = requestFor();
  const requestPath = writeRequest(f.temp, "request", request);

  const response = cli(["enqueue", "--queue", f.queue, "--request", requestPath, "--now", FIRST_NOW]);

  assert.equal(response.outcome, "published");
  assert.equal(response.exit_code, 0);
  assert.equal(response.schema_version, RESULT_SCHEMA);
  const event = buildEvent(request, { now: () => FIRST_NOW });
  assert.equal(response.event_key, eventKey(event.identity));
  assert.equal(response.event.schema_version, EVENT_SCHEMA);
  assert.equal(response.event_path, join(f.queue, `${event.event_key}.json`));
  // The published bytes are the deterministic serialisation, exactly.
  assert.equal(readFileSync(response.event_path, "utf8"), serializeEvent(event));
  assert.deepEqual(Object.keys(JSON.parse(readFileSync(response.event_path, "utf8"))).sort(), EVENT_KEYS);
  assert.equal(queueFiles(f.queue).length, 1);
});

test("a retry of one identity leaves the published bytes alone and does no publication work", (t) => {
  const f = fixture(t);
  const request = requestFor();
  const requestPath = writeRequest(f.temp, "request", request);
  const first = cli(["enqueue", "--queue", f.queue, "--request", requestPath, "--now", FIRST_NOW]);
  assert.equal(first.outcome, "published");
  const before = digest(first.event_path);

  // The second attempt declares a different attempt timestamp, and both of its
  // write steps are traps: a retry of a published identity must reach neither.
  const second = enqueueLearning(f.queue, request, {
    now: () => LATER_NOW,
    link: () => {
      throw new Error("a retry of a published identity must not publish again");
    },
    removeTemp: () => {
      throw new Error("a retry of a published identity must not clean up");
    },
  });

  assert.equal(second.outcome, "existing-identical");
  assert.equal(second.event_key, first.event_key);
  assert.equal(digest(first.event_path), before);
  assert.deepEqual(queueFiles(f.queue), [`${first.event_key}.json`]);
  // The recorded attempt is the one that actually published.
  assert.equal(second.event.recorded_at, FIRST_NOW);
});

test("the attempt timestamp is excluded from the comparison", (t) => {
  const f = fixture(t);
  const request = requestFor();
  const first = enqueueLearning(f.queue, request, { now: () => FIRST_NOW });
  const second = enqueueLearning(f.queue, request, { now: () => LATER_NOW });

  assert.equal(first.outcome, "published");
  assert.equal(second.outcome, "existing-identical");
  assert.equal(second.event.recorded_at, FIRST_NOW);
  assert.equal(queueFiles(f.queue).length, 1);
});

test("a different payload under one identity is a conflict and never replaces the evidence", (t) => {
  const f = fixture(t);
  const original = requestFor();
  const requestPath = writeRequest(f.temp, "request", original);
  const first = cli(["enqueue", "--queue", f.queue, "--request", requestPath, "--now", FIRST_NOW]);
  const before = digest(first.event_path);

  const rival = requestFor({ evidence: ["plans/issue-776/other.log"] });
  const conflict = enqueueLearning(f.queue, rival, { now: () => LATER_NOW });

  assert.equal(conflict.outcome, "conflict");
  assert.equal(conflict.event_key, first.event_key);
  assert.equal(conflict.event_path, first.event_path, "one identity keeps one record path");
  assert.deepEqual(conflict.existing.evidence, ["plans/issue-776/current.json", ".local/artifacts/issue-776/checks.log"]);
  assert.equal("event" in conflict, false, "a conflict reports the existing record, not a new one");
  assert.equal(digest(first.event_path), before);
  assert.deepEqual(JSON.parse(readFileSync(first.event_path, "utf8")).evidence, conflict.existing.evidence);
  assert.deepEqual(queueFiles(f.queue), [`${first.event_key}.json`]);
});

test("the four identity fields each change the key, and each stays stable", () => {
  const base = requestFor();
  const key = eventKey(base);
  assert.equal(eventKey({ ...base }), key, "the same identity is the same key");
  assert.equal(eventKey({ ...base, task: "other-task" }), key, "the task reference is not part of the identity");
  for (const field of ["project", "run", "candidate", "transition_kind"]) {
    const changed = { ...base, [field]: field === "transition_kind" ? "failed-task-finding" : `other-${field}` };
    assert.notEqual(eventKey(changed), key, `${field} must change the key`);
  }
});

test("legitimate distinct projects, runs and candidates each publish their own record", (t) => {
  const f = fixture(t);
  const variants = [
    requestFor(),
    requestFor({ project: "example-org/beta", task: "issue-9" }),
    requestFor({ run: "issue-900" }),
    requestFor({ candidate: "563abce9f0f5a2a4a1a3b4c5d6e7f8091a2b3c4d" }),
  ];
  const keys = new Set();
  for (const request of variants) {
    const response = enqueueLearning(f.queue, request);
    assert.equal(response.outcome, "published");
    keys.add(response.event_key);
  }
  assert.equal(keys.size, variants.length);
  assert.equal(queueFiles(f.queue).length, variants.length);
});

test("a failed-task finding is recorded distinctly from a completed transition", (t) => {
  const f = fixture(t);
  const completed = enqueueLearning(f.queue, requestFor());
  const failed = enqueueLearning(
    f.queue,
    requestFor({ transition_kind: "failed-task-finding", evidence: ["artifacts/issue-776/failure.md"] }),
  );

  assert.equal(completed.outcome, "published");
  assert.equal(failed.outcome, "published");
  assert.notEqual(completed.event_key, failed.event_key);
  const record = JSON.parse(readFileSync(failed.event_path, "utf8"));
  assert.equal(record.identity.transition_kind, "failed-task-finding");
  assert.deepEqual(Object.keys(record).sort(), EVENT_KEYS);
  assert.deepEqual([...TRANSITION_KINDS], ["task-completed", "failed-task-finding"]);
  // Nothing in the record asserts that the product outcome succeeded.
  for (const key of Object.keys(record)) {
    assert.doesNotMatch(key, /deliver|success|verified|complet/i, `the record must not carry a ${key} claim`);
  }
});

test("neither the result nor the record claims delivery", (t) => {
  const f = fixture(t);
  const response = enqueueLearning(f.queue, requestFor());
  const record = JSON.parse(readFileSync(response.event_path, "utf8"));

  assert.equal(response.outcome, "published");
  for (const name of ["delivered", "success", "verified", "complete", "product_outcome"]) {
    assert.equal(name in response, false, `the result must not carry ${name}`);
    assert.equal(name in record, false, `the record must not carry ${name}`);
  }
  assert.match(response.boundary, /not proof of delivery, of a product outcome, or of any downstream processing/i);
});

test("a field outside the allowlist is rejected and its value is never echoed", (t) => {
  const f = fixture(t);
  const marker = "SECRET-MARKER-9f3a4c";
  const request = requestFor({
    token: marker,
    env: { AWS_SECRET_ACCESS_KEY: marker },
    transcript: `full transcript ${marker}`.repeat(20),
  });

  const response = enqueueLearning(f.queue, request);

  assert.equal(response.outcome, "rejected");
  assert.deepEqual(fieldErrors(response), ["unknown-field:env", "unknown-field:token", "unknown-field:transcript"]);
  assert.equal(JSON.stringify(response).includes(marker), false, "the rejection must not echo the request");
  assert.deepEqual(queueFiles(f.queue), []);
});

test("a caller flag cannot carry a success claim for a failed-task finding", (t) => {
  const f = fixture(t);
  const response = enqueueLearning(
    f.queue,
    requestFor({ transition_kind: "failed-task-finding", delivered: true, assertion: "verified" }),
  );

  assert.equal(response.outcome, "rejected");
  assert.deepEqual(fieldErrors(response), ["unknown-field:assertion", "unknown-field:delivered"]);
  assert.deepEqual(queueFiles(f.queue), []);
});

/* ----------------------------------------------------------- concurrency */

const RACE_CHILD = `
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const [libUrl, queue, requestPath, signalPath, startPath] = process.argv.slice(2);
const { enqueueLearning } = await import(libUrl);
const request = JSON.parse(readFileSync(requestPath, "utf8"));
writeFileSync(signalPath, "ready");
const deadline = Date.now() + 20000;
while (!existsSync(startPath)) {
  if (Date.now() > deadline) {
    process.stderr.write("barrier timeout\\n");
    process.exit(3);
  }
  await new Promise((resolve) => setTimeout(resolve, 1));
}
process.stdout.write(JSON.stringify({ request_evidence: request.evidence, response: enqueueLearning(queue, request) }));
`;

/** Start every producer, wait until all are ready, then release them together. */
async function raceProducers(directory, queue, requestPaths) {
  const scriptPath = join(directory, "race-child.mjs");
  writeFileSync(scriptPath, RACE_CHILD);
  const startPath = join(directory, "start.txt");
  const signals = requestPaths.map((_, index) => join(directory, `signal-${index}.txt`));
  const outcomes = [];
  const pending = requestPaths.map((requestPath, index) => {
    const promise = spawnChild(scriptPath, [moduleUrl, queue, requestPath, signals[index], startPath]);
    promise.then((outcome) => outcomes.push(outcome));
    return promise;
  });
  await waitForBarrier(signals, outcomes);
  writeFileSync(startPath, "go\n");
  const results = await Promise.all(pending);
  for (const result of results) assert.equal(result.code, 0, `a producer failed: ${result.stderr}`);
  return results.map((result) => JSON.parse(result.stdout));
}

test("real producers racing one identity publish exactly one record", async (t) => {
  const f = fixture(t);
  const requestPath = writeRequest(f.temp, "same", requestFor());
  const producers = 8;

  const raced = await raceProducers(f.temp, f.queue, Array.from({ length: producers }, () => requestPath));
  const responses = raced.map((entry) => entry.response);

  const published = responses.filter((response) => response.outcome === "published");
  const identical = responses.filter((response) => response.outcome === "existing-identical");
  assert.equal(published.length, 1, `outcomes: ${responses.map((r) => r.outcome).join(",")}`);
  assert.equal(identical.length, producers - 1, `outcomes: ${responses.map((r) => r.outcome).join(",")}`);
  assert.deepEqual(queueFiles(f.queue), [`${published[0].event_key}.json`]);
  for (const response of responses) assert.equal(response.event_key, published[0].event_key);
});

test("racing producers with two payloads leave one record and honest conflicts", async (t) => {
  const f = fixture(t);
  const variants = [
    requestFor({ evidence: ["plans/issue-776/alpha.log"] }),
    requestFor({ evidence: ["plans/issue-776/beta.log"] }),
  ];
  const paths = variants.map((request, index) => writeRequest(f.temp, `variant-${index}`, request));

  const responses = await raceProducers(f.temp, f.queue, paths.flatMap((path) => [path, path, path]));

  const published = responses.filter((entry) => entry.response.outcome === "published");
  assert.equal(published.length, 1, `outcomes: ${responses.map((entry) => entry.response.outcome).join(",")}`);
  const record = JSON.parse(readFileSync(published[0].response.event_path, "utf8"));
  const winner = variants.find((variant) => variant.evidence[0] === record.evidence[0]);
  assert.ok(winner, "the record must be one of the two raced payloads");
  for (const { request_evidence: evidence, response } of responses) {
    const mine = evidence[0] === record.evidence[0];
    if (response.outcome === "conflict") {
      assert.equal(mine, false, "a producer whose own payload holds the record cannot be told it conflicts");
      assert.deepEqual(response.existing.evidence, record.evidence);
      continue;
    }
    assert.equal(mine, true, `${response.outcome} reported for a payload the record does not hold`);
    assert.deepEqual(response.event.evidence, record.evidence, "only the winner's payload may publish");
  }
  assert.deepEqual(queueFiles(f.queue), [`${published[0].response.event_key}.json`]);
});

test("a rival publication that wins the link race is never replaced", (t) => {
  const f = fixture(t);
  const request = requestFor();
  const rivalPath = writeRequest(f.temp, "rival", requestFor({ evidence: ["plans/issue-776/rival.log"] }));

  // The link step is where a rival wins. Publish the rival for real, in a
  // second process, then attempt this attempt's own no-replace link.
  const response = enqueueLearning(f.queue, request, {
    link: (tempPath, eventPath) => {
      const first = cli(["enqueue", "--queue", f.queue, "--request", rivalPath, "--now", FIRST_NOW]);
      assert.equal(first.outcome, "published");
      linkSync(tempPath, eventPath);
    },
  });

  assert.equal(response.outcome, "conflict");
  const published = JSON.parse(readFileSync(response.event_path, "utf8"));
  assert.deepEqual(published.evidence, ["plans/issue-776/rival.log"], "the rival's bytes survive");
  assert.deepEqual(response.existing.evidence, ["plans/issue-776/rival.log"]);
  assert.deepEqual(queueFiles(f.queue), [`${response.event_key}.json`]);
});

test("a rival publication with the same payload reports the record it already has", (t) => {
  const f = fixture(t);
  const request = requestFor();
  const requestPath = writeRequest(f.temp, "same", request);

  const response = enqueueLearning(f.queue, request, {
    link: (tempPath, eventPath) => {
      const first = cli(["enqueue", "--queue", f.queue, "--request", requestPath, "--now", FIRST_NOW]);
      assert.equal(first.outcome, "published");
      linkSync(tempPath, eventPath);
    },
  });

  assert.equal(response.outcome, "existing-identical");
  assert.equal(response.event.recorded_at, FIRST_NOW);
  assert.deepEqual(queueFiles(f.queue), [`${response.event_key}.json`]);
});

/* ------------------------------------------------------- crash and retry */

const CRASH_CHILD = `
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const [libUrl, mode, queue, requestPath, reportPath] = process.argv.slice(2);
const { buildEvent, createTempRecord, linkRecord, serializeEvent, validateRequest } = await import(libUrl);
const request = JSON.parse(readFileSync(requestPath, "utf8"));
const validation = validateRequest(request);
if (!validation.ok) {
  writeFileSync(reportPath, JSON.stringify({ validation }));
  process.exit(2);
}
const event = buildEvent(request, { now: () => "2026-09-20T07:00:00.000Z" });
const { tempPath } = createTempRecord(queue, event.event_key, serializeEvent(event));
if (mode === "after-link") linkRecord(tempPath, join(queue, event.event_key + ".json"));
writeFileSync(reportPath, JSON.stringify({ event_key: event.event_key, temp_path: tempPath }));
process.kill(process.pid, "SIGKILL");
`;

const PARTIAL_CHILD = `
import { closeSync, fsyncSync, openSync, readFileSync, writeFileSync, writeSync } from "node:fs";
import { join } from "node:path";
const [libUrl, queue, requestPath, reportPath] = process.argv.slice(2);
const { buildEvent, serializeEvent } = await import(libUrl);
const request = JSON.parse(readFileSync(requestPath, "utf8"));
const event = buildEvent(request, { now: () => "2026-09-20T07:00:00.000Z" });
const text = serializeEvent(event);
const tempPath = join(queue, ".learning-" + event.event_key.slice(0, 16) + "." + process.pid + ".deadbeef.tmp");
const handle = openSync(tempPath, "wx");
const cut = Math.floor(text.length / 2);
writeSync(handle, text.slice(0, cut), null, "utf8");
fsyncSync(handle);
closeSync(handle);
writeFileSync(reportPath, JSON.stringify({ event_key: event.event_key, temp_path: tempPath, cut, full_bytes: Buffer.byteLength(text, "utf8") }));
process.kill(process.pid, "SIGKILL");
`;

/** Run one producer that is killed rather than returning a response. */
async function crash(directory, name, script, args) {
  const scriptPath = join(directory, `${name}-child.mjs`);
  writeFileSync(scriptPath, script);
  const reportPath = join(directory, `${name}-report.json`);
  const result = await spawnChild(scriptPath, [...args, reportPath]);
  assert.equal(result.stdout, "", "a killed producer must not report a completed call");
  assert.notEqual(result.code, 0, "a killed producer must not exit successfully");
  assert.ok(existsSync(reportPath), `the killed producer left no report: ${result.stderr}`);
  return JSON.parse(readFileSync(reportPath, "utf8"));
}

test("a producer killed before linking leaves no event and one ignorable temporary", async (t) => {
  const f = fixture(t);
  const requestPath = writeRequest(f.temp, "request", requestFor());

  const report = await crash(f.temp, "before-link", CRASH_CHILD, [moduleUrl, "before-link", f.queue, requestPath]);

  assert.equal(existsSync(join(f.queue, `${report.event_key}.json`)), false);
  const orphan = digest(report.temp_path);
  assert.deepEqual(queueFiles(f.queue), [report.temp_path.split(/[\\/]/).pop()]);

  const retry = cli(["enqueue", "--queue", f.queue, "--request", requestPath, "--now", LATER_NOW]);
  assert.equal(retry.outcome, "published");
  assert.equal(digest(report.temp_path), orphan, "the orphan is never promoted or rewritten");
  assert.equal(queueFiles(f.queue).length, 2);
  assert.equal(JSON.parse(readFileSync(retry.event_path, "utf8")).recorded_at, LATER_NOW);
});

test("a producer killed after linking leaves the published record and a retry preserves it", async (t) => {
  const f = fixture(t);
  const requestPath = writeRequest(f.temp, "request", requestFor());

  const report = await crash(f.temp, "after-link", CRASH_CHILD, [moduleUrl, "after-link", f.queue, requestPath]);

  const eventPath = join(f.queue, `${report.event_key}.json`);
  assert.ok(existsSync(eventPath), "the link published before the process was killed");
  const before = digest(eventPath);
  const orphan = digest(report.temp_path);

  const retry = cli(["enqueue", "--queue", f.queue, "--request", requestPath, "--now", LATER_NOW]);
  assert.equal(retry.outcome, "existing-identical");
  assert.equal(digest(eventPath), before, "a retry after publication leaves the bytes alone");
  assert.equal(digest(report.temp_path), orphan, "a retry never touches another attempt's leftover");
  assert.equal(JSON.parse(readFileSync(eventPath, "utf8")).recorded_at, FIRST_NOW);
  assert.equal(queueFiles(f.queue).length, 2);
});

test("a producer killed while writing leaves a partial temporary that is never promoted", async (t) => {
  const f = fixture(t);
  const requestPath = writeRequest(f.temp, "request", requestFor());

  const report = await crash(f.temp, "partial", PARTIAL_CHILD, [moduleUrl, f.queue, requestPath]);

  const partialSize = statSync(report.temp_path).size;
  assert.ok(partialSize > 0, "the crash must leave a real partial file");
  assert.ok(partialSize < report.full_bytes, "the partial file is shorter than the record it was writing");
  assert.equal(existsSync(join(f.queue, `${report.event_key}.json`)), false);

  const retry = cli(["enqueue", "--queue", f.queue, "--request", requestPath, "--now", LATER_NOW]);
  assert.equal(retry.outcome, "published");
  assert.equal(statSync(report.temp_path).size, partialSize, "the partial temporary is left exactly as it was");
  const record = JSON.parse(readFileSync(retry.event_path, "utf8"));
  assert.equal(record.identity.run, "issue-776");
  assert.equal(queueFiles(f.queue).length, 2);
});

test("an interrupted publish recovers by replaying the request its caller saved", async (t) => {
  const f = fixture(t);
  const requestPath = writeRequest(f.temp, "saved-request", requestFor());
  const report = await crash(f.temp, "before-link", CRASH_CHILD, [moduleUrl, "before-link", f.queue, requestPath]);
  assert.equal(existsSync(join(f.queue, `${report.event_key}.json`)), false);

  const recovered = cli(["enqueue", "--queue", f.queue, "--request", requestPath, "--now", LATER_NOW]);
  assert.equal(recovered.outcome, "published");
  assert.equal(recovered.event_key, report.event_key, "the replay keeps the identity the caller retained");

  const replay = cli(["enqueue", "--queue", f.queue, "--request", requestPath, "--now", FIRST_NOW]);
  assert.equal(replay.outcome, "existing-identical");
  assert.equal(digest(recovered.event_path), digest(replay.event_path));
  assert.equal(queueFiles(f.queue).length, 2, "the recovered record and the abandoned temporary only");
});

test("an orphan temporary is never consumed as the event", (t) => {
  const f = fixture(t);
  const request = requestFor();
  const key = eventKey(request);
  // A leftover temporary that even holds a complete, valid event for another
  // identity must stay invisible: only the requested identity may publish, and
  // only from this attempt's own flushed record.
  const orphan = join(f.queue, `.learning-${key.slice(0, 16)}.99999.aaaaaaaa.tmp`);
  writeFileSync(orphan, serializeEvent(buildEvent(requestFor({ run: "issue-999" }), { now: () => FIRST_NOW })));
  const orphanBefore = digest(orphan);

  const response = enqueueLearning(f.queue, request);

  assert.equal(response.outcome, "published");
  assert.equal(digest(orphan), orphanBefore);
  assert.deepEqual(queueFiles(f.queue), [`${key}.json`, orphan.split(/[\\/]/).pop()].sort());
  assert.equal(JSON.parse(readFileSync(response.event_path, "utf8")).identity.run, "issue-776");
});

/* ---------------------------------------------------------- bad records */

test("an invalid JSON record is corrupt and is never replaced", (t) => {
  const f = fixture(t);
  const request = requestFor();
  const recordPath = join(f.queue, `${eventKey(request)}.json`);
  writeFileSync(recordPath, "{ this is not json\n");
  const before = digest(recordPath);

  const response = enqueueLearning(f.queue, request);

  assert.equal(response.outcome, "corrupt");
  assert.deepEqual(response.failure, { code: "invalid-json", detail: null });
  assert.equal("event" in response, false, "a corrupt record is not a duplicate success");
  assert.equal(digest(recordPath), before);
});

test("a record with another schema is corrupt rather than identical", (t) => {
  const f = fixture(t);
  const request = requestFor();
  const recordPath = join(f.queue, `${eventKey(request)}.json`);
  writeFileSync(recordPath, `${JSON.stringify({ ...buildEvent(request, { now: () => FIRST_NOW }), schema_version: "CodexLearningEvent.v2" }, null, 2)}\n`);
  const before = digest(recordPath);

  const response = enqueueLearning(f.queue, request);

  assert.equal(response.outcome, "corrupt");
  assert.deepEqual(response.failure, { code: "unsupported-schema-version", detail: "schema_version" });
  assert.equal(digest(recordPath), before);
});

test("a record whose identity does not match its key is corrupt", (t) => {
  const f = fixture(t);
  const request = requestFor();
  const event = buildEvent(request, { now: () => FIRST_NOW });
  const recordPath = join(f.queue, `${event.event_key}.json`);
  writeFileSync(recordPath, `${JSON.stringify({ ...event, identity: { ...event.identity, run: "issue-999" } }, null, 2)}\n`);
  const before = digest(recordPath);

  const response = enqueueLearning(f.queue, request);

  assert.equal(response.outcome, "corrupt");
  assert.deepEqual(response.failure, { code: "identity-mismatch", detail: "identity" });
  assert.equal(digest(recordPath), before);
});

test("a record carrying a field this writer never writes is corrupt", (t) => {
  const f = fixture(t);
  const request = requestFor();
  const event = buildEvent(request, { now: () => FIRST_NOW });
  const recordPath = join(f.queue, `${event.event_key}.json`);
  writeFileSync(recordPath, `${JSON.stringify({ ...event, delivered: true }, null, 2)}\n`);
  const before = digest(recordPath);

  const response = enqueueLearning(f.queue, request);

  assert.equal(response.outcome, "corrupt");
  assert.deepEqual(response.failure, { code: "unexpected-field", detail: "delivered" });
  assert.equal(digest(recordPath), before);
});

test("a key path occupied by something that is not a file is corrupt", (t) => {
  const f = fixture(t);
  const request = requestFor();
  const recordPath = join(f.queue, `${eventKey(request)}.json`);
  mkdirSync(recordPath);

  const response = enqueueLearning(f.queue, request);

  assert.equal(response.outcome, "corrupt");
  assert.deepEqual(response.failure, { code: "destination-not-a-file", detail: null });
  assert.ok(statSync(recordPath).isDirectory(), "nothing was replaced");
  assert.deepEqual(queueFiles(f.queue), [`${eventKey(request)}.json`]);
});

/* ------------------------------------------------------ queue unusable */

test("a missing queue is a recoverable missed event and is never created", (t) => {
  const f = fixture(t, { createQueue: false });
  const request = requestFor();
  const requestPath = writeRequest(f.temp, "request", request);

  const response = cli(["enqueue", "--queue", f.queue, "--request", requestPath]);

  assert.equal(response.outcome, "recoverable-missed-event");
  assert.equal(response.exit_code, 1);
  assert.equal(response.failure.code, "queue-missing");
  assert.equal(existsSync(f.queue), false, "the writer never invents the queue directory");
  assert.equal(response.event_key, eventKey(request));
  assert.equal(response.retry.event_key, response.event_key);
  assert.deepEqual(response.retry.request.project, request.project);
  assert.deepEqual(response.retry.request.evidence, request.evidence);
  assert.equal("delivered" in response, false, "a queue miss is not a claim about the change");
});

test("a queue path that is a file is a recoverable failure, not a new queue", (t) => {
  const f = fixture(t, { createQueue: false });
  writeFileSync(f.queue, "not a directory\n");

  const response = enqueueLearning(f.queue, requestFor());

  assert.equal(response.outcome, "recoverable-missed-event");
  assert.equal(response.failure.code, "queue-not-a-directory");
  assert.equal(readFileSync(f.queue, "utf8"), "not a directory\n");
});

test("a denied queue directory is a recoverable failure carrying the OS code", (t) => {
  if (process.platform !== "win32") {
    t.skip("the denial fixture uses Windows directory ACLs");
    return;
  }
  const f = fixture(t);
  const user = currentWindowsPrincipal();
  const requestPath = writeRequest(f.temp, "request", requestFor());
  const reset = () => {
    try {
      execFileSync("icacls", [f.queue, "/remove:d", user], { stdio: "ignore" });
    } catch {
      // The fixture directory is disposable; a reset failure is reported by the
      // assertion below rather than swallowed.
    }
  };
  t.after(reset);
  execFileSync("icacls", [f.queue, "/deny", `${user}:(W,AD,WD)`], { stdio: "ignore" });

  try {
    const response = cli(["enqueue", "--queue", f.queue, "--request", requestPath]);
    assert.equal(response.outcome, "recoverable-missed-event");
    assert.equal(response.failure.code, "queue-unwritable");
    assert.equal(response.failure.os_code, "EPERM");
  } finally {
    reset();
  }
  assert.deepEqual(queueFiles(f.queue), []);
});

test("a record that cannot be read is a recoverable miss rather than a verdict", (t) => {
  if (process.platform !== "win32") {
    t.skip("the unreadable-record fixture uses Windows directory ACLs");
    return;
  }
  const f = fixture(t);
  const request = requestFor();
  const requestPath = writeRequest(f.temp, "request", request);
  const published = cli(["enqueue", "--queue", f.queue, "--request", requestPath, "--now", FIRST_NOW]);
  assert.equal(published.outcome, "published");
  const before = digest(published.event_path);

  const user = currentWindowsPrincipal();
  const reset = () => {
    try {
      execFileSync("icacls", [published.event_path, "/remove:d", user], { stdio: "ignore" });
    } catch {
      // Reported by the assertions below rather than swallowed.
    }
  };
  t.after(reset);
  execFileSync("icacls", [published.event_path, "/deny", `${user}:(R)`], { stdio: "ignore" });
  let response;
  try {
    response = cli(["enqueue", "--queue", f.queue, "--request", requestPath, "--now", LATER_NOW]);
  } finally {
    reset();
  }

  assert.equal(response.outcome, "recoverable-missed-event");
  assert.equal(response.failure.code, "record-unreadable");
  assert.ok(["EPERM", "EACCES"].includes(response.failure.os_code), `unexpected OS code ${response.failure.os_code}`);
  assert.equal(response.event_key, published.event_key);
  assert.equal(digest(published.event_path), before, "an unreadable record is left exactly as it was");
});

/** A writable directory on a different volume from the fixture, if one exists. */
function neighbourVolumeDir(t, fixtureRoot) {
  const neighbour = dirname(sourceRoot);
  try {
    if (statSync(neighbour).dev === statSync(fixtureRoot).dev) return null;
    const scratch = mkdtempSync(join(neighbour, ".tmp-learning-queue-cross-"));
    t.after(() => rmSync(scratch, { recursive: true, force: true }));
    return scratch;
  } catch {
    return null;
  }
}

test("an unsupported link is a recoverable failure and no weaker step publishes", (t) => {
  const f = fixture(t);
  const scratch = neighbourVolumeDir(t, f.temp);
  if (scratch === null) {
    t.skip("no second writable volume is available for a real cross-volume link");
    return;
  }
  const request = requestFor();

  const response = enqueueLearning(f.queue, request, {
    link: (tempPath) => linkSync(tempPath, join(scratch, "cross-volume.json")),
  });

  assert.equal(response.outcome, "recoverable-missed-event");
  assert.equal(response.failure.code, "publication-unsupported");
  assert.equal(response.failure.os_code, "EXDEV");
  assert.equal(existsSync(join(scratch, "cross-volume.json")), false, "there is no rename or copy fallback");
  assert.equal(existsSync(join(f.queue, `${response.event_key}.json`)), false);
  assert.deepEqual(queueFiles(f.queue), [], "the attempt's temporary file is removed");
  assert.equal(response.retry.event_key, eventKey(request));
});

test("a failed cleanup after publication still reports the published event", (t) => {
  const f = fixture(t);
  const request = requestFor();
  const requestPath = writeRequest(f.temp, "request", request);

  const response = enqueueLearning(f.queue, request, {
    removeTemp: () => ({ removed: false, warning: "temporary-cleanup-failed" }),
  });

  assert.equal(response.outcome, "published");
  assert.deepEqual(response.warnings, ["temporary-cleanup-failed"]);
  assert.ok(existsSync(response.event_path), "cleanup trouble never unmakes the published event");
  assert.equal(queueFiles(f.queue).length, 2, "the attempt's temporary name is left behind");

  const retry = cli(["enqueue", "--queue", f.queue, "--request", requestPath, "--now", LATER_NOW]);
  assert.equal(retry.outcome, "existing-identical");
  assert.equal(queueFiles(f.queue).length, 2, "a later run neither removes nor promotes the leftover");
});

test("the cleanup step reports failure instead of throwing when a name cannot be removed", (t) => {
  const f = fixture(t);
  const stubborn = join(f.queue, "not-a-temporary-file");
  mkdirSync(stubborn);
  writeFileSync(join(stubborn, "child"), "x");

  const result = discardTemp(stubborn);

  assert.equal(result.removed, false);
  assert.equal(result.warning, "temporary-cleanup-failed");
  assert.equal(result.detail, "ERR_FS_EISDIR");
  assert.ok(existsSync(stubborn));
  assert.equal(discardTemp(join(f.queue, "already-gone.tmp")).removed, true);
});

/* -------------------------------------------------------- bounded input */

test("a request outside the bounds is rejected before anything is written", (t) => {
  const f = fixture(t);
  const cases = [
    {
      why: "no run identity",
      request: (() => {
        const request = requestFor();
        delete request.run;
        return request;
      })(),
      errors: ["missing-field:run"],
    },
    { why: "no evidence reference", request: requestFor({ evidence: [] }), errors: ["invalid-value:evidence"] },
    {
      why: "an oversized identity",
      request: requestFor({ project: "p".repeat(LIMITS.identityChars + 1) }),
      errors: ["invalid-value:project"],
    },
    { why: "a control character", request: requestFor({ run: "issue\u0007" }), errors: ["invalid-value:run"] },
    {
      why: "an unsupported transition kind",
      request: requestFor({ transition_kind: "task-reverted" }),
      errors: ["invalid-value:transition_kind"],
    },
    {
      why: "too many references",
      request: requestFor({ evidence: Array.from({ length: LIMITS.references + 1 }, (_, index) => `ref-${index}`) }),
      errors: ["too-many-entries:evidence"],
    },
    {
      why: "an oversized reference",
      request: requestFor({ evidence: ["x".repeat(LIMITS.referenceChars + 1)] }),
      errors: ["invalid-value:evidence"],
    },
    {
      why: "another request schema",
      request: { ...requestFor(), schema_version: "CodexLearningRequest.v2" },
      errors: ["unsupported-schema-version:schema_version"],
    },
    { why: "not an object", request: [requestFor()], errors: ["request-not-an-object:-"] },
  ];

  for (const entry of cases) {
    const response = enqueueLearning(f.queue, entry.request);
    assert.equal(response.outcome, "rejected", entry.why);
    assert.deepEqual(fieldErrors(response), entry.errors, entry.why);
  }
  assert.deepEqual(queueFiles(f.queue), []);
});

test("the CLI refuses a null identity field instead of publishing what it will call corrupt", (t) => {
  const f = fixture(t);
  for (const field of ["project", "run", "candidate"]) {
    const requestPath = writeRequest(f.temp, `${field}-null`, requestFor({ [field]: null }));
    const response = cli(["enqueue", "--queue", f.queue, "--request", requestPath]);

    assert.equal(response.outcome, "rejected", `${field}: null must not publish`);
    assert.equal(response.exit_code, 2, `${field}: null is a request fault`);
    assert.deepEqual(fieldErrors(response), [`invalid-value:${field}`], `${field}: null names the field`);
    assert.deepEqual(queueFiles(f.queue), [], `${field}: null must leave the queue untouched`);
  }
});

test("the library refuses an undefined identity field rather than publishing a keyless record", (t) => {
  const f = fixture(t);
  for (const field of ["project", "run", "candidate"]) {
    const request = requestFor();
    request[field] = undefined;
    const response = enqueueLearning(f.queue, request);

    assert.equal(response.outcome, "rejected", `${field}: undefined must not publish`);
    assert.deepEqual(fieldErrors(response), [`invalid-value:${field}`], `${field}: undefined names the field`);
    assert.deepEqual(queueFiles(f.queue), [], `${field}: undefined must leave the queue untouched`);
  }
  // A missing field keeps its own distinct report, so the two faults stay apart.
  const missing = requestFor();
  delete missing.run;
  assert.deepEqual(fieldErrors(enqueueLearning(f.queue, missing)), ["missing-field:run"]);
  assert.deepEqual(queueFiles(f.queue), []);
});

test("a null optional reference and a missing optional list stay legitimate", (t) => {
  const f = fixture(t);
  const request = requestFor({ task: null });
  const first = enqueueLearning(f.queue, request, { now: () => FIRST_NOW });
  assert.equal(first.outcome, "published");
  assert.equal(JSON.parse(readFileSync(first.event_path, "utf8")).task, null);
  assert.equal(enqueueLearning(f.queue, request, { now: () => LATER_NOW }).outcome, "existing-identical");

  const withoutTrace = requestFor({ run: "issue-778", task: null, trace: undefined });
  const second = enqueueLearning(f.queue, withoutTrace, { now: () => FIRST_NOW });
  assert.equal(second.outcome, "published");
  assert.deepEqual(JSON.parse(readFileSync(second.event_path, "utf8")).trace, []);
  assert.equal(queueFiles(f.queue).length, 2);
});

test("a record whose attempt timestamp is not a string is corrupt while a real one still dedupes", (t) => {
  const f = fixture(t);
  const request = requestFor();
  const event = buildEvent(request, { now: () => FIRST_NOW });
  const recordPath = join(f.queue, `${event.event_key}.json`);

  for (const bad of [null, 0, true, "not-a-date"]) {
    writeFileSync(recordPath, `${JSON.stringify({ ...event, recorded_at: bad }, null, 2)}\n`);
    const response = enqueueLearning(f.queue, request);
    assert.equal(response.outcome, "corrupt", `recorded_at ${JSON.stringify(bad)} must not read as valid`);
    assert.deepEqual(response.failure, { code: "invalid-value", detail: "recorded_at" });
    rmSync(recordPath);
  }

  // The writer's own timestamp is a parseable string, and the retry still dedupes.
  const published = enqueueLearning(f.queue, request, { now: () => FIRST_NOW });
  assert.equal(published.outcome, "published");
  assert.equal(typeof JSON.parse(readFileSync(published.event_path, "utf8")).recorded_at, "string");
  assert.equal(enqueueLearning(f.queue, request, { now: () => LATER_NOW }).outcome, "existing-identical");
  // A value the writer cannot read as a timestamp is refused, not coerced to 1970.
  const refused = enqueueLearning(f.queue, requestFor({ run: "issue-777" }), { now: () => 0 });
  assert.equal(refused.outcome, "rejected");
  assert.deepEqual(fieldErrors(refused), ["invalid-value:recorded_at"]);
  assert.equal(queueFiles(f.queue).length, 1);
});

test("every required field rejects a present-but-undefined value without throwing", (t) => {
  const f = fixture(t);
  for (const field of REQUIRED_NAMES) {
    const request = requestFor();
    request[field] = undefined;
    let response;
    assert.doesNotThrow(() => {
      response = enqueueLearning(f.queue, request);
    }, `${field}: undefined must be answered, not thrown`);
    assert.equal(response.outcome, "rejected", `${field}: undefined must not publish`);
    assert.deepEqual(fieldErrors(response), [`invalid-value:${field}`], `${field}: undefined names the field`);
    assert.deepEqual(queueFiles(f.queue), [], `${field}: undefined must leave the queue untouched`);
  }
});

test("every required field reports absence distinctly from an empty value", (t) => {
  const f = fixture(t);
  for (const field of REQUIRED_NAMES) {
    const request = requestFor();
    delete request[field];
    const response = enqueueLearning(f.queue, request);
    assert.equal(response.outcome, "rejected", field);
    assert.deepEqual(fieldErrors(response), [`missing-field:${field}`], `${field}: absence is its own fault`);
  }
  assert.deepEqual(queueFiles(f.queue), []);
});

test("every identity field is a non-empty bounded string, with one report per fault", (t) => {
  const f = fixture(t);
  const faults = [
    { why: "null", value: null },
    { why: "undefined", value: undefined },
    { why: "empty", value: "" },
    { why: "numeric", value: 7 },
  ];
  for (const field of IDENTITY_NAMES) {
    for (const fault of faults) {
      const request = requestFor({ [field]: fault.value });
      let response;
      assert.doesNotThrow(() => {
        response = enqueueLearning(f.queue, request);
      }, `${field}/${fault.why} must be answered, not thrown`);
      assert.equal(response.outcome, "rejected", `${field}/${fault.why}`);
      assert.deepEqual(fieldErrors(response), [`invalid-value:${field}`], `${field}/${fault.why}: one report`);
    }
  }
  // An out-of-enum kind keeps the same single report rather than doubling up.
  const wrongKind = enqueueLearning(f.queue, requestFor({ transition_kind: "task-reverted" }));
  assert.equal(wrongKind.outcome, "rejected");
  assert.deepEqual(fieldErrors(wrongKind), ["invalid-value:transition_kind"]);
  assert.deepEqual(queueFiles(f.queue), []);
});

test("optional references stay optional while the required list stays required", (t) => {
  const f = fixture(t);
  const minimal = requestFor({ run: "issue-780" });
  delete minimal.task;
  delete minimal.skills;
  delete minimal.trace;
  const published = enqueueLearning(f.queue, minimal);
  assert.equal(published.outcome, "published");
  const record = JSON.parse(readFileSync(published.event_path, "utf8"));
  assert.equal(record.task, null);
  assert.deepEqual(record.skills, []);
  assert.deepEqual(record.trace, []);

  const emptyLists = requestFor({ run: "issue-781", task: null, skills: [], trace: [] });
  assert.equal(enqueueLearning(f.queue, emptyLists).outcome, "published");

  for (const [why, value] of [["empty", []], ["null", null]]) {
    const response = enqueueLearning(f.queue, requestFor({ run: "issue-782", evidence: value }));
    assert.equal(response.outcome, "rejected", `evidence ${why}`);
    assert.deepEqual(fieldErrors(response), ["invalid-value:evidence"], `evidence ${why}`);
  }

  // The documented CLI path reports an omitted required field honestly too.
  const omitted = requestFor({ run: "issue-783" });
  delete omitted.transition_kind;
  const response = cli(["enqueue", "--queue", f.queue, "--request", writeRequest(f.temp, "omitted-kind", omitted)]);
  assert.equal(response.outcome, "rejected");
  assert.equal(response.exit_code, 2);
  assert.deepEqual(fieldErrors(response), ["missing-field:transition_kind"]);
  assert.equal(queueFiles(f.queue).length, 2);
});

test("an oversized request file is refused before it is parsed", (t) => {
  const f = fixture(t);
  const requestPath = join(f.temp, "huge.json");
  writeFileSync(requestPath, `{"schema_version": "${REQUEST_SCHEMA}", "pad": "${"x".repeat(LIMITS.requestBytes)}"}`);

  const response = runCommand({ command: "enqueue", values: { queue: f.queue, request: requestPath } });

  assert.equal(response.exitCode, 2);
  const parsed = JSON.parse(response.stdout);
  assert.equal(parsed.outcome, "rejected");
  assert.deepEqual(parsed.errors, [{ code: "request-too-large", field: null }]);
  assert.deepEqual(queueFiles(f.queue), []);
});

test("a missing or unparsable request is rejected rather than guessed at", (t) => {
  const f = fixture(t);
  const missing = runCommand({ command: "enqueue", values: { queue: f.queue, request: join(f.temp, "absent.json") } });
  assert.equal(missing.exitCode, 2);
  assert.deepEqual(JSON.parse(missing.stdout).errors, [{ code: "request-missing", field: null }]);

  const broken = join(f.temp, "broken.json");
  writeFileSync(broken, "{ this is not json");
  const invalid = runCommand({ command: "enqueue", values: { queue: f.queue, request: broken } });
  assert.equal(invalid.exitCode, 2);
  assert.deepEqual(JSON.parse(invalid.stdout).errors, [{ code: "invalid-json", field: null }]);
  assert.deepEqual(queueFiles(f.queue), []);
});

test("the CLI separates published, conflict and rejected in its exit code", (t) => {
  const f = fixture(t);
  const request = requestFor();
  const requestPath = writeRequest(f.temp, "request", request);
  const published = cli(["enqueue", "--queue", f.queue, "--request", requestPath, "--now", FIRST_NOW]);
  assert.equal(published.exit_code, 0);

  const conflictPath = writeRequest(f.temp, "conflict", requestFor({ evidence: ["plans/issue-776/other.log"] }));
  const conflict = cli(["enqueue", "--queue", f.queue, "--request", conflictPath]);
  assert.equal(conflict.outcome, "conflict");
  assert.equal(conflict.exit_code, 1);

  const rejectedPath = writeRequest(f.temp, "rejected", requestFor({ evidence: [] }));
  const rejected = cli(["enqueue", "--queue", f.queue, "--request", rejectedPath]);
  assert.equal(rejected.outcome, "rejected");
  assert.equal(rejected.exit_code, 2);

  const help = runCli(["help"]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage: node learning-queue\.mjs enqueue/);
  const noQueue = runCli(["enqueue", "--request", requestPath]);
  assert.equal(noQueue.status, 2);
  assert.deepEqual(JSON.parse(noQueue.stdout).errors, [{ code: "queue-required", field: "queue" }]);
  const unknown = runCli(["resume"]);
  assert.equal(unknown.status, 2);
  assert.deepEqual(JSON.parse(unknown.stdout).errors, [{ code: "unknown-command", field: null }]);
  const badNow = runCli(["enqueue", "--queue", f.queue, "--request", requestPath, "--now", "not-a-date"]);
  assert.equal(badNow.status, 2);
  assert.deepEqual(JSON.parse(badNow.stdout).errors, [{ code: "invalid-value", field: "now" }]);
  assert.equal(queueFiles(f.queue).length, 1);
});

/* ---------------------------------------------------------- boundaries */

test("the producer and its reference carry no host path or environment read", () => {
  for (const path of [modulePath, referencePath]) {
    const text = readFileSync(path, "utf8");
    assert.doesNotMatch(text, /[A-Za-z]:[\\/]/, `${path} embeds a drive path`);
    assert.doesNotMatch(text, /\\\\[A-Za-z0-9._-]+\\/, `${path} embeds a UNC path`);
  }
  const source = readFileSync(modulePath, "utf8");
  assert.doesNotMatch(source, /process\.env/, "the producer must not read the environment");
  assert.doesNotMatch(source, /child_process|node:http|node:net|\bfetch\(/, "the producer must not reach another process or the network");
  const allowed = ["node:crypto", "node:fs", "node:path", "node:url", "node:util"];
  for (const specifier of [...source.matchAll(/from "([^"]+)"/g)].map((match) => match[1])) {
    assert.ok(allowed.includes(specifier), `${specifier} is not one of the standard library modules this producer may use`);
  }
});

test("the workflow reference states the boundary, the outcomes and the recovery limit", () => {
  const text = readFileSync(referencePath, "utf8");
  for (const outcome of ["published", "existing-identical", "conflict", "corrupt", "recoverable-missed-event", "rejected"]) {
    assert.ok(text.includes(outcome), `the reference must name the ${outcome} outcome`);
  }
  for (const kind of TRANSITION_KINDS) assert.ok(text.includes(kind), `the reference must name ${kind}`);
  assert.match(text, /not proof of delivery/i);
  assert.match(text, /never creates/i);
  assert.match(text, /hard link/i);
  assert.match(text, /power-loss|power loss/i);
  assert.match(text, /orphan/i);
});

test("both workflows point at the one reference", () => {
  const delivery = readFileSync(fileURLToPath(new URL("../../skills/delivery/SKILL.md", import.meta.url)), "utf8");
  assert.ok(delivery.includes("references/learning-events.md"), "the delivery skill must link the reference");
  const docs = readFileSync(fileURLToPath(new URL("../../skills/docs-workspace/SKILL.md", import.meta.url)), "utf8");
  assert.ok(docs.includes("../delivery/references/learning-events.md"), "the documents route must point at the same reference");
});
