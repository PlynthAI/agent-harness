// Structural checks for the project templates under templates/.
//
// Checks only what a machine can decide: every template carries the files the
// shared contract requires, the fixed script names, the project-name and
// workspace placeholders where the copier expects them, a committed lockfile
// and the Node pin; the check-only commit hook, knip in `check`, axe in the E2E
// specs and the agent-state ignores; no agent-runtime layer, which `harness
// adopt` adds (D1); no text file embeds a machine path, a profile path or the
// product name; and the copier creates a clean project with the placeholders
// replaced, installed or generated folders left behind and, when asked, a
// seeded workspace with its registry entry printed.
//
// The design seam: each template carries the applied design library profile in
// one design folder (tokens.css, type.css, role-bridge.css, fonts.css and
// SOURCE.json), and the copier's --design applies another in-repo profile from
// a library. Those paths are proved against a tiny fixture library built in a
// temp folder. Two tests need the real design library and skip, saying why,
// when it does not resolve (DESIGN_LIBRARY_ROOT, else the docs-workspace
// registry's design-library shared root): the drift check that the bundled
// design is the library's Kit byte for byte, and that copying with no --design
// equals copying with --design kit.
//
// Whether a template installs, builds and drives in a browser is proved by
// each template's own docs/VERIFICATION.md qualification run, not here: this
// suite installs nothing and starts nothing.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, unlinkSync, writeFileSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templatesDir = path.join(root, "templates");
const copier = path.join(templatesDir, "new-project.mjs");

const GENERATED = new Set(["node_modules", ".cache", ".next", ".astro", "dist", "out", "playwright-report", "test-results"]);
// The shared contract's fixed file set: project docs, the tool configuration
// every copy relies on, the runner, the lockfile, the pins and the workflow.
const REQUIRED_FILES = [
  "package.json",
  "pnpm-lock.yaml",
  ".node-version",
  ".npmrc",
  ".gitignore",
  ".gitattributes",
  ".editorconfig",
  ".prettierrc",
  ".prettierignore",
  "components.json",
  "portless.json",
  "README.md",
  "AGENTS.md",
  "PROJECT.md",
  "ARCHITECTURE.md",
  "CODING_STANDARDS.md",
  "DESIGN.md",
  "docs/VERIFICATION.md",
  "scripts/dev.mjs",
  "playwright.config.ts",
  ".github/workflows/check.yml",
  ".husky/pre-commit",
  "lint-staged.config.mjs",
  "knip.json",
];
const REQUIRED_SCRIPTS = [
  "dev", "dev:up", "dev:status", "dev:stop", "build", "start", "lint", "typecheck",
  "format", "format:check", "test:unit", "test:e2e", "browser:setup", "design:lint", "knip", "check",
];
// The portable layer stops here: agent-runtime config, hooks, repository skills and
// MCP servers arrive with `harness adopt`, never with a template (decision D1).
const AGENT_RUNTIME = [".claude", ".codex", ".agents", ".mcp.json", ".serena", "CLAUDE.md"];
const IGNORED = [".state/", ".playwright-cli/", ".claude/settings.local.json", ".claude/worktrees/"];
// A drive path or a personal profile path has no place in a portable template.
// The lockfile is scanned too: a path dependency would show there.
// Case-insensitive, so a lowercase drive letter is caught too. Owner and project
// names are the public-copy scan's job.
const FORBIDDEN = [
  { name: "a drive path", pattern: /\b[A-Za-z]:[\\/]/ },
  { name: "a personal profile path", pattern: /(?:[\\/]Users[\\/]|[\\/]home[\\/]|~[\\/])[A-Za-z]/ },
];
const WORKSPACE_FOLDERS = ["goals", "findings", "plans", "prds", "specs", "adrs", "features", ".artifacts", ".task-scratch"];
// Where each template keeps the applied design, and the files that folder holds.
const DESIGN_DIRS = { "web-app": "styles/design", website: "src/styles/design" };
const DESIGN_FILES = ["tokens.css", "type.css", "role-bridge.css", "fonts.css", "SOURCE.json"];
const KIT_FONT_PACKAGES = ["@fontsource-variable/mona-sans", "@fontsource-variable/geist-mono", "@fontsource/geist-pixel"];
const resolver = path.join(root, "skills", "docs-workspace", "scripts", "resolve-workspace.mjs");

function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

// SOURCE.json's written hash of DESIGN.md is taken with the project name put back
// as the placeholder, so the bundled template and any copy of it agree.
function designWrittenHash(file) {
  const text = readFileSync(file, "utf8").replace(/^name: .*$/m, "name: __PROJECT_NAME__");
  return createHash("sha256").update(text).digest("hex");
}

// A DESIGN.md with its front-matter name and description lines blanked, for
// comparing a project's DESIGN.md with the library file it came from.
function designBody(text) {
  return text.replace(/^name:.*$/m, "name:").replace(/^description:.*$/m, "description:");
}

function designDir(name) {
  return DESIGN_DIRS[name] ?? "styles/design";
}

// The real design library, when this host has one: DESIGN_LIBRARY_ROOT, else the
// docs-workspace registry's design-library shared root.
function libraryRoot() {
  if (process.env.DESIGN_LIBRARY_ROOT) return existsSync(process.env.DESIGN_LIBRARY_ROOT) ? process.env.DESIGN_LIBRARY_ROOT : null;
  try {
    const listed = JSON.parse(execFileSync(process.execPath, [resolver, "projects"], { encoding: "utf8", stdio: "pipe" }));
    const shared = (listed.sharedRoots ?? []).find((entry) => entry.id === "design-library" && entry.path);
    return shared && existsSync(path.join(shared.path, "profiles")) ? shared.path : null;
  } catch {
    return null;
  }
}
const library = libraryRoot();
const NO_LIBRARY = "no design library on this host: set DESIGN_LIBRARY_ROOT or register the docs-workspace design-library shared root";

function writeFile(file, text) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text);
}

