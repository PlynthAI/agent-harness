/**
 * Focused fixtures for the shared docs-workspace method.
 *
 * These do not re-test the workspace resolver. They check the things that
 * actually break in a routing skill: the route vocabulary drifting away from
 * the resolver, a template that is promised but missing, an orphan template,
 * and a router that is no longer short enough to read before acting.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { DEFAULT_ROUTES, REQUIRED_ROUTES } from "../scripts/resolve-workspace.mjs";

const skillDir = fileURLToPath(new URL("..", import.meta.url));
const router = join(skillDir, "SKILL.md");
const routesDoc = join(skillDir, "references", "routes.md");
const starterDir = resolve(skillDir, "../../harness-docs-starter");
const workspaceAgents = join(starterDir, "AGENTS.md");
const templatesDir = join(starterDir, "templates");

function skillFiles() {
  const files = [router];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else files.push(path);
    }
  };
  walk(join(skillDir, "references"));
  walk(starterDir);
  return files;
}

/** First backticked token of every table row that starts with one. */
function tableRoutes(markdown) {
  return markdown
    .split("\n")
    .filter((line) => line.startsWith("| `"))
    .map((line) => line.split("`")[1]);
}

/** The body of one `## <heading>` section, located by name rather than order. */
function section(markdown, heading) {
  const lines = markdown.split("\n");
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  assert.notEqual(start, -1, `routes.md has no "${heading}" section`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("## "));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

test("the routed vocabulary is exactly the resolver's route vocabulary", () => {
  const routes = readFileSync(routesDoc, "utf8");

  const required = tableRoutes(section(routes, "Required routes"));
  assert.deepEqual([...required].sort(), [...REQUIRED_ROUTES].sort());

  const other = tableRoutes(section(routes, "Other routes"));
  assert.ok(other.length >= 5, `expected the other routes, got ${JSON.stringify(other)}`);
  for (const name of other) {
    assert.ok(name in DEFAULT_ROUTES, `${name} is not a route the resolver knows`);
    assert.ok(!REQUIRED_ROUTES.includes(name), `${name} is listed as optional but is required`);
  }
});

test("every promised template exists and no template is orphaned", () => {
  const promised = [...readFileSync(router, "utf8").matchAll(/`(templates\/[A-Za-z-]+\.md)`/g)].map((m) => m[1]);
  assert.ok(promised.length >= 8, `expected at least 8 templates, found ${promised.length}`);

  for (const relative of promised) {
    assert.ok(existsSync(join(starterDir, relative)), `${relative} is promised by SKILL.md but missing`);
  }

  const onDisk = readdirSync(templatesDir).map((name) => `templates/${name}`);
  assert.deepEqual([...onDisk].sort(), [...promised].sort(), "a template exists that the router never offers");
});

test("every reference is reachable from the router", () => {
  const text = readFileSync(router, "utf8");
  for (const name of readdirSync(join(skillDir, "references"))) {
    assert.ok(text.includes(`references/${name}`), `references/${name} is not linked from SKILL.md`);
  }

  // Concision is a review judgment; line wrapping is not a routing contract.
});

test("every local Markdown link points at a real file", () => {
  for (const path of skillFiles()) {
    const where = relative(skillDir, path);
    const text = readFileSync(path, "utf8");
    for (const match of text.matchAll(/\]\((?!([a-z][a-z0-9+.-]*:))([^)#]+)\)/gi)) {
      const target = resolve(dirname(path), match[2]);
      assert.ok(existsSync(target), `${where} links to ${match[2]}, which does not exist`);
    }
  }
});

test("the cross-skill links this method created still resolve", () => {
  // A skill may link into a sibling skill; nothing else checks those.
  const pPlanner = fileURLToPath(new URL("../../planner/SKILL.md", import.meta.url));
  const text = readFileSync(pPlanner, "utf8");
  assert.ok(
    text.includes("../docs-workspace/references/plan-and-state.md"),
    "planner must route through the shared plan and state guidance",
  );
  const links = [...text.matchAll(/\]\((?!([a-z][a-z0-9+.-]*:))([^)#]+)\)/gi)].map((match) => match[2]);
  assert.ok(links.length > 0, "planner should link to plan routing guidance");
  for (const link of links) {
    assert.ok(existsSync(resolve(dirname(pPlanner), link)), `planner links to ${link}, which does not exist`);
  }
});

test("the router's own destination table uses resolver route names", () => {
  const named = [];
  for (const line of readFileSync(router, "utf8").split("\n")) {
    if (!line.startsWith("| ")) continue;
    const route = line.split("|")[2]?.trim() ?? "";
    const match = /^`([A-Za-z0-9._-]+)/.exec(route);
    if (match) named.push(match[1].split("/")[0]);
  }
  assert.ok(named.length >= 6, `expected route rows in the destination table, found ${JSON.stringify(named)}`);
  for (const name of named) {
    assert.ok(name in DEFAULT_ROUTES, `${name} is listed as a destination but is not a resolver route`);
  }
});

test("each template states its purpose and has a single title", () => {
  for (const name of readdirSync(templatesDir)) {
    const text = readFileSync(join(templatesDir, name), "utf8");
    assert.ok(text.trim().length > 0, `${name} is empty`);
    // A leading YAML front matter block (the DESIGN.md starter) may carry "# "
    // comments; those are not Markdown titles.
    const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
    const titles = body.split("\n").filter((line) => /^# /.test(line));
    assert.equal(titles.length, 1, `${name} should have exactly one H1 title`);
    assert.ok(text.includes("<"), `${name} should carry at least one <placeholder> to fill in`);
  }
});

test("the method embeds no host path and no project-specific drive", () => {
  for (const path of skillFiles()) {
    const text = readFileSync(path, "utf8");
    assert.doesNotMatch(text, /\b[A-Za-z]:[\\/]/, `${path} embeds a host drive path or project-specific root`);
  }
});

test("the workspace AGENTS.md template names both documentation endpoints", () => {
  const text = readFileSync(workspaceAgents, "utf8");
  assert.match(text, /resolve-workspace\.mjs/, "must tell the reader how to resolve routes");
  for (const route of ["goals", "findings", "plans", "artifacts"]) {
    assert.ok(text.includes(`\`${route}`), `must route ${route}`);
  }
  assert.match(text, /trackedRoutes/, "must say that Git owns some documents");
  assert.match(
    text,
    /No database, table, schema or writer command is a prerequisite/,
    "must say a document needs no database, table, schema or writer command",
  );
  assert.match(
    text,
    /`state\.md`/,
    "must route a task's current position to the state file",
  );
  assert.match(text, /`objects\/` and `index\/`/, "must mark the tool-owned internals");
});
