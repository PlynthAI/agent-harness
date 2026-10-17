import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmdirSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const helper = join(root, 'config', 'set-full-access.py');
const python = process.env.HARNESS_PYTHON || 'python';

function removeFixture(directory) {
  // Remove entries individually, never recurse through a symlink or junction.
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink() || !stat.isDirectory()) unlinkSync(path);
    else removeFixture(path);
  }
  rmdirSync(directory);
}

function fixture(t, original) {
  const home = mkdtempSync(join(realpathSync(tmpdir()), 'harness-full-access-'));
  t.after(() => removeFixture(home));
  const config = join(home, 'config.toml');
  if (original !== undefined) writeFileSync(config, original);
  const run = (...args) => spawnSync(python, [helper, '--codex-home', home, ...args], {
    cwd: root, encoding: 'utf8', env: process.env,
  });
  return { home, config, run };
}

function parse(config) {
  const result = spawnSync(python, ['-c',
    'import json, pathlib, sys, tomllib; print(json.dumps(tomllib.loads(pathlib.Path(sys.argv[1]).read_bytes().decode("utf-8-sig"))))',
    config], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test('dry-run reports setting changes without writing or exposing unrelated configuration', (t) => {
  const original = '# operator comment\nmodel = "private-model"\napi_key = "fixture-secret"\napproval_policy = "on-request" # approval comment\nsandbox_mode = "workspace-write"\n[computer_use]\ndefault_app_access = "ask"\n[plugins.example]\nenabled = true\n';
  const { home, config, run } = fixture(t, original);
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /approval_policy.*never/);
  assert.match(result.stdout, /sandbox_mode.*danger-full-access/);
  assert.match(result.stdout, /computer_use.default_app_access.*allow/);
  assert.doesNotMatch(result.stdout + result.stderr, /private-model|fixture-secret|operator comment/);
  assert.equal(readFileSync(config, 'utf8'), original);
  assert.deepEqual(readdirSync(home), ['config.toml']);
});

test('apply changes only access settings, preserves BOM/comments/newlines and backs up original bytes', (t) => {
  const original = Buffer.from('\uFEFF# operator comment\r\nmodel = "private-model"\r\napproval_policy = "on-request" # approval comment\r\nsandbox_mode = \'workspace-write\'\r\n[computer_use]\r\ndefault_app_access = "ask" # app comment\r\n[model_providers.example]\r\nbase_url = "https://example.invalid"\r\napi_key = "fixture-secret"\r\nnote = """a multiline value\r\napproval_policy = \\"fixture\\"\r\n[computer_use]\r\n"""\r\n[mcp_servers.example]\r\ncommand = "tool"\r\n[plugins.example]\r\nenabled = true\r\n');
  const { home, config, run } = fixture(t, original);
  const result = run('--apply');
  assert.equal(result.status, 0, result.stderr);
  const expected = original.toString('utf8')
    .replace('approval_policy = "on-request"', 'approval_policy = "never"')
    .replace("sandbox_mode = 'workspace-write'", 'sandbox_mode = "danger-full-access"')
    .replace('default_app_access = "ask"', 'default_app_access = "allow"');
  assert.deepEqual(readFileSync(config), Buffer.from(expected));
  const current = parse(config);
  assert.equal(current.approval_policy, 'never');
  assert.equal(current.sandbox_mode, 'danger-full-access');
  assert.equal(current.computer_use.default_app_access, 'allow');
  assert.equal(current.model_providers.example.api_key, 'fixture-secret');
  assert.equal(current.mcp_servers.example.command, 'tool');
  assert.equal(current.plugins.example.enabled, true);
  const backups = readdirSync(join(home, '.harness-backup'));
  assert.equal(backups.length, 1);
  const backup = join(home, '.harness-backup', backups[0], 'config.toml');
  assert.deepEqual(readFileSync(backup), original);
  assert.ok(result.stdout.includes(backup));
  assert.doesNotMatch(result.stdout + result.stderr, /private-model|fixture-secret/);
});

test('missing config is created only on apply, with no invented backup', (t) => {
  const { home, config, run } = fixture(t);
  const dry = run();
  assert.equal(dry.status, 0, dry.stderr);
  assert.equal(existsSync(config), false);
  const applied = run('--apply');
  assert.equal(applied.status, 0, applied.stderr);
  assert.deepEqual(parse(config), {
    approval_policy: 'never', sandbox_mode: 'danger-full-access',
    computer_use: { default_app_access: 'allow' },
  });
  assert.equal(existsSync(join(home, '.harness-backup')), false);
});

test('root default_permissions is removed while named tables and target-like profile keys are retained', (t) => {
  const original = '# root\n"default_permissions" = "restricted" # named switch comment\nmodel = "kept"\n[permissions.restricted]\napproval_policy = "on-request"\nsandbox_mode = "workspace-write"\n[profiles.research]\napproval_policy = "on-request"\n["computer_use"]\n"default_app_access" = \'ask\'\nother = "kept"\n';
  const { config, run } = fixture(t, original);
  const result = run('--apply');
  assert.equal(result.status, 0, result.stderr);
  const current = parse(config);
  assert.equal(Object.hasOwn(current, 'default_permissions'), false);
  assert.equal(current.approval_policy, 'never');
  assert.equal(current.sandbox_mode, 'danger-full-access');
  assert.equal(current.computer_use.default_app_access, 'allow');
  assert.deepEqual(current.permissions.restricted, {
    approval_policy: 'on-request', sandbox_mode: 'workspace-write',
  });
  assert.equal(current.profiles.research.approval_policy, 'on-request');
  assert.match(readFileSync(config, 'utf8'), /# named switch comment/);
  assert.match(result.stdout, /default_permissions.*remove/);
});

test('a repeated apply is byte-stable and does not create another backup', (t) => {
  const { home, config, run } = fixture(t, 'model = "kept"\n');
  const first = run('--apply');
  assert.equal(first.status, 0, first.stderr);
  const bytes = readFileSync(config);
  const backups = readdirSync(join(home, '.harness-backup'));
  const second = run('--apply');
  assert.equal(second.status, 0, second.stderr);
  assert.match(second.stdout, /No changes needed/);
  assert.doesNotMatch(second.stdout, /Backup:/);
  assert.deepEqual(readFileSync(config), bytes);
  assert.deepEqual(readdirSync(join(home, '.harness-backup')), backups);
});

test('invalid, ambiguous or multiline target settings fail without changing files or leaking values', async (t) => {
  const inputs = [
    'api_key = "fixture-secret"\napproval_policy = "unterminated\n',
    'approval_policy = "never"\napproval_policy = "fixture-secret"\n',
    'approval_policy = """fixture-secret\nnever"""\n',
    "sandbox_mode = '''fixture-secret\ndanger-full-access'''\n",
    '[computer_use]\ndefault_app_access = """fixture-secret\nallow"""\n',
    'approval_policy = { secret = "fixture-secret" }\n',
    'computer_use = { default_app_access = "fixture-secret", other = true }\n',
    'computer_use = "fixture-secret"\n',
  ];
  for (const [index, original] of inputs.entries()) {
    await t.test(`rejected input ${index + 1}`, (sub) => {
      const { home, config, run } = fixture(sub, original);
      const result = run('--apply');
      assert.equal(result.status, 1, result.stdout);
      assert.match(result.stderr, /config unchanged/);
      assert.doesNotMatch(result.stdout + result.stderr, /fixture-secret/);
      assert.equal(readFileSync(config, 'utf8'), original);
      assert.deepEqual(readdirSync(home), ['config.toml']);
    });
  }
});

test('root dotted computer use keys and child tables remain supported', async (t) => {
  for (const original of [
    'approval_policy = \'ask\'\ncomputer_use.default_app_access = \'ask\' # comment\ncomputer_use.other = true\n',
    '[computer_use.other]\nenabled = true',
    '[computer_use] # header comment',
  ]) {
    await t.test(original.split('\n')[0], (sub) => {
      const { config, run } = fixture(sub, original);
      const result = run('--apply');
      assert.equal(result.status, 0, result.stderr);
      const current = parse(config);
      assert.equal(current.approval_policy, 'never');
      assert.equal(current.sandbox_mode, 'danger-full-access');
      assert.equal(current.computer_use.default_app_access, 'allow');
    });
  }
});

test('CODEX_HOME selects the default target without a machine-specific path', (t) => {
  const { home, config } = fixture(t, 'model = "kept"\n');
  const result = spawnSync(python, [helper, '--apply'], {
    cwd: root, encoding: 'utf8', env: { ...process.env, CODEX_HOME: home },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(parse(config).approval_policy, 'never');
});

test('backup failure leaves original config unchanged', (t) => {
  const original = 'model = "fixture-secret"\n';
  const { home, config, run } = fixture(t, original);
  writeFileSync(join(home, '.harness-backup'), 'occupied');
  const result = run('--apply');
  assert.equal(result.status, 1);
  assert.doesNotMatch(result.stdout + result.stderr, /fixture-secret/);
  assert.equal(readFileSync(config, 'utf8'), original);
});

test('apply rejects a linked config instead of replacing the link or its target', (t) => {
  const { home, config, run } = fixture(t);
  const target = join(home, 'original.toml');
  const original = 'model = "kept"\n';
  writeFileSync(target, original);
  symlinkSync(target, config, 'file');
  const result = run('--apply');
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /Linked configuration/);
  assert.equal(lstatSync(config).isSymbolicLink(), true);
  assert.equal(readFileSync(target, 'utf8'), original);
  assert.equal(existsSync(join(home, '.harness-backup')), false);
});

test('unrelated TOML numeric and date values remain valid and byte-preserved', (t) => {
  const suffix = '[model_providers.example]\noptional_number = nan\nlimits = [inf, -inf, nan]\nupdated = 2026-10-05T08:00:00Z\n';
  const { config, run } = fixture(t, suffix);
  const result = run('--apply');
  assert.equal(result.status, 0, result.stderr);
  assert.ok(readFileSync(config, 'utf8').includes(suffix));
  const validation = spawnSync(python, ['-c',
    'import math, pathlib, sys, tomllib; c = tomllib.loads(pathlib.Path(sys.argv[1]).read_text()); assert c["approval_policy"] == "never"; assert math.isnan(c["model_providers"]["example"]["optional_number"]); assert c["model_providers"]["example"]["updated"].year == 2026',
    config], { encoding: 'utf8' });
  assert.equal(validation.status, 0, validation.stderr);
});