// A tiny library shaped like the design library: in-repo profiles with a role
// bridge, foundations with their own token names, a project profile and a
// package-lock that pins the font packages.
function fixtureLibrary(dir) {
  const roles = {
    ink: "css:--fx-ink",
    paper: "css:--fx-paper",
    accent: "css:--fx-accent",
    "font-body": "css:--fx-face",
    "radius-control": "css:--fx-round",
  };
  const profile = (id, extra) => ({
    id,
    name: `Fixture ${id}`,
    collection: "shared",
    surface: "Test design",
    source: { repo: "design-library", defaultPath: "." },
    authority: [`foundations/${id}/DESIGN.md`, `foundations/${id}/tokens.css`],
    inputs: {
      designMd: `foundations/${id}/DESIGN.md`,
      css: { path: `foundations/${id}/tokens.css`, light: [":root"], dark: [':root[data-theme="dark"]'] },
    },
    modes: ["light", "dark"],
    fonts: { "Fixture Sans": { face: '"Fixture Sans Variable"', package: "@fontsource-variable/fixture-sans", licence: "OFL-1.1" } },
    roles,
    ...extra,
  });
  const foundation = (id, withType) => {
    writeFile(
      path.join(dir, "foundations", id, "DESIGN.md"),
      `---\nversion: alpha\nname: Fixture ${id}\ndescription: A fixture design for the copier tests.\ncolors:\n  primary: "#112233"\n---\n\n# Fixture ${id}\n\nBody text.\n`,
    );
    writeFile(
      path.join(dir, "foundations", id, "tokens.css"),
      `:root {\n  --fx-ink: #112233;\n  --fx-paper: #fafaf0;\n  --fx-accent: #2255ff;\n  --fx-face: "Fixture Sans Variable", sans-serif;\n  --fx-round: 3px;\n}\n\n:root[data-theme="dark"] {\n  --fx-ink: #fafaf0;\n  --fx-paper: #112233;\n}\n`,
    );
    if (withType) writeFile(path.join(dir, "foundations", id, "type.css"), `.t-title {\n  color: var(--fx-ink);\n}\n`);
  };
  const write = (id, body) => {
    writeFile(path.join(dir, "profiles", id, "profile.json"), `${JSON.stringify(body, null, 2)}\n`);
    writeFile(
      path.join(dir, "profiles", id, "role-bridge.css"),
      `:root {\n${Object.entries(roles).map(([role, ref]) => `  --role-${role}: var(${ref.slice(4)});`).join("\n")}\n}\n`,
    );
  };
  foundation("fixture", true);
  write("fixture", profile("fixture"));
  foundation("fixture-plain", false);
  write("fixture-plain", profile("fixture-plain"));
  foundation("fixture-licensed", true);
  write(
    "fixture-licensed",
    profile("fixture-licensed", {
      fonts: {
        "Fixture Sans": { face: '"Fixture Sans Variable"', package: "@fontsource-variable/fixture-sans", licence: "OFL-1.1" },
        "Fixture Licensed": { face: '"Fixture Licensed"', package: null, licence: "Commercial licence, no redistribution" },
      },
    }),
  );
  write("other-app", profile("other-app", { source: { repo: "example-org/other-app", defaultPath: "../other-app" } }));
  // Malformed profiles, each refused before anything is written.
  foundation("fixture-unfenced", false);
  writeFile(path.join(dir, "foundations", "fixture-unfenced", "DESIGN.md"), "---\nversion: alpha\nname: Fixture unfenced\n\n# Fixture unfenced\n");
  write("fixture-unfenced", profile("fixture-unfenced"));
  write("fixture-unknown-token", profile("fixture", { id: "fixture-unknown-token", roles: { ...roles, accent: "css:--fx-missing" } }));
  write(
    "fixture-unlocked",
    profile("fixture", {
      id: "fixture-unlocked",
      fonts: { "Fixture Mono": { face: '"Fixture Mono"', package: "@fontsource/fixture-mono", licence: "OFL-1.1" } },
    }),
  );
  // The library Kit's type roles, written for a profile without its own type.css.
  writeFile(path.join(dir, "foundations", "kit", "type.css"), ".t-kit-fixture {\n  color: var(--ink-2);\n}\n");
  // A role whose token appears only inside a comment, and a profile with no css input.
  foundation("fixture-commented", false);
  writeFile(
    path.join(dir, "foundations", "fixture-commented", "tokens.css"),
    `:root {\n  --fx-ink: #112233;\n  --fx-paper: #fafaf0;\n  --fx-accent: #2255ff;\n  --fx-face: "Fixture Sans Variable", sans-serif;\n  --fx-round: 3px;\n  /* --fx-hidden: #ff0000; */\n}\n`,
  );
  write("fixture-commented", profile("fixture-commented", { roles: { ...roles, accent: "css:--fx-hidden" } }));
  write("fixture-no-css", profile("fixture", { id: "fixture-no-css", inputs: { designMd: "foundations/fixture/DESIGN.md", css: {} } }));
  // Files outside the library that a profile path could reach with "..".
  writeFile(path.join(dir, "..", "outside", "DESIGN.md"), "---\nname: Outside\n---\n\n# Outside\n");
  writeFile(path.join(dir, "..", "outside", "tokens.css"), ":root {\n  --fx-ink: #000;\n}\n");
  const escape = (id, inputs) => write(id, profile("fixture", { id, inputs: { ...profile("fixture").inputs, ...inputs } }));
  escape("fixture-escape-design", { designMd: "../outside/DESIGN.md" });
  escape("fixture-escape-css", { css: { path: "../outside/tokens.css", light: [":root"], dark: [] } });
  writeFile(
    path.join(dir, "package-lock.json"),
    `${JSON.stringify({ lockfileVersion: 3, packages: { "node_modules/@fontsource-variable/fixture-sans": { version: "5.1.0", license: "OFL-1.1" } } }, null, 2)}\n`,
  );
  return dir;
}

// The JSON block the copier prints after a marker line.
function jsonAfter(output, marker) {
  const at = output.indexOf(marker);
  assert.notEqual(at, -1, `the copier did not print "${marker}"`);
  const start = output.indexOf("{", at);
  const end = output.indexOf("\n}", start);
  return JSON.parse(output.slice(start, end + 2));
}

