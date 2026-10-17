/**
 * Behaviour of the adoption stack scan through its command line. The script
 * reads the library index beside the skills folder, so each test runs a copy
 * of it inside a scratch harness whose index is a fixture, and scans a scratch
 * repository.
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const source = fileURLToPath(new URL("../scripts/stack-scan.mjs", import.meta.url));

const INDEX = `# Principles and patterns

## Patterns

- [FastAPI](patterns/fastapi.md) (diff; dependency \`fastapi\`): Apply when FastAPI.
- [Python patterns](patterns/python.md) (diff): Apply when Python.
- [React composition](patterns/react-composition.md) (plan, diff; dependency \`react\`): Apply when React.
- [Supabase](patterns/supabase.md) (plan, diff; dependency \`@supabase/supabase-js\`, \`supabase\`): Apply when Supabase.
- [TypeScript patterns](patterns/typescript.md) (diff): Apply when TypeScript.
`;

function write(root, relative, text) {
  const path = join(root, relative);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

// A scratch harness (script plus fixture index) and an empty repository.
function setup(t) {
  const dir = mkdtempSync(join(tmpdir(), "stack-scan-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const script = join(dir, "harness/skills/harness/scripts/stack-scan.mjs");
  mkdirSync(dirname(script), { recursive: true });
  copyFileSync(source, script);
  write(dir, "harness/principles-and-patterns/index.md", INDEX);
  const repo = join(dir, "repo");
  mkdirSync(repo);
  const scan = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: "utf8", timeout: 60000 });
  return { repo, scan };
}

// Denies reading a file until the returned restore runs: an Everyone deny entry
// on Windows, no permission bits elsewhere.
function denyRead(path) {
  if (process.platform !== "win32") {
    chmodSync(path, 0);
    return () => chmodSync(path, 0o644);
  }
  const icacls = (...args) => {
    const result = spawnSync("icacls", [path, ...args], { encoding: "utf8" });
    assert.equal(result.status, 0, `icacls ${args.join(" ")}: ${result.stdout}${result.stderr}`);
  };
  icacls("/deny", "*S-1-1-0:(R)");
  return () => icacls("/remove:d", "*S-1-1-0");
}

// The lines under one heading of the report, up to the next blank line.
function section(stdout, heading) {
  const lines = stdout.replace(/\r\n/g, "\n").split("\n");
  const start = lines.indexOf(heading);
  assert.notEqual(start, -1, `missing heading "${heading}" in:\n${stdout}`);
  const end = lines.indexOf("", start);
  return lines.slice(start + 1, end === -1 ? undefined : end);
}

// A workspace monorepo: a web app, a Python service and a Go worker, plus
// manifests the scan must not read.
function monorepo(repo) {
  write(repo, "package.json", JSON.stringify({
    name: "acme",
    dependencies: { react: "^19.0.0", zod: "^3.0.0" },
    devDependencies: { typescript: "^5.0.0", vitest: "^3.0.0" },
    peerDependencies: { lodash: "*" },
  }));
  write(repo, "apps/web/package.json", JSON.stringify({
    dependencies: { "@acme/api-client": "workspace:*", react: "^19.0.0", "@supabase/supabase-js": "^2.0.0" },
  }));
  write(repo, "api/pyproject.toml", [
    "[project]",
    'name = "acme-api"',
    "dependencies = [",
    '    "FastAPI[standard]>=0.115",  # web framework, see [docs]',
    "    'httpx>=0.27',",
    `    "Pydantic_Settings ; python_version >= '3.12'",`,
    "]",
    "",
    "[project.optional-dependencies]",
    'worker = ["celery[redis]>=5"]',
    "",
    "[dependency-groups]",
    'dev = ["pytest"]',
    "",
    "[tool.other]",
    'dependencies = ["not-a-dependency"]',
    "",
  ].join("\n"));
  write(repo, "services/worker/go.mod", "module example.com/worker\n");
  // Not read: installed packages, a virtual environment, build output and a
  // manifest three levels down.
  write(repo, "node_modules/left-pad/package.json", JSON.stringify({ dependencies: { "installed-dep": "1.0.0" } }));
  write(repo, ".venv/lib/pyproject.toml", '[project]\ndependencies = ["venv-dep"]\n');
  write(repo, "dist/package.json", JSON.stringify({ dependencies: { "built-dep": "1.0.0" } }));
  write(repo, "dist/Cargo.toml", "[package]\n");
  write(repo, "a/b/c/package.json", JSON.stringify({ dependencies: { "deep-dep": "1.0.0" } }));
  write(repo, "a/b/c/Gemfile", "source 'https://rubygems.org'\n");
}

test("each language found maps to its quality kit, or to no kit yet, with the manifests that showed it", (t) => {
  const { repo, scan } = setup(t);
  monorepo(repo);
  const result = scan(repo);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(section(result.stdout, "Languages and quality kit:"), [
    "- TypeScript/JavaScript: TypeScript kit (package.json, apps/web/package.json)",
    "- Python: Python kit (api/pyproject.toml)",
    "- Go: no kit yet (services/worker/go.mod)",
  ]);
});

test("library pages apply by a direct dependency's name or by a language found", (t) => {
  const { repo, scan } = setup(t);
  monorepo(repo);
  const result = scan(repo);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(section(result.stdout, "Library pages that apply:"), [
    "- FastAPI (patterns/fastapi.md): fastapi",
    "- Python patterns (patterns/python.md): Python",
    "- React composition (patterns/react-composition.md): react",
    "- Supabase (patterns/supabase.md): @supabase/supabase-js",
    "- TypeScript patterns (patterns/typescript.md): TypeScript/JavaScript",
  ]);
});

// Direct runtime dependencies only: package.json dependencies and pyproject's
// [project] dependencies and optional groups. Not dev, peer or workspace links,
// [dependency-groups], another table's dependencies key, comments, or anything
// in a skipped folder. Python names are compared in their normalised form.
test("uncovered dependencies are the direct runtime ones no page names", (t) => {
  const { repo, scan } = setup(t);
  monorepo(repo);
  const result = scan(repo);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(section(result.stdout, "Direct runtime dependencies with no library page:"), [
    "- celery",
    "- httpx",
    "- pydantic-settings",
    "- zod",
  ]);
});

// The [project] dependencies however TOML spells them: a quoted key, an inline
// table of groups, dotted groups, a dotted key from the root table and a quoted
// table header. A dotted key under another table is that table's, not [project]'s.
test("pyproject dependencies are read from quoted keys, inline tables and dotted keys", (t) => {
  const { repo, scan } = setup(t);
  write(repo, "svc-a/pyproject.toml", [
    "[project]",
    'name = "a"',
    '"dependencies" = ["alpha-quoted"]',
    'optional-dependencies = { web = ["beta-inline"], model = ["gamma-inline"] }',
    "",
  ].join("\n"));
  write(repo, "svc-b/pyproject.toml", [
    "[project]",
    'optional-dependencies.web = ["delta-dotted"]',
    "'optional-dependencies'.cli = ['epsilon-dotted']",
    "",
  ].join("\n"));
  write(repo, "svc-c/pyproject.toml", [
    'project.dependencies = ["zeta-root-dotted"]',
    "",
    '[project."optional-dependencies"]',
    '"eta" = ["eta-quoted-header"]',
    "",
    "[tool.x]",
    'project.dependencies = ["not-a-dependency"]',
    "",
  ].join("\n"));
  const result = scan(repo);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(section(result.stdout, "Direct runtime dependencies with no library page:"), [
    "- alpha-quoted",
    "- beta-inline",
    "- delta-dotted",
    "- epsilon-dotted",
    "- eta-quoted-header",
    "- gamma-inline",
    "- zeta-root-dotted",
  ]);
});

// String contents are text, never keys, headers or extra items: escaped quotes
// inside a marker, an example table inside a multiline readme, brackets and a
// hash inside a literal string, and a basic string ending in an escaped backslash.
test("pyproject string contents never become dependencies", (t) => {
  const { repo, scan } = setup(t);
  write(repo, "pyproject.toml", [
    "[project]",
    'name = "c"',
    'dependencies = ["fastapi; python_version >= \\"3.12\\" and python_version < \\"4\\"", "httpx"]',
    'readme.text = """',
    "Install the extras:",
    "",
    "[project.optional-dependencies]",
    'demo = ["invented-package"]',
    '"""',
    "readme.content-type = 'text/markdown'",
    "description = '''a literal with \"quotes\", [brackets] and # no comment'''",
    'license = { text = "ends in a backslash \\\\" }',
    'optional-dependencies.cli = ["typer"]',
    "",
  ].join("\n"));
  const result = scan(repo);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(section(result.stdout, "Library pages that apply:"), [
    "- FastAPI (patterns/fastapi.md): fastapi",
    "- Python patterns (patterns/python.md): Python",
  ]);
  assert.deepEqual(section(result.stdout, "Direct runtime dependencies with no library page:"), ["- httpx", "- typer"]);
});

// Basic strings decode TOML's escapes, in keys and values, including a
// multiline string's line-ending backslash; literal strings keep them as text.
test("pyproject basic-string escapes are decoded and literal strings are not", (t) => {
  const { repo, scan } = setup(t);
  write(repo, "pyproject.toml", [
    "[project]",
    '"\\u0064ependencies" = ["\\u0066astapi", "\\U00000068ttpx", "\\tsniffio"]',
    'optional-dependencies.cli = ["""ty\\',
    '    per"""]',
    "'\\u006fptional-dependencies'.x = ['not-a-dependency']",
    "",
  ].join("\n"));
  const result = scan(repo);
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /^NOTE/m);
  assert.deepEqual(section(result.stdout, "Library pages that apply:"), [
    "- FastAPI (patterns/fastapi.md): fastapi",
    "- Python patterns (patterns/python.md): Python",
  ]);
  assert.deepEqual(section(result.stdout, "Direct runtime dependencies with no library page:"), ["- httpx", "- sniffio", "- typer"]);
});

test("a pyproject.toml with an escape TOML does not define is noted and its dependencies skipped", (t) => {
  const { repo, scan } = setup(t);
  write(repo, "package.json", JSON.stringify({ dependencies: { zod: "^3.0.0" } }));
  write(repo, "a/pyproject.toml", '[project]\ndependencies = ["\\x66astapi"]\n');
  write(repo, "b/pyproject.toml", '[project]\ndependencies = ["\\u00zzastapi"]\n');
  write(repo, "c/pyproject.toml", '[project]\ndependencies = ["\\ud800astapi"]\n');
  const result = scan(repo);
  assert.equal(result.status, 0, result.stderr);
  for (const folder of ["a", "b", "c"]) {
    assert.match(result.stdout, new RegExp(`^NOTE ${folder}/pyproject\\.toml: could not be read as TOML; its dependencies were skipped\\.$`, "m"));
  }
  assert.deepEqual(section(result.stdout, "Direct runtime dependencies with no library page:"), ["- zod"]);
});

test("a pyproject.toml that is not valid TOML is noted and its dependencies skipped", (t) => {
  const { repo, scan } = setup(t);
  write(repo, "package.json", JSON.stringify({ dependencies: { zod: "^3.0.0" } }));
  write(repo, "api/pyproject.toml", '[project]\ndependencies = ["httpx", "unterminated]\n');
  const result = scan(repo);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^NOTE api\/pyproject\.toml: could not be read as TOML; its dependencies were skipped\.$/m);
  assert.deepEqual(section(result.stdout, "Direct runtime dependencies with no library page:"), ["- zod"]);
});

test("a manifest that cannot be read is noted and its dependencies skipped", (t) => {
  if (process.getuid?.() === 0) return t.skip("root can read any file");
  const { repo, scan } = setup(t);
  write(repo, "package.json", JSON.stringify({ dependencies: { zod: "^3.0.0" } }));
  write(repo, "api/pyproject.toml", '[project]\ndependencies = ["httpx"]\n');
  const restore = denyRead(join(repo, "api/pyproject.toml"));
  let result;
  try {
    result = scan(repo);
  } finally {
    restore();
  }
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^NOTE api\/pyproject\.toml: could not be read as TOML; its dependencies were skipped\.$/m);
  assert.deepEqual(section(result.stdout, "Direct runtime dependencies with no library page:"), ["- zod"]);
});

test("npm optionalDependencies are direct runtime dependencies", (t) => {
  const { repo, scan } = setup(t);
  write(repo, "package.json", JSON.stringify({
    dependencies: { zod: "^3.0.0" },
    optionalDependencies: { fsevents: "^2.3.0" },
    devDependencies: { vitest: "^3.0.0" },
  }));
  const result = scan(repo);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(section(result.stdout, "Direct runtime dependencies with no library page:"), ["- fsevents", "- zod"]);
});

test("a manifest that starts with a UTF-8 byte order mark is read normally", (t) => {
  const { repo, scan } = setup(t);
  write(repo, "package.json", `﻿${JSON.stringify({ dependencies: { zod: "^3.0.0" } })}`);
  write(repo, "api/pyproject.toml", '﻿[project]\ndependencies = ["httpx"]\n');
  const result = scan(repo);
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /^NOTE/m);
  assert.deepEqual(section(result.stdout, "Direct runtime dependencies with no library page:"), ["- httpx", "- zod"]);
});

// Manifests stay the primary evidence; a language with none is found by its
// source files, within the same depth and skipped folders, and reported as
// incidental with no kit by default, whether or not it has a kit.
test("a language with no manifest is found by its source files and is incidental", (t) => {
  const { repo, scan } = setup(t);
  write(repo, "package.json", JSON.stringify({ name: "web" }));
  write(repo, "src/index.ts", "export {};\n");
  write(repo, "src/main.py", "print('hi')\n");
  write(repo, "src/util.py", "\n");
  write(repo, "tools/build.ps1", "Write-Output hi\n");
  write(repo, "composer.json", "{}\n");
  write(repo, "a/b/c/deep.go", "package deep\n");
  write(repo, "node_modules/x/index.rb", "\n");
  write(repo, ".tools/x.rs", "\n");
  const result = scan(repo);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(section(result.stdout, "Languages and quality kit:"), [
    "- TypeScript/JavaScript: TypeScript kit (package.json)",
    "- Python: incidental, no kit by default (source files: src/main.py and 1 more)",
    "- PHP: no kit yet (composer.json)",
    "- PowerShell: incidental, no kit by default (source files: tools/build.ps1)",
  ]);
});

test("a package.json that is not valid JSON is noted and its dependencies skipped", (t) => {
  const { repo, scan } = setup(t);
  write(repo, "package.json", JSON.stringify({ dependencies: { zod: "^3.0.0" } }));
  write(repo, "fixtures/broken/package.json", "{ not json");
  const result = scan(repo);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^NOTE fixtures\/broken\/package\.json: could not be read as JSON; its dependencies were skipped\.$/m);
  assert.deepEqual(section(result.stdout, "Direct runtime dependencies with no library page:"), ["- zod"]);
});

test("a repository with no manifest reports none in every list", (t) => {
  const { repo, scan } = setup(t);
  write(repo, "README.md", "# Nothing to build\n");
  const result = scan(repo);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(section(result.stdout, "Languages and quality kit:"), ["- none found"]);
  assert.deepEqual(section(result.stdout, "Library pages that apply:"), ["- none found"]);
  assert.deepEqual(section(result.stdout, "Direct runtime dependencies with no library page:"), ["- none found"]);
});

test("a missing repository folder or a stray option is a usage error", (t) => {
  const { repo, scan } = setup(t);
  for (const args of [[join(repo, "no-such-folder")], [], ["--json", repo]]) {
    const result = scan(...args);
    assert.equal(result.status, 2, `${args.join(" ")}: ${result.stdout}${result.stderr}`);
  }
});
