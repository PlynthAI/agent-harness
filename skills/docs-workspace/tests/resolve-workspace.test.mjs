/**
 * Focused fixtures for the shared workspace resolver.
 *
 * Every case runs against a temporary Git repository, a temporary registry and
 * a temporary workspace parent. No real product checkout or workspace is read
 * or written, and the assertion is deliberately about resolution behaviour
 * rather than about any particular host layout.
 */

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { DEFAULT_ROUTES, loadRegistry, registryCandidates, validateRegistry } from "../scripts/resolve-workspace.mjs";

const cli = fileURLToPath(new URL("../scripts/resolve-workspace.mjs", import.meta.url));
const shippedRegistry = fileURLToPath(new URL("../registry.json", import.meta.url));
const registryFormat = fileURLToPath(new URL("../references/registry-format.md", import.meta.url));
const resolutionDoc = fileURLToPath(new URL("../references/resolution.md", import.meta.url));

function git(cwd, ...args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  }).trim();
}

function makeRepo(root, name, remote) {
  const repo = join(root, name);
  mkdirSync(repo, { recursive: true });
  git(repo, "init", "--initial-branch=main");
  git(repo, "remote", "add", "origin", remote);
  git(
    repo,
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "--allow-empty",
    "-m",
    "Fixture",
  );
  return repo;
}

function writeRegistry(root, document, name = "registry.json") {
  const path = join(root, name);
  writeFileSync(path, `${JSON.stringify(document, null, 2)}\n`);
  return path;
}

function baseRegistry(root, projects, extra = {}) {
  return {
    schemaVersion: 1,
    plainNamesPreferred: true,
    workspaceParent: join(root, "workspaces"),
    workspaceLayout: "v1",
    projects,
    ...extra,
  };
}

/** The smallest registry document `check` accepts: one project, no routes. */
function alphaProject(root, id = "alpha") {
  return [
    {
      id,
      identity: { remotes: [`example-org/${id}`] },
      workspaceRoot: join(root, "workspaces", id, "v1"),
    },
  ];
}

function fixture(t, { remote = "https://github.com/example-org/alpha.git", projects, extra } = {}) {
  const temp = mkdtempSync(join(tmpdir(), "workspace-resolution-"));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const repo = makeRepo(temp, "checkout", remote);
  const resolvedProjects = projects ?? [
    {
      id: "alpha",
      identity: { remotes: ["example-org/alpha"] },
      workspaceRoot: join(temp, "workspaces", "alpha", "v1"),
    },
  ];
  const registryPath = writeRegistry(temp, baseRegistry(temp, resolvedProjects, extra));
  const run = (args, options = {}) =>
    spawnSync(process.execPath, [cli, ...args], {
      cwd: options.cwd ?? repo,
      encoding: "utf8",
      windowsHide: true,
      env: {
        ...process.env,
        CODEX_WORKSPACE_REGISTRY: registryPath,
        CODEX_WORKSPACE_ROOT: "",
        ...(options.env ?? {}),
      },
    });
  return { temp, repo, registryPath, run };
}

function success(result) {
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function failure(result) {
  assert.equal(result.status, 2, `expected exit 2, got ${result.status}: ${result.stdout}${result.stderr}`);
  return JSON.parse(result.stdout);
}

/** Sorted relative path listing, so a resolution can be shown not to mutate the disk. */
function snapshot(root) {
  const seen = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(dir, entry.name);
      seen.push(relative(root, path));
      if (entry.isDirectory()) walk(path);
    }
  };
  walk(root);
  return seen;
}

test("two worktrees and a nested working directory resolve the same workspace", (t) => {
  const f = fixture(t);
  const sibling = join(f.temp, "renamed-checkout");
  git(f.repo, "worktree", "add", "--detach", sibling);
  const nested = join(f.repo, "src", "deep", "nested");
  mkdirSync(nested, { recursive: true });

  const canonical = success(f.run(["resolve"]));
  const worktree = success(f.run(["resolve"], { cwd: sibling }));
  const deep = success(f.run(["resolve"], { cwd: nested }));

  assert.equal(canonical.project.id, "alpha");
  assert.equal(worktree.project.id, "alpha");
  assert.equal(deep.project.id, "alpha");
  assert.equal(worktree.workspace.root, canonical.workspace.root);
  assert.equal(deep.workspace.root, canonical.workspace.root);
  assert.notEqual(worktree.project.repoRoot, canonical.project.repoRoot);
  assert.equal(worktree.project.worktree, sibling);
  assert.equal(deep.project.cwd, nested);
  for (const result of [canonical, worktree, deep]) {
    assert.equal(result.readOnly, true);
    assert.deepEqual(Object.keys(result.routes).sort(), Object.keys(canonical.routes).sort());
  }
});

test("a different project resolves a different namespace", (t) => {
  const alpha = fixture(t, {
    remote: "https://github.com/example-org/alpha.git",
    projects: [
      { id: "alpha", identity: { remotes: ["example-org/alpha"] } },
      { id: "beta", identity: { remotes: ["example-org/beta"] } },
    ],
  });
  // workspaceParent + project id supplies the root for both projects.
  const alphaResult = success(alpha.run(["resolve"]));
  const beta = makeRepo(alpha.temp, "beta", "git@github.com:example-org/beta.git");
  const betaResult = success(alpha.run(["resolve"], { cwd: beta }));

  assert.equal(alphaResult.project.id, "alpha");
  assert.equal(betaResult.project.id, "beta");
  assert.equal(alphaResult.workspace.root, join(alpha.temp, "workspaces", "alpha", "v1"));
  assert.equal(betaResult.workspace.root, join(alpha.temp, "workspaces", "beta", "v1"));
  assert.notEqual(alphaResult.workspace.root, betaResult.workspace.root);

  const listed = success(alpha.run(["projects"]));
  assert.deepEqual(listed.projects.map((project) => project.id).sort(), ["alpha", "beta"]);
});

test("projects handles a not-used route instead of failing on it", (t) => {
  const f = fixture(t, {
    projects: [
      {
        id: "alpha",
        identity: { remotes: ["example-org/alpha"] },
        routes: { index: null, scratch: null },
      },
    ],
  });
  const listed = success(f.run(["projects"]));
  assert.equal(listed.projects[0].routes.index, null);
  assert.equal(listed.projects[0].routes.scratch, null);
  assert.ok(listed.projects[0].routes.plans.endsWith(join("v1", "plans")));
});

