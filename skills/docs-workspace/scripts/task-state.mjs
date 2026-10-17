#!/usr/bin/env node
/**
 * Task-state reader.
 *
 * Answers one question for a handoff or a resume: what does the team lead's state file
 * for the task in this checkout record?
 *
 * Three properties matter:
 *
 *   1. Markdown is the state. The team lead, the agent coordinating the task, keeps one
 *      `state.md` per checkout at `.state/state.md` in the root of the checkout
 *      the task runs in: a worktree, or the canonical checkout when there is no
 *      worktree. Subagents and the reviewer keep none. It is edited directly;
 *      there is no writer command, no record schema and no second ledger. The
 *      `.state/` folder ignores itself through its own `.gitignore` and goes
 *      with the worktree.
 *   2. Read only. Every export reads. Nothing here creates, writes, rewrites,
 *      migrates or repairs a file, and a missing `state.md` is an observation to
 *      report rather than a gap to fill.
 *   3. Free form is allowed. Two optional headings carry a display value -
 *      `## Status` and `## Next action` - and any other prose stays the author's.
 *
 * It contains no host paths and needs no registry, workspace or remote: Git
 * finds the checkout from the working directory. The task's plan stays in the
 * project's workspace and is not read here.
 */

import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { physicalPath } from "./resolve-workspace.mjs";

export const TASK_STATE_ID = "codex-task-state/2";

/** The team lead's state file, in the task's own folder at the checkout root. */
export const STATE_DIR = ".state";
export const STATE_FILE = "state.md";

/** The two headings that carry a display value. Both are optional. */
export const STATE_HEADINGS = Object.freeze({ status: "Status", next_action: "Next action" });

export class TaskStateError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "TaskStateError";
    this.code = code;
    this.details = details;
  }
}

/* ------------------------------------------------------------------ paths */

function within(parent, child) {
  const suffix = relative(parent, child);
  return suffix === "" || (!isAbsolute(suffix) && suffix !== ".." && !suffix.startsWith(`..${sep}`));
}

