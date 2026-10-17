/**
 * Focused fixtures for the task-state reader.
 *
 * The team lead keeps one `state.md` per checkout, at `.state/state.md` in the root of
 * the checkout the task runs in. It is ordinary Markdown edited directly, so
 * these cases pin what would break silently: the file is found from anywhere
 * in the checkout, each worktree reads its own, the read is fresh every time, a
 * heading outranks an example label, free-form content is content, a missing
 * or unreadable file is reported rather than created, a link out of the
 * checkout is refused, and no command has a write path.
 *
 * Every case runs in a temporary Git checkout. No registry, workspace, install
 * or cache is read or written.
 */

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import * as adapter from "../scripts/task-state.mjs";
import {
  STATE_DIR,
  STATE_FILE,
  TASK_STATE_ID,
  parseStateMarkdown,
  projectRecord,
  readTaskState,
} from "../scripts/task-state.mjs";

const cli = fileURLToPath(new URL("../scripts/task-state.mjs", import.meta.url));

/** A real-shaped state file: the two display headings plus free-form sections. */
const DEFAULT_STATE = [
  "# Task state",
  "",
  "## Status",
  "",
  "active",
  "",
  "## Next action",
  "",
  "team lead: reconcile the reviewer findings",
  "",
  "## Owner",
  "",
  "team lead",
  "",
  "## Branch",
  "",
  "codex/plain-workspace-runtime",
  "",
  "## Worktree",
  "",
  "the current checkout",
  "",
  "## Evidence",
  "",
  "- checks/run-all.ps1",
  "- hooks/tests/learning-queue.test.mjs",
  "",
  "## Notes",
  "",
  "Anything else in this file stays the author's.",
  "",
].join("\n");

function git(cwd, ...args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  }).trim();
}

/** A checkout with one commit and no remote: reading state needs no identity. */
function makeRepo(root, name) {
  const repo = join(root, name);
  mkdirSync(repo, { recursive: true });
  git(repo, "init", "--initial-branch=main");
  git(repo, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "--allow-empty", "-m", "Fixture");
  return repo;
}

/** Write the team lead's state file the way the convention says: the folder ignores itself. */
function writeState(checkout, text) {
  const dir = join(checkout, STATE_DIR);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, ".gitignore"), "*\n");
  writeFileSync(join(dir, STATE_FILE), text);
}

/** The physical path, as the reader reports it. */
function real(path) {
  return realpathSync.native(path);
}

/** Sorted relative path plus content hash, so a read can be shown to write nothing. */
function snapshot(root) {
  const seen = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(dir, entry.name);
      const where = relative(root, path);
      if (entry.isDirectory()) {
        seen.push(`${where}/`);
        walk(path);
      } else {
        seen.push(`${where}:${createHash("sha256").update(readFileSync(path)).digest("hex")}`);
      }
    }
  };
  walk(root);
  return seen;
}

/**
 * One checkout with the team lead's state file at `.state/state.md`; `state: null`
 * leaves the file and its folder out. Git may not climb above the fixture, and
 * the registry variable names a file that does not exist, so a read that
 * reached for either would fail here.
 */
function fixture(t, { state = DEFAULT_STATE } = {}) {
  const temp = mkdtempSync(join(tmpdir(), "task-state-"));
  t.after(() => rmSync(temp, { recursive: true, force: true }));

  const repo = makeRepo(temp, "checkout");
  if (state !== null) writeState(repo, state);
  const stateDir = join(repo, STATE_DIR);

  const env = {
    ...process.env,
    GIT_CEILING_DIRECTORIES: temp,
    CODEX_WORKSPACE_REGISTRY: join(temp, "no-registry.json"),
    CODEX_WORKSPACE_ROOT: "",
  };
  const read = (cwd = repo) => readTaskState({ cwd, env });
  const run = (args, { cwd = repo } = {}) =>
    spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8", windowsHide: true, env });

  return { temp, repo, stateDir, statePath: join(stateDir, STATE_FILE), env, read, run };
}

/* ------------------------------------------------------------------ tests */

