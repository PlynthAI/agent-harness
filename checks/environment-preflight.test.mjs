import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, copyFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const script = process.env.PREFLIGHT_SCRIPT || join(dirname(fileURLToPath(import.meta.url)), '..', 'skills', 'validate-implementation', 'scripts', 'environment-preflight.mjs');
const scratch = mkdtempSync(join(tmpdir(), 'preflight-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

function run(tools, env = process.env) {
  const spec = join(scratch, `spec-${Math.random().toString(36).slice(2)}.json`);
  // A loaded machine can exceed the helper's 3 s default per probe. Only the
  // timeout test sets its own limit; every other probe must finish.
  writeFileSync(spec, JSON.stringify({ tools: tools.map((tool) => ({ timeoutMs: 20000, ...tool })) }));
  // The limit only stops a hung helper; one run starts several children, each
  // of which can take seconds on a loaded machine.
  const child = spawnSync(process.execPath, [script, '--spec', spec], { encoding: 'utf8', env, timeout: 90000 });
  assert.equal(child.error, undefined, child.error?.message);
  return { exitCode: child.status, report: JSON.parse(child.stdout), stderr: child.stderr };
}

test('reports the actual executable, identity and version without exposing process environment', () => {
  const { exitCode, report } = run([{ name: 'node', command: process.execPath, args: ['--version'], expectedVersion: process.version }], { ...process.env, PREFLIGHT_SECRET: 'TEST_PRIVATE_VALUE' });
  assert.equal(exitCode, 0);
  assert.equal(report.ok, true);
  assert.equal(report.identity.platform, process.platform);
  assert.ok(report.identity.user);
  assert.equal(report.results[0].status, 'works');
  assert.equal(report.results[0].executable, process.execPath);
  assert.equal(report.results[0].version, process.version.slice(1));
  assert.equal(report.results[0].exitCode, 0);
  assert.ok(!JSON.stringify(report).includes('TEST_PRIVATE_VALUE'));
});

test('distinguishes missing tools, failed commands and version mismatches', () => {
  const missing = join(scratch, 'missing-tool.exe');
  const { exitCode, report } = run([
    { name: 'missing', command: missing, args: ['--version'] },
    { name: 'failed', command: process.execPath, args: ['-e', 'process.exit(7)'] },
    { name: 'wrong node', command: process.execPath, args: ['--version'], expectedVersion: '0.0.1' },
  ]);
  assert.equal(exitCode, 1);
  assert.deepEqual(report.results.map((item) => item.status), ['missing', 'command-failed', 'version-mismatch']);
  assert.equal(report.results[1].exitCode, 7);
  assert.equal(report.results[2].version, process.version.slice(1));
});

test('resolves a real executable from a Unicode PATH directory with spaces', { skip: process.platform !== 'win32' }, () => {
  const dir = join(scratch, 'Tools ü 日本語');
  mkdirSync(dir);
  const command = join(dir, 'where.exe');
  copyFileSync(join(process.env.SystemRoot, 'System32', 'where.exe'), command);
  const env = { ...process.env, PATH: `${dir};${process.env.PATH}` };
  const { exitCode, report } = run([{ name: 'where', command: 'where', args: ['/?'] }], env);
  assert.equal(exitCode, 0);
  assert.equal(report.results[0].status, 'works');
  assert.equal(report.results[0].executable, command);
});

test('resolves a bare Windows command through PATHEXT and reports a batch launcher as needing a wrapper', { skip: process.platform !== 'win32' }, () => {
  // npm ships an extensionless POSIX script beside npm.cmd. Windows never
  // launches the extensionless file, even from an earlier PATH directory.
  const posixDir = join(scratch, 'posix shim');
  const batchDir = join(scratch, 'batch launcher');
  mkdirSync(posixDir);
  mkdirSync(batchDir);
  writeFileSync(join(posixDir, 'npm-like'), '#!/bin/sh\necho 1.0.0\n');
  writeFileSync(join(batchDir, 'npm-like.cmd'), '@echo 1.0.0\r\n');
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !['path', 'pathext'].includes(key.toLowerCase())));
  Object.assign(env, { PATH: `${posixDir};${batchDir}`, PATHEXT: '.COM;.EXE;.BAT;.CMD' });
  const { exitCode, report } = run([{ name: 'npm-like', command: 'npm-like', args: ['--version'] }], env);
  assert.equal(exitCode, 1);
  assert.equal(report.results[0].executable, join(batchDir, 'npm-like.cmd'));
  assert.equal(report.results[0].status, 'needs-shell-wrapper');
  assert.equal(report.results[0].exitCode, null);
});

test('reads npm wrapper runtime separately from npm version and an explicit child probe', () => {
  const stdout = JSON.stringify({ npm: '11.9.1', node: 'v24.20.0' });
  const { exitCode, report } = run([
    { name: 'npm wrapper', command: process.execPath, args: ['-e', `console.log(${JSON.stringify(stdout)})`], versionSource: 'npm-node', expectedVersion: '24.20.0' },
    { name: 'npm child', command: process.execPath, args: ['-e', 'console.log("v24.14.1")'], expectedVersion: '24.20.0' },
  ]);
  assert.equal(exitCode, 1);
  assert.equal(report.results[0].status, 'works');
  assert.equal(report.results[0].version, '24.20.0');
  assert.equal(report.results[1].status, 'version-mismatch');
});

test('an expected access restriction does not disguise an unrelated launch failure', () => {
  const blocked = join(scratch, 'not-an-executable');
  mkdirSync(blocked);
  const { exitCode, report } = run([{ name: 'restricted', command: blocked, args: ['--version'], expectedRestriction: true }]);
  assert.equal(exitCode, 1);
  assert.equal(report.results[0].status, 'fails-to-launch');
  assert.equal(report.results[0].observedStatus, undefined);
  assert.equal(report.results[0].version, null);
});

test('reports a missing symlink target as the missing dependency', () => {
  const target = join(scratch, 'removed-target.exe');
  const link = join(scratch, 'linked-tool.exe');
  symlinkSync(target, link, 'file');
  const { exitCode, report } = run([{ name: 'linked', command: link, args: ['--version'] }]);
  assert.equal(exitCode, 1);
  assert.equal(report.results[0].status, 'missing');
  assert.equal(report.results[0].executable, link);
  assert.equal(report.results[0].linkTarget, target);
});

test('reports an existing file with a missing interpreter as a launch failure', () => {
  const command = join(scratch, 'requires-missing-interpreter');
  writeFileSync(command, '#!/definitely/missing/preflight-interpreter\n');
  chmodSync(command, 0o755);
  const { exitCode, report } = run([{ name: 'broken interpreter', command, args: [] }]);
  assert.equal(exitCode, 1);
  assert.equal(report.results[0].executable, command);
  assert.equal(report.results[0].status, 'fails-to-launch');
  assert.equal(report.results[0].error, 'ENOENT');
});

test('reports a timed-out tool without exposing its output', () => {
  const { exitCode, report } = run([{
    name: 'slow', command: process.execPath,
    args: ['-e', 'process.stdout.write("PRIVATE_OUTPUT"); setTimeout(() => {}, 10000)'],
    timeoutMs: 100,
  }]);
  assert.equal(exitCode, 1);
  assert.equal(report.results[0].status, 'timed-out');
  assert.equal(report.results[0].error, 'ETIMEDOUT');
  assert.ok(!JSON.stringify(report).includes('PRIVATE_OUTPUT'));
});
