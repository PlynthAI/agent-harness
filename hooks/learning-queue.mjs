#!/usr/bin/env node
/**
 * One bounded learning event per verified run transition.
 *
 * The caller is the transition owner: it has already verified that the
 * transition happened, and it keeps its own evidence. This writer only
 * deduplicates the record of that call. It never observes a transition, never
 * consumes the queue, and cannot prove that anything was delivered.
 *
 *   - The caller resolves and supplies the queue directory; this module
 *     embeds no host path, invents no queue location and creates no directory.
 *   - The identity - project, run or task execution id, actual candidate and
 *     transition kind - is hashed into the event's file name and kept inside
 *     the record, so a retry of that identity returns the published record
 *     untouched instead of preparing a second candidate.
 *   - Publication is a hard link from a flushed, closed, same-directory
 *     temporary record. The link cannot replace an existing event, and it is
 *     the only no-replace primitive used here: there is no rename fallback,
 *     and a filesystem that cannot link returns a recoverable failure.
 *   - The whole payload is bounded metadata and references. No transcript, no
 *     environment, no credential and no referenced file is read or copied, and
 *     a field the allowlist does not name is rejected rather than carried.
 *
 * Usage:
 *   node learning-queue.mjs enqueue --queue <dir> --request <file> [--now <iso>]
 *   node learning-queue.mjs help
 *
 * Outcomes: published, existing-identical, conflict, corrupt,
 * recoverable-missed-event, rejected. Exit 0 for the first two, 1 for
 * conflict, corrupt and recoverable, 2 for a rejected request.
 */

import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  fsyncSync,
  linkSync,
  lstatSync,
  openSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

/** Versioned shapes. A change to either is a new schema, not a silent edit. */
export const REQUEST_SCHEMA = "CodexLearningRequest.v1";
export const EVENT_SCHEMA = "CodexLearningEvent.v1";
export const RESULT_SCHEMA = "CodexLearningQueueResult.v1";
export const KEY_VERSION = "CodexLearningKey.v1";

/**
 * The two transitions this writer distinguishes. A completed transition is
 * verified work; a failed-task finding is useful evidence that cannot carry a
 * success claim. Neither record says anything about delivery.
 */
export const TRANSITION_KINDS = Object.freeze(["task-completed", "failed-task-finding"]);

/**
 * Bounds applied before anything is written. They are deliberately small: the
 * record is an index into the caller's own evidence, not a copy of it.
 */
export const LIMITS = Object.freeze({
  requestBytes: 64 * 1024,
  recordBytes: 16 * 1024,
  identityChars: 200,
  referenceChars: 300,
  references: 16,
});

const REQUEST_FIELDS = Object.freeze([
  "schema_version",
  "project",
  "run",
  "candidate",
  "transition_kind",
  "task",
  "skills",
  "evidence",
  "trace",
]);
const IDENTITY_FIELDS = Object.freeze(["project", "run", "candidate", "transition_kind"]);
const EVENT_FIELDS = Object.freeze([
  "schema_version",
  "event_key",
  "identity",
  "recorded_at",
  "task",
  "skills",
  "evidence",
  "trace",
]);
/** The required set is derived from the one identity authority, so it cannot drift from it. */
const REQUIRED_FIELDS = Object.freeze([...IDENTITY_FIELDS, "evidence"]);
const LIST_FIELDS = Object.freeze(["skills", "evidence", "trace"]);

/** A field name is echoed in a rejection only when it is a plain identifier. */
const SAFE_FIELD_NAME = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

const BOUNDARY =
  "an event records that the transition owner called this writer; it is not proof of delivery, " +
  "of a product outcome, or of any downstream processing";

const RETRY_NOTE =
  "retain this bounded request (or the equivalent evidence references in your own artifacts) and " +
  "call the writer again; this queue never proves a transition and never creates a record for you";

/* --------------------------------------------------------------- identity */

/**
 * The stable key of one identity. Deterministic and versioned: the four fields
 * are serialised as written, in a fixed order, under the key version.
 */