function copy(args, env = {}) {
  return execFileSync(process.execPath, [copier, ...args], { encoding: "utf8", stdio: "pipe", env: { ...process.env, ...env } });
}

function refusal(args, env = {}) {
  try {
    copy(args, env);
  } catch (error) {
    return `${error.stdout}${error.stderr}`;
  }
  assert.fail(`the copier accepted ${args.join(" ")}`);
}

function files(dir, base = dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? files(full, base) : [path.relative(base, full).split(path.sep).join("/")];
  });
}

function templates() {
  if (!existsSync(templatesDir)) return [];
  return readdirSync(templatesDir).filter((entry) => statSync(path.join(templatesDir, entry)).isDirectory());
}

function* textFiles(dir) {
  for (const entry of readdirSync(dir)) {
    if (GENERATED.has(entry)) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* textFiles(full);
    } else if (!/\.(png|jpg|jpeg|webp|gif|ico|woff2?|ttf|otf|pdf|zip)$/i.test(entry)) {
      yield full;
    }
  }
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function leftovers(dir, token) {
  const hits = [];
  for (const file of textFiles(dir)) {
    if (readFileSync(file, "utf8").includes(token)) hits.push(path.relative(dir, file));
  }
  return hits;
}

const found = templates();

test("the templates folder holds the web-app and website templates", () => {
  assert.ok(found.includes("web-app"), `templates/: ${found.join(", ") || "(none)"}; web-app is missing`);
  assert.ok(found.includes("website"), `templates/: ${found.join(", ") || "(none)"}; website is missing`);
});

