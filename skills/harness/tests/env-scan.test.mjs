/**
 * Behaviour of the environment inventory through its command line, against a
 * scratch repository. The real .env file carries a sentinel value that must
 * never reach the output.
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("../scripts/env-scan.mjs", import.meta.url));
const SENTINEL = ["sentinel", "value", "never", "printed"].join("-");

function repo(t, files) {
  const root = mkdtempSync(join(tmpdir(), "env-scan-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

const scan = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: "utf8", timeout: 60000 });

function section(text, title) {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.startsWith(`## ${title}`));
  assert.ok(start >= 0, `no section ${title}`);
  const rows = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("## ")) break;
    if (line.startsWith("- ")) rows.push(line.slice(2));
  }
  return rows;
}

test("--help prints usage and bad arguments are refused", () => {
  const help = scan("--help");
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage: node env-scan\.mjs <repository>/);
  assert.equal(scan().status, 2);
  assert.equal(scan(join(tmpdir(), "no-such-folder-env-scan")).status, 2);
});

test("variables are reconciled between the example file and the code, by name only", (t) => {
  const root = repo(t, {
    ".env.example": "# From the Supabase dashboard\nSUPABASE_URL=\n\nPUBLIC_SITE_URL=https://example.com\nUNUSED_FLAG=1\n",
    ".env.local": `STRIPE_SECRET_KEY=${SENTINEL}\n`,
    "src/server.ts": "const key = process.env.STRIPE_SECRET_KEY; const url = process.env['SUPABASE_URL'];\nconst shell = process.env.ComSpec; const mode = process.env.NODE_ENV;\n",
    "src/page.astro": "---\nconst site = import.meta.env.PUBLIC_SITE_URL;\n---\n",
    "worker/main.py": "import os\nTOKEN = os.environ.get('WORKER_TOKEN')\n",
    "node_modules/pkg/index.js": "process.env.FROM_A_DEPENDENCY\n",
  });
  const r = scan(root);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!r.stdout.includes(SENTINEL), "a value from a real .env reached the output");
  assert.deepEqual(section(r.stdout, "Environment variables"), [
    "PUBLIC_SITE_URL: plain; declared in .env.example; used in src/page.astro",
    "STRIPE_SECRET_KEY: secret; UNDECLARED; used in src/server.ts",
    "SUPABASE_URL: plain; declared in .env.example; used in src/server.ts; note: From the Supabase dashboard",
    "UNUSED_FLAG: plain; declared, unused in .env.example; not referenced in code",
    "WORKER_TOKEN: secret; UNDECLARED; used in worker/main.py",
  ]);
  assert.deepEqual(section(r.stdout, "Real .env files present"), [".env.local"]);
});

test("a commented-out value is never printed, and platform-looking secrets are still listed", (t) => {
  const root = repo(t, {
    ".env.example": `# OPENAI_API_KEY=${SENTINEL}\nOPENAI_API_KEY=\n`,
    "src/deploy.ts": "process.env.VERCEL_TOKEN; process.env.GITHUB_CLIENT_SECRET; process.env.VERCEL_URL; process.env.GITHUB_SHA;\n",
  });
  const r = scan(root);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!r.stdout.includes(SENTINEL), "a commented-out value reached the output");
  assert.deepEqual(section(r.stdout, "Environment variables"), [
    "GITHUB_CLIENT_SECRET: secret; UNDECLARED; used in src/deploy.ts",
    "OPENAI_API_KEY: secret; declared, unused in .env.example; not referenced in code",
    "VERCEL_TOKEN: secret; UNDECLARED; used in src/deploy.ts",
  ]);
});

test("Laravel env(), compose interpolation and multi-suffix dotenv files count; tests do not", (t) => {
  const root = repo(t, {
    "config/database.php": "<?php return ['password' => env('DB_PASSWORD')];\n",
    "compose.yaml": "services:\n  app:\n    image: app\n    environment:\n      DATABASE_URL: ${DATABASE_URL:-postgres://localhost}\n",
    ".env.production.local": `X=${SENTINEL}\n`,
    ".env.development.local.example": "LOCAL_ONLY=\n",
    "tests/fixture.test.ts": "process.env.FAKE_KEY\n",
    "src/app.spec.ts": "process.env.SPEC_ONLY\n",
  });
  const r = scan(root);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!r.stdout.includes(SENTINEL));
  assert.deepEqual(section(r.stdout, "Environment variables"), [
    "DATABASE_URL: secret; UNDECLARED; used in compose.yaml",
    "DB_PASSWORD: secret; UNDECLARED; used in config/database.php",
    "LOCAL_ONLY: plain; declared, unused in .env.development.local.example; not referenced in code",
  ]);
  assert.deepEqual(section(r.stdout, "Real .env files present"), [".env.production.local"]);
});

test("runtimes, implied tools, services, automation, CI and setup hooks are listed with their source", (t) => {
  const root = repo(t, {
    "package.json": JSON.stringify({ packageManager: "pnpm@10.34.6", engines: { node: ">=24" }, devDependencies: { "@playwright/test": "1", prisma: "6" } }),
    "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
    ".node-version": "24\n",
    "mise.toml": "[tools]\nuv = \"0.9\"\n\n[env]\nX = '1'\n",
    "compose.yaml": "services:\n  db:\n    image: postgres:17\n  cache:\n    image: redis:7\n",
    ".github/dependabot.yml": "version: 2\nupdates:\n  - package-ecosystem: npm\n  - package-ecosystem: github-actions\n",
    ".github/workflows/ci.yml": "jobs:\n  t:\n    env:\n      TOKEN: ${{ secrets.NPM_TOKEN }}\n",
    ".claude/settings.json": JSON.stringify({ hooks: { SessionStart: [] } }),
    "scripts/setup-env.sh": "#!/bin/bash\n",
  });
  const r = scan(root);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(section(r.stdout, "Runtimes and package managers"), [
    "package manager pnpm@10.34.6 (package.json packageManager)",
    "node >=24 (package.json engines)",
    "node 24 (.node-version)",
    "pnpm lockfile (pnpm-lock.yaml)",
    "uv 0.9 (mise.toml)",
  ]);
  assert.deepEqual(section(r.stdout, "Tools the dependencies imply"), [
    "Playwright browsers (package.json: playwright)",
    "Prisma engines, generated at install (package.json: prisma)",
  ]);
  assert.deepEqual(section(r.stdout, "Services"), ["db: postgres:17 (compose.yaml)", "cache: redis:7 (compose.yaml)"]);
  assert.deepEqual(section(r.stdout, "Update automation"), ["Dependabot (.github/dependabot.yml): npm, github-actions"]);
  assert.deepEqual(section(r.stdout, "CI secrets referenced"), ["NPM_TOKEN (.github/workflows/ci.yml)"]);
  assert.deepEqual(section(r.stdout, "CI workflows"), [".github/workflows/ci.yml"]);
  assert.deepEqual(section(r.stdout, "Setup and agent instructions"), [
    "Claude Code SessionStart hook (.claude/settings.json)",
    "setup script (scripts/setup-env.sh)",
  ]);
});

test("an empty repository reports every section as none found", (t) => {
  const r = scan(repo(t, { "README.md": "# empty\n" }));
  assert.equal(r.status, 0, r.stderr);
  assert.equal((r.stdout.match(/- none found/g) ?? []).length, 9);
});
