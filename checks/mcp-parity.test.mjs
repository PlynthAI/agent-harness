// Fixture tests for checks/mcp-parity.mjs: the two runtime files a repository
// keeps for its MCP routes (.mcp.json for Claude Code, .codex/config.toml for
// Codex) declare the same servers the same way, with no secret in either.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { checkRepository, parseCodexServers } from "./mcp-parity.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const script = resolve(here, "mcp-parity.mjs");

const SUPABASE_URL =
  "https://mcp.supabase.com/mcp?project_ref=abcdefghijklmnopqrst&read_only=true&features=database,docs";
const VERCEL_URL = "https://mcp.vercel.com/example-team/example-app";

function makeRepo({ mcp, toml, claudeSettings } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "mcp-parity-"));
  if (mcp !== undefined) writeFileSync(join(dir, ".mcp.json"), JSON.stringify(mcp, null, 2));
  if (toml !== undefined) {
    mkdirSync(join(dir, ".codex"));
    writeFileSync(join(dir, ".codex", "config.toml"), toml);
  }
  if (claudeSettings !== undefined) {
    mkdirSync(join(dir, ".claude"));
    writeFileSync(join(dir, ".claude", "settings.json"), JSON.stringify(claudeSettings, null, 2));
  }
  return dir;
}

const goodMcp = {
  mcpServers: {
    supabase: { type: "http", url: SUPABASE_URL, headers: { Authorization: "Bearer ${SUPABASE_ACCESS_TOKEN}" } },
    vercel: { type: "http", url: VERCEL_URL },
  },
};
const goodToml = `# Frontend-only Codex baseline.

[mcp_servers.supabase]
url = "${SUPABASE_URL}"
bearer_token_env_var = "SUPABASE_ACCESS_TOKEN"
startup_timeout_sec = 120.0
required = false
disabled_tools = ["apply_migration"]

[mcp_servers.vercel]
url = "${VERCEL_URL}"
required = false

[plugins."supabase@claude-plugins-official"]
enabled = false
`;
const goodSettings = { permissions: { deny: ["mcp__supabase__apply_migration"] } };

const codes = (result) => result.findings.map((f) => f.code).sort();

