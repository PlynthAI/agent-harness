#!/usr/bin/env node
/**
 * MCP route parity for a repository: Claude Code reads `.mcp.json` and Codex
 * reads `.codex/config.toml`, and neither reads the other's file, so a
 * repository that gives both runtimes the same tools keeps two declarations.
 * This check reads both and reports where they drift:
 *
 * - a server declared for one runtime only (missing-claude, missing-codex)
 * - the same server on different URLs (url-mismatch)
 * - a secret written into either file instead of an environment reference
 *   (token-literal; the value itself is never printed)
 * - a Supabase route without `read_only=true` or a `project_ref` pin, or
 *   with `apply_migration` still reachable on either runtime
 * - a Vercel route not pinned to a team and project
 *
 * A Codex entry with `enabled = false` is not a route. An entry with only
 * `enabled = true` opts in to a definition the user config carries (a
 * DNS provider's modules, say), so its URL or command is not compared.
 *
 * Usage: node checks/mcp-parity.mjs <repository> [<repository> ...]
 * Exit 0 with no findings, 1 with findings, 2 when it could not run.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const USAGE = "Usage: node checks/mcp-parity.mjs <repository> [<repository> ...]";

// A value that looks like a credential: long enough, one token of safe
// characters, and not an environment reference.
function looksLikeSecret(value) {
  if (typeof value !== "string") return false;
  const bare = value.replace(/^Bearer\s+/i, "").trim();
  if (bare.includes("${")) return false;
  return bare.length >= 16 && /^[A-Za-z0-9_.\-]+$/.test(bare);
}

// Minimal TOML reading for `[mcp_servers.<name>]` tables and their `env`
// sub-tables: strings, booleans, numbers and arrays of strings. Other tables
// are skipped. This is not a TOML parser and does not try to be.
export function parseCodexServers(text) {
  const servers = {};
  let target = null;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#")) continue;
    const header = line.match(/^\[\[?\s*(.+?)\s*\]\]?$/);
    if (header) {
      target = null;
      if (line.startsWith("[[")) continue;
      const path = splitTablePath(header[1]);
      if (path[0] !== "mcp_servers" || path.length < 2 || path.length > 3) continue;
      const name = path[1];
      servers[name] ??= {};
      if (path.length === 2) target = servers[name];
      else if (path[2] === "env") target = servers[name].env ??= {};
      else if (path[2] === "http_headers") target = servers[name].http_headers ??= {};
      continue;
    }
    if (!target) continue;
    const pair = line.match(/^("[^"]*"|'[^']*'|[A-Za-z0-9_\-]+)\s*=\s*(.+)$/);
    if (!pair) continue;
    const key = pair[1].replace(/^["']|["']$/g, "");
    let value = stripValueComment(pair[2]).trim();
    if (value.startsWith("[")) {
      // In a flat string array, the closing bracket ends the value after comments.
      while (!value.endsWith("]") && i + 1 < lines.length) {
        value += "\n" + stripValueComment(lines[++i]).trim();
      }
    }
    target[key] = parseValue(value);
  }
  return servers;
}

function splitTablePath(text) {
  const parts = [];
  let current = "";
  let quote = null;
  for (const ch of text) {
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === ".") { parts.push(current.trim()); current = ""; }
    else current += ch;
  }
  parts.push(current.trim());
  return parts;
}

function stripValueComment(text) {
  return text.replace(/"(?:[^"\\]|\\.)*"|'[^']*'|#.*$/g, (token) => token.startsWith("#") ? "" : token);
}

function parseValue(text) {
  const value = text.trim();
  if (value === "true") return true;
  if (value === "false") return false;
  const quoted = value.match(/^"((?:[^"\\]|\\.)*)"$/) ?? value.match(/^'([^']*)'$/);
  if (quoted) return quoted[1].replace(/\\"/g, '"');
  if (value.startsWith("[")) {
    return [...value.matchAll(/"((?:[^"\\]|\\.)*)"|'([^']*)'/g)].map((m) => (m[1] ?? m[2]).replace(/\\"/g, '"'));
  }
  const number = Number(value.replace(/_/g, ""));
  return Number.isNaN(number) ? value : number;
}

function readClaudeServers(dir) {
  const file = join(dir, ".mcp.json");
  if (!existsSync(file)) return {};
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  return parsed?.mcpServers && typeof parsed.mcpServers === "object" ? parsed.mcpServers : {};
}

function readClaudeDeny(dir) {
  const file = join(dir, ".claude", "settings.json");
  if (!existsSync(file)) return [];
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  return Array.isArray(parsed?.permissions?.deny) ? parsed.permissions.deny : [];
}

function readCodexServers(dir) {
  const file = join(dir, ".codex", "config.toml");
  if (!existsSync(file)) return {};
  const all = parseCodexServers(readFileSync(file, "utf8"));
  const active = {};
  for (const [name, entry] of Object.entries(all)) {
    if (entry.enabled === false) continue;
    active[name] = { ...entry, inherited: !entry.url && !entry.command };
  }
  return active;
}

function hostOf(url) {
  try { return new URL(url).host; } catch { return ""; }
}

export function checkRepository(dir) {
  const claude = readClaudeServers(dir);
  const codex = readCodexServers(dir);
  const deny = readClaudeDeny(dir);
  const findings = [];
  const add = (code, server, message) => findings.push({ code, server, message });

  const names = [...new Set([...Object.keys(claude), ...Object.keys(codex)])].sort();
  const servers = names.map((name) => ({ name, claude: claude[name] ?? null, codex: codex[name] ?? null }));

  for (const { name, claude: c, codex: x } of servers) {
    if (!c) add("missing-claude", name, `${name}: declared in .codex/config.toml but not in .mcp.json`);
    if (!x) add("missing-codex", name, `${name}: declared in .mcp.json but not in .codex/config.toml`);
    if (c && x && c.url && x.url && c.url !== x.url) {
      add("url-mismatch", name, `${name}: .mcp.json and .codex/config.toml name different URLs`);
    }

    if (c) {
      for (const [key, value] of Object.entries(c.headers ?? {})) {
        if (looksLikeSecret(value)) add("token-literal", name, `${name}: header ${key} in .mcp.json holds a literal value; reference an environment variable`);
      }
      for (const [key, value] of Object.entries(c.env ?? {})) {
        if (looksLikeSecret(value)) add("token-literal", name, `${name}: env ${key} in .mcp.json holds a literal value; reference an environment variable`);
      }
    }
    if (x) {
      if (x.bearer_token !== undefined) add("token-literal", name, `${name}: bearer_token in .codex/config.toml is a literal; use bearer_token_env_var`);
      for (const [key, value] of Object.entries(x.http_headers ?? {})) {
        if (looksLikeSecret(value)) add("token-literal", name, `${name}: http_headers ${key} in .codex/config.toml holds a literal value`);
      }
      for (const [key, value] of Object.entries(x.env ?? {})) {
        if (looksLikeSecret(value)) add("token-literal", name, `${name}: env ${key} in .codex/config.toml holds a literal value; keep the definition in the user config and opt in here`);
      }
    }

    const urls = new Map();
    if (c?.url) urls.set(c.url, [...(urls.get(c.url) ?? []), ".mcp.json"]);
    if (x?.url) urls.set(x.url, [...(urls.get(x.url) ?? []), ".codex/config.toml"]);

    const isSupabase = name === "supabase" || [...urls.keys()].some((u) => hostOf(u) === "mcp.supabase.com");
    const isVercel = name === "vercel" || [...urls.keys()].some((u) => hostOf(u) === "mcp.vercel.com");

    if (isSupabase) {
      for (const [url, sides] of urls) {
        let query;
        try { query = new URL(url).searchParams; } catch { continue; }
        if (query.get("read_only") !== "true") add("supabase-not-read-only", name, `${name}: ${sides.join(" and ")} without read_only=true`);
        if (!query.get("project_ref")) add("supabase-no-project-pin", name, `${name}: ${sides.join(" and ")} without a project_ref pin`);
      }
      if (x && !x.inherited && !(x.disabled_tools ?? []).includes("apply_migration")) {
        add("apply-migration-reachable", name, `${name}: .codex/config.toml does not list apply_migration in disabled_tools`);
      }
      if (c && !deny.includes(`mcp__${name}__apply_migration`)) {
        add("apply-migration-reachable", name, `${name}: .claude/settings.json does not deny mcp__${name}__apply_migration`);
      }
    }

    if (isVercel) {
      for (const [url, sides] of urls) {
        let segments;
        try { segments = new URL(url).pathname.split("/").filter(Boolean); } catch { continue; }
        if (segments.length !== 2) add("vercel-unpinned", name, `${name}: ${sides.join(" and ")} not pinned to a team and project (https://mcp.vercel.com/<team>/<project>)`);
      }
    }
  }

  return { dir, servers, findings };
}

function describe(side) {
  if (!side) return "-";
  if (side.inherited) return "(definition in user config)";
  return side.url ?? side.command ?? "(no url or command)";
}

function main(args) {
  if (args.length === 0) {
    console.error(USAGE);
    return 2;
  }
  let failed = false;
  for (const arg of args) {
    const dir = resolve(arg);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) {
      console.error(`${arg}: not a directory`);
      return 2;
    }
    const result = checkRepository(dir);
    console.log(`${dir}`);
    if (result.servers.length === 0) console.log("  no MCP routes in either runtime file");
    for (const s of result.servers) {
      console.log(`  ${s.name}`);
      console.log(`    .mcp.json           ${describe(s.claude)}`);
      console.log(`    .codex/config.toml  ${describe(s.codex)}`);
    }
    for (const f of result.findings) console.log(`  ! ${f.code}: ${f.message}`);
    if (result.findings.length > 0) failed = true;
    console.log(result.findings.length === 0 ? "  parity ok" : `  ${result.findings.length} finding(s)`);
  }
  return failed ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