test("missing storage is reported and resolution never modifies the filesystem", (t) => {
  const f = fixture(t);
  const before = snapshot(f.temp);
  const result = success(f.run(["resolve"]));

  assert.equal(result.workspace.exists, false);
  assert.ok(result.warnings.some((warning) => /does not exist yet/.test(warning)));
  assert.equal(result.routes.goals.state, "missing");
  assert.equal(result.routes.goals.exists, false);
  assert.equal(existsSync(join(f.temp, "workspaces")), false, "resolution must not create the workspace parent");
  assert.deepEqual(snapshot(f.temp), before);

  const repeated = success(f.run(["resolve"]));
  assert.deepEqual(repeated.routes, result.routes);
  assert.deepEqual(snapshot(f.temp), before);
});

test("knowledge routes default to plain names and task storage to dotted names", () => {
  // A dot means Obsidian ignores the folder. Knowledge routes must stay visible
  // in a vault, so they are plain; scratch and artifacts are hidden when they
  // sit inside a workspace.
  for (const name of ["goals", "findings", "prds", "specs", "adrs", "features"]) {
    assert.equal(DEFAULT_ROUTES[name], name, `${name} defaults to its plain name`);
  }
  assert.equal(DEFAULT_ROUTES.artifacts, ".artifacts");
  assert.equal(DEFAULT_ROUTES.scratch, ".task-scratch");
});

test("plain and dotted spellings are reported without migrating either name", (t) => {
  const f = fixture(t);
  const root = join(f.temp, "workspaces", "alpha", "v1");
  mkdirSync(join(root, ".goals", "module"), { recursive: true });
  mkdirSync(join(root, "goals"), { recursive: true });
  mkdirSync(join(root, ".prds"), { recursive: true });
  const before = snapshot(f.temp);

  const result = success(f.run(["resolve"]));

  // The default name is the plain one; the populated dotted folder is reported
  // as the variant, and neither is renamed.
  assert.equal(result.routes.goals.relativePath, "goals");
  assert.equal(result.routes.goals.state, "empty");
  assert.equal(result.routes.goals.variant.relativePath, ".goals");
  assert.equal(result.routes.goals.variant.state, "populated");
  assert.ok(!result.routes.goals.warnings.some((warning) => /dotted name/.test(warning)));

  assert.equal(result.routes.findings.relativePath, "findings");
  assert.equal(result.routes.findings.state, "missing");

  // Only the dotted spelling exists: a naming split to report, not an error.
  assert.equal(result.routes.prds.relativePath, "prds");
  assert.equal(result.routes.prds.state, "missing");
  assert.equal(result.routes.prds.variant.relativePath, ".prds");
  assert.ok(result.routes.prds.warnings.some((warning) => /naming split/.test(warning)));

  assert.equal(result.routes.features.relativePath, "features");
  assert.equal(result.routes.features.state, "missing");

  // Task storage stays dotted inside a workspace when no scratch root is set,
  // and a plain-name preference does not ask for it to change.
  assert.equal(result.routes.artifacts.relativePath, ".artifacts");
  assert.equal(result.routes.artifacts.location, "workspace");
  assert.equal(result.routes.scratch.relativePath, ".task-scratch");
  for (const name of ["artifacts", "scratch"]) {
    assert.ok(!result.routes[name].warnings.some((warning) => /dotted name/.test(warning)), name);
  }

  assert.equal(result.routes.specs.state, "missing");
  assert.ok(result.routes.specs.warnings.some((warning) => /does not exist yet/.test(warning)));
  assert.equal(existsSync(join(root, "prds")), false, "no plain folder may be created");
  assert.equal(existsSync(join(root, "specs")), false, "no plain folder may be created");
  assert.deepEqual(snapshot(f.temp), before);
});

test("a configured dotted knowledge route draws the plain-name warning and is not renamed", (t) => {
  const f = fixture(t, {
    projects: [
      {
        id: "alpha",
        identity: { remotes: ["example-org/alpha"] },
        routes: { goals: ".goals", artifacts: "artifacts", scratch: "task-scratch" },
      },
    ],
  });
  const root = join(f.temp, "workspaces", "alpha", "v1");
  mkdirSync(join(root, ".goals"), { recursive: true });
  const before = snapshot(f.temp);

  const result = success(f.run(["resolve"]));
  assert.equal(result.routes.goals.relativePath, ".goals");
  assert.equal(result.routes.goals.state, "empty");
  assert.ok(result.routes.goals.warnings.some((warning) => /dotted name/.test(warning)));
  // A project that configures plain task storage keeps it; nothing is renamed.
  assert.equal(result.routes.artifacts.relativePath, "artifacts");
  assert.equal(result.routes.scratch.relativePath, "task-scratch");
  assert.deepEqual(snapshot(f.temp), before);
});

test("a host scratch root holds every project's scratch and artifacts outside its workspace", (t) => {
  const temp = mkdtempSync(join(tmpdir(), "workspace-scratch-"));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const scratchRoot = join(temp, "host", ".scratch");
  const f = fixture(t, {
    projects: [
      { id: "alpha", identity: { remotes: ["example-org/alpha"] } },
      { id: "beta", identity: { remotes: ["example-org/beta"] }, routes: { scratch: null } },
    ],
    extra: { scratchRoot },
  });
  const workspace = join(f.temp, "workspaces", "alpha", "v1");
  // A legacy in-workspace folder is reported, never moved.
  mkdirSync(join(workspace, ".artifacts", "old-task"), { recursive: true });
  const before = snapshot(f.temp);

  const result = success(f.run(["resolve"]));
  assert.equal(result.scratchRoot.path, scratchRoot);
  assert.equal(result.scratchRoot.projectPath, join(scratchRoot, "alpha"));
  assert.equal(result.scratchRoot.exists, false);
  assert.equal(result.routes.scratch.path, join(scratchRoot, "alpha", "task-scratch"));
  assert.equal(result.routes.scratch.location, "scratch-root");
  assert.equal(result.routes.artifacts.path, join(scratchRoot, "alpha", "artifacts"));
  assert.equal(result.routes.artifacts.location, "scratch-root");
  assert.equal(result.routes.artifacts.state, "missing");
  assert.ok(
    result.warnings.some((warning) => /^artifacts: .*in-workspace folder/.test(warning)),
    `expected a legacy-folder warning, got ${JSON.stringify(result.warnings)}`,
  );
  // Knowledge routes stay in the workspace.
  assert.equal(result.routes.goals.path, join(workspace, "goals"));
  assert.equal(result.routes.goals.location, "workspace");
  assert.equal(existsSync(scratchRoot), false, "resolution must not create the scratch root");
  assert.deepEqual(snapshot(f.temp), before);

  const listed = success(f.run(["projects"]));
  assert.equal(listed.scratchRoot, scratchRoot);
  const alpha = listed.projects.find((project) => project.id === "alpha");
  const beta = listed.projects.find((project) => project.id === "beta");
  assert.equal(alpha.routes.artifacts, join(scratchRoot, "alpha", "artifacts"));
  assert.equal(alpha.routes.scratch, join(scratchRoot, "alpha", "task-scratch"));
  assert.equal(beta.routes.artifacts, join(scratchRoot, "beta", "artifacts"));
  // A project that declares scratch unused keeps it unused.
  assert.equal(beta.routes.scratch, null);
});