test("a repository whose two files agree has no findings", () => {
  const dir = makeRepo({ mcp: goodMcp, toml: goodToml, claudeSettings: goodSettings });
  try {
    const result = checkRepository(dir);
    assert.deepEqual(result.findings, []);
    assert.deepEqual(result.servers.map((s) => s.name).sort(), ["supabase", "vercel"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("multiline MCP string arrays preserve parity and command success", () => {
  const expectedTools = ["inspect#]", 'quoted "tool"#]', "apply_migration"];
  const singleLine = String.raw`disabled_tools = ["inspect#]", "quoted \"tool\"#]", 'apply_migration']`;
  const multiline = String.raw`"disabled_tools" = [ # ] 'comment_only'
  "inspect#]", # ] "also_comment_only"

  "quoted \"tool\"#]",
  # A comment is not a disabled tool: "get_auth_token"
  'apply_migration',# trailing comma and ] 'another_comment'
]
enabled = true`;
  const baseline = makeRepo({
    mcp: goodMcp,
    toml: goodToml.replace('disabled_tools = ["apply_migration"]', `${singleLine}\nenabled = true`),
    claudeSettings: goodSettings,
  });
  try {
    const expected = checkRepository(baseline);
    assert.deepEqual(expected.findings, []);
    assert.deepEqual(expected.servers.find((s) => s.name === "supabase").codex.disabled_tools, expectedTools);
    for (const newline of ["\n", "\r\n"]) {
      const toml = goodToml.replace('disabled_tools = ["apply_migration"]', multiline).replace(/\n/g, newline);
      const dir = makeRepo({ mcp: goodMcp, toml, claudeSettings: goodSettings });
      try {
        const command = spawnSync(process.execPath, [script, dir], { encoding: "utf8" });
        assert.equal(command.status, 0, command.stdout + command.stderr);
        assert.match(command.stdout, /parity ok/);
        const result = checkRepository(dir);
        assert.deepEqual(result.findings, []);
        assert.deepEqual(result.servers, expected.servers);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  } finally {
    rmSync(baseline, { recursive: true, force: true });
  }
});

test("a server declared for one runtime only is a finding naming the missing side", () => {
  const mcp = { mcpServers: { supabase: goodMcp.mcpServers.supabase } };
  const dir = makeRepo({ mcp, toml: goodToml, claudeSettings: goodSettings });
  try {
    const result = checkRepository(dir);
    assert.deepEqual(codes(result), ["missing-claude"]);
    assert.match(result.findings[0].message, /vercel/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the same server with different URLs is a finding", () => {
  const mcp = structuredClone(goodMcp);
  mcp.mcpServers.vercel.url = "https://mcp.vercel.com/example-team/example-site";
  const dir = makeRepo({ mcp, toml: goodToml, claudeSettings: goodSettings });
  try {
    assert.deepEqual(codes(checkRepository(dir)), ["url-mismatch"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a token literal in either runtime file is a finding", () => {
  const mcp = structuredClone(goodMcp);
  mcp.mcpServers.supabase.headers.Authorization = "Bearer sbp_0123456789abcdef0123456789abcdef";
  const toml = goodToml.replace('bearer_token_env_var = "SUPABASE_ACCESS_TOKEN"', 'bearer_token = "sbp_0123456789abcdef0123456789abcdef"');
  const dir = makeRepo({ mcp, toml, claudeSettings: goodSettings });
  try {
    const result = checkRepository(dir);
    assert.deepEqual(codes(result), ["token-literal", "token-literal"]);
    assert.ok(result.findings.every((f) => !f.message.includes("sbp_0123456789")), "the secret itself is never printed");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a Supabase route without read_only=true or a project pin is a finding on each side it is missing", () => {
  const openUrl = "https://mcp.supabase.com/mcp?features=database";
  const mcp = structuredClone(goodMcp);
  mcp.mcpServers.supabase.url = openUrl;
  const toml = goodToml.split(SUPABASE_URL).join(openUrl);
  const dir = makeRepo({ mcp, toml, claudeSettings: goodSettings });
  try {
    assert.deepEqual(codes(checkRepository(dir)), ["supabase-no-project-pin", "supabase-not-read-only"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a Supabase route that leaves apply_migration reachable on either runtime is a finding", () => {
  const toml = goodToml.replace('disabled_tools = ["apply_migration"]\n', "");
  const dir = makeRepo({ mcp: goodMcp, toml, claudeSettings: { permissions: { deny: [] } } });
  try {
    const result = checkRepository(dir);
    assert.deepEqual(codes(result), ["apply-migration-reachable", "apply-migration-reachable"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a Vercel route that is not pinned to a team and project is a finding", () => {
  const mcp = structuredClone(goodMcp);
  mcp.mcpServers.vercel.url = "https://mcp.vercel.com";
  const toml = goodToml.split(VERCEL_URL).join("https://mcp.vercel.com");
  const dir = makeRepo({ mcp, toml, claudeSettings: goodSettings });
  try {
    assert.deepEqual(codes(checkRepository(dir)), ["vercel-unpinned"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a Codex entry switched off, and an opt-in to a user-level definition, are read as the repository means them", () => {
  const toml = `${goodToml}
[mcp_servers.blender]
command = "blender-mcp"
enabled = false

[mcp_servers.example-dns]
enabled = true
`;
  const mcp = structuredClone(goodMcp);
  mcp.mcpServers["example-dns"] = {
    type: "stdio", command: "npx", args: ["--package=example-dns-api-mcp@latest", "example-dns-mcp"],
    env: { API_TOKEN: "${EXAMPLE_DNS_API_TOKEN}" },
  };
  const dir = makeRepo({ mcp, toml, claudeSettings: goodSettings });
  try {
    const result = checkRepository(dir);
    assert.deepEqual(result.findings, []);
    const dns = result.servers.find((s) => s.name === "example-dns");
    assert.equal(dns.codex.inherited, true, "an enabled-only entry inherits its definition from the user config");
    assert.ok(!result.servers.some((s) => s.name === "blender"), "a disabled entry is not a route");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a stdio server whose environment carries a literal value in the repository file is a finding", () => {
  const mcp = structuredClone(goodMcp);
  mcp.mcpServers.tool = { type: "stdio", command: "tool-mcp", env: { API_TOKEN: "hst_live_0123456789abcdef" } };
  const toml = `${goodToml}
[mcp_servers.tool]
command = "tool-mcp"

[mcp_servers.tool.env]
API_TOKEN = "hst_live_0123456789abcdef"
`;
  const dir = makeRepo({ mcp, toml, claudeSettings: goodSettings });
  try {
    assert.deepEqual(codes(checkRepository(dir)), ["token-literal", "token-literal"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the Codex reader keeps only mcp_servers tables and their scalar, boolean and string-array values", () => {
  const servers = parseCodexServers(goodToml);
  assert.deepEqual(Object.keys(servers).sort(), ["supabase", "vercel"]);
  assert.equal(servers.supabase.url, SUPABASE_URL);
  assert.equal(servers.supabase.bearer_token_env_var, "SUPABASE_ACCESS_TOKEN");
  assert.equal(servers.supabase.required, false);
  assert.equal(servers.supabase.startup_timeout_sec, 120);
  assert.deepEqual(servers.supabase.disabled_tools, ["apply_migration"]);
});

test("a repository with neither file is reported as having no routes, not as broken", () => {
  const dir = makeRepo({});
  try {
    const result = checkRepository(dir);
    assert.deepEqual(result.findings, []);
    assert.deepEqual(result.servers, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the command exits 0 with no findings, 1 with findings and 2 without a repository", () => {
  const good = makeRepo({ mcp: goodMcp, toml: goodToml, claudeSettings: goodSettings });
  const bad = makeRepo({ mcp: { mcpServers: { vercel: { type: "http", url: "https://mcp.vercel.com" } } }, toml: goodToml, claudeSettings: goodSettings });
  try {
    const ok = spawnSync(process.execPath, [script, good], { encoding: "utf8" });
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /supabase/);
    const findings = spawnSync(process.execPath, [script, bad], { encoding: "utf8" });
    assert.equal(findings.status, 1);
    assert.match(findings.stdout, /missing-claude|vercel-unpinned/);
    const usage = spawnSync(process.execPath, [script], { encoding: "utf8" });
    assert.equal(usage.status, 2);
  } finally {
    rmSync(good, { recursive: true, force: true });
    rmSync(bad, { recursive: true, force: true });
  }
});
