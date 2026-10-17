#!/usr/bin/env node
/**
 * Identity and completion for one explicit optimiser job.
 *
 * A job has exactly one input: the record the learning producer already
 * published for one identity. This module reads that record, says whether the
 * job's own packet is new, half-written or finished, and records completion
 * once. It decides nothing else.
 *
 *   - The event key is the identity. It is the record's file name and the
 *     packet's directory name, so the same event is found again rather than
 *     turned into a second proposal.
 *   - The queue is read-only here: no record is created, moved, rewritten or
 *     deleted, and the producer's own reader validates it.
 *   - Completion holds only while the record's bytes are unchanged and every
 *     artefact it names still exists with the digest it recorded.
 *   - A marker is published with a no-replace hard link, so a finished result is
 *     re-read rather than overwritten.
 *   - This module never judges what the job found, executes a patch, launches a
 *     model, scans tasks or takes a lease.
 *
 * Usage:
 *   node optimiser-job.mjs read     --queue <dir> --key <key>
 *   node optimiser-job.mjs status   --queue <dir> --packet-root <dir> --key <key>
 *   node optimiser-job.mjs complete --queue <dir> --packet-root <dir> --key <key>
 *                                   --outcome <proposal|finding|no-lesson>
 *                                   --event-sha256 <digest returned by read>
 *                                   --artifact <path> [--now <iso>]
 *   node optimiser-job.mjs help
 *
 * Outcomes: record, completed, already-complete, new, partial, stale, unusable,
 * refused, conflict, rejected. Exit 0: a usable record, a completed job, or a
 * completion this attempt recorded. 1: the record or the completion cannot be
 * used as a finished result. 2: the invocation was rejected.
 */

import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  linkSync,
  lstatSync,
  openSync,
  readFileSync,
  readSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

// The producer owns the record's contract. Its reader, key rule and bounds are
// imported rather than restated, so a change there cannot leave a second copy
// here describing something else.
import { LIMITS, readPublishedEvent } from "../../../hooks/learning-queue.mjs";

/** Versioned shapes. A change to either is a new schema, not a silent edit. */
export const COMPLETION_SCHEMA = "CodexOptimiserCompletion.v1";
export const RESULT_SCHEMA = "CodexOptimiserJobResult.v1";

/** The marker beside a packet's own artefacts. */
export const COMPLETION_FILE = "completion.json";

/** The three results one job may record. */
export const OUTCOMES = Object.freeze(["proposal", "finding", "no-lesson"]);

/** The producer's key is a SHA-256 digest in hex; that shape is the identity. */
export const KEY_PATTERN = /^[0-9a-fA-F]{64}$/;

const COMPLETION_FIELDS = Object.freeze([
  "schema_version",
  "event_key",
  "event_sha256",
  "outcome",
  "artifacts",
  "completed_at",
]);
const ARTIFACT_FIELDS = Object.freeze(["ref", "path", "sha256", "bytes"]);
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;

const BOUNDARY =
  "a completion records that this job finished its own output for this event; it is not proof " +
  "that the finding is sound, that a proposal was accepted, or that anything was applied";

/* --------------------------------------------------------------- identity */

/**
 * The one accepted spelling of a key. A digest is lower case everywhere else in
 * the producer, and a caller who pastes an upper-case copy gets the same job
 * rather than a second one.
 */
export function normaliseKey(key) {
  if (typeof key !== "string") return null;
  const trimmed = key.trim();
  return KEY_PATTERN.test(trimmed) ? trimmed.toLowerCase() : null;
}

/** The published record for one key. The name is the key, in the producer's shape. */
export function eventPathFor(queueDir, key) {
  return join(queueDir, `${key}.json`);
}

/**
 * The packet directory for one key: one level under the caller's route, named by
 * the identity. The key is a hex digest, so the name cannot reach outside the
 * route, and nothing here creates the directory.
 */
export function packetDirFor(packetRoot, key) {
  return join(resolve(packetRoot), key);
}

/* ---------------------------------------------------------------- digests */

/**
 * The SHA-256 of a file's bytes, read in bounded chunks so a large artefact does
 * not have to fit in memory. This is the fingerprint completion compares: an
 * edited record or a replaced artefact changes it.
 */