test("without a scratch root, scratch and artifacts stay in the workspace", (t) => {
  const f = fixture(t);
  const workspace = join(f.temp, "workspaces", "alpha", "v1");
  const result = success(f.run(["resolve"]));
  assert.equal(result.scratchRoot, null);
  assert.equal(result.routes.scratch.path, join(workspace, ".task-scratch"));
  assert.equal(result.routes.artifacts.path, join(workspace, ".artifacts"));
});

test("a brain root is reported, and scratch or artifacts inside a brain are refused", (t) => {
  const f = fixture(t);
  const brain = join(f.temp, "brain");
  const inBrain = join(brain, "Workspaces", "alpha");
  mkdirSync(inBrain, { recursive: true });
  const outside = join(f.temp, "host", ".scratch");
  const project = (extra = {}) => ({
    id: "alpha",
    identity: { remotes: ["example-org/alpha"] },
    workspaceRoot: inBrain,
    brainRoot: brain,
    ...extra,
  });

  // A workspace inside the brain with no scratch root would put scratch and
  // artifacts in the brain.
  writeRegistry(f.temp, baseRegistry(f.temp, [project()]));
  const refused = f.run(["check"]);
  assert.equal(refused.status, 2);
  assert.ok(
    JSON.parse(refused.stdout).errors.some((error) => /alpha.*scratch and artifacts.*brain/.test(error)),
    refused.stdout,
  );

  // A scratch root inside the brain is refused for the same reason.
  writeRegistry(f.temp, baseRegistry(f.temp, [project()], { scratchRoot: join(brain, ".scratch") }));
  assert.equal(f.run(["check"]).status, 2);

  // A scratch root outside the brain is the supported shape.
  writeRegistry(f.temp, baseRegistry(f.temp, [project()], { scratchRoot: outside }));
  success(f.run(["check"]));
  const result = success(f.run(["resolve"]));
  assert.equal(result.brain.root, brain);
  assert.equal(result.brain.exists, true);
  assert.equal(result.brain.workspaceInside, true);
  assert.equal(result.routes.artifacts.path, join(outside, "alpha", "artifacts"));
  const listed = success(f.run(["projects"]));
  assert.equal(listed.projects[0].brainRoot, brain);

  // A workspace kept outside its brain needs no scratch root.
  writeRegistry(f.temp, baseRegistry(f.temp, [
    { id: "alpha", identity: { remotes: ["example-org/alpha"] }, brainRoot: brain },
  ]));
  const standalone = success(f.run(["resolve"]));
  assert.equal(standalone.brain.workspaceInside, false);

  // A project without a brain reports none.
  writeRegistry(f.temp, baseRegistry(f.temp, alphaProject(f.temp)));
  assert.equal(success(f.run(["resolve"])).brain, null);
  assert.equal(existsSync(outside), false, "resolution must not create the scratch root");
});