export function eventKey(identity) {
  const canonical = JSON.stringify([
    KEY_VERSION,
    identity?.project ?? null,
    identity?.run ?? null,
    identity?.candidate ?? null,
    identity?.transition_kind ?? null,
  ]);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

/* ------------------------------------------------------------ validation */

/** True when a value cannot be carried as a bounded reference. */
function violatesBounds(value, max) {
  return (
    typeof value !== "string" ||
    value.trim() === "" ||
    CONTROL_CHARACTER.test(value) ||
    value.length > max
  );
}

/**
 * Validate a request against the allowlist and the bounds. Nothing here reads
 * the queue, and nothing here echoes a rejected value: an error carries a code
 * and, when the name is a plain identifier, the field name.
 */
export function validateRequest(request) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    return { ok: false, errors: [{ code: "request-not-an-object", field: null }] };
  }
  const errors = [];
  for (const name of Object.keys(request)) {
    if (REQUEST_FIELDS.includes(name)) continue;
    const safe = SAFE_FIELD_NAME.test(name);
    errors.push({ code: safe ? "unknown-field" : "invalid-field-name", field: safe ? name : null });
  }
  if (request.schema_version !== REQUEST_SCHEMA) {
    errors.push({ code: "unsupported-schema-version", field: "schema_version" });
  }
  for (const name of REQUIRED_FIELDS) {
    if (!(name in request)) errors.push({ code: "missing-field", field: name });
  }
  // The identity is checked from the same four-name authority the key, the event
  // schema and the reader use, so no second list can fall behind it. Absence is
  // already reported above; a present but empty value is not a value.
  const boundedIdentity = new Set();
  for (const name of IDENTITY_FIELDS) {
    if (!(name in request)) continue;
    const value = request[name];
    if (value === null || value === undefined || violatesBounds(value, LIMITS.identityChars)) {
      errors.push({ code: "invalid-value", field: name });
      continue;
    }
    boundedIdentity.add(name);
  }
  // Only a well-formed string can be an unsupported kind; anything else has
  // already been reported once rather than twice.
  if (boundedIdentity.has("transition_kind") && !TRANSITION_KINDS.includes(request.transition_kind)) {
    errors.push({ code: "invalid-value", field: "transition_kind" });
  }
  // `task` is the one optional scalar reference, and it may be null.
  if (request.task !== null && request.task !== undefined && violatesBounds(request.task, LIMITS.referenceChars)) {
    errors.push({ code: "invalid-value", field: "task" });
  }
  for (const name of LIST_FIELDS) {
    if (!(name in request)) continue; // absence is already reported above
    const value = request[name];
    if (value === undefined) {
      // An omitted optional list is fine; an omitted required one is not.
      if (REQUIRED_FIELDS.includes(name)) errors.push({ code: "invalid-value", field: name });
      continue;
    }
    if (!Array.isArray(value)) {
      errors.push({ code: "invalid-value", field: name });
      continue;
    }
    if (value.length > LIMITS.references) errors.push({ code: "too-many-entries", field: name });
    if (value.length === 0 && REQUIRED_FIELDS.includes(name)) errors.push({ code: "invalid-value", field: name });
    for (const entry of value) {
      if (violatesBounds(entry, LIMITS.referenceChars)) {
        errors.push({ code: "invalid-value", field: name });
        break;
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

/** Re-serialise a validated request into the bounded shape callers retain. */
export function boundedRequest(request) {
  const bounded = {
    schema_version: REQUEST_SCHEMA,
    project: request.project,
    run: request.run,
    candidate: request.candidate,
    transition_kind: request.transition_kind,
    task: request.task ?? null,
    skills: [...(request.skills ?? [])],
    evidence: [...request.evidence],
    trace: [...(request.trace ?? [])],
  };
  return bounded;
}

/* ---------------------------------------------------------------- records */

/**
 * The attempt timestamp for a Date or a non-empty string that parses. A number,
 * a boolean or an empty value is not a timestamp: a record's `recorded_at` is
 * always a string, and the reader requires one.
 */
function timestampOf(value) {
  if (typeof value === "string") {
    const text = value.trim();
    if (text === "") return null;
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  return null;
}

/**
 * The event for one validated request. `recorded_at` is the attempt timestamp:
 * it is written into the record and deliberately excluded from every
 * comparison, so an identical retry on a later attempt still matches.
 */
export function buildEvent(request, { now = () => new Date() } = {}) {
  const bounded = boundedRequest(request);
  const identity = {
    project: bounded.project,
    run: bounded.run,
    candidate: bounded.candidate,
    transition_kind: bounded.transition_kind,
  };
  return {
    schema_version: EVENT_SCHEMA,
    event_key: eventKey(identity),
    identity,
    recorded_at: timestampOf(typeof now === "function" ? now() : now),
    task: bounded.task,
    skills: bounded.skills,
    evidence: bounded.evidence,
    trace: bounded.trace,
  };
}

/** The bytes of one record. Deterministic: the same event is the same bytes. */
export function serializeEvent(event) {
  return `${JSON.stringify(event, null, 2)}\n`;
}

/**
 * What two records are compared by: the identity and the bounded references,
 * in a fixed order, with the attempt timestamp left out.
 */
export function canonicalPayload(event) {
  return JSON.stringify([
    KEY_VERSION,
    event?.event_key ?? null,
    event?.identity?.project ?? null,
    event?.identity?.run ?? null,
    event?.identity?.candidate ?? null,
    event?.identity?.transition_kind ?? null,
    event?.task ?? null,
    [...(event?.skills ?? [])],
    [...(event?.evidence ?? [])],
    [...(event?.trace ?? [])],
  ]);
}

/**
 * Read the record already published at one key, or report why it cannot be
 * used. An unreadable, mislabelled or unexpected-shape record is corrupt, never
 * a duplicate success and never repaired here.
 */
export function readPublishedEvent(eventPath, expectedKey) {
  let info;
  try {
    info = lstatSync(eventPath);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    return { ok: false, failure: { code: "unreadable-record", detail: error.code ?? null } };
  }
  if (!info.isFile()) return { ok: false, failure: { code: "destination-not-a-file", detail: null } };
  if (info.size > LIMITS.recordBytes) {
    return { ok: false, failure: { code: "record-too-large", detail: `over ${LIMITS.recordBytes} bytes` } };
  }
  let text;
  try {
    text = readFileSync(eventPath, "utf8");
  } catch (error) {
    return { ok: false, failure: { code: "unreadable-record", detail: error.code ?? null } };
  }
  let event;
  try {
    event = JSON.parse(text);
  } catch {
    return { ok: false, failure: { code: "invalid-json", detail: null } };
  }
  return validateEvent(event, expectedKey);
}

function validateEvent(event, expectedKey) {
  const invalid = (code, field = null) => ({ ok: false, failure: { code, detail: field } });
  if (!event || typeof event !== "object" || Array.isArray(event)) return invalid("invalid-value");
  for (const name of Object.keys(event)) {
    if (EVENT_FIELDS.includes(name)) continue;
    return invalid("unexpected-field", SAFE_FIELD_NAME.test(name) ? name : null);
  }
  for (const name of EVENT_FIELDS) {
    if (!(name in event)) return invalid("invalid-value", name);
  }
  if (event.schema_version !== EVENT_SCHEMA) return invalid("unsupported-schema-version", "schema_version");
  if (event.event_key !== expectedKey) return invalid("event-key-mismatch", "event_key");
  const identity = event.identity;
  if (!identity || typeof identity !== "object" || Array.isArray(identity)) return invalid("invalid-value", "identity");
  if (Object.keys(identity).length !== IDENTITY_FIELDS.length) return invalid("identity-mismatch", "identity");
  for (const name of IDENTITY_FIELDS) {
    if (violatesBounds(identity[name], LIMITS.identityChars)) return invalid("identity-mismatch", name);
  }
  if (!TRANSITION_KINDS.includes(identity.transition_kind)) return invalid("identity-mismatch", "transition_kind");
  if (eventKey(identity) !== expectedKey) return invalid("identity-mismatch", "identity");
  if (typeof event.recorded_at !== "string" || timestampOf(event.recorded_at) === null) {
    return invalid("invalid-value", "recorded_at");
  }
  if (event.task !== null && event.task !== undefined && violatesBounds(event.task, LIMITS.referenceChars)) {
    return invalid("invalid-value", "task");
  }
  for (const name of LIST_FIELDS) {
    const value = event[name];
    if (!Array.isArray(value) || value.length > LIMITS.references) return invalid("invalid-value", name);
    for (const entry of value) {
      if (violatesBounds(entry, LIMITS.referenceChars)) return invalid("invalid-value", name);
    }
  }
  return { ok: true, event };
}

/* ------------------------------------------------------------ publication */

/**
 * Write, flush and close one attempt's temporary record inside the queue
 * directory. It is never the published name, and a crash after this call
 * leaves ignorable debris rather than a partial event.
 */
export function createTempRecord(queueDir, key, text) {
  const tempPath = join(queueDir, `.learning-${key.slice(0, 16)}.${process.pid}.${randomUUID().slice(0, 8)}.tmp`);
  const handle = openSync(tempPath, "wx");
  try {
    writeFileSync(handle, text, "utf8");
    fsyncSync(handle);
  } catch (error) {
    try {
      closeSync(handle);
    } catch {
      // The handle is already gone; the temporary below is all that is left.
    }
    rmSync(tempPath, { force: true });
    throw error;
  }
  closeSync(handle);
  return { tempPath };
}

/**
 * The only publication step: a no-replace hard link. An existing destination
 * raises EEXIST, and nothing here removes or replaces it.
 */
export function linkRecord(tempPath, eventPath) {
  linkSync(tempPath, eventPath);
}

/**
 * Remove one attempt's temporary file. A failure here is reported, never
 * thrown: the event it published is still published, and the leftover name is
 * ignored by every later run rather than promoted.
 */
export function discardTemp(tempPath) {
  try {
    rmSync(tempPath, { force: true });
    return { removed: true };
  } catch (error) {
    return { removed: false, warning: "temporary-cleanup-failed", detail: error.code ?? null };
  }
}

function runCleanup(removeTemp, tempPath) {
  try {
    const result = removeTemp(tempPath);
    if (result && result.removed === false) return { warning: result.warning ?? "temporary-cleanup-failed" };
    return {};
  } catch (error) {
    return { warning: "temporary-cleanup-failed", detail: error.code ?? null };
  }
}

const UNSUPPORTED_LINK_CODES = new Set([
  "ENOSYS",
  "ENOTSUP",
  "EOPNOTSUPP",
  "EXDEV",
  "EPERM",
  "EACCES",
  "EMLINK",
  "EINVAL",
]);

function failureOf(error, fallback) {
  const code = typeof error?.code === "string" ? error.code : null;
  if (fallback === "publication") {
    return { code: code && UNSUPPORTED_LINK_CODES.has(code) ? "publication-unsupported" : "publication-failed", os_code: code };
  }
  if (code === "ENOENT") return { code: "queue-missing", os_code: code };
  if (code === "ENOTDIR") return { code: "queue-not-a-directory", os_code: code };
  return { code: "queue-unwritable", os_code: code };
}

function result(outcome, fields) {
  const { warnings = [], ...rest } = fields;
  return { schema_version: RESULT_SCHEMA, outcome, ...rest, boundary: BOUNDARY, warnings };
}

function retryFor(event) {
  return {
    event_key: event.event_key,
    note: RETRY_NOTE,
    request: boundedRequest({
      schema_version: REQUEST_SCHEMA,
      ...event.identity,
      task: event.task,
      skills: event.skills,
      evidence: event.evidence,
      trace: event.trace,
    }),
  };
}

function exportOf(event) {
  return {
    schema_version: EVENT_SCHEMA,
    event_key: event.event_key,
    identity: event.identity,
    recorded_at: event.recorded_at,
    task: event.task,
    skills: event.skills,
    evidence: event.evidence,
    trace: event.trace,
  };
}

/**
 * Publish one learning event, or report honestly why it was not published.
 *
 * @param {string} queueDir the caller-resolved queue directory; it must exist,
 *   and this writer never creates it.
 * @param {object} request the bounded request.
 * @param {object} [options]
 * @param {Date|string|Function} [options.now] the attempt timestamp.
 * @param {Function} [options.removeTemp] the cleanup step for this attempt's
 *   temporary file; it defaults to `discardTemp` and may be supplied by a host
 *   with different removal semantics or by a fixture proving the failure path.
 * @param {Function} [options.link] the publication step; it defaults to
 *   `linkRecord`. Only a no-replace link may publish, so a host that supplies
 *   its own must keep that property; a fixture uses this to hand the
 *   composition a real unsupported-link error from another volume.
 */
export function enqueueLearning(queueDir, request, options = {}) {
  if (typeof queueDir !== "string" || queueDir.trim() === "") {
    return result("rejected", { event_key: null, event_path: null, errors: [{ code: "queue-required", field: "queue" }] });
  }
  const validation = validateRequest(request);
  if (!validation.ok) return result("rejected", { event_key: null, event_path: null, errors: validation.errors });

  const event = buildEvent(request, options);
  if (event.recorded_at === null) {
    return result("rejected", { event_key: null, event_path: null, errors: [{ code: "invalid-value", field: "recorded_at" }] });
  }
  const text = serializeEvent(event);
  if (Buffer.byteLength(text, "utf8") > LIMITS.recordBytes) {
    return result("rejected", { event_key: event.event_key, event_path: null, errors: [{ code: "record-too-large", field: null }] });
  }

  let queueInfo;
  try {
    queueInfo = statSync(queueDir);
  } catch (error) {
    return result("recoverable-missed-event", {
      event_key: event.event_key,
      event_path: null,
      queue: queueDir,
      failure: failureOf(error, "queue"),
      retry: retryFor(event),
    });
  }
  if (!queueInfo.isDirectory()) {
    return result("recoverable-missed-event", {
      event_key: event.event_key,
      event_path: null,
      queue: queueDir,
      failure: { code: "queue-not-a-directory", os_code: null },
      retry: retryFor(event),
    });
  }

  const eventPath = join(queueDir, `${event.event_key}.json`);
  // An already published record is compared where it lies: a retry of a
  // published identity reads, and never writes.
  const published = readPublishedEvent(eventPath, event.event_key);
  if (published !== null) return compare(published, event, eventPath, queueDir);

  let tempPath;
  try {
    tempPath = createTempRecord(queueDir, event.event_key, text).tempPath;
  } catch (error) {
    return result("recoverable-missed-event", {
      event_key: event.event_key,
      event_path: eventPath,
      queue: queueDir,
      failure: failureOf(error, "queue"),
      retry: retryFor(event),
    });
  }

  let linked = false;
  try {
    (options.link ?? linkRecord)(tempPath, eventPath);
    linked = true;
  } catch (error) {
    if (error.code !== "EEXIST") {
      const cleanup = runCleanup(options.removeTemp ?? discardTemp, tempPath);
      return result("recoverable-missed-event", {
        event_key: event.event_key,
        event_path: eventPath,
        queue: queueDir,
        failure: failureOf(error, "publication"),
        retry: retryFor(event),
        ...(cleanup.warning ? { warnings: [cleanup.warning] } : {}),
      });
    }
  }

  const cleanup = runCleanup(options.removeTemp ?? discardTemp, tempPath);
  const warnings = cleanup.warning ? [cleanup.warning] : [];
  if (linked) {
    return result("published", { event_key: event.event_key, event_path: eventPath, event: exportOf(event), warnings });
  }
  // Every rival publisher lost the same race: the winner's record is the only
  // one that exists, and it is either identical to this request or a conflict.
  const raced = readPublishedEvent(eventPath, event.event_key);
  if (raced === null) {
    return result("recoverable-missed-event", {
      event_key: event.event_key,
      event_path: eventPath,
      queue: queueDir,
      failure: { code: "publication-failed", os_code: "ENOENT" },
      retry: retryFor(event),
      warnings,
    });
  }
  return { ...compare(raced, event, eventPath, queueDir), warnings };
}

function compare(existing, event, eventPath, queueDir) {
  if (!existing.ok) {
    // A record that cannot be read is not a record we may judge, replace or
    // report as a duplicate: the caller keeps the request and can retry.
    if (existing.failure.code === "unreadable-record") {
      return result("recoverable-missed-event", {
        event_key: event.event_key,
        event_path: eventPath,
        queue: queueDir,
        failure: { code: "record-unreadable", os_code: existing.failure.detail },
        retry: retryFor(event),
      });
    }
    return result("corrupt", { event_key: event.event_key, event_path: eventPath, failure: existing.failure });
  }
  if (canonicalPayload(existing.event) === canonicalPayload(event)) {
    return result("existing-identical", { event_key: event.event_key, event_path: eventPath, event: exportOf(existing.event) });
  }
  return result("conflict", {
    event_key: event.event_key,
    event_path: eventPath,
    existing: exportOf(existing.event),
  });
}

/* --------------------------------------------------------------- request */

/**
 * Read one bounded request file. The size is checked before the read, so an
 * oversized file is refused rather than parsed.
 */
export function readRequestFile(requestPath, limit = LIMITS.requestBytes) {
  let info;
  try {
    info = statSync(requestPath);
  } catch (error) {
    return { ok: false, errors: [{ code: error.code === "ENOENT" ? "request-missing" : "request-unreadable", field: null }] };
  }
  if (!info.isFile()) return { ok: false, errors: [{ code: "request-unreadable", field: null }] };
  if (info.size > limit) return { ok: false, errors: [{ code: "request-too-large", field: null }] };
  let text;
  try {
    text = readFileSync(requestPath, "utf8");
  } catch {
    return { ok: false, errors: [{ code: "request-unreadable", field: null }] };
  }
  try {
    return { ok: true, request: JSON.parse(text) };
  } catch {
    return { ok: false, errors: [{ code: "invalid-json", field: null }] };
  }
}

/* -------------------------------------------------------------------- cli */

const USAGE =
  "Usage: node learning-queue.mjs enqueue --queue <dir> --request <file> [--now <iso>]\n" +
  "       node learning-queue.mjs help\n" +
  "\n" +
  "enqueue records one bounded learning event for a transition the caller has\n" +
  "already verified. The queue directory must already exist: this writer never\n" +
  "creates it, never overwrites a published event and never consumes the queue.\n" +
  "Exit 0 published or already published identically; 1 conflict, corrupt or\n" +
  "recoverable; 2 a request that was rejected or could not be read.";

const ENQUEUE_EXIT = {
  published: 0,
  "existing-identical": 0,
  conflict: 1,
  corrupt: 1,
  "recoverable-missed-event": 1,
  rejected: 2,
};

export function runCommand({ command, values = {} } = {}) {
  const reject = (errors, extra = {}) => ({
    exitCode: 2,
    stdout: `${JSON.stringify({ schema_version: RESULT_SCHEMA, outcome: "rejected", errors, boundary: BOUNDARY, ...extra })}\n`,
  });
  if (command !== "enqueue") {
    return reject([{ code: "unknown-command", field: null }]);
  }
  const queue = typeof values.queue === "string" ? values.queue.trim() : "";
  if (!queue) {
    return reject([{ code: "queue-required", field: "queue" }]);
  }
  if (typeof values.request !== "string" || values.request.trim() === "") {
    return reject([{ code: "request-required", field: "request" }]);
  }
  const read = readRequestFile(values.request.trim());
  if (!read.ok) {
    return reject(read.errors);
  }
  const options = {};
  if (values.now !== undefined) {
    if (timestampOf(values.now) === null) {
      return reject([{ code: "invalid-value", field: "now" }]);
    }
    options.now = () => values.now;
  }
  const response = enqueueLearning(queue, read.request, options);
  return { exitCode: ENQUEUE_EXIT[response.outcome] ?? 1, stdout: `${JSON.stringify(response, null, 2)}\n` };
}

const OPTIONS = {
  queue: { type: "string" },
  request: { type: "string" },
  now: { type: "string" },
  help: { type: "boolean", short: "h" },
};

async function main() {
  let parsed;
  try {
    parsed = parseArgs({ args: process.argv.slice(2), options: OPTIONS, allowPositionals: true });
  } catch (error) {
    process.stderr.write(`[learning-queue] ${error.message}\n${USAGE}\n`);
    process.exitCode = 2;
    return;
  }
  const [positional = "enqueue", ...extra] = parsed.positionals;
  if (parsed.values.help || positional === "help") {
    process.stdout.write(`${USAGE}\n`);
    return;
  }
  if (extra.length > 0) {
    process.stderr.write(`[learning-queue] unexpected argument\n${USAGE}\n`);
    process.exitCode = 2;
    return;
  }
  const response = runCommand({ command: positional, values: parsed.values });
  process.stdout.write(response.stdout);
  process.exitCode = response.exitCode;
}

function isMain() {
  if (!process.argv[1]) return false;
  const self = fileURLToPath(import.meta.url);
  const invoked = process.argv[1];
  return process.platform === "win32"
    ? self.toLowerCase() === invoked.toLowerCase() || pathToFileURL(invoked).href.toLowerCase() === import.meta.url.toLowerCase()
    : pathToFileURL(invoked).href === import.meta.url;
}

if (isMain()) {
  main().catch((error) => {
    process.stderr.write(`[learning-queue] ${error?.message ?? error}\n`);
    process.exitCode = 2;
  });
}
