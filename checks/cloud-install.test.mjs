// Fixtures for claude/cloud: the installer a Claude Code cloud container runs,
// exercised against a scratch home, and the shell scripts it ships.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cloud = path.join(root, 'claude', 'cloud');
const claudeMap = JSON.parse(readFileSync(path.join(root, 'claude', 'claude-map.json'), 'utf8'));
const cloudMap = JSON.parse(readFileSync(path.join(cloud, 'cloud-map.json'), 'utf8'));

function install(home) {
  const result = spawnSync(process.execPath, [path.join(cloud, 'install-harness.mjs'), '--home', home],{ encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}

test('the cloud install renders every mapped agent on a Claude model, with cloud overrides applied', (t) => {
  const home = mkdtempSync(path.join(os.tmpdir(), 'cloud-install-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  install(home);
  const agents = readdirSync(path.join(home, '.claude', 'agents')).sort();
  assert.deepEqual(agents, Object.keys(claudeMap.roles).map((k) => `${k}.md`).sort());
  for (const key of Object.keys(claudeMap.roles)) {
    const text = readFileSync(path.join(home, '.claude', 'agents', `${key}.md`), 'utf8');
    const binding = cloudMap.roles[key] ?? claudeMap.roles[key];
    assert.match(text, new RegExp(`^model: ${binding.model}$`, 'm'), key);
    if (binding.tools) assert.match(text, new RegExp(`^tools: ${binding.tools}$`, 'm'), key);
  }
  assert.match(readFileSync(path.join(home, '.claude', 'CLAUDE.md'), 'utf8'), /^@~\/\.codex\/AGENTS\.md/);
  assert.ok(readdirSync(path.join(home, '.claude', 'skills')).includes('code-review'));
});

test('a repeated install keeps one harness refresh hook beside the session\'s own hooks', (t) => {
  const home = mkdtempSync(path.join(os.tmpdir(), 'cloud-install-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  install(home);
  install(home);
  const settings = JSON.parse(readFileSync(path.join(home, '.claude', 'settings.json'), 'utf8'));
  const refresh = settings.hooks.SessionStart.filter((g) => g.hooks.some((h) => h.command.endsWith('refresh-harness.sh')));
  assert.equal(refresh.length, 1);
  assert.equal(refresh[0].matcher, 'startup');
  assert.equal(settings.pluginConfigs['agents-md@builtin'].options.instructionFiles, 'claude-md-and-agents-md');
});

test('the cloud shell scripts parse under bash', { skip: spawnSync('bash', ['--version']).status !== 0 && 'bash not found' }, () => {
  for (const name of readdirSync(cloud).filter((f) => f.endsWith('.sh'))) {
    const source = readFileSync(path.join(cloud, name), 'utf8').replace(/\r\n/g, '\n');
    const result = spawnSync('bash', ['-n'], { input: source, encoding: 'utf8' });
    assert.equal(result.status, 0, `${name}: ${result.stderr}`);
  }
});