function lstatOrNull(path) {
  try {
    return lstatSync(path);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

/* --------------------------------------------------------------- markdown */

const FIELD_ALIASES = Object.freeze({
  status: ["status"],
  next_action: ["next action", "next-action", "next_action"],
  owner: ["owner"],
  branch: ["branch"],
  worktree: ["worktree", "work tree", "working tree"],
  evidence: ["evidence"],
});

function emptyFields() {
  return { status: null, next_action: null, owner: null, branch: null, worktree: null, evidence: [] };
}

function normalizeKey(value) {
  return String(value)
    .replace(/[#`*_]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function fieldFor(key) {
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.includes(key)) return field;
  }
  return null;
}

/** Strip the decoration a hand-written line may carry, and drop it when empty. */
function cleanValue(value) {
  const text = String(value ?? "")
    .replace(/^[-*+]\s+/, "")
    .replace(/^\[[ xX]\]\s*/, "")
    .trim();
  return text === "" ? null : text;
}

/**
 * One `Name: value` line naming one of the six fields, or null. A bullet or a
 * checkbox line is section content, not a label, so it stays with its heading.
 */
function matchLabel(line) {
  if (/^\s*[-*+]\s+/.test(line) || /^\s*\[[ xX]\]\s*/.test(line)) return null;
  const match = /^\s*([A-Za-z][A-Za-z _-]{0,24}):\s*(.*?)\s*$/.exec(line);
  if (!match) return null;
  const field = fieldFor(normalizeKey(match[1]));
  if (!field) return null;
  const value = cleanValue(match[2]);
  return value === null ? null : { field, value };
}

/**
 * Read the two optional headings and, anywhere else, a `Name: value` line.
 * Everything that is not one of the six fields is left alone: unknown prose is
 * content, not an error.
 *
 * A heading outranks a label line wherever the two disagree, so an example
 * `Status:` quoted in prose or in a fenced block cannot stand in for the real
 * heading. A label line that names a different field is still read inside an
 * open heading, which is what a hand-edited `## Status` followed by a
 * `Next action:` line looks like. A heading's own paragraph is kept as written,
 * wrapped lines and all.
 */
export function parseStateMarkdown(text) {
  const fields = emptyFields();
  const headings = { status: false, next_action: false };
  if (typeof text !== "string") return { fields, headings };

  const fromHeading = new Map();
  const fromLabel = new Map();
  const push = (map, field, value) => {
    if (!map.has(field)) map.set(field, []);
    map.get(field).push(value);
  };

  let fenced = false;
  let current = null;
  let paragraph = [];
  const flush = () => {
    if (!current) {
      paragraph = [];
      return;
    }
    if (paragraph.length > 0 && paragraph.every((part) => part.bullet)) {
      // A bullet list under a heading is several values, not one paragraph.
      for (const part of paragraph) push(fromHeading, current, part.text);
    } else {
      let value = "";
      for (const part of paragraph) {
        if (value === "") value = part.text;
        else value += part.bullet ? `; ${part.text}` : ` ${part.text}`;
      }
      if (value !== "") push(fromHeading, current, value);
    }
    paragraph = [];
  };

  for (const line of text.split(/\r?\n/)) {
    if (/^\s{0,3}(```|~~~)/.test(line)) {
      flush();
      current = null;
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;

    const heading = /^\s{0,3}#{2,6}\s+(.*?)\s*#*\s*$/.exec(line);
    if (heading) {
      flush();
      current = fieldFor(normalizeKey(heading[1]));
      if (current) headings[current] = true;
      continue;
    }
    const label = matchLabel(line);
    if (current) {
      if (label) {
        // A field label is never swallowed as the open section's prose.
        flush();
        push(fromLabel, label.field, label.value);
        continue;
      }
      const bullet = /^\s*[-*+]\s+/.test(line) || /^\s*\[[ xX]\]\s*/.test(line);
      const value = cleanValue(line);
      if (value === null) flush();
      else paragraph.push({ text: value, bullet });
      continue;
    }
    if (!label) continue;
    push(fromLabel, label.field, label.value);
  }
  flush();

  for (const [field, values] of fromHeading) {
    if (Array.isArray(fields[field])) fields[field].push(...values);
    else fields[field] = values[0];
  }
  for (const [field, values] of fromLabel) {
    if (Array.isArray(fields[field])) fields[field].push(...values);
    else if (fields[field] === null) fields[field] = values[0];
  }
  return { fields, headings };
}

/**
 * Project the read result for display. Missing information stays missing: a
 * value the file does not carry is reported as null, never inferred.
 */
export function projectRecord(state) {
  const fields = state?.fields ?? emptyFields();
  return {
    status: fields.status ?? null,
    owner: fields.owner ?? null,
    next_action: fields.next_action ?? null,
    branch: fields.branch ?? null,
    worktree: fields.worktree ?? null,
    evidence: Array.isArray(fields.evidence) ? fields.evidence : [],
    headings: {
      status: Boolean(state?.headings?.status),
      next_action: Boolean(state?.headings?.next_action),
    },
  };
}

/* -------------------------------------------------------------- checkout */

/**
 * Find the checkout that contains the working directory and the team lead's state file
 * at its root. A linked worktree is its own checkout, so it never borrows the
 * canonical checkout's state. A `.state` folder or state file that resolves
 * outside the checkout is refused rather than followed; a missing one is fine.
 */
export function findCheckout({ cwd = process.cwd(), env = process.env } = {}) {
  let top = "";
  let cause = "";
  try {
    top = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      env,
      encoding: "utf8",
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    cause = String(error.stderr ?? error.message ?? error).trim();
  }
  if (!top) {
    throw new TaskStateError(
      "not-a-checkout",
      `Not inside a Git checkout, so there is no ${STATE_DIR} folder to read. With no checkout, task state and scratch stay on the project's resolved scratch route.`,
      { cwd, cause },
    );
  }

  const root = physicalPath(top);
  const dir = join(root, STATE_DIR);
  const statePath = join(dir, STATE_FILE);
  for (const candidate of [dir, statePath]) {
    if (!lstatOrNull(candidate)) continue;
    const real = physicalPath(candidate);
    if (!within(root, real)) {
      throw new TaskStateError(
        "out-of-scope",
        `${relative(root, candidate)} resolves outside the checkout; refusing to read it.`,
        { path: candidate, resolved: real, checkout: root },
      );
    }
  }
  return { root, dir, statePath };
}

/* ----------------------------------------------------------------- state */

/**
 * Read `.state/state.md`. Absence and damage are reported instead of repaired.
 */
export function readState(checkout) {
  const path = checkout.statePath;
  const info = lstatOrNull(path);

  if (!info) {
    return {
      exists: false,
      path,
      kind: "missing",
      text: null,
      fields: emptyFields(),
      headings: { status: false, next_action: false },
      warnings: [
        `no ${STATE_FILE} at ${path}; report the path and the absence - a checkout without one is normal, and this reader never creates it`,
      ],
    };
  }

  if (info.isDirectory()) {
    return {
      exists: true,
      path,
      kind: "unreadable",
      text: null,
      fields: emptyFields(),
      headings: { status: false, next_action: false },
      warnings: [`${STATE_FILE} is a folder, not a file: ${path}`],
    };
  }

  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    return {
      exists: true,
      path,
      kind: "unreadable",
      text: null,
      fields: emptyFields(),
      headings: { status: false, next_action: false },
      warnings: [`cannot read ${STATE_FILE} (${error.code ?? error.message})`],
    };
  }

  const { fields, headings } = parseStateMarkdown(text);
  const warnings = [];
  if (!headings.status && !headings.next_action) {
    warnings.push(
      `${STATE_FILE} carries neither "## ${STATE_HEADINGS.status}" nor "## ${STATE_HEADINGS.next_action}"; free-form content is allowed, and nothing was inferred from it`,
    );
  } else if (!headings.status || !headings.next_action) {
    const missing = headings.status ? STATE_HEADINGS.next_action : STATE_HEADINGS.status;
    warnings.push(`${STATE_FILE} carries no "## ${missing}" heading, so that value stays unrecorded`);
  }
  return {
    exists: true,
    path,
    kind: "markdown",
    text,
    fields,
    headings,
    warnings,
  };
}

/** The payload the team lead reads on a resume or a handoff to take the task back up. */
export function readTaskState({ cwd = process.cwd(), env = process.env } = {}) {
  const checkout = findCheckout({ cwd, env });
  const state = readState(checkout);

  return {
    adapter: TASK_STATE_ID,
    action: "read",
    readOnly: true,
    checkout: { root: checkout.root },
    state: { path: checkout.statePath, exists: state.exists, kind: state.kind },
    record: projectRecord(state),
    contract: {
      authority: checkout.statePath,
      writer: "the team lead, the agent coordinating the task; subagents and the reviewer keep no state file",
      edited: "directly, by Markdown edit - there is no writer command and no second ledger",
      writes: "none: every export in this module reads",
    },
    warnings: [...state.warnings],
  };
}

/* -------------------------------------------------------------------- cli */

const USAGE =
  "Usage: node task-state.mjs read [--cwd <dir>]\n" +
  "\n" +
  "read reports what the team lead's state file records at .state/state.md in the\n" +
  "root of the checkout that holds the working directory, and never writes. The\n" +
  "state file is ordinary Markdown, edited directly; there is no update command,\n" +
  "no init command and no record schema.";

/** Flags that would only make sense for a writer, which no longer exists. */
const WRITE_FLAGS = ["expect", "owner", "next-action", "branch", "worktree", "evidence", "status"];

export function run(argv, { env = process.env } = {}) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        cwd: { type: "string" },
        expect: { type: "string" },
        owner: { type: "string" },
        "next-action": { type: "string" },
        branch: { type: "string" },
        worktree: { type: "string" },
        evidence: { type: "string", multiple: true },
        status: { type: "string" },
        help: { type: "boolean", short: "h" },
      },
      allowPositionals: true,
    });
  } catch (error) {
    return { exitCode: 2, stdout: "", stderr: `[task-state] ${error.message}\n${USAGE}\n` };
  }
  const [command, ...extra] = parsed.positionals;
  if (parsed.values.help || !command) {
    return { exitCode: parsed.values.help ? 0 : 2, stdout: `${USAGE}\n`, stderr: "" };
  }
  if (extra.length > 0 || command !== "read") {
    return {
      exitCode: 2,
      stdout: "",
      stderr:
        `[task-state] "${command}" is not a command: state.md is edited directly and this reader has no write path\n${USAGE}\n`,
    };
  }
  const stray = WRITE_FLAGS.filter((flag) => parsed.values[flag] !== undefined);
  if (stray.length > 0) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `[task-state] read takes no write flag (${stray.join(", ")}): edit state.md directly instead\n${USAGE}\n`,
    };
  }

  try {
    const payload = readTaskState({ cwd: parsed.values.cwd ? resolve(parsed.values.cwd) : process.cwd(), env });
    return { exitCode: 0, stdout: `${JSON.stringify(payload, null, 2)}\n`, stderr: "" };
  } catch (error) {
    const payload = {
      adapter: TASK_STATE_ID,
      action: "read",
      readOnly: true,
      ok: false,
      error: {
        code: error.code ?? "task-state-failed",
        message: error.message,
        details: error.details ?? {},
      },
    };
    return { exitCode: 2, stdout: `${JSON.stringify(payload, null, 2)}\n`, stderr: "" };
  }
}

// Compare real paths: Node runs a linked script from its real file, so through a
// junction or symlink the invoked path differs and main() would silently not run.
if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const result = run(process.argv.slice(2));
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
}
