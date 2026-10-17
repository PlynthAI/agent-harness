/**
 * Behaviour of the brain check through its command line: exit status and the
 * readable list it prints. The OKF checker underneath is a pinned, unmodified
 * copy, so these fixtures test the wrapper's scope, its description rule, its
 * source and parent rules, wikilink resolution and duplicate names, not OKF itself.
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const skillDir = fileURLToPath(new URL("..", import.meta.url));
const script = join(skillDir, "scripts", "check-brain.mjs");
const starterBrain = resolve(skillDir, "../../harness-docs-starter/brain");

// The first uv run may fetch PyYAML into uv's cache; later runs are local.
const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: "utf8", timeout: 180000 });

function scratch(t) {
  const dir = mkdtempSync(join(tmpdir(), "brain-check-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function write(root, relative, text) {
  const path = join(root, relative);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

const page = (fields, body = "") =>
  `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join("\n")}\n---\n${body}\n`;

// A small brain that passes: root index and log, one home page, one source.
function minimalBrain(t) {
  const root = scratch(t);
  write(root, "index.md", '---\nokf_version: "0.2"\n---\n# Brain\n\n## Sources\n\n- [[Home]]\n');
  write(root, "log.md", "# Log\n\n## 2026-09-30\n\n- Brain created.\n");
  write(root, "Home.md", page({ type: "home", title: "Home", description: '"Start page. Read when opening the vault."' }, "# Home\n\n[[index]] and [[log]]."));
  write(root, "Sources/Example - Technique.md", page({
    type: "source",
    title: '"Example: technique"',
    description: '"A technique. Read when choosing a drawing style."',
    status: "draft",
    related: '["[[Home]]"]',
    sources: "\n  - resource: https://example.com/post",
  }, "# Example: technique\n\nSee [[Home#Inbox|the inbox]]."));
  return root;
}

const output = (result) => `${result.stdout}${result.stderr}`;

test("the landed starter brain passes once adoption fills its date", (t) => {
  const root = join(scratch(t), "brain");
  cpSync(starterBrain, root, { recursive: true });
  const log = join(root, "log.md");
  writeFileSync(log, readFileSync(log, "utf8").replaceAll("<YYYY-MM-DD>", "2026-09-30"));
  const result = run(root);
  assert.equal(result.status, 0, output(result));
  assert.match(result.stdout, /Brain check passed/);
});

test("a concept page with no description fails the check", (t) => {
  const root = minimalBrain(t);
  write(root, "Sources/No description.md", page({ type: "source", title: "No description", sources: "[{resource: https://example.com/post}]" }, "Links [[Home]]."));
  const result = run(root);
  assert.equal(result.status, 1, output(result));
  assert.match(result.stdout, /^ERROR Sources\/No description\.md \[description\]/m);
  assert.match(result.stdout, /Brain check FAILED: 1 error/);
});

test("a fixture brain with resolvable links and descriptions passes", (t) => {
  const root = minimalBrain(t);
  const result = run(root);
  assert.equal(result.status, 0, output(result));
});

test("an unresolved wikilink in the body or a property fails, and code is ignored", (t) => {
  const root = minimalBrain(t);
  write(root, "Company/Decisions/Pricing.md", page({
    type: "decision",
    title: "Pricing",
    description: '"A decision. Read when changing prices."',
    area: '"[[Missing area]]"',
  }, "Body links [[Missing page|alias]].\n\n```\n[[Inside a fence]]\n```\n\nInline `[[Inside code]]` is ignored."));
  const result = run(root);
  assert.equal(result.status, 1, output(result));
  assert.match(result.stdout, /Company\/Decisions\/Pricing\.md \[wikilink\].*Missing area/);
  assert.match(result.stdout, /Company\/Decisions\/Pricing\.md \[wikilink\].*Missing page/);
  assert.doesNotMatch(result.stdout, /Inside a fence|Inside code/);
});

test("wikilinks resolve by file name, path, heading and embed, including non-Markdown files", (t) => {
  const root = minimalBrain(t);
  write(root, "Home/Inbox.base", "views: []\n");
  write(root, "Attachments/plan.png", "not really a png");
  write(root, "Sources/Links.md", page({
    type: "source",
    title: "Links",
    description: '"Link forms. Read when checking links."',
    related: '["[[Sources/Example - Technique]]", "[[home]]"]',
    sources: "[{resource: https://example.com/post}]",
  }, "![[Inbox.base]] ![[plan.png]] [[Example - Technique#What it says]] [[#Local heading]]\n\n| a | [[Home\\|table alias]] |\n|---|---|"));
  const result = run(root);
  assert.equal(result.status, 0, output(result));
});

test("two concept pages with the same file name are flagged", (t) => {
  const root = minimalBrain(t);
  const fields = { type: "goal", title: "Sign in", description: '"A goal. Read before planning sign-in."', status: "draft" };
  write(root, "Workspaces/app-one/goals/sign-in.md", page(fields, "[[Home]]"));
  write(root, "Workspaces/app-two/goals/Sign-in.md", page(fields, "[[Home]]"));
  const result = run(root);
  assert.equal(result.status, 1, output(result));
  assert.match(result.stdout, /\[duplicate-name\].*app-one\/goals\/sign-in\.md.*app-two\/goals\/Sign-in\.md/i);
});

test("agent guides, views, templates, plans and dot folders are outside the check", (t) => {
  const root = minimalBrain(t);
  write(root, "AGENTS.md", "# Guide without front matter [[Nowhere]]\n");
  write(root, "Workspaces/README.md", "# Workspaces\n");
  write(root, "Workspaces/app-one/AGENTS.md", "# Workspace guide\n");
  write(root, "Home/Notes.md", "no front matter\n");
  write(root, "Templates/source.md", '---\ntype: source\ntitle: "{{title}}"\nrelated: ["[[<placeholder>]]"]\n---\n');
  write(root, "Workspaces/app-one/plans/task/plan.md", "# Plan [[Nowhere]]\n");
  write(root, "Inbox/.raw/x/bookmarks.md", "raw pull\n");
  write(root, ".obsidian/notes.md", "settings\n");
  const result = run(root);
  assert.equal(result.status, 0, output(result));
});

test("a Markdown link to a file outside the check scope still resolves", (t) => {
  const root = minimalBrain(t);
  write(root, "Sources/Guide link.md", page({
    type: "source",
    title: "Guide link",
    description: '"Links the guide. Read when checking links."',
    sources: "[{resource: https://example.com/post}]",
  }, "[[Home]] and the [agent guide](../AGENTS.md)."));
  write(root, "AGENTS.md", "# Guide\n");
  const result = run(root);
  assert.equal(result.status, 0, output(result));
  assert.doesNotMatch(result.stdout, /broken-link/);
});

// A brain can be a folder inside a larger Obsidian vault, such as a workspace
// in a checkout. Obsidian resolves its links across the whole vault, so the
// check does too, while it still checks only the pages under the brain root.
function nestedBrain(t, { vault = true } = {}) {
  const outer = scratch(t);
  if (vault) write(outer, ".obsidian/app.json", "{}\n");
  write(outer, "README.md", "# Checkout\n");
  write(outer, "docs/Guide.md", "# Guide outside the brain\n");
  write(outer, "docs/Broken.md", "---\ntype: note\n---\nNo description, no parent, [[Nowhere]].\n");
  const root = join(outer, "workspace");
  write(root, "README.md", "# Workspace\n");
  write(root, "log.md", "# Log\n\n## 2026-10-02\n\n- Created [[workspace/README|the workspace]].\n");
  write(root, "goals/board.md", page({
    type: "goal",
    title: "Board",
    description: '"A goal. Read when planning the board."',
    status: "draft",
    related: '["[[workspace/README]]"]',
  }, "See [[Guide]]."));
  write(root, "Inbox/2026-10-02 Pick up the board.md", page({
    type: "inbox",
    title: '"Pick up the board"',
    description: '"Handoff: build the board. Read when picking up harness work."',
    status: "draft",
    project: "harness",
    kind: "task",
    outcome: '""',
    date: '"2026-10-02"',
  }, "## The drop\n\nBuild it from [[board]].\n\n## Route\n\nThe next chat fills outcome."));
  return root;
}

test("a brain inside a larger vault resolves links across the vault and checks only its own pages", (t) => {
  const result = run(nestedBrain(t));
  assert.equal(result.status, 0, output(result));
  assert.match(result.stdout, /3 page\(s\) checked/);
  assert.doesNotMatch(result.stdout, /Broken\.md|Nowhere/);
});

// Obsidian does not index dot folders, so a brain reached through one is not
// part of the vault above it: its links resolve inside the brain only.
test("a brain under a dot folder of a vault resolves its links inside the brain only", (t) => {
  const outer = scratch(t);
  write(outer, ".obsidian/app.json", "{}\n");
  write(outer, "docs/Guide.md", "# Guide outside the brain\n");
  const root = join(outer, ".local/x/brain");
  write(root, "index.md", '---\nokf_version: "0.2"\n---\n# Brain\n\n- [[Home]]\n');
  write(root, "log.md", "# Log\n\n## 2026-10-02\n\n- Brain created.\n");
  write(root, "Home.md", page({ type: "home", title: "Home", description: '"Start page. Read when opening the vault."' }, "[[index]] and [[log]]."));
  write(root, "Sources/Links.md", page({
    type: "source",
    title: "Links",
    description: '"Link forms. Read when checking links."',
    related: '["[[Home]]"]',
    sources: "[{resource: https://example.com/post}]",
  }, "[[Home#Start]] and [[Guide]]."));
  const result = run(root);
  assert.equal(result.status, 1, output(result));
  assert.doesNotMatch(result.stdout, /Links resolve across the vault/);
  assert.match(result.stdout, /^ERROR Sources\/Links\.md \[wikilink\].*\[\[Guide\]\]/m);
  assert.match(result.stdout, /Brain check FAILED: 1 error/);
});

test("a vault whose own folder name starts with a dot still resolves a nested brain's links", (t) => {
  const root = nestedBrain(t);
  const dotted = join(dirname(dirname(root)), `.${basename(dirname(root))}`);
  // Copied, not renamed: Windows can refuse to rename a folder a scanner still holds.
  cpSync(dirname(root), dotted, { recursive: true });
  t.after(() => rmSync(dotted, { recursive: true, force: true }));
  const result = run(join(dotted, "workspace"));
  assert.equal(result.status, 0, output(result));
  assert.match(result.stdout, /Links resolve across the vault/);
});

// Denies listing a folder until the returned restore runs: an Everyone deny
// entry on Windows, no permission bits elsewhere.
function denyRead(path) {
  if (process.platform !== "win32") {
    chmodSync(path, 0);
    return () => chmodSync(path, 0o755);
  }
  const icacls = (...args) => {
    const result = spawnSync("icacls", [path, ...args], { encoding: "utf8" });
    assert.equal(result.status, 0, `icacls ${args.join(" ")}: ${result.stdout}${result.stderr}`);
  };
  icacls("/deny", "*S-1-1-0:(R)");
  return () => icacls("/remove:d", "*S-1-1-0");
}

test("across a larger vault, a folder that cannot be read is skipped", (t) => {
  if (process.getuid?.() === 0) return t.skip("root can list any folder");
  const root = nestedBrain(t);
  write(dirname(root), "locked/Private.md", "# Private\n");
  const restore = denyRead(join(dirname(root), "locked"));
  let result;
  try {
    result = run(root);
  } finally {
    restore();
  }
  assert.equal(result.status, 0, output(result));
  assert.match(result.stdout, /3 page\(s\) checked/);
});

test("across a larger vault, installed packages are not indexed for links", (t) => {
  const root = nestedBrain(t);
  write(dirname(root), "node_modules/some-package/Package page.md", "# Installed\n");
  write(root, "goals/packages.md", page({
    type: "goal",
    title: "Packages",
    description: '"A goal. Read when checking packages."',
    status: "draft",
    related: '["[[workspace/README]]"]',
  }, "See [[Package page]]."));
  const result = run(root);
  assert.equal(result.status, 1, output(result));
  assert.match(result.stdout, /4 page\(s\) checked/);
  assert.match(result.stdout, /^ERROR goals\/packages\.md \[wikilink\].*Package page/m);
  assert.match(result.stdout, /Brain check FAILED: 1 error/);
});

test("without a vault above it, a brain's links resolve only inside the brain", (t) => {
  const result = run(nestedBrain(t, { vault: false }));
  assert.equal(result.status, 1, output(result));
  assert.match(result.stdout, /^ERROR goals\/board\.md \[wikilink\].*workspace\/README/m);
  assert.match(result.stdout, /^ERROR goals\/board\.md \[wikilink\].*Guide/m);
});

test("a missing brain root is a usage error, not a pass", (t) => {
  const result = run(join(scratch(t), "no-such-brain"));
  assert.equal(result.status, 2, output(result));
  assert.match(output(result), /not a folder/i);
});

for (const [name, sources] of [
  ["no sources", undefined],
  ["an empty sources list", "[]"],
  ["a null sources value", "null"],
  ["a sources mapping instead of a list", "{resource: https://example.com/post}"],
  ["a source without a resource", '[{title: "A post"}]'],
  ["an empty resource", '[{resource: "  "}]'],
  ["a non-string resource", "[{resource: 42}]"],
  ["an invalid entry after a valid source", "[{resource: https://example.com/post}, {}]"],
]) {
  test(`a source page with ${name} fails with sources`, (t) => {
    const root = minimalBrain(t);
    const fields = { type: '"source"', title: "Bad source", description: '"A source. Read when checking provenance."' };
    if (sources !== undefined) fields.sources = sources;
    write(root, "Sources/Bad source.md", page(fields, "[[Home]]"));
    const result = run(root);
    assert.equal(result.status, 1, output(result));
    assert.match(result.stdout, /^ERROR Sources\/Bad source\.md \[sources\]/m);
    assert.match(result.stdout, /Brain check FAILED: 1 error/);
  });
}

for (const [name, fields, body] of [
  ["no links", {}, "No parent yet."],
  ["empty parent properties", { related: "[]", area: "null", project: '""' }, "No parent yet."],
  ["a link only in another property", { title: '"[[Home]]"' }, "No parent yet."],
  ["links only in code and comments", {}, "`[[Home]]`\n```\n[[Home]]\n```\n<!-- [[Home]] -->\n%% [[Home]] %%"],
  ["a local heading link", {}, "[[#Heading]]\n\n## Heading"],
]) {
  test(`a concept page with ${name} fails with parent`, (t) => {
    const root = minimalBrain(t);
    write(root, "Company/Orphan.md", page({ type: "note", title: "Orphan", description: '"A note. Read when checking the graph."', ...fields }, body));
    const result = run(root);
    assert.equal(result.status, 1, output(result));
    assert.match(result.stdout, /^ERROR Company\/Orphan\.md \[parent\]/m);
    assert.match(result.stdout, /Brain check FAILED: 1 error/);
  });
}

for (const [name, fields, body] of [
  ["body", {}, "[[Home#Inbox|Start here]]"],
  ["area", { area: '"[[Home]]"' }, "A note."],
  ["project", { project: '"[[Home]]"' }, "A note."],
  ["related", { related: '\n  - "[[Home]]"' }, "A note."],
]) {
  test(`a concept parent link in ${name} passes`, (t) => {
    const root = minimalBrain(t);
    write(root, "Company/Linked.md", page({ type: "note", title: "Linked", description: '"A note. Read when checking the graph."', ...fields }, body));
    const result = run(root);
    assert.equal(result.status, 0, output(result));
  });
}

for (const [name, sources] of [
  ["a block list", '\n  - resource: https://example.com/post\n    title: "A post"'],
  ["a flow list and repository path", '[{resource: "src/example.ts"}]'],
  ["a YAML alias", '\n  - &post {resource: https://example.com/post}\n  - *post'],
]) {
  test(`a source page with ${name} passes`, (t) => {
    const root = minimalBrain(t);
    write(root, "Sources/Valid.md", page({ type: "source", title: "Valid", description: '"A source. Read when checking provenance."', sources }, "[[Home]]"));
    const result = run(root);
    assert.equal(result.status, 0, output(result));
  });
}

test("source and parent rules exempt templates, inbox, navigation, home pages and base files", (t) => {
  const root = minimalBrain(t);
  const fields = { type: "source", title: "Exempt", description: '"A page. Read when checking exemptions."' };
  for (const path of ["Templates/source.md", "Inbox/Capture.md", "Home/Notes.md", "Views/Notes.base"]) {
    write(root, path, page(fields, "No parent or sources yet."));
  }
  write(root, "Home.md", page({ ...fields, type: "home" }, "Start here."));
  write(root, "Company/Start.md", page({ ...fields, type: "home" }, "Start here."));
  write(root, "Company/index.md", "# Company\n");
  write(root, "Company/log.md", "# Log\n\n## 2026-09-30\n\n- Created.\n");
  const result = run(root);
  assert.equal(result.status, 0, output(result));
});

for (const [name, body, status] of [
  ["four-space code", "    [[Home]]", 1],
  ["tab-indented code", "\t[[Home]]", 1],
  ["code after a heading", "# Note\n    [[Home]]", 1],
  ["code after a Setext H1", "Heading\n=======\n    [[Home]]", 1],
  ["code after a Setext H2", "Heading\n-\n    [[Home]]", 1],
  ["code inside a list item", "- Example:\n\n      [[Home]]", 1],
  ["an indented list continuation", "- Parent:\n\n    [[Home]]", 0],
  ["a nested list", "- Parents:\n    - [[Home]]", 0],
  ["an indented paragraph continuation", "Parent:\n    [[Home]]", 0],
  ["an equals paragraph continuation", "===\n    [[Home]]", 0],
]) {
  test(`parent detection handles ${name}`, (t) => {
    const root = minimalBrain(t);
    write(root, "Company/Indentation.md", page({ type: "note", title: "Indentation", description: '"A note. Read when checking Markdown parents."' }, body));
    const result = run(root);
    assert.equal(result.status, status, output(result));
    if (status === 1) assert.match(result.stdout, /^ERROR Company\/Indentation\.md \[parent\]/m);
  });
}