export function sha256OfFile(path) {
  let handle;
  try {
    handle = openSync(path, "r");
  } catch (error) {
    return { ok: false, detail: error.code ?? null };
  }
  const hash = createHash("sha256");
  const buffer = Buffer.allocUnsafe(64 * 1024);
  let bytes = 0;
  try {
    let read = readSync(handle, buffer, 0, buffer.length, null);
    while (read > 0) {
      hash.update(buffer.subarray(0, read));
      bytes += read;
      read = readSync(handle, buffer, 0, buffer.length, null);
    }
  } catch (error) {
    try {
      closeSync(handle);
    } catch {
      // The handle is already gone; the failure below is the one that matters.
    }
    return { ok: false, detail: error.code ?? null };
  }
  closeSync(handle);
  return { ok: true, sha256: hash.digest("hex"), bytes };
}

/**
 * The attempt timestamp for a Date or a non-empty string that parses. A number,
 * a boolean or an empty value is not a timestamp.
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

function isDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/**
 * One failure shape everywhere: the code, the schema field it concerns when
 * there is one, and a bounded detail that never carries a request value. A
 * reader can therefore tell "this field is wrong" from "the filesystem said no"
 * without reading the code that produced it.
 */
function failure(code, field = null, detail = null) {
  return { code, field, detail };
}

function invalid(code, field = null, detail = null) {
  return { ok: false, failure: failure(code, field, detail) };
}

function result(outcome, fields) {
  const { warnings = [], ...rest } = fields;
  return { schema_version: RESULT_SCHEMA, outcome, ...rest, boundary: BOUNDARY, warnings };
}

/* ------------------------------------------------------------- the record */

/**
 * Read the one published record for a key. Validation is the producer's: a
 * missing, unreadable, mislabelled or unexpected record is reported, and never
 * repaired or replaced here.
 */
export function readEvent(queueDir, key) {
  const normalised = normaliseKey(key);
  if (normalised === null) {
    return invalid("invalid-key", "key");
  }
  if (typeof queueDir !== "string" || queueDir.trim() === "") {
    return invalid("queue-required", "queue");
  }
  const eventPath = eventPathFor(queueDir.trim(), normalised);
  const published = readPublishedEvent(eventPath, normalised);
  if (published === null) {
    return invalid("record-missing");
  }
  if (!published.ok) {
    // The producer's own code is kept, prefixed, so a reader can tell a corrupt
    // record from a missing one without a second vocabulary.
    return invalid(`record-${published.failure.code}`, null, published.failure.detail ?? null);
  }
  const bytes = sha256OfFile(eventPath);
  if (!bytes.ok) {
    return invalid("record-unreadable", null, bytes.detail);
  }
  return {
    ok: true,
    eventPath,
    eventKey: normalised,
    event: published.event,
    event_sha256: bytes.sha256,
    event_bytes: bytes.bytes,
  };
}

/** The bounded summary of a record: identity and references, never a copy of the run. */
function exportOf(event) {
  return {
    schema_version: event.schema_version,
    event_key: event.event_key,
    identity: event.identity,
    recorded_at: event.recorded_at,
    task: event.task,
    skills: event.skills,
    evidence: event.evidence,
    trace: event.trace,
  };
}

/* ---------------------------------------------------------- the completion */