test("brain and scratch roots must be absolute", () => {
  const root = mkdtempSync(join(tmpdir(), "workspace-roots-"));
  try {
    const relativeBrain = validateRegistry(
      baseRegistry(root, [{ ...alphaProject(root)[0], brainRoot: "brain" }]),
      { env: {} },
    );
    assert.equal(relativeBrain.ok, false);
    assert.ok(relativeBrain.errors.some((error) => /alpha\.brainRoot/.test(error)));

    const relativeScratch = validateRegistry(baseRegistry(root, alphaProject(root), { scratchRoot: ".scratch" }), {
      env: {},
    });
    assert.equal(relativeScratch.ok, false);
    assert.ok(relativeScratch.errors.some((error) => /scratchRoot/.test(error)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the shipped registry needs no writer and prefers plain knowledge route names", () => {
  const text = readFileSync(shippedRegistry, "utf8");
  const document = JSON.parse(text);
  const validation = validateRegistry(document, { env: process.env });
  assert.equal(validation.ok, true, validation.errors.join("; "));

  // Plain names are the convention for knowledge routes. A dotted name a
  // project still configures is reported with the plain-name warning until its
  // folder is renamed; resolution never renames it.
  assert.equal(document.plainNamesPreferred, true, "plain-name preference must be on");

  for (const project of validation.projects) {
    assert.equal(project.writer, null, `${project.id} still names a writer`);
  }

  // The primary project is registered first.
  const create = validation.projects[0];
  assert.ok(create, "the shipped registry must still register the primary project");
  // The configured goals spelling follows the folder on disk; the rename to
  // the plain name is a separate, owned migration.
  assert.match(create.routes.goals, /^\.?goals$/);
  assert.equal(create.routes.findings, "findings");
  assert.equal(create.routes.features, "features");
  for (const retired of ["objects", "index"]) {
    assert.ok(create.notUsedRoutes.includes(retired), `${retired} is retired as a default route`);
  }

  // The retired prerequisite is gone from the shipped data, not merely unused.
  assert.doesNotMatch(text, /local_workspace\.py/);
  assert.doesNotMatch(text, /registry\.sqlite/);
  assert.doesNotMatch(text, /\w+TaskScratch/);
});

test("a conflicting override fails explicitly without inventing a second tree", (t) => {
  const f = fixture(t);
  const elsewhere = join(f.temp, "elsewhere");
  const registered = join(f.temp, "workspaces", "alpha", "v1");

  const conflict = failure(f.run(["resolve"], { env: { CODEX_WORKSPACE_ROOT: elsewhere } }));
  assert.equal(conflict.error.code, "conflicting-override");
  assert.equal(conflict.error.details.registered, registered);
  assert.equal(existsSync(elsewhere), false);
  assert.equal(existsSync(join(f.temp, "workspaces")), false);

  const matched = success(f.run(["resolve"], { env: { CODEX_WORKSPACE_ROOT: registered } }));
  assert.equal(matched.workspace.override.matched, true);
  assert.equal(matched.workspace.root, registered);

  const explicit = failure(f.run(["--workspace-root", elsewhere, "resolve"]));
  assert.equal(explicit.error.code, "conflicting-override");
  assert.equal(existsSync(elsewhere), false);
});

test("a project can declare a convention route unused, but not a required one", (t) => {
  const f = fixture(t, {
    projects: [
      {
        id: "alpha",
        identity: { remotes: ["example-org/alpha"] },
        routes: { index: null, scratch: null },
      },
    ],
  });

  const result = success(f.run(["resolve"]));
  for (const name of ["index", "scratch"]) {
    assert.equal(result.routes[name].state, "not-used");
    assert.equal(result.routes[name].path, null);
    assert.equal(result.routes[name].exists, false);
  }
  assert.equal(result.routes.goals.state, "missing");

  writeRegistry(f.temp, baseRegistry(f.temp, [
    { id: "alpha", identity: { remotes: ["example-org/alpha"] }, routes: { goals: null } },
  ]));
  const invalid = f.run(["check"]);
  assert.equal(invalid.status, 2);
  assert.ok(JSON.parse(invalid.stdout).errors.some((error) => /no route for goals/.test(error)));
});

test("an unregistered repository and a missing registry both fail explicitly", (t) => {
  const f = fixture(t);
  git(f.repo, "remote", "set-url", "origin", "https://github.com/example-org/unregistered.git");
  const unregistered = failure(f.run(["resolve"]));
  assert.equal(unregistered.error.code, "unregistered-identity");
  assert.deepEqual(unregistered.error.details.registeredRemotes, ["example-org/alpha"]);

  const missing = f.run(["resolve", "--registry", join(f.temp, "absent.json")]);
  assert.equal(missing.status, 2);
  assert.equal(JSON.parse(missing.stdout).error.code, "registry-not-found");

  assert.equal(existsSync(join(f.temp, "workspaces")), false);
});

test("an unresolvable workspace root is a configuration failure, not a substitute", (t) => {
  if (process.platform !== "win32") {
    t.skip("the fixture drives a Windows drive letter that cannot be resolved");
    return;
  }
  const free = ["Q", "Z", "Y", "X", "W"].find((letter) => !existsSync(`${letter}:\\`));
  if (!free) {
    t.skip("no spare drive letter on this host");
    return;
  }
  const f = fixture(t, {
    projects: [
      {
        id: "alpha",
        identity: { remotes: ["example-org/alpha"] },
        workspaceRoot: `${free}:\\not-a-real-drive\\alpha\\v1`,
      },
    ],
  });

  const resolved = failure(f.run(["resolve"]));
  assert.equal(resolved.error.code, "workspace-unresolvable");
  assert.match(resolved.error.message, /alpha/);

  const listed = success(f.run(["projects"]));
  assert.equal(listed.projects[0].state, "unresolvable");
  assert.equal(listed.projects[0].exists, false);
});

test("a workspace inside a repository worktree is refused", (t) => {
  const f = fixture(t);
  const sibling = join(f.temp, "sibling");
  git(f.repo, "worktree", "add", "--detach", sibling);
  writeFileSync(join(sibling, ".gitignore"), "workspace/\n");
  writeRegistry(f.temp, baseRegistry(f.temp, [
    {
      id: "alpha",
      identity: { remotes: ["example-org/alpha"] },
      workspaceRoot: join(sibling, "workspace"),
    },
  ]));

  const result = failure(f.run(["resolve"]));
  assert.equal(result.error.code, "workspace-inside-worktree");
  assert.equal(existsSync(join(sibling, "workspace")), false);
});

test("an ignored registered workspace inside the canonical checkout resolves from every worktree", (t) => {
  const f = fixture(t);
  const sibling = join(f.temp, "sibling");
  git(f.repo, "worktree", "add", "--detach", sibling);
  writeFileSync(join(f.repo, ".gitignore"), ".local/\n");
  const root = join(f.repo, ".local", "workspace");
  writeRegistry(f.temp, baseRegistry(f.temp, [
    { id: "alpha", identity: { remotes: ["example-org/alpha"] }, workspaceRoot: root },
  ]));

  const missing = success(f.run(["resolve"]));
  const fromSibling = success(f.run(["resolve"], { cwd: sibling }));
  for (const result of [missing, fromSibling]) {
    assert.equal(result.workspace.root, root);
    assert.equal(result.workspace.exists, false);
    assert.equal(result.workspace.placement, "ignored-in-canonical-checkout");
  }
  assert.equal(existsSync(root), false, "resolution does not create an absent registered root");

  mkdirSync(root, { recursive: true });
  const existing = success(f.run(["resolve"], { cwd: sibling }));
  assert.equal(existing.workspace.root, root);
  assert.equal(existing.workspace.exists, true);
  assert.equal(existing.workspace.placement, "ignored-in-canonical-checkout");
});

test("an unignored registered workspace inside the canonical checkout is refused", (t) => {
  const f = fixture(t);
  const root = join(f.repo, "workspace");
  writeRegistry(f.temp, baseRegistry(f.temp, [
    { id: "alpha", identity: { remotes: ["example-org/alpha"] }, workspaceRoot: root },
  ]));
  const result = failure(f.run(["resolve"]));
  assert.equal(result.error.code, "workspace-inside-worktree");
  assert.equal(existsSync(root), false);
});

test("a workspace equal to or containing the canonical checkout is refused", (t) => {
  const f = fixture(t);
  for (const root of [f.repo, f.temp]) {
    writeRegistry(f.temp, baseRegistry(f.temp, [
      { id: "alpha", identity: { remotes: ["example-org/alpha"] }, workspaceRoot: root },
    ]));
    assert.equal(failure(f.run(["resolve"])).error.code, "workspace-inside-worktree");
  }
});

test("one remote can map to several project roots by configuration", (t) => {
  const f = fixture(t, {
    remote: "https://github.com/example-org/monorepo.git",
    projects: [{ id: "placeholder", identity: { remotes: ["example-org/placeholder"] } }],
  });
  const alphaRoot = join(f.temp, "packages-alpha");
  const betaRoot = join(f.temp, "packages-beta");
  writeRegistry(f.temp, baseRegistry(f.temp, [
    {
      id: "alpha",
      identity: { remotes: ["example-org/monorepo"], root: "packages/alpha" },
      workspaceRoot: alphaRoot,
    },
    {
      id: "beta",
      identity: { remotes: ["example-org/monorepo"], root: "packages/beta" },
      workspaceRoot: betaRoot,
    },
  ]));
  const alphaDir = join(f.repo, "packages", "alpha", "src");
  const betaDir = join(f.repo, "packages", "beta");
  mkdirSync(alphaDir, { recursive: true });
  mkdirSync(betaDir, { recursive: true });

  assert.equal(success(f.run(["resolve"], { cwd: alphaDir })).project.id, "alpha");
  assert.equal(success(f.run(["resolve"], { cwd: betaDir })).project.id, "beta");
  const root = failure(f.run(["resolve"], { cwd: f.repo }));
  assert.equal(root.error.code, "outside-project-root");
  assert.deepEqual(
    root.error.details.candidates.map((candidate) => candidate.project).sort(),
    ["alpha", "beta"],
  );
});

test("registry check reports duplicate identities and roots without needing them to exist", (t) => {
  const f = fixture(t);
  const shared = join(f.temp, "shared-root");
  writeRegistry(f.temp, baseRegistry(f.temp, [
    { id: "alpha", identity: { remotes: ["example-org/shared"] }, workspaceRoot: shared },
    { id: "beta", identity: { remotes: ["example-org/shared"] }, workspaceRoot: shared },
  ]));

  const result = f.run(["check"]);
  assert.equal(result.status, 2);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.ok(payload.errors.some((error) => /claimed by alpha, beta/.test(error)));
  assert.equal(existsSync(shared), false, "a structural check must not create anything");

  const badId = writeRegistry(
    f.temp,
    { schemaVersion: 1, projects: [{ id: "Beta", identity: { remotes: ["nope"] } }] },
    "bad-id.json",
  );
  const badIdResult = f.run(["check", "--registry", badId]);
  assert.equal(badIdResult.status, 2);
  assert.ok(JSON.parse(badIdResult.stdout).errors.some((error) => /\.id must be/.test(error)));

  const emptyProjects = writeRegistry(f.temp, { schemaVersion: 1, projects: [] }, "empty.json");
  const malformedResult = f.run(["check", "--registry", emptyProjects]);
  assert.equal(malformedResult.status, 2);
  assert.ok(JSON.parse(malformedResult.stdout).errors.some((error) => /non-empty array/.test(error)));

  const escaping = writeRegistry(
    f.temp,
    baseRegistry(f.temp, [
      {
        id: "alpha",
        identity: { remotes: ["example-org/alpha"] },
        routes: { goals: "../escape-goals" },
      },
    ]),
    "escaping.json",
  );
  const escapingResult = f.run(["check", "--registry", escaping]);
  assert.equal(escapingResult.status, 2);
  assert.ok(JSON.parse(escapingResult.stdout).errors.some((error) => /must not escape/.test(error)));
});

test("the shared resolver embeds no host drive path", () => {
  const source = readFileSync(cli, "utf8");
  assert.doesNotMatch(source, /\b[A-Za-z]:[\\/]/);
  const registry = JSON.parse(readFileSync(shippedRegistry, "utf8"));
  assert.equal(registry.schemaVersion, 1);
  assert.ok(registry.projects.length >= 1);
});

test("the shipped host registry passes validation", () => {
  const result = spawnSync(process.execPath, [cli, "check", "--registry", shippedRegistry], {
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.registry.source, "explicit");
  for (const project of payload.projects) {
    // A standalone workspace root carries "workspace"; a brain's sits at Workspaces/<repo>.
    assert.match(project.workspaceRoot, /workspace/i, project.workspaceRoot);
  }
});

test("every command works against the shipped host registry", () => {
  for (const command of ["check", "projects"]) {
    const result = spawnSync(process.execPath, [cli, command, "--registry", shippedRegistry], {
      encoding: "utf8",
      windowsHide: true,
    });
    assert.equal(result.status, 0, `${command}: ${result.stderr || result.stdout}`);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok ?? true, true, command);
    assert.equal(
      payload.projects.length,
      JSON.parse(readFileSync(shippedRegistry, "utf8")).projects.length,
      command,
    );
    for (const project of payload.projects) {
      for (const [name, path] of Object.entries(project.routes ?? {})) {
        assert.ok(path === null || typeof path === "string", `${project.id}.${name}`);
      }
    }
  }
});

test("the registry discovery chain prefers explicit, then environment, then CODEX_HOME", (t) => {
  const temp = mkdtempSync(join(tmpdir(), "workspace-resolution-"));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const projects = alphaProject(temp);
  const explicit = writeRegistry(temp, baseRegistry(temp, projects), "explicit.json");
  const environment = writeRegistry(temp, baseRegistry(temp, projects), "environment.json");
  const home = join(temp, "codex-home");
  mkdirSync(home, { recursive: true });
  const homeRegistry = writeRegistry(home, baseRegistry(temp, projects), "workspace-registry.json");

  const both = { CODEX_HOME: home, CODEX_WORKSPACE_REGISTRY: environment };
  assert.deepEqual(
    registryCandidates({ registryPath: explicit, env: both }).map((candidate) => candidate.source),
    ["explicit", "environment", "codex-home", "shipped-with-skill", "factory-config"],
  );

  assert.equal(loadRegistry({ registryPath: explicit, env: both }).path, explicit);
  assert.equal(loadRegistry({ env: both }).path, environment);
  assert.deepEqual(
    { path: loadRegistry({ env: { CODEX_HOME: home } }).path, source: loadRegistry({ env: { CODEX_HOME: home } }).source },
    { path: homeRegistry, source: "codex-home" },
  );

  // An explicit path or a set environment variable is an instruction, not a hint:
  // an unreadable one fails rather than resolving against a different registry.
  for (const options of [
    { registryPath: join(temp, "absent.json"), env: both },
    { env: { CODEX_HOME: home, CODEX_WORKSPACE_REGISTRY: join(temp, "absent.json") } },
  ]) {
    assert.throws(
      () => loadRegistry(options),
      (error) => error.code === "registry-not-found" && /absent\.json/.test(error.message),
    );
  }

  // A directory where the CODEX_HOME registry is expected is skipped, not fatal.
  rmSync(homeRegistry, { force: true });
  mkdirSync(homeRegistry, { recursive: true });
  assert.equal(loadRegistry({ env: { CODEX_HOME: home } }).source, "shipped-with-skill");
  assert.equal(existsSync(join(temp, "workspaces")), false);
});

test("a relocated resolver falls back to the skill registry, then the factory config", (t) => {
  const temp = mkdtempSync(join(tmpdir(), "workspace-resolution-"));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const root = join(temp, "factory");
  const skill = join(root, "skills", "docs-workspace");
  mkdirSync(join(skill, "scripts"), { recursive: true });
  const relocated = join(skill, "scripts", "resolve-workspace.mjs");
  copyFileSync(cli, relocated);

  const home = join(temp, "codex-home");
  mkdirSync(home, { recursive: true });
  const env = { ...process.env, CODEX_HOME: home };
  delete env.CODEX_WORKSPACE_REGISTRY;
  const run = () => spawnSync(process.execPath, [relocated, "check"], { encoding: "utf8", windowsHide: true, env });
  const sourceOf = (result) => {
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return JSON.parse(result.stdout).registry.source;
  };

  const nothing = run();
  assert.equal(nothing.status, 2);
  const payload = JSON.parse(nothing.stdout);
  assert.equal(payload.error.code, "registry-not-found");
  assert.deepEqual(
    payload.error.details.searched.map((entry) => entry.slice(0, entry.indexOf(":"))),
    ["codex-home", "shipped-with-skill", "factory-config"],
  );

  mkdirSync(join(root, "config"), { recursive: true });
  writeRegistry(join(root, "config"), baseRegistry(temp, alphaProject(temp)), "workspace-registry.json");
  assert.equal(sourceOf(run()), "factory-config");

  writeRegistry(skill, baseRegistry(temp, alphaProject(temp)), "registry.json");
  assert.equal(sourceOf(run()), "shipped-with-skill");

  writeRegistry(home, baseRegistry(temp, alphaProject(temp)), "workspace-registry.json");
  assert.equal(sourceOf(run()), "codex-home");
});

test("a route below an existing file is unreadable rather than missing", (t) => {
  const f = fixture(t);
  const root = join(f.temp, "workspaces", "alpha", "v1");
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, "not-a-directory.txt"), "preserve this file\n");
  writeRegistry(
    f.temp,
    baseRegistry(f.temp, [{
      id: "alpha",
      identity: { remotes: ["example-org/alpha"] },
      workspaceRoot: root,
      routes: {
        specs: "not-a-directory.txt/nested/specs",
        findings: "not-a-directory.txt",
        goals: "absent/nested/goals",
        reviews: null,
      },
    }]),
  );
  const before = snapshot(f.temp);

  const resolved = success(f.run(["resolve"]));

  assert.equal(resolved.routes.specs.state, "unreadable");
  assert.ok(resolved.routes.specs.warnings.some((warning) => warning.startsWith("cannot enumerate: ")));
  assert.ok(resolved.routes.specs.warnings.every((warning) => !warning.includes("does not exist yet")));
  assert.equal(resolved.routes.findings.state, "file");
  assert.equal(resolved.routes.goals.state, "missing");
  assert.equal(resolved.routes.reviews.state, "not-used");
  assert.deepEqual(snapshot(f.temp), before);
  assert.equal(readFileSync(join(root, "not-a-directory.txt"), "utf8"), "preserve this file\n");
});

test("missing routes below a searchable but unlistable directory remain missing", (t) => {
  if (process.platform === "win32" || process.getuid?.() === 0) {
    t.skip("requires POSIX directory permissions for a non-root user");
    return;
  }
  const f = fixture(t);
  const root = join(f.temp, "workspaces", "alpha", "v1");
  const searchable = join(root, "searchable");
  const unsearchable = join(root, "unsearchable");
  mkdirSync(searchable, { recursive: true });
  mkdirSync(unsearchable);
  symlinkSync(searchable, join(root, "searchable-link"), "dir");
  writeRegistry(
    f.temp,
    baseRegistry(f.temp, [{
      id: "alpha",
      identity: { remotes: ["example-org/alpha"] },
      workspaceRoot: root,
      routes: {
        goals: "searchable/goals",
        findings: "searchable/absent/nested/findings",
        specs: "searchable-link/absent/nested/specs",
        prds: "searchable",
        adrs: "searchable-link",
        features: "unsearchable/child",
        plans: "unsearchable",
      },
    }]),
  );
  chmodSync(searchable, 0o300);
  chmodSync(unsearchable, 0o200);
  try {
    assert.throws(() => readdirSync(searchable), (error) => error.code === "EACCES");
    const resolved = success(f.run(["resolve"]));

    for (const name of ["goals", "findings", "specs"]) {
      const route = resolved.routes[name];
      assert.equal(route.exists, false, name);
      assert.equal(route.state, "missing", name);
      assert.equal(route.type, "missing", name);
      assert.ok(route.warnings.some((warning) => warning.includes("does not exist yet")), name);
      assert.equal(existsSync(route.path), false, "resolution creates no missing route");
    }
    for (const name of ["prds", "adrs", "features", "plans"]) {
      assert.equal(resolved.routes[name].state, "unreadable", name);
      assert.ok(resolved.routes[name].warnings.some((warning) => warning.startsWith("cannot enumerate: ")), name);
    }
    assert.equal(resolved.routes.prds.type, "dir");
    assert.equal(resolved.routes.adrs.type, "link");
    mkdirSync(resolved.routes.goals.path);
    assert.equal(existsSync(resolved.routes.goals.path), true, "the absent child can be created without listing its parent");
  } finally {
    chmodSync(searchable, 0o700);
    chmodSync(unsearchable, 0o700);
  }
});

test("a link to a file and a broken link report unreadable, not populated", (t) => {
  const temp = mkdtempSync(join(tmpdir(), "workspace-resolution-"));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const repo = makeRepo(temp, "checkout", "https://github.com/example-org/alpha.git");
  const root = join(temp, "workspaces", "alpha", "v1");
  mkdirSync(root, { recursive: true });
  const notADirectory = join(temp, "not-a-directory.txt");
  writeFileSync(notADirectory, "not a folder\n");

  let linkable = true;
  try {
    symlinkSync(notADirectory, join(root, "specs"), "file");
    symlinkSync(join(temp, "absent-target"), join(root, "prds"), "file");
  } catch {
    linkable = false;
  }
  if (!linkable) {
    t.skip("this host cannot create the link fixtures");
    return;
  }

  const registryPath = writeRegistry(
    temp,
    baseRegistry(temp, [
      {
        id: "alpha",
        identity: { remotes: ["example-org/alpha"] },
        workspaceRoot: root,
        routes: { specs: "specs", prds: "prds", goals: "goals" },
      },
    ]),
  );
  const result = spawnSync(process.execPath, [cli, "resolve"], {
    cwd: repo,
    encoding: "utf8",
    windowsHide: true,
    env: { ...process.env, CODEX_WORKSPACE_REGISTRY: registryPath, CODEX_WORKSPACE_ROOT: "" },
  });

  const resolved = success(result);
  assert.equal(resolved.routes.specs.type, "link");
  assert.equal(resolved.routes.specs.state, "unreadable");
  assert.equal(resolved.routes.prds.state, "unreadable");
  assert.equal(resolved.routes.goals.state, "missing");
  assert.ok(
    resolved.warnings.some((warning) => /^specs: cannot enumerate: /.test(warning)),
    `expected an enumeration warning, got ${JSON.stringify(resolved.warnings)}`,
  );
});

/** A project entry whose only extra root is a configured design root. */
function designProject(design, id = "alpha", remote = `example-org/${id}`) {
  return {
    id,
    identity: { remotes: [remote] },
    designRoots: [{ id: "design-assets", path: design, scope: "shared" }],
  };
}

test("two projects sharing one design root resolve distinct asset namespaces", (t) => {
  const f = fixture(t);
  const design = join(f.temp, "design-assets");
  writeRegistry(
    f.temp,
    baseRegistry(f.temp, [
      designProject(design, "alpha"),
      designProject(design, "beta"),
    ]),
  );
  const beta = makeRepo(f.temp, "beta", "git@github.com:example-org/beta.git");

  const alpha = success(f.run(["assets"]));
  const other = success(f.run(["assets"], { cwd: beta }));

  assert.equal(alpha.project.namespace, "alpha");
  assert.equal(other.project.namespace, "beta");
  assert.equal(alpha.designRoot.path, design);
  assert.equal(other.designRoot.path, design);
  // Configured but not created: available, present as a finding, never made here.
  assert.equal(alpha.designRoot.exists, false);
  assert.equal(alpha.designRoot.state, "missing");
  assert.ok(alpha.warnings.some((warning) => /design root does not exist yet/.test(warning)));
  assert.equal(alpha.routes.source.state, "missing");
  for (const kind of ["source", "working", "export"]) {
    assert.equal(alpha.routes[kind].relativePath, `alpha/${kind}`);
    assert.equal(other.routes[kind].relativePath, `beta/${kind}`);
    assert.notEqual(alpha.routes[kind].path, other.routes[kind].path);
  }
  assert.notEqual(alpha.routes.source.path, alpha.routes.working.path);
  assert.notEqual(alpha.routes.working.path, alpha.routes.export.path);
  assert.equal(existsSync(design), false, "resolution must not create the design root or a namespace");
});

test("the assets route is read-only and keeps originals, working files and exports apart", (t) => {
  const f = fixture(t);
  const design = join(f.temp, "design-assets");
  writeRegistry(f.temp, baseRegistry(f.temp, [designProject(design)]));
  mkdirSync(join(design, "alpha", "source"), { recursive: true });
  mkdirSync(join(design, "alpha", "working"), { recursive: true });
  writeFileSync(join(design, "alpha", "source", "hero.png"), "original\n");
  writeFileSync(join(design, "alpha", "working", "hero-cropped.png"), "derivative\n");
  const before = snapshot(f.temp);

  const routes = success(f.run(["assets"]));
  assert.equal(routes.routes.source.path, join(design, "alpha", "source"));
  assert.equal(routes.routes.source.state, "populated");
  assert.equal(routes.routes.working.state, "populated");
  assert.equal(routes.routes.export.exists, false);
  assert.equal(routes.routes.export.state, "missing");
  assert.equal(routes.designRoot.namespace.exists, true);
  assert.equal(routes.designRoot.state, "populated");

  const nested = success(f.run(["assets", "--task", "2026-09-20-hero", "--asset", "hero-cropped.png"]));
  assert.equal(
    nested.routes.working.target.path,
    join(design, "alpha", "working", "2026-09-20-hero", "hero-cropped.png"),
  );
  assert.equal(nested.routes.working.target.relativePath, "alpha/working/2026-09-20-hero/hero-cropped.png");
  assert.equal(nested.routes.working.target.exists, false);

  assert.deepEqual(snapshot(f.temp), before, "resolution must leave the design fixture unchanged");
});

test("a traversing or absolute task or asset component is refused", (t) => {
  const f = fixture(t);
  const design = join(f.temp, "design-assets");
  writeRegistry(f.temp, baseRegistry(f.temp, [designProject(design)]));

  const refused = [
    ["--task", ".."],
    ["--task", "a/../../b"],
    ["--asset", "../../escape.png"],
    ["--asset", "C:\\absolute.png"],
    ["--asset", ""],
  ];
  for (const args of refused) {
    const result = f.run(["assets", ...args]);
    assert.equal(result.status, 2, `expected ${JSON.stringify(args)} to be refused: ${result.stdout}`);
    assert.equal(JSON.parse(result.stdout).error.code, "asset-component-invalid");
  }
  assert.equal(existsSync(design), false, "a refused request must not create anything");

  const accepted = success(f.run(["assets", "--asset", "renders/hero.png"]));
  assert.equal(accepted.routes.source.target.path, join(design, "alpha", "source", "renders", "hero.png"));
});

test("a link that leaves the project design namespace is refused", (t) => {
  const f = fixture(t);
  const design = join(f.temp, "design-assets");
  const outside = join(f.temp, "outside");
  mkdirSync(outside, { recursive: true });
  mkdirSync(join(design, "alpha"), { recursive: true });

  let linkable = true;
  try {
    // A junction needs no elevation on Windows; "dir" is the POSIX spelling.
    symlinkSync(outside, join(design, "alpha", "source"), "junction");
  } catch {
    try {
      symlinkSync(outside, join(design, "alpha", "source"), "dir");
    } catch {
      linkable = false;
    }
  }
  if (!linkable) {
    t.skip("this host cannot create the link fixture");
    return;
  }
  writeRegistry(f.temp, baseRegistry(f.temp, [designProject(design)]));

  const result = f.run(["assets"]);
  assert.equal(result.status, 2, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.error.code, "asset-namespace-escape");
  assert.deepEqual(readdirSync(outside), [], "the namespace must not be followed and populated");
});

test("a missing leaf under an escaping junction is still refused", (t) => {
  const f = fixture(t);
  const design = join(f.temp, "design-assets");
  const outside = join(f.temp, "outside");
  const source = join(design, "alpha", "source");
  mkdirSync(join(outside, "renders"), { recursive: true });
  mkdirSync(source, { recursive: true });

  let linkable = true;
  try {
    symlinkSync(join(outside, "renders"), join(source, "renders"), "junction");
  } catch {
    try {
      symlinkSync(join(outside, "renders"), join(source, "renders"), "dir");
    } catch {
      linkable = false;
    }
  }
  if (!linkable) {
    t.skip("this host cannot create the link fixture");
    return;
  }
  writeRegistry(f.temp, baseRegistry(f.temp, [designProject(design)]));

  // The route itself sits inside the namespace, so reporting it alone still works.
  const plain = success(f.run(["assets"]));
  assert.equal(plain.routes.source.state, "populated");

  // The leaf does not exist, but the existing prefix of the requested path
  // leaves the namespace, so the target is refused rather than reported.
  const escaped = f.run(["assets", "--task", "renders", "--asset", "leaf.png"]);
  assert.equal(escaped.status, 2, escaped.stderr || escaped.stdout);
  assert.equal(JSON.parse(escaped.stdout).error.code, "asset-namespace-escape");

  // A path that is merely missing is not an escape: it stays a normal target.
  const ordinary = success(f.run(["assets", "--task", "2026-09-20-hero", "--asset", "renders/hero.svg"]));
  assert.equal(ordinary.routes.source.target.exists, false);
  assert.equal(ordinary.routes.source.target.state, "missing");
  assert.equal(ordinary.routes.source.target.relativePath, "alpha/source/2026-09-20-hero/renders/hero.svg");
  assert.deepEqual(readdirSync(join(outside, "renders")), [], "the namespace must not be followed and populated");
});

test("a project with no configured design root reports the capability absent", (t) => {
  const f = fixture(t);
  const result = success(f.run(["assets"]));

  assert.equal(result.designRoot, null);
  for (const kind of ["source", "working", "export"]) {
    assert.equal(result.routes[kind].available, false);
    assert.equal(result.routes[kind].path, null);
    assert.equal(result.routes[kind].state, "unconfigured");
  }
  assert.ok(
    result.warnings.some((warning) => /no configured design root/.test(warning)),
    `expected a capability-absent warning, got ${JSON.stringify(result.warnings)}`,
  );
});

test("shared roots reach every project and are refused when relative", (t) => {
  const temp = mkdtempSync(join(tmpdir(), "workspace-shared-"));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const library = join(temp, "library");
  mkdirSync(library, { recursive: true });
  writeFileSync(join(library, "README.md"), "library\n");
  const f = fixture(t, {
    extra: { sharedRoots: [{ id: "design-library", path: library, note: "cross-project resources" }] },
  });

  const resolved = success(f.run(["resolve"]));
  assert.deepEqual(
    resolved.optionalRoots.shared.map((root) => [root.id, root.scope, root.state]),
    [["design-library", "shared", "populated"]],
  );
  // `projects` needs no registered checkout, so an unregistered repository can still find the root.
  const listed = success(f.run(["projects"], { cwd: temp }));
  assert.equal(listed.sharedRoots[0].path, library);

  const relativeRoot = baseRegistry(temp, alphaProject(temp), {
    sharedRoots: [{ id: "design-library", path: "library" }],
  });
  const validation = validateRegistry(relativeRoot, { env: {} });
  assert.equal(validation.ok, false);
  assert.ok(validation.errors.some((error) => /sharedRoots\.design-library\.path/.test(error)));
});

test("every worktree of one project resolves the same asset routes", (t) => {
  const f = fixture(t);
  const design = join(f.temp, "design-assets");
  writeRegistry(f.temp, baseRegistry(f.temp, [designProject(design)]));
  mkdirSync(join(design, "alpha", "working", "task-one"), { recursive: true });
  const sibling = join(f.temp, "renamed-checkout");
  git(f.repo, "worktree", "add", "--detach", sibling);

  const canonical = success(f.run(["assets", "--task", "task-one", "--asset", "out.png"]));
  const worktree = success(f.run(["assets", "--task", "task-one", "--asset", "out.png"], { cwd: sibling }));

  assert.equal(worktree.project.id, "alpha");
  assert.equal(worktree.project.namespace, canonical.project.namespace);
  assert.deepEqual(worktree.routes, canonical.routes);
  assert.equal(worktree.routes.working.target.exists, false);
  assert.equal(existsSync(join(design, "alpha", "working", "task-one", "out.png")), false);
});

test("the design-asset provenance template names what a record needs", () => {
  // The starter is the one home for recipes; the skill ships no template copy.
  const template = readFileSync(
    fileURLToPath(new URL("../../../harness-docs-starter/templates/asset-provenance.md", import.meta.url)),
    "utf8",
  );
  assert.equal(template.split("\n").filter((line) => /^# /.test(line)).length, 1, "exactly one H1 title");
  for (const field of [
    "Project",
    "Source or reference",
    "Original or derivative",
    "Parent input",
    "Author or generator",
    "Licence or permission",
    "Intended export or use",
  ]) {
    assert.ok(template.includes(field), `the template must ask for ${field}`);
  }
  assert.match(template, /<[^>]+>/, "the template carries placeholders to fill in");
  assert.doesNotMatch(template, /\b[A-Za-z]:[\\/]/, "the template embeds no host drive path or project-specific root");
});

test("every state and error code the resolver can report is documented", () => {
  const source = readFileSync(cli, "utf8");
  const doc = readFileSync(registryFormat, "utf8");
  const router = readFileSync(resolutionDoc, "utf8");

  const stateOf = source.slice(source.indexOf("function stateOf"), source.indexOf("function variantName"));
  assert.notEqual(stateOf, "", "stateOf was not found in the resolver");
  // `stateOf` is the shared decision for routes, project roots and optional
  // roots, so its literals are the state vocabulary.
  const states = new Set([...stateOf.matchAll(/"([a-z][a-z-]*)"/g)].map((match) => match[1]));
  for (const line of source.split("\n")) {
    if (!/\bstate:/.test(line)) continue;
    for (const match of line.matchAll(/"([a-z][a-z-]*)"/g)) states.add(match[1]);
  }

  assert.deepEqual(
    [...states].sort(),
    ["empty", "file", "missing", "not-used", "populated", "unconfigured", "unreadable", "unresolvable"],
  );
  // A vocabulary word is documented when it appears as `word` or as "word".
  const appears = (text, token) => text.includes(`\`${token}\``) || text.includes(`"${token}"`);
  const documented = (token) => appears(doc, token);
  for (const state of states) {
    assert.ok(documented(state), `state ${state} is not documented in registry-format.md`);
  }
  // The skill router is what an agent reads first, so the state it names must
  // stay a subset of the real vocabulary rather than drifting stale.
  const routerStates = [...router.matchAll(/`([a-z][a-z-]*)`/g)].map((match) => match[1]);
  const known = new Set([...states, "not-used", "unconfigured", "unresolvable"]);
  const routerVocabulary = new Set(
    routerStates.filter((token) => known.has(token) || ["dir", "link", "file"].includes(token)),
  );
  for (const state of routerVocabulary) {
    assert.ok(states.has(state) || state === "dir" || state === "link", `SKILL.md names unknown state ${state}`);
  }
  for (const state of states) {
    assert.ok(appears(router, state), `state ${state} is missing from the resolution reference`);
  }

  const codes = new Set([...source.matchAll(/new ResolutionError\(\s*"([a-z][a-z-]*)"/g)].map((match) => match[1]));
  assert.equal(codes.size, 13, "the emitted error-code list changed");
  for (const code of codes) {
    assert.ok(documented(code), `error code ${code} is not documented in registry-format.md`);
  }
});