test("a read reports the recorded Markdown state and writes nothing", (t) => {
  const f = fixture(t);
  const before = snapshot(f.temp);
  const payload = f.read();

  assert.equal(payload.adapter, TASK_STATE_ID);
  assert.equal(payload.action, "read");
  assert.equal(payload.readOnly, true);
  assert.equal(payload.checkout.root, real(f.repo));
  assert.equal(payload.state.path, join(real(f.repo), STATE_DIR, STATE_FILE));
  assert.equal(payload.state.exists, true);
  assert.equal(payload.state.kind, "markdown");
  assert.equal(payload.record.status, "active");
  assert.equal(payload.record.next_action, "team lead: reconcile the reviewer findings");
  assert.equal(payload.record.owner, "team lead");
  assert.equal(payload.record.branch, "codex/plain-workspace-runtime");
  assert.equal(payload.record.worktree, "the current checkout");
  assert.deepEqual(payload.record.evidence, ["checks/run-all.ps1", "hooks/tests/learning-queue.test.mjs"]);
  assert.deepEqual(payload.record.headings, { status: true, next_action: true });
  assert.deepEqual(payload.warnings, []);
  assert.deepEqual(snapshot(f.temp), before, "a read must leave every file untouched");
});

test("a read from a nested folder finds the state at the checkout root", (t) => {
  const f = fixture(t);
  const nested = join(f.repo, "src", "deep");
  mkdirSync(nested, { recursive: true });

  const payload = f.read(nested);
  assert.equal(payload.checkout.root, real(f.repo));
  assert.equal(payload.record.status, "active");
  assert.equal(existsSync(join(nested, STATE_DIR)), false, "a nested folder never gets a state folder of its own");

  const fromInside = f.run(["read"], { cwd: nested });
  assert.equal(fromInside.status, 0, fromInside.stderr);
  assert.equal(JSON.parse(fromInside.stdout).record.status, "active");

  const byFlag = f.run(["read", "--cwd", nested], { cwd: f.temp });
  assert.equal(byFlag.status, 0, byFlag.stderr);
  assert.equal(JSON.parse(byFlag.stdout).checkout.root, real(f.repo));
});

test("each worktree reads its own state file", (t) => {
  const f = fixture(t);
  const worktree = join(f.temp, "worktree");
  git(f.repo, "worktree", "add", "-b", "task", worktree);

  const before = f.read(worktree);
  assert.equal(before.checkout.root, real(worktree));
  assert.equal(before.state.path, join(real(worktree), STATE_DIR, STATE_FILE));
  assert.equal(before.state.exists, false);
  assert.equal(before.record.status, null, "a worktree never borrows another checkout's state");

  writeState(worktree, DEFAULT_STATE.replace("\nactive\n", "\nreviewing\n"));
  assert.equal(f.read(worktree).record.status, "reviewing");
  assert.equal(f.read(f.repo).record.status, "active", "the canonical checkout keeps its own");
});

test("a direct edit to state.md is visible to the next read", (t) => {
  const f = fixture(t);
  const path = f.statePath;
  const first = f.read();
  assert.equal(first.record.status, "active");

  writeFileSync(
    path,
    DEFAULT_STATE.replace("team lead: reconcile the reviewer findings", "team lead: run the second review slot").replace(
      "\nactive\n",
      "\nreviewing\n",
    ),
  );

  const second = f.read();
  assert.equal(second.record.status, "reviewing");
  assert.equal(second.record.next_action, "team lead: run the second review slot");
  assert.doesNotMatch(second.record.next_action, /reconcile the reviewer findings/);

  // The second read is the same as a third: nothing is cached between them.
  assert.deepEqual(f.read().record, second.record);
});

test("a heading outranks a fenced or quoted example of the same label", (t) => {
  const state = [
    "# Task state",
    "",
    "An example the author keeps for reference:",
    "",
    "```",
    "Status: an example, not the real state",
    "Next action: do the example thing",
    "```",
    "",
    "Status: a stray label outside the fence",
    "",
    "## Status",
    "",
    "reviewing",
    "",
    "## Next action",
    "",
    "team lead: run the second review slot",
    "",
    "## Anything else",
    "",
    "Colour: blue",
    "",
  ].join("\n");
  const f = fixture(t, { state });

  const parsed = parseStateMarkdown(state);
  assert.equal(parsed.fields.status, "reviewing");
  assert.equal(parsed.fields.next_action, "team lead: run the second review slot");
  assert.equal(parsed.fields.colour, undefined);

  const payload = f.read();
  assert.equal(payload.record.status, "reviewing");
  assert.equal(payload.record.next_action, "team lead: run the second review slot");
  assert.deepEqual(payload.record.headings, { status: true, next_action: true });
  assert.deepEqual(payload.warnings, [], "an example inside the file is not a warning");
});