/** Validate one marker against the allowlist, the identity and the bounds. */
export function validateCompletion(marker) {
  if (!marker || typeof marker !== "object" || Array.isArray(marker)) return invalid("marker-not-an-object");
  for (const name of Object.keys(marker)) {
    if (!COMPLETION_FIELDS.includes(name)) return invalid("marker-unexpected-field", name);
  }
  for (const name of COMPLETION_FIELDS) {
    if (!(name in marker)) return invalid("marker-invalid-value", name);
  }
  if (marker.schema_version !== COMPLETION_SCHEMA) return invalid("marker-unsupported-schema-version", "schema_version");
  if (normaliseKey(marker.event_key) === null) return invalid("marker-invalid-value", "event_key");
  if (typeof marker.event_sha256 !== "string" || !DIGEST_PATTERN.test(marker.event_sha256)) {
    return invalid("marker-invalid-value", "event_sha256");
  }
  if (!OUTCOMES.includes(marker.outcome)) return invalid("marker-invalid-value", "outcome");
  if (timestampOf(marker.completed_at) === null) return invalid("marker-invalid-value", "completed_at");
  const artifacts = marker.artifacts;
  if (!Array.isArray(artifacts) || artifacts.length === 0) return invalid("marker-invalid-value", "artifacts");
  if (artifacts.length > LIMITS.references) return invalid("marker-too-many-entries", "artifacts");
  for (const artifact of artifacts) {
    if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) {
      return invalid("marker-invalid-value", "artifacts");
    }
    for (const name of Object.keys(artifact)) {
      if (!ARTIFACT_FIELDS.includes(name)) return invalid("marker-unexpected-field", "artifacts");
    }
    for (const name of ARTIFACT_FIELDS) {
      if (!(name in artifact)) return invalid("marker-invalid-value", "artifacts");
    }
    if (typeof artifact.ref !== "string" || artifact.ref.trim() === "" || CONTROL_CHARACTER.test(artifact.ref)) {
      return invalid("marker-invalid-value", "artifacts");
    }
    if (typeof artifact.path !== "string" || artifact.path.trim() === "" || CONTROL_CHARACTER.test(artifact.path)) {
      return invalid("marker-invalid-value", "artifacts");
    }
    if (typeof artifact.sha256 !== "string" || !DIGEST_PATTERN.test(artifact.sha256)) {
      return invalid("marker-invalid-value", "artifacts");
    }
    if (!Number.isInteger(artifact.bytes) || artifact.bytes < 0) return invalid("marker-invalid-value", "artifacts");
  }
  return { ok: true, marker };
}

/**
 * What two markers are compared by. The attempt timestamp is left out, so the
 * same job finishing again on a later attempt matches instead of conflicting.
 */
export function canonicalCompletion(marker) {
  return JSON.stringify([
    COMPLETION_SCHEMA,
    marker?.event_key ?? null,
    marker?.event_sha256 ?? null,
    marker?.outcome ?? null,
    (marker?.artifacts ?? []).map((artifact) => [
      artifact?.ref ?? null,
      artifact?.path ?? null,
      artifact?.sha256 ?? null,
      artifact?.bytes ?? null,
    ]),
  ]);
}

/** Read the marker beside a packet's artefacts, or report why it cannot be used. */
export function readCompletion(packetDir) {
  const markerPath = join(packetDir, COMPLETION_FILE);
  let info;
  try {
    info = lstatSync(markerPath);
  } catch (error) {
    return error.code === "ENOENT" ? null : invalid("marker-unreadable", null, error.code ?? null);
  }
  if (!info.isFile()) return invalid("marker-not-a-file");
  if (info.size > LIMITS.recordBytes) return invalid("marker-too-large");
  let text;
  try {
    text = readFileSync(markerPath, "utf8");
  } catch (error) {
    return invalid("marker-unreadable", null, error.code ?? null);
  }
  let marker;
  try {
    marker = JSON.parse(text);
  } catch {
    return invalid("marker-invalid-json");
  }
  return validateCompletion(marker);
}

function exportOfMarker(marker) {
  return {
    schema_version: marker.schema_version,
    event_key: marker.event_key,
    event_sha256: marker.event_sha256,
    outcome: marker.outcome,
    artifacts: marker.artifacts,
    completed_at: marker.completed_at,
  };
}

/**
 * Why a marker no longer holds, as bounded codes with the artefact they concern.
 * Every reason is kept: a packet that both moved on and lost an artefact should
 * not look like one with a single problem.
 */
function staleReasons(marker, eventKey, eventSha) {
  const reasons = [];
  if (marker.event_key !== eventKey) reasons.push({ code: "event-key-mismatch", ref: null });
  if (marker.event_sha256 !== eventSha) reasons.push({ code: "record-bytes-changed", ref: null });
  for (const artifact of marker.artifacts) {
    const digest = sha256OfFile(artifact.path);
    if (!digest.ok) reasons.push({ code: "artifact-unreadable", ref: artifact.ref });
    else if (digest.sha256 !== artifact.sha256) reasons.push({ code: "artifact-changed", ref: artifact.ref });
  }
  return reasons;
}

/* -------------------------------------------------------------- commands */

/**
 * The state of one job's packet. Exit 0 means a valid completed result already
 * exists for this event, so the job is reused rather than done again; anything
 * else means the caller still has work.
 */