for (const name of found) {
  const dir = path.join(templatesDir, name);

  test(`${name}: carries every file the shared contract requires`, () => {
    const required = [...REQUIRED_FILES, ...DESIGN_FILES.map((file) => `${designDir(name)}/${file}`)];
    const missing = required.filter((file) => !existsSync(path.join(dir, file)));
    assert.deepEqual(missing, [], `missing in templates/${name}: ${missing.join(", ")}`);
  });

  // `dev:up` starts the server detached, so on Windows it has no console and a
  // console program it starts without windowsHide opens a visible window (a
  // project copy that dropped it flashed ten windows per launch, 9 October 2026).
  test(`${name}: the dev runner asks for a hidden console on every process it starts`, () => {
    const runner = "scripts/dev.mjs";
    const source = readFileSync(path.join(dir, runner), "utf8");
    const calls = [...source.matchAll(/(?<![.\w])(spawn|spawnSync|execFile|execFileSync|exec|execSync|fork)\(/g)];
    assert.ok(calls.length > 0, `${runner} starts no process; the check would prove nothing`);
    for (const match of calls) {
      let depth = 0;
      let end = match.index + match[0].length - 1;
      do {
        if (source[end] === "(") depth += 1;
        else if (source[end] === ")") depth -= 1;
        end += 1;
      } while (depth > 0 && end < source.length);
      const line = source.slice(0, match.index).split("\n").length;
      assert.match(source.slice(match.index, end), /windowsHide:\s*true/, `templates/${name}/${runner}:${line} starts ${match[1]} without windowsHide`);
    }
  });

  test(`${name}: SOURCE.json records the bundled Kit and the design files it copied unchanged`, () => {
    const folder = designDir(name);
    const source = readJson(path.join(dir, folder, "SOURCE.json"));
    assert.equal(source.profile, "kit", "the bundled design is the library's Kit");
    const recorded = Object.fromEntries(source.files.map((entry) => [entry.path, entry]));
    assert.deepEqual(Object.keys(recorded).sort(), ["DESIGN.md", ...DESIGN_FILES.filter((f) => f !== "SOURCE.json").map((f) => `${folder}/${f}`)].sort());
    for (const file of ["tokens.css", "type.css", "role-bridge.css"]) {
      assert.equal(recorded[`${folder}/${file}`].sha256, sha256(path.join(dir, folder, file)), `${folder}/${file} differs from its SOURCE.json hash`);
    }
    for (const entry of source.files) {
      assert.equal(entry.written, sha256(path.join(dir, entry.path)), `${entry.path} differs from the file SOURCE.json says was written`);
    }
    const imports = [...readFileSync(path.join(dir, folder, "fonts.css"), "utf8").matchAll(/^@import "([^"]+)";$/gm)].map(([, pkg]) => pkg);
    assert.deepEqual(imports, KIT_FONT_PACKAGES, "fonts.css imports each Kit face's package once");
    const pkg = readJson(path.join(dir, "package.json"));
    for (const font of KIT_FONT_PACKAGES) assert.ok(pkg.dependencies?.[font], `package.json must depend on ${font}`);
  });

  test(`${name}: the copier applies a library profile with --design`, () => {
    const scratch = mkdtempSync(path.join(os.tmpdir(), "harness-template-"));
    const lib = fixtureLibrary(path.join(scratch, "library"));
    const target = path.join(scratch, "proof-site");
    const folder = designDir(name);
    try {
      const output = copy([name, target, "--design", "fixture", "--library", lib]);
      const design = readFileSync(path.join(target, "DESIGN.md"), "utf8");
      assert.match(design, /^name: proof-site$/m, "DESIGN.md is named for the project");
      assert.match(design, /^description: ".*Fixture fixture.*A fixture design for the copier tests\."$/m);
      assert.ok(design.endsWith("# Fixture fixture\n\nBody text.\n"), "the body is the profile's DESIGN.md");
      for (const [file, from] of [
        ["tokens.css", "foundations/fixture/tokens.css"],
        ["type.css", "foundations/fixture/type.css"],
        ["role-bridge.css", "profiles/fixture/role-bridge.css"],
      ]) {
        assert.equal(readFileSync(path.join(target, folder, file), "utf8"), readFileSync(path.join(lib, from), "utf8"), `${file} is the library's file`);
      }
      assert.equal(readFileSync(path.join(target, folder, "fonts.css"), "utf8").match(/^@import .*$/gm).join("\n"), '@import "@fontsource-variable/fixture-sans";');
      const source = readJson(path.join(target, folder, "SOURCE.json"));
      assert.equal(source.profile, "fixture");
      for (const entry of source.files) {
        assert.equal(entry.sha256, sha256(path.join(lib, entry.from)), `${entry.path}: SOURCE.json hashes ${entry.from}`);
        const written = entry.path === "DESIGN.md" ? designWrittenHash(path.join(target, entry.path)) : sha256(path.join(target, entry.path));
        assert.equal(entry.written, written, `${entry.path}: SOURCE.json hashes the file as written`);
      }
      assert.deepEqual(source.roles, readJson(path.join(lib, "profiles", "fixture", "profile.json")).roles);
      const deps = readJson(path.join(target, "package.json")).dependencies;
      assert.equal(deps["@fontsource-variable/fixture-sans"], "5.1.0", "the design's font package at the library's version");
      for (const font of KIT_FONT_PACKAGES) assert.equal(deps[font], undefined, `the Kit's ${font} is dropped when unused`);
      assert.deepEqual(Object.keys(deps), Object.keys(deps).sort(), "dependencies stay sorted");
      assert.match(output, /Fixture Sans: @fontsource-variable\/fixture-sans 5\.1\.0, licence OFL-1\.1/);
      assert.match(output, /pnpm install\s+# not frozen/);
      assert.doesNotMatch(output, /--frozen-lockfile/);
      const adapter = jsonAfter(output, "profiles/proof-site/profile.json");
      assert.equal(adapter.id, "proof-site");
      assert.deepEqual(adapter.authority, ["DESIGN.md", `${folder}/tokens.css`, `${folder}/type.css`, `${folder}/role-bridge.css`]);
      assert.deepEqual(adapter.inputs, {
        designMd: "DESIGN.md",
        css: { path: `${folder}/tokens.css`, light: [":root"], dark: [':root[data-theme="dark"]', ".dark"] },
      });
      assert.deepEqual(adapter.roles, source.roles);
      assert.ok(output.includes(`"proof-site": "${target.split(path.sep).join("/")}"`), "prints the sources.local.json line");
      assert.doesNotMatch(output, /design router/);
      assert.equal(existsSync(path.join(lib, "profiles", "proof-site")), false, "the copier never writes into the library");
      assert.deepEqual(leftovers(target, "__PROJECT_NAME__"), []);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  test(`${name}: package.json names the placeholder, pins pnpm and declares the fixed scripts`, () => {
    const pkg = readJson(path.join(dir, "package.json"));
    assert.equal(pkg.name, "__PROJECT_NAME__", "package.json name must be the placeholder the copier replaces");
    assert.match(String(pkg.packageManager ?? ""), /^pnpm@10\./, "packageManager must pin pnpm 10");
    assert.match(String(pkg.engines?.node ?? ""), /^>=24/, "engines.node must be >=24");
    const scripts = Object.keys(pkg.scripts ?? {});
    const missing = REQUIRED_SCRIPTS.filter((script) => !scripts.includes(script));
    assert.deepEqual(missing, [], `scripts missing from templates/${name}: ${missing.join(", ")}`);
  });

  test(`${name}: the commit hook runs lint-staged and only checks, per the check ladder`, async () => {
    const pkg = readJson(path.join(dir, "package.json"));
    assert.equal(pkg.scripts.prepare, "husky", "a root prepare script installs the hook in each clone");
    for (const tool of ["husky", "lint-staged"]) assert.ok(pkg.devDependencies?.[tool], `devDependencies must pin ${tool}`);
    const hook = readFileSync(path.join(dir, ".husky", "pre-commit"), "utf8").split("\n").filter((line) => line && !line.startsWith("#"));
    assert.deepEqual(hook, ["lint-staged --no-stash --fail-on-changes --max-arg-length 7000"], "the hook runs lint-staged without its stash, failing on any task that writes");
    const { default: tasks } = await import(pathToFileURL(path.join(dir, "lint-staged.config.mjs")).href);
    assert.equal(tasks["*"], "prettier --check --ignore-unknown", "Prettier checks every staged file it knows");
    const writers = Object.entries(tasks).filter(([, task]) => /--write|--fix\b/.test(String(task)));
    assert.deepEqual(writers, [], "no hook task writes");
    assert.match(readFileSync(path.join(dir, ".prettierignore"), "utf8"), /^\/?pnpm-lock\.yaml$/m, "a staged lockfile must not fail the Prettier check");
  });

  test(`${name}: check runs knip, E2E has axe, and the browser has a setup alias`, () => {
    const pkg = readJson(path.join(dir, "package.json"));
    assert.equal(pkg.scripts.knip, "pnpm dlx knip@6.40.0");
    assert.match(pkg.scripts.check, /&& pnpm run knip$/, "check ends with knip");
    assert.equal(readJson(path.join(dir, "knip.json")).ignoreExportsUsedInFile, true);
    assert.ok(pkg.devDependencies?.["@axe-core/playwright"], "devDependencies must pin @axe-core/playwright");
    const e2e = readdirSync(path.join(dir, "tests", "e2e")).map((file) => readFileSync(path.join(dir, "tests", "e2e", file), "utf8"));
    assert.ok(
      e2e.some((spec) => spec.includes('from "@axe-core/playwright"') && spec.includes("new AxeBuilder(")),
      "an E2E spec imports axe and runs an AxeBuilder analysis",
    );
    assert.equal(pkg.scripts["browser:setup"], "playwright install chromium");
  });

  test(`${name}: ignores agent state, bounds CI, names code navigation and carries no agent runtime`, () => {
    const ignore = readFileSync(path.join(dir, ".gitignore"), "utf8").split(/\r?\n/);
    const unlisted = IGNORED.filter((entry) => !ignore.includes(entry));
    assert.deepEqual(unlisted, [], `.gitignore must list ${unlisted.join(", ")}`);
    const workflow = readFileSync(path.join(dir, ".github", "workflows", "check.yml"), "utf8");
    assert.match(workflow, /^ {4}timeout-minutes: \d+$/m, "the CI job has a timeout");
    assert.match(readFileSync(path.join(dir, "AGENTS.md"), "utf8"), /^### Code navigation$/m);
    const runtime = AGENT_RUNTIME.filter((entry) => existsSync(path.join(dir, entry)));
    assert.deepEqual(runtime, [], `templates/${name} is the portable layer; harness adopt adds ${runtime.join(", ")}`);
  });

  test(`${name}: pins Node 24, names the Portless app and routes documents through the workspace placeholder`, () => {
    assert.equal(readFileSync(path.join(dir, ".node-version"), "utf8").trim(), "24");
    assert.equal(readJson(path.join(dir, "portless.json")).name, "__PROJECT_NAME__", "portless.json must name the app by the placeholder");
    const project = readFileSync(path.join(dir, "PROJECT.md"), "utf8");
    assert.ok(project.includes("__WORKSPACE_ROOT__"), "PROJECT.md must carry __WORKSPACE_ROOT__ for the copier to fill");
  });

  test(`${name}: DESIGN.md is the project's own authority, named by the placeholder`, () => {
    const design = readFileSync(path.join(dir, "DESIGN.md"), "utf8");
    assert.match(design, /^name:\s*__PROJECT_NAME__\s*$/m, "DESIGN.md front matter must carry name: __PROJECT_NAME__");
  });

  test(`${name}: no text file embeds a machine path or a profile path`, () => {
    const hits = [];
    for (const file of textFiles(dir)) {
      const text = readFileSync(file, "utf8");
      for (const { name: what, pattern } of FORBIDDEN) {
        const match = text.match(pattern);
        if (match) hits.push(`${path.relative(root, file)}: ${what} (${JSON.stringify(match[0])})`);
      }
    }
    assert.deepEqual(hits, [], hits.join("\n"));
  });

  test(`${name}: the copier replaces the project name and leaves no placeholder`, () => {
    const scratch = mkdtempSync(path.join(os.tmpdir(), "harness-template-"));
    const target = path.join(scratch, "proof-site");
    try {
      const output = execFileSync(process.execPath, [copier, name, target, "--name", "proof-site"], { encoding: "utf8" });
      assert.match(output, /Created proof-site from the/);
      assert.match(output, /No workspace was seeded/);
      assert.match(output, /pnpm install --frozen-lockfile/, "the bundled Kit leaves the lockfile valid");
      assert.doesNotMatch(output, /design router/);
      assert.match(output, /--design <profile-id>/, "the last line says how another design is applied");
      const adapter = jsonAfter(output, "profiles/proof-site/profile.json");
      assert.deepEqual(adapter.roles, readJson(path.join(dir, designDir(name), "SOURCE.json")).roles, "the adapter maps the applied profile's roles");
      assert.equal(readJson(path.join(target, "package.json")).name, "proof-site");
      assert.equal(readJson(path.join(target, "portless.json")).name, "proof-site");
      assert.deepEqual(leftovers(target, "__PROJECT_NAME__"), [], "project-name placeholder left behind");
      assert.deepEqual(leftovers(target, "__WORKSPACE_ROOT__"), [], "workspace placeholder left behind");
      assert.ok(readFileSync(path.join(target, "PROJECT.md"), "utf8").includes("no workspace seeded yet"));
      for (const generated of GENERATED) {
        assert.equal(existsSync(path.join(target, generated)), false, `${generated} must not be copied`);
      }
      for (const file of REQUIRED_FILES) {
        assert.ok(existsSync(path.join(target, file)), `${file} missing from the copy`);
      }
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  test(`${name}: the copier seeds a workspace from the docs starter and prints its registry entry`, () => {
    const scratch = mkdtempSync(path.join(os.tmpdir(), "harness-template-"));
    const target = path.join(scratch, "repo", "proof-site");
    const workspace = path.join(scratch, "brain", "Workspaces", "proof-site");
    try {
      const output = execFileSync(
        process.execPath,
        [copier, name, target, "--workspace", workspace, "--remote", "example-org/proof-site"],
        { encoding: "utf8" },
      );
      assert.match(output, /Seeded the workspace at/);
      for (const file of ["AGENTS.md", "README.md", "LICENSE", "templates/goal.md", ...WORKSPACE_FOLDERS]) {
        assert.ok(existsSync(path.join(workspace, file)), `${file} missing from the seeded workspace`);
      }
      const agents = readFileSync(path.join(workspace, "AGENTS.md"), "utf8");
      assert.ok(agents.startsWith("# proof-site workspace"), "the starter's <project> placeholder is filled");
      assert.ok(!agents.includes("<workspace-root>"), "the starter's <workspace-root> placeholder is filled");
      const project = readFileSync(path.join(target, "PROJECT.md"), "utf8");
      assert.ok(project.includes(workspace.split(path.sep).join("/")), "PROJECT.md points at the seeded workspace");
      assert.deepEqual(leftovers(target, "__WORKSPACE_ROOT__"), []);
      const entry = jsonAfter(output, "docs-workspace registry");
      assert.equal(entry.id, "proof-site");
      assert.deepEqual(entry.identity.remotes, ["example-org/proof-site"]);
      assert.equal(entry.workspaceRoot, workspace);
      assert.equal(entry.brainRoot, path.join(scratch, "brain"));
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
}

test("the copier refuses an unknown template, a non-empty target and a workspace inside the project", () => {
  const scratch = mkdtempSync(path.join(os.tmpdir(), "harness-template-"));
  try {
    assert.throws(
      () => execFileSync(process.execPath, [copier, "no-such-template", path.join(scratch, "a")], { encoding: "utf8", stdio: "pipe" }),
      /unknown template/,
    );
    assert.throws(
      () => execFileSync(process.execPath, [copier, "..", path.join(scratch, "a")], { encoding: "utf8", stdio: "pipe" }),
      /unknown template/,
      "a path is not a template name: .. would copy the harness itself",
    );
    assert.equal(existsSync(path.join(scratch, "a")), false);
    const busy = path.join(scratch, "busy");
    mkdirSync(busy);
    writeFileSync(path.join(busy, "keep.txt"), "do not overwrite");
    const name = found[0] ?? "web-app";
    assert.throws(
      () => execFileSync(process.execPath, [copier, name, busy], { encoding: "utf8", stdio: "pipe" }),
      /exists and is not empty/,
    );
    assert.equal(readFileSync(path.join(busy, "keep.txt"), "utf8"), "do not overwrite");
    const nested = path.join(scratch, "nested");
    assert.throws(
      () => execFileSync(process.execPath, [copier, name, nested, "--workspace", path.join(nested, "workspace")], { encoding: "utf8", stdio: "pipe" }),
      /outside the project folder/,
    );
    assert.equal(existsSync(nested), false, "nothing is created when the arguments are refused");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("the copier refuses a font with no package before writing anything", () => {
  const scratch = mkdtempSync(path.join(os.tmpdir(), "harness-template-"));
  try {
    const lib = fixtureLibrary(path.join(scratch, "library"));
    const target = path.join(scratch, "proof-site");
    const message = refusal([found[0] ?? "web-app", target, "--design", "fixture-licensed", "--library", lib]);
    assert.match(message, /Fixture Licensed/, "names the face");
    assert.match(message, /Commercial licence, no redistribution/, "names the licence");
    assert.equal(existsSync(target), false, "nothing is written");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("the copier refuses a project's own profile and an unknown one", () => {
  const scratch = mkdtempSync(path.join(os.tmpdir(), "harness-template-"));
  try {
    const lib = fixtureLibrary(path.join(scratch, "library"));
    const target = path.join(scratch, "proof-site");
    const template = found[0] ?? "web-app";
    assert.match(refusal([template, target, "--design", "other-app", "--library", lib]), /another project's own (design )?authority/);
    assert.match(refusal([template, target, "--design", "no-such-design", "--library", lib]), /no profile "no-such-design"/);
    assert.equal(existsSync(target), false, "nothing is written");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("the copier's design command applies a profile to an existing project", () => {
  const scratch = mkdtempSync(path.join(os.tmpdir(), "harness-template-"));
  try {
    const lib = fixtureLibrary(path.join(scratch, "library"));
    const template = found[0] ?? "web-app";
    const folder = designDir(template);
    const project = path.join(scratch, "proof-site");
    copy([template, project]);
    const readme = readFileSync(path.join(project, "README.md"), "utf8");
    const output = copy(["design", project, "--design", "fixture", "--library", lib]);
    const design = readFileSync(path.join(project, "DESIGN.md"), "utf8");
    assert.match(design, /^name: proof-site$/m, "DESIGN.md keeps the project's name");
    assert.ok(design.endsWith("# Fixture fixture\n\nBody text.\n"), "the body is the profile's DESIGN.md");
    for (const [file, from] of [
      ["tokens.css", "foundations/fixture/tokens.css"],
      ["type.css", "foundations/fixture/type.css"],
      ["role-bridge.css", "profiles/fixture/role-bridge.css"],
    ]) {
      assert.equal(readFileSync(path.join(project, folder, file), "utf8"), readFileSync(path.join(lib, from), "utf8"), `${file} is the library's file`);
    }
    assert.equal(readFileSync(path.join(project, folder, "fonts.css"), "utf8").match(/^@import .*$/gm).join("\n"), '@import "@fontsource-variable/fixture-sans";');
    const source = readJson(path.join(project, folder, "SOURCE.json"));
    assert.equal(source.profile, "fixture");
    for (const entry of source.files.filter((e) => e.path !== "DESIGN.md")) {
      assert.equal(entry.written, sha256(path.join(project, entry.path)), `${entry.path}: SOURCE.json hashes the file as written`);
    }
    const deps = readJson(path.join(project, "package.json")).dependencies;
    assert.equal(deps["@fontsource-variable/fixture-sans"], "5.1.0");
    for (const font of KIT_FONT_PACKAGES) assert.equal(deps[font], undefined, `the Kit's ${font} is dropped`);
    assert.equal(readFileSync(path.join(project, "README.md"), "utf8"), readme, "the rest of the project is left alone");
    assert.match(output, /Fixture Sans: @fontsource-variable\/fixture-sans 5\.1\.0, licence OFL-1\.1/);
    assert.match(output, /pnpm install\s+# not frozen/);
    assert.deepEqual(jsonAfter(output, "profiles/proof-site/profile.json").roles, source.roles);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("the copier's design command refuses a folder with no SOURCE.json", () => {
  const scratch = mkdtempSync(path.join(os.tmpdir(), "harness-template-"));
  try {
    const lib = fixtureLibrary(path.join(scratch, "library"));
    const project = path.join(scratch, "not-a-template-project");
    writeFile(path.join(project, "package.json"), '{ "name": "not-a-template-project" }\n');
    assert.match(refusal(["design", project, "--design", "fixture", "--library", lib]), /SOURCE\.json/);
    assert.deepEqual(readdirSync(project), ["package.json"], "nothing is written");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// A project copied from the first template, for the design command tests.
function designProject(scratch) {
  const template = found[0] ?? "web-app";
  const project = path.join(scratch, "proof-site");
  copy([template, project]);
  return { project, folder: designDir(template), lib: fixtureLibrary(path.join(scratch, "library")) };
}

test("the design command writes type.css from the profile, else from the library Kit, and records its source", () => {
  const scratch = mkdtempSync(path.join(os.tmpdir(), "harness-template-"));
  try {
    const { project, folder, lib } = designProject(scratch);
    const typeEntry = () => readJson(path.join(project, folder, "SOURCE.json")).files.find((entry) => entry.path === `${folder}/type.css`);
    copy(["design", project, "--design", "fixture", "--library", lib]);
    assert.equal(readFileSync(path.join(project, folder, "type.css"), "utf8"), readFileSync(path.join(lib, "foundations/fixture/type.css"), "utf8"));
    assert.equal(typeEntry().from, "foundations/fixture/type.css");
    const output = copy(["design", project, "--design", "fixture-plain", "--library", lib]);
    const kit = path.join(lib, "foundations/kit/type.css");
    assert.equal(readFileSync(path.join(project, folder, "type.css"), "utf8"), readFileSync(kit, "utf8"), "the fixture's type.css does not stay behind");
    assert.equal(typeEntry().from, "foundations/kit/type.css", "SOURCE.json names the file type.css came from");
    assert.equal(typeEntry().sha256, sha256(kit));
    assert.doesNotMatch(output, /keeps the type roles/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("the copier refuses a profile without type.css when the library has no Kit type.css, before writing anything", () => {
  const scratch = mkdtempSync(path.join(os.tmpdir(), "harness-template-"));
  try {
    const lib = fixtureLibrary(path.join(scratch, "library"));
    rmSync(path.join(lib, "foundations", "kit", "type.css"));
    const target = path.join(scratch, "proof-site");
    assert.match(refusal([found[0] ?? "web-app", target, "--design", "fixture-plain", "--library", lib]), /foundations\/kit\/type\.css/);
    assert.equal(existsSync(target), false, "nothing is written");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("the design command refuses to overwrite an edited design file unless --force", () => {
  const scratch = mkdtempSync(path.join(os.tmpdir(), "harness-template-"));
  try {
    const { project, folder, lib } = designProject(scratch);
    const designFile = path.join(project, "DESIGN.md");
    const edited = `${readFileSync(designFile, "utf8")}\nA hand edit.\n`;
    writeFileSync(designFile, edited);
    const tokens = readFileSync(path.join(project, folder, "tokens.css"), "utf8");
    const message = refusal(["design", project, "--design", "fixture", "--library", lib]);
    assert.match(message, /DESIGN\.md/, "names the edited file");
    assert.match(message, /--force/, "says how to overwrite");
    assert.doesNotMatch(message, new RegExp(`${folder}/tokens\\.css`), "names only the edited files");
    assert.equal(readFileSync(designFile, "utf8"), edited, "the edit is intact");
    assert.equal(readFileSync(path.join(project, folder, "tokens.css"), "utf8"), tokens, "nothing is written");
    copy(["design", project, "--design", "fixture", "--library", lib, "--force"]);
    assert.ok(readFileSync(designFile, "utf8").endsWith("# Fixture fixture\n\nBody text.\n"), "--force overwrites");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("the design command refuses an unparsable SOURCE.json and a package name the copier would refuse", () => {
  const scratch = mkdtempSync(path.join(os.tmpdir(), "harness-template-"));
  try {
    const { project, folder, lib } = designProject(scratch);
    const design = readFileSync(path.join(project, "DESIGN.md"), "utf8");
    const pkgFile = path.join(project, "package.json");
    const pkg = readFileSync(pkgFile, "utf8");
    writeFileSync(pkgFile, pkg.replace('"name": "proof-site"', '"name": "@scope/x"'));
    assert.match(refusal(["design", project, "--design", "fixture", "--library", lib]), /"@scope\/x" must be lowercase letters, digits and hyphens/);
    writeFileSync(pkgFile, pkg);
    const sourceFile = path.join(project, folder, "SOURCE.json");
    writeFileSync(sourceFile, "{");
    assert.match(refusal(["design", project, "--design", "fixture", "--library", lib]), /SOURCE\.json.*(not valid|unparsable|cannot be read)/);
    assert.equal(readFileSync(path.join(project, "DESIGN.md"), "utf8"), design, "nothing is written");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("the design command does not follow a link to another design folder", () => {
  const scratch = mkdtempSync(path.join(os.tmpdir(), "harness-template-"));
  const link = path.join(scratch, "proof-site", "a-linked");
  try {
    const { project, folder, lib } = designProject(scratch);
    // A folder outside the project shaped like a design folder, reached through a link
    // that sorts before the project's own.
    const outside = path.join(scratch, "outside");
    writeFile(path.join(outside, "design", "SOURCE.json"), readFileSync(path.join(project, folder, "SOURCE.json"), "utf8"));
    writeFile(path.join(outside, "design", "tokens.css"), "/* outside */\n");
    symlinkSync(outside, link, "junction");
    copy(["design", project, "--design", "fixture", "--library", lib]);
    assert.deepEqual(readdirSync(path.join(outside, "design")).sort(), ["SOURCE.json", "tokens.css"], "nothing is written through the link");
    assert.equal(readFileSync(path.join(outside, "design", "tokens.css"), "utf8"), "/* outside */\n");
    assert.equal(readFileSync(path.join(project, folder, "tokens.css"), "utf8"), readFileSync(path.join(lib, "foundations/fixture/tokens.css"), "utf8"));
  } finally {
    // Remove the link entry itself, never through it, before the scratch folder.
    if (lstatExists(link)) unlinkSync(link);
    rmSync(scratch, { recursive: true, force: true });
  }
});

function lstatExists(file) {
  try {
    lstatSync(file);
    return true;
  } catch {
    return false;
  }
}

test("the copier refuses a role token that appears only in a comment, a profile with no css input and an invalid profile id", () => {
  const scratch = mkdtempSync(path.join(os.tmpdir(), "harness-template-"));
  try {
    const lib = fixtureLibrary(path.join(scratch, "library"));
    const target = path.join(scratch, "proof-site");
    const template = found[0] ?? "web-app";
    const commented = refusal([template, target, "--design", "fixture-commented", "--library", lib]);
    assert.match(commented, /does not declare/);
    assert.match(commented, /accent: --fx-hidden/);
    assert.match(refusal([template, target, "--design", "fixture-no-css", "--library", lib]), /no inputs\.designMd or inputs\.css\.path/);
    assert.match(refusal([template, target, "--design", "../fixture", "--library", lib]), /profile id "\.\.\/fixture" must be lowercase/);
    assert.equal(existsSync(target), false, "nothing is written");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("the copier refuses a DESIGN.md whose front matter is not closed, before writing anything", () => {
  const scratch = mkdtempSync(path.join(os.tmpdir(), "harness-template-"));
  try {
    const lib = fixtureLibrary(path.join(scratch, "library"));
    const target = path.join(scratch, "proof-site");
    assert.match(refusal([found[0] ?? "web-app", target, "--design", "fixture-unfenced", "--library", lib]), /front matter/);
    assert.equal(existsSync(target), false, "nothing is written");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("the copier refuses a role whose token the design's tokens.css does not declare", () => {
  const scratch = mkdtempSync(path.join(os.tmpdir(), "harness-template-"));
  try {
    const lib = fixtureLibrary(path.join(scratch, "library"));
    const target = path.join(scratch, "proof-site");
    const message = refusal([found[0] ?? "web-app", target, "--design", "fixture-unknown-token", "--library", lib]);
    assert.match(message, /accent/, "names the role");
    assert.match(message, /--fx-missing/, "names the token");
    assert.equal(existsSync(target), false, "nothing is written");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("the copier refuses profile paths outside the library and a font missing from the library lock", () => {
  const scratch = mkdtempSync(path.join(os.tmpdir(), "harness-template-"));
  try {
    const lib = fixtureLibrary(path.join(scratch, "library"));
    const target = path.join(scratch, "proof-site");
    const template = found[0] ?? "web-app";
    assert.match(refusal([template, target, "--design", "fixture-escape-design", "--library", lib]), /outside the library/);
    assert.match(refusal([template, target, "--design", "fixture-escape-css", "--library", lib]), /outside the library/);
    assert.match(refusal([template, target, "--design", "fixture-unlocked", "--library", lib]), /@fontsource\/fixture-mono .*package-lock\.json/);
    assert.equal(existsSync(target), false, "nothing is written");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("the copier refuses an extra argument and --library without --design", () => {
  const scratch = mkdtempSync(path.join(os.tmpdir(), "harness-template-"));
  try {
    const lib = fixtureLibrary(path.join(scratch, "library"));
    const target = path.join(scratch, "proof-site");
    const template = found[0] ?? "web-app";
    const extra = refusal([template, target, "extra"]);
    assert.match(extra, /unexpected argument "extra"/);
    assert.match(extra, /usage:/);
    assert.match(refusal([template, target, "--library", lib]), /--library needs --design/);
    assert.equal(existsSync(target), false, "nothing is written");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("the copier finds the library through the registry's design-library shared root, or says how to name one", () => {
  const scratch = mkdtempSync(path.join(os.tmpdir(), "harness-template-"));
  try {
    const lib = fixtureLibrary(path.join(scratch, "library"));
    const template = found[0] ?? "web-app";
    const registry = (sharedRoots) => {
      const file = path.join(scratch, `registry-${sharedRoots.length}.json`);
      const projects = [{ id: "fixture", identity: { remotes: ["example-org/fixture"] }, workspaceRoot: path.join(scratch, "workspace") }];
      writeFileSync(file, JSON.stringify({ schemaVersion: 1, projects, sharedRoots }));
      return { CODEX_WORKSPACE_REGISTRY: file };
    };
    const target = path.join(scratch, "proof-site");
    const output = copy([template, target, "--design", "fixture-plain"], registry([{ id: "design-library", path: lib }]));
    const folder = designDir(template);
    assert.equal(readFileSync(path.join(target, folder, "tokens.css"), "utf8"), readFileSync(path.join(lib, "foundations/fixture-plain/tokens.css"), "utf8"));
    assert.equal(readFileSync(path.join(target, folder, "type.css"), "utf8"), readFileSync(path.join(lib, "foundations/kit/type.css"), "utf8"), "a profile without type.css gets the library Kit's");
    const adapter = jsonAfter(output, "profiles/proof-site/profile.json");
    assert.deepEqual(adapter.authority, ["DESIGN.md", `${folder}/tokens.css`, `${folder}/type.css`, `${folder}/role-bridge.css`]);

    const missing = path.join(scratch, "no-library");
    assert.match(refusal([template, missing, "--design", "fixture"], registry([])), /--library <path>/);
    assert.equal(existsSync(missing), false, "nothing is written");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("the templates' design files are the design library's Kit, byte for byte", { skip: library ? false : NO_LIBRARY }, () => {
  const sources = { "tokens.css": "foundations/kit/tokens.css", "type.css": "foundations/kit/type.css", "role-bridge.css": "profiles/kit/role-bridge.css" };
  for (const name of found) {
    const folder = designDir(name);
    for (const [file, from] of Object.entries(sources)) {
      assert.ok(
        readFileSync(path.join(templatesDir, name, folder, file)).equals(readFileSync(path.join(library, from))),
        `templates/${name}/${folder}/${file} differs from the library's ${from}; rerun the copier with --design kit and copy the design back`,
      );
    }
    for (const entry of readJson(path.join(templatesDir, name, folder, "SOURCE.json")).files) {
      assert.equal(entry.sha256, sha256(path.join(library, entry.from)), `templates/${name}: ${entry.path} was applied from an older ${entry.from}`);
    }
    assert.equal(
      designBody(readFileSync(path.join(templatesDir, name, "DESIGN.md"), "utf8")),
      designBody(readFileSync(path.join(library, "foundations/kit/DESIGN.md"), "utf8")),
      `templates/${name}/DESIGN.md differs from the library Kit's DESIGN.md beyond its name and description`,
    );
  }
});

test("copying with no --design equals copying with --design kit", { skip: library ? false : NO_LIBRARY }, () => {
  const scratch = mkdtempSync(path.join(os.tmpdir(), "harness-template-"));
  try {
    for (const name of found) {
      const bundled = path.join(scratch, name, "bundled", "proof-site");
      const applied = path.join(scratch, name, "applied", "proof-site");
      copy([name, bundled]);
      copy([name, applied, "--design", "kit", "--library", library]);
      assert.deepEqual(files(applied), files(bundled), `${name}: the same files`);
      const folder = designDir(name);
      for (const file of files(bundled)) {
        if (file === `${folder}/SOURCE.json`) {
          // The library commit moves with unrelated library work; the hashes may not.
          const strip = (dir) => ({ ...readJson(path.join(dir, file)), library: null });
          assert.deepEqual(strip(applied), strip(bundled), `${name}: ${file}`);
        } else {
          assert.equal(readFileSync(path.join(applied, file), "utf8"), readFileSync(path.join(bundled, file), "utf8"), `${name}: ${file}`);
        }
      }
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
