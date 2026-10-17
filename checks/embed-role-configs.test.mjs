import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const checker = fileURLToPath(new URL('../guide/scripts/embed-role-configs.mjs', import.meta.url));
const start = '<!-- role-configs:start, written by guide/scripts/embed-role-configs.mjs; do not edit by hand -->';
const end = '<!-- role-configs:end -->';

test('check rejects a stale first template with a duplicate current ID, and apply repairs it', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'embed-role-configs-cli-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const guideDir = join(dir, 'guide');
  const scriptDir = join(guideDir, 'scripts');
  const agentsDir = join(dir, 'agents');
  const fixtureHome = join(dir, 'home');
  for (const path of [scriptDir, agentsDir, fixtureHome]) mkdirSync(path, { recursive: true });
  const script = join(scriptDir, 'embed-role-configs.mjs');
  const guide = join(guideDir, 'harness-guide.html');
  writeFileSync(script, readFileSync(checker));
  writeFileSync(join(agentsDir, 'fixture_role.toml'), 'name = "fixture_role"\n# current instructions\n');
  writeFileSync(guide, `${start}\n${end}\n`);
  const run = (mode) => spawnSync(process.execPath, [script, mode], {
    encoding: 'utf8', timeout: 3000,
    env: { ...process.env, HOME: fixtureHome, USERPROFILE: fixtureHome },
  });
  const apply = run('--apply');
  assert.equal(apply.status, 0, apply.stdout + apply.stderr);
  const clean = run('--check');
  assert.equal(clean.status, 0, clean.stdout + clean.stderr);
  assert.match(clean.stdout, /1 template\(s\) equal their files, 1 unverifiable/);

  const html = readFileSync(guide, 'utf8');
  const current = html.match(/<template id="cfg-codex-fixture_role"[^>]*>[\s\S]*?<\/template>/)?.[0];
  assert.ok(current, 'apply embeds the role file');
  const stale = current.replace('current instructions', 'stale instructions');
  assert.notEqual(stale, current);
  writeFileSync(guide, html.replace(current, `${stale}\n${current}`));
  const duplicate = run('--check');
  assert.equal(duplicate.status, 1, duplicate.stdout + duplicate.stderr);
  assert.match(duplicate.stdout, /duplicate cfg-codex-fixture_role/);

  const repaired = run('--apply');
  assert.equal(repaired.status, 0, repaired.stdout + repaired.stderr);
  const checked = run('--check');
  assert.equal(checked.status, 0, checked.stdout + checked.stderr);
  assert.match(checked.stdout, /1 template\(s\) equal their files, 1 unverifiable/);
});