test("a field label inside an open heading is still read as that field", (t) => {
  const state = "## Status\n\nactive\n\nNext action: team lead: do the thing\n";
  const f = fixture(t, { state });

  const parsed = parseStateMarkdown(state);
  assert.equal(parsed.fields.status, "active");
  assert.equal(parsed.fields.next_action, "team lead: do the thing", "a label must not be swallowed by the open heading");

  const payload = f.read();
  assert.equal(payload.record.status, "active");
  assert.equal(payload.record.next_action, "team lead: do the thing");
});

test("a label after an evidence list is recorded, not joined to the evidence", (t) => {
  const state = "## Status\n\nactive\n\n## Evidence\n\n- checks/run-all.ps1\n\nNext action: team lead: do the thing\n";
  const f = fixture(t, { state });

  const parsed = parseStateMarkdown(state);
  assert.deepEqual(parsed.fields.evidence, ["checks/run-all.ps1"], "the label is not an evidence entry");
  assert.equal(parsed.fields.next_action, "team lead: do the thing");

  const payload = f.read();
  assert.deepEqual(payload.record.evidence, ["checks/run-all.ps1"]);
  assert.equal(payload.record.next_action, "team lead: do the thing");
});

test("a heading still outranks a later label for the same field", (t) => {
  const parsed = parseStateMarkdown("## Status\n\nactive\n\nStatus: reviewing\n");
  assert.equal(parsed.fields.status, "active", "the heading keeps precedence over a label");
  assert.equal(parsed.headings.status, true);
});

test("ordinary prose containing a colon stays with its heading", (t) => {
  const state = "## Next action\n\nteam lead: run the second review slot\nPlan: not one of the fields\n";
  const parsed = parseStateMarkdown(state);

  assert.equal(parsed.fields.next_action, "team lead: run the second review slot Plan: not one of the fields");
  assert.equal(parsed.fields.plan, undefined, "an unknown label does not become a field");
});

test("free-form content is allowed and headings are optional", (t) => {
  const state = "# Notes\n\nStatus: reviewing\nNext action: team lead: hand the candidate to the owner\n\nAnything else is prose.\n";
  const f = fixture(t, { state });
  const payload = f.read();

  assert.equal(payload.record.status, "reviewing");
  assert.equal(payload.record.next_action, "team lead: hand the candidate to the owner");
  assert.deepEqual(payload.record.headings, { status: false, next_action: false });
  assert.ok(
    payload.warnings.some((warning) => /free-form content is allowed/.test(warning)),
    `expected the free-form note, got ${JSON.stringify(payload.warnings)}`,
  );
});

test("a wrapped next action is shown as written", (t) => {
  const state = "## Status\n\nactive\n\n## Next action\n\nteam lead: run the second review slot and then\nhand the candidate to the owner\n";
  const f = fixture(t, { state });
  const payload = f.read();
  assert.equal(payload.record.next_action, "team lead: run the second review slot and then hand the candidate to the owner");
});

test("a missing state.md is a reported path, never a created file", (t) => {
  const f = fixture(t, { state: null });
  const before = snapshot(f.temp);
  const payload = f.read();

  assert.equal(payload.state.exists, false);
  assert.equal(payload.state.kind, "missing");
  assert.equal(payload.record.status, null);
  assert.equal(payload.record.next_action, null);
  assert.deepEqual(payload.record.evidence, []);
  assert.ok(
    payload.warnings.some((warning) => warning.includes(join(STATE_DIR, STATE_FILE))),
    `the warning must name the path, got ${JSON.stringify(payload.warnings)}`,
  );
  assert.equal(existsSync(f.stateDir), false, "the reader must not create the state folder");
  assert.deepEqual(snapshot(f.temp), before);
});

test("an unreadable state path is reported rather than repaired", (t) => {
  const f = fixture(t, { state: null });
  mkdirSync(f.statePath, { recursive: true });
  const payload = f.read();

  assert.equal(payload.state.exists, true);
  assert.equal(payload.state.kind, "unreadable");
  assert.equal(payload.record.status, null);
  assert.ok(
    payload.warnings.some((warning) => /not a file/.test(warning)),
    `expected the unreadable note, got ${JSON.stringify(payload.warnings)}`,
  );
  assert.ok(existsSync(f.statePath));
});