export function statusOf({ queueDir, packetRoot, key } = {}) {
  const normalised = normaliseKey(key);
  if (normalised === null) return result("rejected", { errors: [{ code: "invalid-value", field: "key" }] });
  // Without a route there is no packet to look for, and "new" would be a guess
  // about a directory the caller never named.
  if (typeof packetRoot !== "string" || packetRoot.trim() === "") {
    return result("rejected", { errors: [{ code: "packet-root-required", field: "packet-root" }] });
  }
  const record = readEvent(queueDir, normalised);
  if (!record.ok) return result("unusable", { event_key: normalised, failure: record.failure });
  const packet = packetDirFor(packetRoot, normalised);
  const shared = { event_key: normalised, event_sha256: record.event_sha256, event_path: record.eventPath, packet };
  if (!isDirectory(packet)) return result("new", shared);

  const marker = readCompletion(packet);
  if (marker === null) return result("partial", shared);
  if (!marker.ok) return result("stale", { ...shared, failure: marker.failure });

  const reasons = staleReasons(marker.marker, normalised, record.event_sha256);
  if (reasons.length > 0) return result("stale", { ...shared, completion: exportOfMarker(marker.marker), reasons });
  return result("completed", { ...shared, completion: exportOfMarker(marker.marker) });
}

/**
 * Record that this job finished its own output for this event. The marker names
 * the record's current bytes and every artefact it was given, so a later status
 * can tell a finished packet from one that has moved on.
 */
export function completeJob({
  queueDir,
  packetRoot,
  key,
  outcome,
  artifacts,
  expectedEventSha256,
  now,
} = {}) {
  const normalised = normaliseKey(key);
  const errors = [];
  if (normalised === null) errors.push({ code: "invalid-value", field: "key" });
  if (!OUTCOMES.includes(outcome)) errors.push({ code: "invalid-value", field: "outcome" });
  if (typeof expectedEventSha256 !== "string" || !DIGEST_PATTERN.test(expectedEventSha256)) {
    errors.push({ code: "invalid-value", field: "event_sha256" });
  }
  if (typeof packetRoot !== "string" || packetRoot.trim() === "") {
    errors.push({ code: "packet-root-required", field: "packet-root" });
  }
  const refs = Array.isArray(artifacts) ? artifacts : null;
  if (refs === null || refs.length === 0) {
    // A packet of drafts, or of nothing, is not a result.
    errors.push({ code: "invalid-value", field: "artifacts" });
  } else if (refs.length > LIMITS.references) {
    errors.push({ code: "too-many-entries", field: "artifacts" });
  } else {
    for (const ref of refs) {
      if (typeof ref !== "string" || ref.trim() === "" || CONTROL_CHARACTER.test(ref)) {
        errors.push({ code: "invalid-value", field: "artifacts" });
        break;
      }
    }
  }
  if (errors.length > 0) return result("rejected", { errors });

  const record = readEvent(queueDir, normalised);
  if (!record.ok) return result("refused", { event_key: normalised, failure: record.failure });
  // The output was reasoned from the initial read. A later record under the
  // same key is a new input, not a digest this attempt may silently adopt.
  if (record.event_sha256 !== expectedEventSha256) {
    return result("refused", {
      event_key: normalised,
      event_sha256: record.event_sha256,
      event_path: record.eventPath,
      packet: packetDirFor(packetRoot, normalised),
      failure: failure("record-bytes-changed"),
    });
  }
  const packet = packetDirFor(packetRoot, normalised);
  // The packet directory is the job's own output area and this module never
  // creates it: a completion with nothing to complete is refused.
  if (!isDirectory(packet)) {
    return result("refused", {
      event_key: normalised,
      event_sha256: record.event_sha256,
      event_path: record.eventPath,
      packet,
      failure: failure("packet-missing"),
    });
  }

  const resolved = [];
  for (const ref of refs) {
    const path = resolve(ref.trim());
    const digest = sha256OfFile(path);
    if (!digest.ok) {
      return result("refused", {
        event_key: normalised,
        event_sha256: record.event_sha256,
        packet,
        failure: failure("artifact-missing", null, ref.trim()),
      });
    }
    resolved.push({ ref: ref.trim(), path, sha256: digest.sha256, bytes: digest.bytes });
  }

  const marker = {
    schema_version: COMPLETION_SCHEMA,
    event_key: normalised,
    event_sha256: record.event_sha256,
    outcome,
    artifacts: resolved,
    completed_at: timestampOf(typeof now === "function" ? now() : (now ?? new Date())),
  };
  if (marker.completed_at === null) return result("rejected", { errors: [{ code: "invalid-value", field: "now" }] });

  const shared = { event_key: normalised, event_sha256: record.event_sha256, packet };
  const markerText = `${JSON.stringify(marker, null, 2)}\n`;
  const existing = readCompletion(packet);
  if (existing !== null) {
    if (existing.ok && canonicalCompletion(existing.marker) === canonicalCompletion(marker)) {
      return result("already-complete", { ...shared, completion: exportOfMarker(existing.marker) });
    }
    return result("conflict", {
      ...shared,
      existing: existing.ok ? exportOfMarker(existing.marker) : null,
      failure: existing.ok ? null : existing.failure,
    });
  }

  const validMarker = validateCompletion(marker);
  if (!validMarker.ok) return result("refused", { ...shared, failure: validMarker.failure });
  if (Buffer.byteLength(markerText, "utf8") > LIMITS.recordBytes) {
    return result("refused", { ...shared, failure: failure("marker-too-large", "artifacts") });
  }

  let tempPath;
  try {
    tempPath = createTempMarker(packet, normalised, markerText).tempPath;
  } catch (error) {
    return result("refused", { ...shared, failure: failure("packet-unwritable", null, error.code ?? null) });
  }

  let linked = false;
  try {
    linkSync(tempPath, join(packet, COMPLETION_FILE));
    linked = true;
  } catch (error) {
    if (error.code !== "EEXIST") {
      const cleanup = runCleanup(tempPath);
      return result("refused", {
        ...shared,
        failure: failure("packet-unwritable", null, error.code ?? null),
        ...(cleanup.warning ? { warnings: [cleanup.warning] } : {}),
      });
    }
  }
  const cleanup = runCleanup(tempPath);
  const warnings = cleanup.warning ? [cleanup.warning] : [];
  if (linked) return result("completed", { ...shared, completion: exportOfMarker(marker), warnings });

  // Every rival attempt lost the same race: the winner's marker is the only one
  // that exists, and it is either identical to this attempt or a conflict.
  const raced = readCompletion(packet);
  if (raced === null) {
    return result("refused", { ...shared, failure: failure("completion-missing", null, "ENOENT"), warnings });
  }
  if (raced.ok && canonicalCompletion(raced.marker) === canonicalCompletion(marker)) {
    return result("already-complete", { ...shared, completion: exportOfMarker(raced.marker), warnings });
  }
  return result("conflict", {
    ...shared,
    existing: raced.ok ? exportOfMarker(raced.marker) : null,
    failure: raced.ok ? null : raced.failure,
    warnings,
  });
}

