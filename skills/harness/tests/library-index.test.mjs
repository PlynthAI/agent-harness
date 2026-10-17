/**
 * Behaviour of the principles and patterns library check through its command
 * line: exit status, the errors it prints and the index it writes. The OKF
 * checker underneath is the inbox skill's pinned, unmodified copy, so these
 * fixtures test the library's own rules (required fields, the folder for each
 * type, nothing in the library but entries and the index, a generated index
 * that cannot drift), not OKF.
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("../scripts/library-index.mjs", import.meta.url));

// The first uv run may fetch PyYAML into uv's cache; later runs are local.
const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: "utf8", timeout: 180000 });
// LIBRARY_TODAY stands in for the calendar date when judging a reviewed date's age.
const runOn = (today, ...args) =>
  spawnSync(process.execPath, [script, ...args], { encoding: "utf8", timeout: 180000, env: { ...process.env, LIBRARY_TODAY: today } });
const output = (result) => `${result.stdout}${result.stderr}`;

function scratch(t) {
  const dir = mkdtempSync(join(tmpdir(), "library-index-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function write(root, relative, text) {
  const path = join(root, relative);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

const entry = (fields, body = "# Body\n") =>
  `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join("\n")}\n---\n${body}`;

// One entry of each type, a trial principle and a pattern triggered by a
// dependency. No index yet.
function library(t) {
  const root = scratch(t);
  write(root, "principles/zeta-rule.md", entry({
    type: '"principle"', title: '"Zeta rule"', description: '"Apply when a plan sequences work."', applies_to: '["plan"]',
  }));
  write(root, "principles/alpha-rule.md", entry({
    type: '"principle"', title: '"Alpha rule"', description: '"Apply when a diff adds a type."', applies_to: '["plan", "diff"]', status: '"trial"',
  }));
  write(root, "patterns/python.md", entry({
    type: '"pattern"', title: '"Python"', description: '"Apply when a diff changes Python code."', applies_to: '["diff"]',
  }));
  write(root, "patterns/supabase.md", entry({
    type: '"pattern"', title: '"Supabase"', description: '"Apply when a change touches Supabase queries or policies."',
    applies_to: '["plan", "diff"]', dependency: '["@supabase/supabase-js", "supabase"]',
    source: '"https://example.com/supabase/abc123"', reviewed: '"2026-10-02"',
  }));
  return root;
}

test("a missing index fails the check and --write builds it", (t) => {
  const root = library(t);
  const before = run(root);
  assert.equal(before.status, 1, output(before));
  assert.match(before.stdout, /^ERROR index\.md \[index\]/m);

  const written = run("--write", root);
  assert.equal(written.status, 0, output(written));
  const after = run(root);
  assert.equal(after.status, 0, output(after));
  assert.match(after.stdout, /Library check passed: 4 entries/);
});

test("the index lists one line per entry, grouped by type, from the front matter", (t) => {
  const root = library(t);
  assert.equal(run("--write", root).status, 0);
  const index = readFileSync(join(root, "index.md"), "utf8");
  const headings = [...index.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
  assert.deepEqual(headings, ["Principles", "Patterns"]);
  const lines = index.split("\n").filter((line) => line.startsWith("- "));
  assert.deepEqual(lines, [
    "- [Alpha rule](principles/alpha-rule.md) (plan, diff; trial): Apply when a diff adds a type.",
    "- [Zeta rule](principles/zeta-rule.md) (plan): Apply when a plan sequences work.",
    "- [Python](patterns/python.md) (diff): Apply when a diff changes Python code.",
    "- [Supabase](patterns/supabase.md) (plan, diff; dependency `@supabase/supabase-js`, `supabase`): Apply when a change touches Supabase queries or policies.",
  ]);
});

test("an index link to a file whose name Markdown treats specially still points at that file", (t) => {
  const root = library(t);
  write(root, "patterns/c#-(odd.md", entry({
    type: '"pattern"', title: '"C sharp"', description: '"Apply when a diff changes C# code."', applies_to: '["diff"]',
  }));
  const written = run("--write", root);
  assert.equal(written.status, 0, output(written));
  assert.match(readFileSync(join(root, "index.md"), "utf8"), /^- \[C sharp\]\(patterns\/c%23-%28odd\.md\) \(diff\): /m);
});

test("a hand edit to the index fails the check", (t) => {
  const root = library(t);
  assert.equal(run("--write", root).status, 0);
  const path = join(root, "index.md");
  writeFileSync(path, readFileSync(path, "utf8").replace("Zeta rule", "Zeta rule, edited"));
  const result = run(root);
  assert.equal(result.status, 1, output(result));
  assert.match(result.stdout, /^ERROR index\.md \[index\]/m);
});

test("a new entry fails the check until the index is rebuilt", (t) => {
  const root = library(t);
  assert.equal(run("--write", root).status, 0);
  write(root, "principles/beta-rule.md", entry({
    type: '"principle"', title: '"Beta rule"', description: '"Apply when a diff adds a branch."', applies_to: '["diff"]',
  }));
  assert.equal(run(root).status, 1);
  assert.equal(run("--write", root).status, 0);
  assert.match(readFileSync(join(root, "index.md"), "utf8"), /^- \[Beta rule\]\(principles\/beta-rule\.md\) \(diff\): /m);
});

for (const [name, field, fields] of [
  ["no description", "description", { type: '"principle"', title: '"Gamma"', applies_to: '["plan"]' }],
  ["no title", "title", { type: '"principle"', description: '"Apply when gamma."', applies_to: '["plan"]' }],
  ["no applies_to", "applies_to", { type: '"principle"', title: '"Gamma"', description: '"Apply when gamma."' }],
  ["an empty applies_to", "applies_to", { type: '"principle"', title: '"Gamma"', description: '"Apply when gamma."', applies_to: "[]" }],
  ["applies_to outside plan and diff", "applies_to", { type: '"principle"', title: '"Gamma"', description: '"Apply when gamma."', applies_to: '["tool"]' }],
  ["an unknown type", "type", { type: '"rule"', title: '"Gamma"', description: '"Apply when gamma."', applies_to: '["plan"]' }],
  ["a type that does not match its folder", "type", { type: '"pattern"', title: '"Gamma"', description: '"Apply when gamma."', applies_to: '["plan"]' }],
  ["a status other than trial", "status", { type: '"principle"', title: '"Gamma"', description: '"Apply when gamma."', applies_to: '["plan"]', status: '"draft"' }],
  ["a source and no reviewed date", "reviewed", { type: '"principle"', title: '"Gamma"', description: '"Apply when gamma."', applies_to: '["plan"]', source: '"https://example.com/g"' }],
  ["a reviewed date that is not a calendar date", "reviewed", { type: '"principle"', title: '"Gamma"', description: '"Apply when gamma."', applies_to: '["plan"]', source: '"https://example.com/g"', reviewed: '"2026-02-30"' }],
  ["a reviewed date given as a list", "reviewed", { type: '"principle"', title: '"Gamma"', description: '"Apply when gamma."', applies_to: '["plan"]', source: '"https://example.com/g"', reviewed: '["2026-10-02"]' }],
]) {
  test(`an entry with ${name} fails with ${field} and leaves the index alone`, (t) => {
    const root = library(t);
    assert.equal(run("--write", root).status, 0);
    const before = readFileSync(join(root, "index.md"), "utf8");
    write(root, "principles/gamma.md", entry(fields));
    const result = run("--write", root);
    assert.equal(result.status, 1, output(result));
    assert.match(result.stdout, new RegExp(`^ERROR principles/gamma\\.md \\[${field}\\]`, "m"));
    assert.equal(readFileSync(join(root, "index.md"), "utf8"), before);
  });
}

test("a dependency belongs to a pattern: on a principle, or as no list of names, it fails", (t) => {
  const root = library(t);
  write(root, "principles/delta.md", entry({
    type: '"principle"', title: '"Delta"', description: '"Apply when delta."', applies_to: '["plan"]', dependency: '["react"]',
  }));
  write(root, "patterns/react.md", entry({
    type: '"pattern"', title: '"React"', description: '"Apply when a diff changes React."', applies_to: '["diff"]', dependency: '"react"',
  }));
  const result = run("--write", root);
  assert.equal(result.status, 1, output(result));
  assert.match(result.stdout, /^ERROR principles\/delta\.md \[dependency\]/m);
  assert.match(result.stdout, /^ERROR patterns\/react\.md \[dependency\]/m);
});

test("a reviewed date more than six months old is an advisory warning naming the entry and its source", (t) => {
  const root = library(t);
  write(root, "patterns/stale.md", entry({
    type: '"pattern"', title: '"Stale"', description: '"Apply when stale."', applies_to: '["diff"]',
    source: '"https://example.com/stale/old111"', reviewed: '"2026-04-01"',
  }));
  write(root, "patterns/edge.md", entry({
    type: '"pattern"', title: '"Edge"', description: '"Apply when edge."', applies_to: '["diff"]',
    source: '"https://example.com/edge/def456"', reviewed: '"2026-04-02"',
  }));
  assert.equal(runOn("2026-10-02", "--write", root).status, 0);
  const result = runOn("2026-10-02", root);
  assert.equal(result.status, 0, output(result));
  assert.match(result.stdout, /^WARNING patterns\/stale\.md \[reviewed\]: .*2026-04-01.*https:\/\/example\.com\/stale\/old111/m);
  assert.doesNotMatch(result.stdout, /^WARNING patterns\/(edge|supabase)\.md/m);
  assert.match(result.stdout, /Library check passed: 6 entries, index current, 1 advisory warning\(s\)\./);
});

// Six calendar months from the reviewed date, a month end clamped to the target
// month's last day; the warning starts the day after that.
test("a reviewed date warns only once more than six calendar months have passed, month ends and leap years included", (t) => {
  const root = library(t);
  write(root, "patterns/spring.md", entry({
    type: '"pattern"', title: '"Spring"', description: '"Apply when spring."', applies_to: '["diff"]',
    source: '"https://example.com/spring/aaa111"', reviewed: '"2026-03-01"',
  }));
  write(root, "patterns/leap.md", entry({
    type: '"pattern"', title: '"Leap"', description: '"Apply when leap."', applies_to: '["diff"]',
    source: '"https://example.com/leap/bbb222"', reviewed: '"2027-08-31"',
  }));
  assert.equal(run("--write", root).status, 0);
  const warned = (today) => {
    const result = runOn(today, root);
    assert.equal(result.status, 0, output(result));
    return [...result.stdout.matchAll(/^WARNING patterns\/(spring|leap)\.md \[reviewed\]/gm)].map((match) => match[1]).sort();
  };
  // 2026-03-01 reaches six months on 2026-09-01; 2027-08-31 on 2028-02-29.
  assert.deepEqual(warned("2026-08-31"), []);
  assert.deepEqual(warned("2026-09-01"), []);
  assert.deepEqual(warned("2026-09-02"), ["spring"]);
  assert.deepEqual(warned("2028-02-29"), ["spring"]);
  assert.deepEqual(warned("2028-03-01"), ["leap", "spring"]);
});

test("an entry without front matter fails the OKF structure check", (t) => {
  const root = library(t);
  write(root, "patterns/typescript.md", "# TypeScript\n\nNo front matter.\n");
  const result = run("--write", root);
  assert.equal(result.status, 1, output(result));
  assert.match(result.stdout, /^ERROR patterns\/typescript\.md \[type\]/m);
});

// The library holds the index and one page per entry, nothing else: a copied
// upstream folder, a metadata file or a SKILL.md or AGENTS.md (which agent tools
// load on their own) fails, even when it is valid Markdown with front matter.
for (const [name, path, text] of [
  ["a folder below patterns", "patterns/vendor/rule.md", entry({ type: '"pattern"', title: '"Rule"', description: '"Apply when rule."', applies_to: '["diff"]' })],
  ["a folder beside principles and patterns", "stack/react.md", entry({ type: '"pattern"', title: '"React"', description: '"Apply when React."', applies_to: '["diff"]' })],
  ["a file that is not Markdown", "library.base", "views: []\n"],
  ["a SKILL.md", "patterns/SKILL.md", entry({ type: '"pattern"', title: '"Skill"', description: '"Apply when skill."', applies_to: '["diff"]' })],
  ["an AGENTS.md", "AGENTS.md", "# Agents\n"],
]) {
  test(`${name} in the library fails with layout and leaves the index alone`, (t) => {
    const root = library(t);
    assert.equal(run("--write", root).status, 0);
    const before = readFileSync(join(root, "index.md"), "utf8");
    write(root, path, text);
    const result = run("--write", root);
    assert.equal(result.status, 1, output(result));
    assert.match(result.stdout, new RegExp(`^ERROR ${path.replace(/[.\/]/g, "\\$&")} \\[layout\\]`, "m"));
    assert.equal(readFileSync(join(root, "index.md"), "utf8"), before);
  });
}

test("a missing library folder is a usage error, not a pass", (t) => {
  const result = run(join(scratch(t), "no-such-library"));
  assert.equal(result.status, 2, output(result));
  assert.match(output(result), /not a folder/i);
});

test("a temporary folder that cannot be created means the check cannot run, with a one-line reason", (t) => {
  const root = library(t);
  const missing = join(scratch(t), "no-such-temp");
  const result = spawnSync(process.execPath, [script, root], {
    encoding: "utf8",
    timeout: 180000,
    env: { ...process.env, TMP: missing, TEMP: missing, TMPDIR: missing },
  });
  assert.equal(result.status, 2, output(result));
  assert.match(result.stderr, /^Cannot check library: .+\n$/);
  assert.doesNotMatch(output(result), /\n\s+at /);
});

test("the committed library index matches a fresh build and every entry is complete", () => {
  // No argument: the library beside the installed or source skills folder.
  const result = run();
  assert.equal(result.status, 0, output(result));
  assert.match(result.stdout, /Library check passed/);
});