test("a state folder or file that resolves outside the checkout is refused", (t) => {
  const outside = mkdtempSync(join(tmpdir(), "task-state-outside-"));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  writeFileSync(join(outside, STATE_FILE), "## Status\n\nelsewhere\n");
  let exercised = 0;

  // The whole folder is a link that leads out of the checkout.
  const folder = fixture(t, { state: null });
  let linked = false;
  for (const type of ["junction", "dir"]) {
    try {
      symlinkSync(outside, folder.stateDir, type);
      linked = true;
      break;
    } catch {
      // try the next link type
    }
  }
  if (linked) {
    exercised++;
    assert.throws(
      () => folder.read(),
      (error) => error.code === "out-of-scope",
      "a .state folder that leads out of the checkout must be refused",
    );
  }

  // The folder is real but the state file inside it links out.
  const file = fixture(t, { state: null });
  mkdirSync(file.stateDir);
  try {
    symlinkSync(join(outside, STATE_FILE), file.statePath, "file");
    exercised++;
    assert.throws(
      () => file.read(),
      (error) => error.code === "out-of-scope",
      "a state file that leads out of the checkout must be refused",
    );
  } catch (error) {
    if (error.code !== "EPERM") throw error;
    t.diagnostic("this host cannot create a file symlink; the file case is not exercised here");
  }
  if (exercised === 0) t.diagnostic("this host can create no link; the containment guard is not exercised here");
});

test("reading state needs no registry and no remote", (t) => {
  const f = fixture(t);
  // The fixture checkout has no remote, and its registry variable names no file.
  const result = f.run(["read"]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.record.next_action, "team lead: reconcile the reviewer findings");
  assert.equal(payload.project, undefined, "the read reports no workspace project of its own");
});

test("a folder outside any Git checkout fails explicitly", (t) => {
  const f = fixture(t);
  const loose = join(f.temp, "loose");
  mkdirSync(loose);

  assert.throws(
    () => f.read(loose),
    (error) => error.code === "not-a-checkout",
    "with no checkout there is no .state folder to read",
  );
  const result = f.run(["read"], { cwd: loose });
  assert.equal(result.status, 2);
  const failure = JSON.parse(result.stdout);
  assert.equal(failure.error.code, "not-a-checkout");
  assert.match(failure.error.message, /scratch route/, "the failure names where state goes without a checkout");
  assert.equal(existsSync(join(loose, STATE_DIR)), false, "the failed read must not create a state folder");
});

test("the reader has no write path at all", (t) => {
  const f = fixture(t);
  const before = snapshot(f.temp);

  for (const command of ["update", "init", "set", "write", "goal-set", "finding-add"]) {
    const result = f.run([command]);
    assert.notEqual(result.status, 0, `${command} must not be a command`);
    assert.match(result.stderr, /no write path/);
  }

  const flagged = f.run(["read", "--next-action", "team lead: set by a writer"]);
  assert.notEqual(flagged.status, 0);
  assert.match(flagged.stderr, /takes no write flag/);

  const read = f.run(["read"]);
  assert.equal(read.status, 0, read.stderr);
  const payload = JSON.parse(read.stdout);
  assert.equal(payload.readOnly, true);
  assert.equal(payload.record.next_action, "team lead: reconcile the reviewer findings");

  const help = f.run(["--help"]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /edited directly/);
  assert.deepEqual(snapshot(f.temp), before, "no command may change the fixture");
});

test("the module keeps the reader's exports and no writer machinery", () => {
  const names = Object.keys(adapter);
  for (const needed of ["findCheckout", "readState", "projectRecord", "readTaskState", "run"]) {
    assert.ok(names.includes(needed), `${needed} is part of the reader's API and must stay exported`);
  }
  for (const gone of ["updateTaskState", "initTaskState", "fingerprintOf", "WRITER_SCHEMA_PAIRS", "HANDOFF_SCHEMA", "ABSENT"]) {
    assert.ok(!names.includes(gone), `${gone} belonged to the retired writer adapter`);
  }

  const source = readFileSync(cli, "utf8");
  assert.doesNotMatch(source, /fingerprint/i);
  assert.doesNotMatch(source, /schema_version/);
  for (const write of ["writeFileSync", "renameSync", "rmSync", "openSync", "fsyncSync", "createHash", "randomUUID"]) {
    assert.ok(!source.includes(write), `${write} means the reader could still write`);
  }
  assert.equal(projectRecord({}).status, null, "an unread file projects null, never an inferred value");
});