/* ------------------------------------------------------------- mechanism */

function createTempMarker(packetDir, key, text) {
  const tempPath = join(packetDir, `.completion-${key.slice(0, 16)}.${process.pid}.${randomUUID().slice(0, 8)}.tmp`);
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
 * Remove one attempt's temporary file. A failure here is reported, never thrown:
 * the marker it published is still published, and the leftover name is ignored
 * rather than promoted.
 */
function discardTemp(tempPath) {
  try {
    rmSync(tempPath, { force: true });
    return { removed: true };
  } catch (error) {
    return { removed: false, warning: "temporary-cleanup-failed", detail: error.code ?? null };
  }
}

function runCleanup(tempPath) {
  const cleanup = discardTemp(tempPath);
  return cleanup.removed === false ? { warning: cleanup.warning ?? "temporary-cleanup-failed" } : {};
}

/* -------------------------------------------------------------------- cli */

const USAGE =
  "Usage: node optimiser-job.mjs read     --queue <dir> --key <key>\n" +
  "       node optimiser-job.mjs status   --queue <dir> --packet-root <dir> --key <key>\n" +
  "       node optimiser-job.mjs complete --queue <dir> --packet-root <dir> --key <key>\n" +
  "                                       --outcome <proposal|finding|no-lesson>\n" +
  "                                       --event-sha256 <digest returned by read>\n" +
  "                                       --artifact <path> [--now <iso>]\n" +
  "       node optimiser-job.mjs help\n" +
  "\n" +
  "One explicit job over one recorded learning event. The queue is read-only here,\n" +
  "the record is never rewritten, and the packet directory is never created: a\n" +
  "completion is refused when there is nothing to complete.\n" +
  "Exit 0: a record was read, the job is completed, or this attempt recorded the\n" +
  "completion. Exit 1: not a finished result (new, partial, stale, unusable,\n" +
  "refused or conflict). Exit 2: the invocation was rejected.";

const EXIT = {
  record: 0,
  completed: 0,
  "already-complete": 0,
  new: 1,
  partial: 1,
  stale: 1,
  unusable: 1,
  refused: 1,
  conflict: 1,
  rejected: 2,
};

const text = (value) => (typeof value === "string" ? value.trim() : "");
const pretty = (value) => `${JSON.stringify(value, null, 2)}\n`;

export function runCommand({ command, values = {} } = {}) {
  const reject = (errors, extra = {}) => ({
    exitCode: 2,
    stdout: pretty({ schema_version: RESULT_SCHEMA, outcome: "rejected", errors, boundary: BOUNDARY, ...extra }),
  });
  const answer = (response) => ({ exitCode: EXIT[response.outcome] ?? 1, stdout: pretty(response) });

  if (command !== "read" && command !== "status" && command !== "complete") {
    return reject([{ code: "unknown-command", field: null }]);
  }
  const queue = text(values.queue);
  if (!queue) return reject([{ code: "queue-required", field: "queue" }]);
  const key = normaliseKey(values.key);
  if (key === null) return reject([{ code: "invalid-value", field: "key" }]);

  if (command === "read") {
    const record = readEvent(queue, key);
    if (!record.ok) return answer(result("unusable", { event_key: key, failure: record.failure }));
    return answer(result("record", {
      event_key: key,
      event_sha256: record.event_sha256,
      event_bytes: record.event_bytes,
      event_path: record.eventPath,
      event: exportOf(record.event),
    }));
  }

  const packetRoot = text(values["packet-root"]);
  if (!packetRoot) return reject([{ code: "packet-root-required", field: "packet-root" }]);

  if (command === "status") {
    return answer(statusOf({ queueDir: queue, packetRoot, key }));
  }

  if (values.now !== undefined && timestampOf(values.now) === null) {
    return reject([{ code: "invalid-value", field: "now" }]);
  }
  const eventSha256 = text(values["event-sha256"]);
  const artifacts =
    values.artifact === undefined ? [] : Array.isArray(values.artifact) ? values.artifact : [values.artifact];
  return answer(completeJob({
    queueDir: queue,
    packetRoot,
    key,
    outcome: text(values.outcome),
    artifacts,
    expectedEventSha256: eventSha256,
    now: values.now === undefined ? undefined : () => values.now,
  }));
}

const OPTIONS = {
  queue: { type: "string" },
  key: { type: "string" },
  "packet-root": { type: "string" },
  outcome: { type: "string" },
  "event-sha256": { type: "string" },
  artifact: { type: "string", multiple: true },
  now: { type: "string" },
  help: { type: "boolean", short: "h" },
};

async function main() {
  let parsed;
  try {
    parsed = parseArgs({ args: process.argv.slice(2), options: OPTIONS, allowPositionals: true });
  } catch (error) {
    process.stderr.write(`[optimiser-job] ${error.message}\n${USAGE}\n`);
    process.exitCode = 2;
    return;
  }
  const [positional = "status", ...extra] = parsed.positionals;
  if (parsed.values.help || positional === "help") {
    process.stdout.write(`${USAGE}\n`);
    return;
  }
  if (extra.length > 0) {
    process.stderr.write(`[optimiser-job] unexpected argument\n${USAGE}\n`);
    process.exitCode = 2;
    return;
  }
  const response = runCommand({ command: positional, values: parsed.values });
  process.stdout.write(response.stdout);
  process.exitCode = response.exitCode;
}

function isMain() {
  if (!process.argv[1] || !existsSync(process.argv[1])) return false;
  // Compare real paths: Node runs a linked script from its real file, so through
  // a junction or symlink the invoked path differs and main() would silently not
  // run. Windows paths compare without regard to case.
  const self = realpathSync(fileURLToPath(import.meta.url));
  const invoked = realpathSync(process.argv[1]);
  return process.platform === "win32" ? self.toLowerCase() === invoked.toLowerCase() : self === invoked;
}

if (isMain()) {
  main().catch((error) => {
    process.stderr.write(`[optimiser-job] ${error?.message ?? error}\n`);
    process.exitCode = 2;
  });
}
