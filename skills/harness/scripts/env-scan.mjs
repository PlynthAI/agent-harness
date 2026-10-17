#!/usr/bin/env node
/**
 * The environment inventory: what a repository needs from the machine it runs
 * on, read from its own files, so a cloud environment can be packaged and the
 * user asked only for what an agent cannot supply. Read-only. It reports names,
 * never values: a real .env file is listed as present and never opened.
 *
 * Exit 0 after a scan, 2 when it could not run.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const USAGE = `Usage: node env-scan.mjs <repository>

Prints the repository's environment inventory as Markdown: runtimes and the
package manager, pinned tools, environment variables (declared in an example
file, referenced in code, or both, with the likely secrets marked), services,
update automation, CI workflows and existing setup hooks. Names only; no value
is read or printed.`;

const SKIP = new Set(["node_modules", "venv", "env", "__pycache__", "dist", "build", "out", "target", "coverage", "vendor"]);
const CODE = /\.(?:[cm]?[jt]sx?|astro|vue|svelte|py|rb|go|rs|php|ex|exs|sh|ps1|ya?ml|toml)$/i;
const EXAMPLE = /^\.env(?:\.[\w-]+)*\.(?:example|sample|template|dist)$/i;
const REAL_ENV = /^\.env(?:\.[\w-]+)*$/;
// Tests and fixtures name variables as data, not as configuration the app reads.
const TEST_PATH = /(?:^|\/)(?:tests?|__tests__|fixtures?|__fixtures__)\/|\.(?:test|spec)\.[\w]+$/i;
const COMPOSE = /^(?:docker-)?compose(?:\.[\w-]+)?\.ya?ml$/i;
const MAX_BYTES = 512 * 1024;
const MAX_DEPTH = 6;
// Names a secret store, not ordinary configuration.
const SECRET = /(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD|PRIVATE|CREDENTIAL|DSN|AUTH|COOKIE|SIGNING|DATABASE_URL|_URL_WITH_AUTH)/i;
// Set by the runtime or the platform, never by the user.
// A name that also looks like a secret is never treated as platform-set.
const PLATFORM = /^(?:NODE_ENV|NODE_OPTIONS|CI|PORT|HOST|HOME|PATH|PWD|TZ|LANG|SHELL|USER|USERNAME|TERM|TMP|TEMP|TMPDIR|APPDATA|LOCALAPPDATA|USERPROFILE|ComSpec|SystemRoot|ProgramFiles|PATHEXT|XDG_\w+|VERCEL|VERCEL_(?:ENV|URL|BRANCH_URL|PROJECT_PRODUCTION_URL|REGION|GIT_\w+)|NEXT_RUNTIME|NEXT_PHASE|npm_\w+|GITHUB_(?:ACTIONS|SHA|REF|REF_NAME|REPOSITORY|RUN_ID|RUN_NUMBER|WORKSPACE|EVENT_NAME|ACTOR|OUTPUT|ENV|STEP_SUMMARY)|RUNNER_\w+|CLAUDE_CODE_REMOTE|CLAUDE_PROJECT_DIR|CODEX_HOME|GIT_\w+)$/i;
const platformSet = (name) => PLATFORM.test(name) && !SECRET.test(name);

// Reference shapes: process.env.X, process.env["X"], import.meta.env.X,
// Deno.env.get("X"), Bun.env.X, os.environ["X"], os.environ.get("X"),
// os.getenv("X"), ENV["X"], ENV.fetch("X"), env("X"), $env:X, and ${X} in
// compose files (COMPOSE_REFERENCE).
const REFERENCES = [
  /process\.env\.([A-Za-z_][A-Za-z0-9_]*)/g,
  /process\.env\[\s*["'`]([A-Za-z_][A-Za-z0-9_]*)["'`]\s*\]/g,
  /import\.meta\.env\.([A-Za-z_][A-Za-z0-9_]*)/g,
  /(?:Deno\.env\.get|os\.getenv|os\.environ\.get|ENV\.fetch|\bgetenv|\benv)\(\s*["']([A-Za-z_][A-Za-z0-9_]*)["']/g,
  /Bun\.env\.([A-Za-z_][A-Za-z0-9_]*)/g,
  /(?:os\.environ|ENV)\[\s*["']([A-Za-z_][A-Za-z0-9_]*)["']\s*\]/g,
  /\$env:([A-Za-z_][A-Za-z0-9_]*)/g,
];
const COMPOSE_REFERENCE = /\$\{([A-Z_][A-Z0-9_]*)(?::?[-?+][^}]*)?\}/g;
const YAML_SECRET = /\$\{\{\s*secrets\.([A-Z_][A-Z0-9_]*)\s*\}\}/g;

function walk(root, relative = "", depth = 0, found = []) {
  let entries;
  try { entries = readdirSync(resolve(root, relative), { withFileTypes: true }); } catch { return found; }
  for (const entry of entries) {
    const path = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isFile()) found.push(path);
    else if (entry.isDirectory() && depth < MAX_DEPTH && !SKIP.has(entry.name)
      && (!entry.name.startsWith(".") || entry.name === ".github" || entry.name === ".claude" || entry.name === ".devcontainer")) {
      walk(root, path, depth + 1, found);
    }
  }
  return found;
}

const read = (root, path) => {
  try {
    const full = resolve(root, path);
    if (statSync(full).size > MAX_BYTES) return "";
    return readFileSync(full, "utf8").replace(/^﻿/, "");
  } catch { return ""; }
};
const json = (text) => { try { return JSON.parse(text); } catch { return null; } };
const base = (path) => path.split("/").at(-1);
const list = (items) => (items.length ? items.map((item) => `- ${item}`) : ["- none found"]);

// Runtimes, package managers and pinned tools, each with the file that says so.
function runtimes(root, files) {
  const lines = [];
  const at = (name) => files.filter((path) => base(path) === name);
  for (const path of at("package.json")) {
    const manifest = json(read(root, path));
    if (!manifest) continue;
    if (manifest.packageManager) lines.push(`package manager ${manifest.packageManager} (${path} packageManager)`);
    if (manifest.engines?.node) lines.push(`node ${manifest.engines.node} (${path} engines)`);
  }
  const pins = { ".nvmrc": "node", ".node-version": "node", ".python-version": "python", ".ruby-version": "ruby", ".go-version": "go", "rust-toolchain": "rust" };
  for (const [name, tool] of Object.entries(pins)) {
    for (const path of at(name)) lines.push(`${tool} ${read(root, path).split(/\r?\n/)[0].trim()} (${path})`);
  }
  for (const path of at("pyproject.toml")) {
    const requires = /^\s*requires-python\s*=\s*["']([^"']+)["']/m.exec(read(root, path));
    if (requires) lines.push(`python ${requires[1]} (${path} requires-python)`);
  }
  for (const path of at("go.mod")) {
    const version = /^go\s+(\S+)/m.exec(read(root, path));
    if (version) lines.push(`go ${version[1]} (${path})`);
  }
  const locks = { "pnpm-lock.yaml": "pnpm", "package-lock.json": "npm", "yarn.lock": "yarn", "bun.lock": "bun", "bun.lockb": "bun", "uv.lock": "uv", "poetry.lock": "poetry", "Pipfile.lock": "pipenv", "Cargo.lock": "cargo", "Gemfile.lock": "bundler" };
  for (const [name, manager] of Object.entries(locks)) for (const path of at(name)) lines.push(`${manager} lockfile (${path})`);
  for (const path of at(".tool-versions")) {
    for (const line of read(root, path).split(/\r?\n/)) if (line.trim() && !line.startsWith("#")) lines.push(`${line.trim()} (${path})`);
  }
  for (const path of [...at("mise.toml"), ...at(".mise.toml")]) {
    const tools = /^\[tools\]\s*$([\s\S]*?)(?=^\[|(?![\s\S]))/m.exec(read(root, path));
    for (const line of (tools?.[1] ?? "").split(/\r?\n/)) {
      const pair = /^\s*["']?([\w@/:.-]+)["']?\s*=\s*(.+?)\s*$/.exec(line);
      if (pair) lines.push(`${pair[1]} ${pair[2].replace(/^["']|["']$/g, "")} (${path})`);
    }
  }
  return lines;
}

// Tools the project's own dependencies imply the machine must provide.
function impliedTools(root, files) {
  const lines = [];
  for (const path of files.filter((p) => base(p) === "package.json")) {
    const manifest = json(read(root, path));
    if (!manifest) continue;
    const deps = { ...manifest.dependencies, ...manifest.devDependencies };
    if (deps["@playwright/test"] || deps.playwright) lines.push(`Playwright browsers (${path}: playwright)`);
    if (deps.puppeteer) lines.push(`a Chromium for Puppeteer (${path}: puppeteer)`);
    if (deps.prisma) lines.push(`Prisma engines, generated at install (${path}: prisma)`);
    if (deps.supabase) lines.push(`Supabase CLI, with Docker for a local stack (${path}: supabase)`);
    if (deps.vercel) lines.push(`Vercel CLI (${path}: vercel)`);
    if (deps.wrangler) lines.push(`Cloudflare Wrangler (${path}: wrangler)`);
  }
  for (const path of files.filter((p) => /\.ps1$/i.test(p)).slice(0, 1)) lines.push(`PowerShell 7 for .ps1 scripts (${path} and others)`);
  return lines;
}

// Environment variable names: declared in example files, referenced in code
// and CI. A real .env file is reported as present and never read.
function variables(root, files) {
  const declared = new Map(); // name -> { file, comment }
  const referenced = new Map(); // name -> Set of files
  const ciSecrets = new Map();
  const realEnv = [];
  for (const path of files) {
    const name = base(path);
    if (EXAMPLE.test(name)) {
      let comment = "";
      for (const line of read(root, path).split(/\r?\n/)) {
        const note = /^\s*#\s*(.*)$/.exec(line);
        // A commented-out assignment can hold a real value: never keep it as a note.
        if (note) { comment = /^(?:export\s+)?[A-Za-z_]\w*\s*=/.test(note[1]) ? "" : note[1].trim(); continue; }
        const pair = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
        if (pair && !declared.has(pair[1])) declared.set(pair[1], { file: path, comment });
        if (!line.trim()) comment = "";
      }
      continue;
    }
    if (REAL_ENV.test(name)) { realEnv.push(path); continue; }
    if (!CODE.test(name) || TEST_PATH.test(path)) continue;
    const text = read(root, path);
    if (!text) continue;
    const add = (map, key) => { if (!map.has(key)) map.set(key, new Set()); map.get(key).add(path); };
    for (const pattern of REFERENCES) for (const match of text.matchAll(pattern)) add(referenced, match[1]);
    if (COMPOSE.test(name)) for (const match of text.matchAll(COMPOSE_REFERENCE)) add(referenced, match[1]);
    if (path.startsWith(".github/")) for (const match of text.matchAll(YAML_SECRET)) add(ciSecrets, match[1]);
  }
  return { declared, referenced, ciSecrets, realEnv };
}

function variableLines({ declared, referenced }) {
  const names = [...new Set([...declared.keys(), ...referenced.keys()])].filter((name) => !platformSet(name)).sort();
  return names.map((name) => {
    const d = declared.get(name);
    const r = referenced.get(name);
    const where = r ? `used in ${[...r][0]}${r.size > 1 ? ` and ${r.size - 1} more` : ""}` : "not referenced in code";
    const status = d && r ? "declared" : d ? "declared, unused" : "UNDECLARED";
    const kind = SECRET.test(name) ? "secret" : "plain";
    return `${name}: ${kind}; ${status}${d ? ` in ${d.file}` : ""}; ${where}${d?.comment ? `; note: ${d.comment}` : ""}`;
  });
}

function services(root, files) {
  const lines = [];
  for (const path of files.filter((p) => COMPOSE.test(base(p)))) {
    const text = read(root, path);
    const block = /^services:\s*$([\s\S]*?)(?=^\S|(?![\s\S]))/m.exec(text)?.[1] ?? "";
    let current = "";
    for (const line of block.split(/\r?\n/)) {
      const service = /^ {2}([\w.-]+):\s*$/.exec(line);
      if (service) { current = service[1]; lines.push(`${current} (${path})`); continue; }
      const image = /^ {4}image:\s*["']?([^"'\s]+)/.exec(line);
      if (image && current) lines[lines.length - 1] = `${current}: ${image[1]} (${path})`;
    }
  }
  return lines;
}

function automation(root, files) {
  const lines = [];
  for (const path of files.filter((p) => /^\.github\/dependabot\.ya?ml$/.test(p))) {
    const ecosystems = [...read(root, path).matchAll(/package-ecosystem:\s*["']?([\w-]+)/g)].map((m) => m[1]);
    lines.push(`Dependabot (${path}): ${ecosystems.length ? ecosystems.join(", ") : "no ecosystems listed"}`);
  }
  for (const path of files.filter((p) => /^(?:\.github\/)?(?:renovate\.json5?|\.renovaterc(?:\.json)?)$/.test(p))) lines.push(`Renovate (${path})`);
  return lines;
}

function setupHooks(root, files) {
  const lines = [];
  for (const path of files.filter((p) => p === ".claude/settings.json")) {
    const settings = json(read(root, path));
    if (settings?.hooks?.SessionStart) lines.push(`Claude Code SessionStart hook (${path})`);
  }
  for (const path of files.filter((p) => /^\.devcontainer\/(?:.*\/)?devcontainer\.json$|^\.devcontainer\.json$/.test(p))) lines.push(`Dev Container (${path})`);
  for (const path of files.filter((p) => /^scripts\/(?:setup|bootstrap|cloud-setup|setup-env|install[_-]pkgs)[\w-]*\.(?:sh|mjs|ps1)$/.test(p))) lines.push(`setup script (${path})`);
  for (const path of files.filter((p) => base(p) === "AGENTS.md" || base(p) === "CLAUDE.md").slice(0, 4)) lines.push(`agent instructions (${path})`);
  return lines;
}

function main(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(USAGE);
    return 0;
  }
  if (argv.length !== 1 || argv[0].startsWith("-")) {
    console.error(USAGE);
    return 2;
  }
  const root = resolve(argv[0]);
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    console.error(`Cannot scan: ${root} is not a folder.`);
    return 2;
  }
  const files = walk(root).sort();
  const vars = variables(root, files);
  const workflows = files.filter((p) => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(p));

  const out = [`# Environment inventory: ${root}`, "",
    "Names only; no value was read. A real .env file is listed, never opened.", ""];
  const section = (title, lines) => out.push(`## ${title}`, ...list(lines), "");
  section("Runtimes and package managers", runtimes(root, files));
  section("Tools the dependencies imply", impliedTools(root, files));
  section("Environment variables", variableLines(vars));
  section("CI secrets referenced", [...vars.ciSecrets.keys()].sort().map((name) => `${name} (${[...vars.ciSecrets.get(name)].join(", ")})`));
  section("Real .env files present (not read; never commit or copy them)", vars.realEnv);
  section("Services", services(root, files));
  section("Update automation", automation(root, files));
  section("CI workflows", workflows);
  section("Setup and agent instructions", setupHooks(root, files));
  console.log(out.join("\n").trimEnd());
  return 0;
}

process.exitCode = main(process.argv.slice(2));
