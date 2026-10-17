// The repository wiring recipe in design/impeccable's adoption reference, run
// as written. Each documented hook command is executed by the shell its host
// uses (sh on POSIX; both PowerShell and cmd on Windows) against a
// throwaway home that holds a copy of the shipped launchers. A stand-in engine
// records what the launcher hands it, so no engine binary or network is needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skill = path.join(root, 'skills/design/impeccable');
const tempRoot = path.join(root, '.local/checks');
const isWindows = process.platform === 'win32';
const adoption = fs.readFileSync(path.join(skill, 'reference/adoption.md'), 'utf8');
const blocks = [...adoption.matchAll(/```json\n([\s\S]*?)\n```/g)].map(match => JSON.parse(match[1]));
const [, claudeSettings, codexHooks] = blocks;
const hooksOf = manifest => ['PostToolUse', 'Stop'].flatMap(event =>
  manifest.hooks[event].flatMap(group => group.hooks.map(hook => ({ event, ...hook }))));

// Claude Code on Windows runs hook commands through Git Bash; use the same sh.
function findSh() {
  if (!isWindows) return '/bin/sh';
  const candidates = [];
  if (process.env.CLAUDE_CODE_GIT_BASH_PATH) candidates.push(path.join(path.dirname(process.env.CLAUDE_CODE_GIT_BASH_PATH), 'sh.exe'));
  const git = spawnSync('where', ['git'], { encoding: 'utf8' });
  for (const line of (git.stdout || '').split(/\r?\n/).filter(Boolean)) {
    candidates.push(path.join(path.dirname(path.dirname(line)), 'bin', 'sh.exe'));
  }
  candidates.push('C:\\Program Files\\Git\\bin\\sh.exe');
  return candidates.find(candidate => fs.existsSync(candidate));
}
const sh = findSh();

// A home holding the harness install as the deploy and the Claude sync lay it out.
function makeWorld() {
  fs.mkdirSync(tempRoot, { recursive: true });
  const world = fs.mkdtempSync(path.join(tempRoot, 'impeccable-wiring-'));
  const home = path.join(world, 'home with spaces');
  const project = path.join(world, 'project with spaces');
  fs.mkdirSync(project, { recursive: true });
  const installs = {};
  for (const host of ['.codex', '.claude']) {
    const scripts = path.join(home, host, 'skills/design/impeccable/scripts');
    fs.mkdirSync(scripts, { recursive: true });
    for (const name of ['impeccable', 'impeccable.cmd', 'VERSION']) {
      fs.copyFileSync(path.join(skill, 'scripts', name), path.join(scripts, name));
    }
    fs.chmodSync(path.join(scripts, 'impeccable'), 0o755);
    installs[host] = path.dirname(scripts);
  }
  // The stand-in engine is node running ./hook, so the launcher's first
  // argument has to be the `hook` verb for it to run at all.
  const record = path.join(world, 'record.json');
  fs.writeFileSync(path.join(project, 'hook'), [
    "const fs = require('fs');",
    "const input = fs.readFileSync(0, 'utf8');",
    "const keys = ['IMPECCABLE_SKILL_DIR', 'IMPECCABLE_NO_TELEMETRY', 'IMPECCABLE_NO_UPDATE_CHECK', 'IMPECCABLE_LIVE_COPY_AGENT', 'IMPECCABLE_CONTEXT_DIR'];",
    "const env = Object.fromEntries(keys.map(key => [key, process.env[key] ?? null]));",
    `fs.writeFileSync(${JSON.stringify(record)}, JSON.stringify({ verb: require('path').basename(process.argv[1]), extra: process.argv.slice(2), input, env }));`,
    "process.stdout.write('{\"hookSpecificOutput\":{\"stand-in\":true}}');",
    "process.exit(3);",
  ].join('\n'));
  return { world, home, project, installs, record, cleanup: () => fs.rmSync(world, { recursive: true, force: true }) };
}

function run(shell, command, { cwd, env, input }) {
  const baseEnv = { ...process.env };
  for (const key of Object.keys(baseEnv)) if (/^(IMPECCABLE_|CODEX_HOME$)/i.test(key)) delete baseEnv[key];
  const [file, args, options] = shell === 'cmd'
    ? [process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `"${command}"`], { windowsVerbatimArguments: true }]
    : shell === 'powershell'
      ? ['powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {}]
      : [sh, ['-c', command], {}];
  return spawnSync(file, args, { cwd, env: { ...baseEnv, ...env }, input, encoding: 'utf8', timeout: 30000, ...options });
}

const payload = JSON.stringify({
  hook_event_name: 'PostToolUse', tool_name: 'Write', cwd: 'project',
  tool_input: { file_path: 'src/index.html', content: '<h1 style="background-clip:text">x</h1>' },
});
const normalise = value => path.resolve(isWindows && /^\/[a-z]\//i.test(value)
  ? `${value[1]}:${value.slice(2)}` : value).toLowerCase();

function assertReached(result, world, install, label, expectedStatus = 3, expectedInput = payload) {
  assert.equal(result.error, undefined, `${label}: ${result.error}`);
  assert.equal(result.status, expectedStatus, `${label} preserves engine failure: ${result.stderr}`);
  assert.equal(result.stdout, '{"hookSpecificOutput":{"stand-in":true}}', `${label} passes the engine's output through`);
  const seen = JSON.parse(fs.readFileSync(world.record, 'utf8'));
  fs.rmSync(world.record);
  assert.equal(seen.verb, 'hook', `${label} calls the hook verb`);
  assert.deepEqual(seen.extra, [], `${label} adds no argument`);
  assert.equal(seen.input, expectedInput, `${label} hands the host's payload to the engine unchanged`);
  assert.equal(normalise(seen.env.IMPECCABLE_SKILL_DIR), normalise(install), `${label} points the engine at the installed skill`);
  assert.equal(seen.env.IMPECCABLE_NO_TELEMETRY, '1', `${label} keeps telemetry off`);
  assert.equal(seen.env.IMPECCABLE_NO_UPDATE_CHECK, '1', `${label} keeps the update check off`);
  assert.equal(seen.env.IMPECCABLE_LIVE_COPY_AGENT, 'chat', `${label} keeps live copy edits in the active task`);
  return seen;
}

test('the documented Claude hooks reach the harness install through HOME', t => {
  assert.ok(sh, 'a POSIX sh is available (Git Bash on Windows)');
  const world = makeWorld();
  t.after(world.cleanup);
  const hooks = hooksOf(claudeSettings);
  assert.deepEqual(hooks.map(hook => hook.event), ['PostToolUse', 'Stop']);
  for (const hook of hooks) {
    const result = run('sh', hook.command, {
      cwd: world.project, input: payload,
      env: { HOME: world.home, USERPROFILE: world.home, IMPECCABLE_BIN: process.execPath },
    });
    assertReached(result, world, world.installs['.claude'], `Claude ${hook.event}`);
  }
});

test('the documented Codex hooks reach the harness install through CODEX_HOME, then HOME', t => {
  assert.ok(sh, 'a POSIX sh is available (Git Bash on Windows)');
  const world = makeWorld();
  t.after(world.cleanup);
  const elsewhere = path.join(world.world, 'codex-home');
  fs.cpSync(path.join(world.home, '.codex'), elsewhere, { recursive: true });
  for (const hook of hooksOf(codexHooks)) {
    const viaHome = run('sh', hook.command, {
      cwd: world.project, input: payload,
      env: { HOME: world.home, IMPECCABLE_BIN: process.execPath },
    });
    assertReached(viaHome, world, world.installs['.codex'], `Codex ${hook.event} via HOME`);
    const viaCodexHome = run('sh', hook.command, {
      cwd: world.project, input: payload,
      env: { HOME: path.join(world.world, 'no-home'), CODEX_HOME: elsewhere, IMPECCABLE_BIN: process.execPath },
    });
    assertReached(viaCodexHome, world, path.join(elsewhere, 'skills/design/impeccable'), `Codex ${hook.event} via CODEX_HOME`);
  }
});

test('the documented Codex Windows hooks preserve stdin, output and failures in the chat shell', { skip: !isWindows && 'Windows only' }, t => {
  const world = makeWorld();
  t.after(world.cleanup);
  const elsewhere = path.join(world.world, 'custom codex home');
  fs.cpSync(path.join(world.home, '.codex'), elsewhere, { recursive: true });
  for (const shell of ['cmd', 'powershell']) {
    for (const hook of hooksOf(codexHooks)) {
      const input = JSON.stringify(hook.event === 'Stop'
        ? { hook_event_name: 'Stop', cwd: world.project, stop_hook_active: false, last_assistant_message: 'Done' }
        : { hook_event_name: 'PostToolUse', cwd: world.project, tool_name: 'apply_patch', tool_input: { command: '*** Begin Patch\n*** Add File: src/index.html\n+<h1>Hello</h1>\n*** End Patch' } });
      for (const codexHome of [undefined, elsewhere, path.join(world.world, 'missing install')]) {
        const result = run(shell, hook.commandWindows, {
          cwd: world.project, input,
          env: { USERPROFILE: world.home, ...(codexHome ? { CODEX_HOME: codexHome } : {}), IMPECCABLE_BIN: process.execPath },
        });
        const install = codexHome === elsewhere ? path.join(elsewhere, 'skills/design/impeccable') : world.installs['.codex'];
        // PowerShell -Command maps a native nonzero exit to 1; cmd retains it.
        assertReached(result, world, install, `Codex ${hook.event} via ${shell}`, shell === 'powershell' ? 1 : 3, input);
      }
    }
  }
});

test('every documented hook is a quiet no-op on a machine without the harness install', t => {
  const world = makeWorld();
  t.after(world.cleanup);
  const empty = path.join(world.world, 'empty-home');
  fs.mkdirSync(empty);
  const commands = [
    ...hooksOf(claudeSettings).map(hook => ['sh', hook.command]),
    ...hooksOf(codexHooks).map(hook => ['sh', hook.command]),
    ...(isWindows ? hooksOf(codexHooks).flatMap(hook => ['cmd', 'powershell'].map(shell => [shell, hook.commandWindows])) : []),
  ];
  for (const [shell, command] of commands) {
    const result = run(shell, command, {
      cwd: world.project, input: payload,
      env: { HOME: empty, USERPROFILE: empty, IMPECCABLE_BIN: process.execPath },
    });
    assert.equal(result.status, 0, `${shell}: ${command}\n${result.stderr}`);
    assert.equal(result.stdout.trim(), '', `${shell} prints nothing without the install`);
    assert.equal(fs.existsSync(world.record), false, `${shell} never reaches an engine without the install`);
  }
});

test('an operator setting survives the launcher defaults, and the authority prefix reaches the engine', t => {
  const world = makeWorld();
  t.after(world.cleanup);
  const shPrefix = adoption.match(/`(export IMPECCABLE_CONTEXT_DIR=[^`]+; )`/)?.[1];
  const psPrefix = adoption.match(/`(\$env:IMPECCABLE_CONTEXT_DIR=[^`]+;)`/)?.[1];
  assert.ok(shPrefix && psPrefix, 'the adoption reference documents both authority prefixes');
  const cases = [['sh', shPrefix + hooksOf(claudeSettings)[0].command, 'docs/design']];
  if (isWindows) {
    const command = hooksOf(codexHooks)[0].commandWindows;
    const encoded = command.split(' ').at(-1);
    const withContext = Buffer.from(psPrefix + Buffer.from(encoded, 'base64').toString('utf16le'), 'utf16le').toString('base64');
    cases.push(['cmd', command.slice(0, -encoded.length) + withContext, 'docs\\design']);
  }
  for (const [shell, command, dir] of cases) {
    const result = run(shell, command, {
      cwd: world.project, input: payload,
      env: { HOME: world.home, USERPROFILE: world.home, IMPECCABLE_BIN: process.execPath, IMPECCABLE_LIVE_COPY_AGENT: 'off', IMPECCABLE_NO_TELEMETRY: '0' },
    });
    assert.equal(result.status, 3, `${shell}: ${result.stderr}`);
    const seen = JSON.parse(fs.readFileSync(world.record, 'utf8'));
    fs.rmSync(world.record);
    assert.equal(seen.env.IMPECCABLE_CONTEXT_DIR, dir, `${shell} passes the documented authority directory`);
    assert.equal(seen.env.IMPECCABLE_LIVE_COPY_AGENT, 'off', `${shell} keeps the operator's live copy setting`);
    assert.equal(seen.env.IMPECCABLE_NO_TELEMETRY, '0', `${shell} keeps the operator's telemetry setting`);
    assert.equal(seen.env.IMPECCABLE_NO_UPDATE_CHECK, '1', `${shell} still defaults what the operator left unset`);
  }
});

// Opt in to the installed pinned binary. This never downloads an engine.
test('real installed engine reports UI findings and completes authentic Stop through Windows chat shells', { skip: !isWindows || !process.env.IMPECCABLE_TEST_ENGINE }, t => {
  const world = makeWorld();
  t.after(world.cleanup);
  const engine = path.resolve(process.env.IMPECCABLE_TEST_ENGINE);
  assert.ok(fs.existsSync(engine), 'the explicitly selected engine exists');
  fs.mkdirSync(path.join(world.project, 'src'));
  const fixture = path.join(world.project, 'src/index.html');
  const content = '<h1 style="background:linear-gradient(red,blue);background-clip:text;color:transparent">Hello</h1>';
  fs.writeFileSync(fixture, content);
  fs.writeFileSync(path.join(world.project, 'src/patched.html'), content);
  for (const shell of ['cmd', 'powershell']) {
    const state = path.join(world.project, '.impeccable');
    if (fs.existsSync(state)) fs.rmSync(state, { recursive: true });
    fs.mkdirSync(state);
    fs.writeFileSync(path.join(state, 'config.json'), JSON.stringify({ hook: { enabled: true } }));
    const events = [
      { hook_event_name: 'PostToolUse', tool_name: 'Write', tool_input: { file_path: fixture, content } },
      { hook_event_name: 'PostToolUse', tool_name: 'apply_patch', tool_input: { command: '*** Begin Patch\n*** Add File: src/patched.html\n+' + content + '\n*** End Patch' } },
      { hook_event_name: 'Stop', stop_hook_active: false, last_assistant_message: 'Done' },
      { hook_event_name: 'PostToolUse', tool_name: 'Write', tool_input: { file_path: 'README.md', content: 'Docs' } },
    ];
    for (const [index, event] of events.entries()) {
      const hook = hooksOf(codexHooks).find(h => h.event === event.hook_event_name);
      const start = Date.now();
      const result = run(shell, hook.commandWindows, {
        cwd: world.project,
        input: JSON.stringify({ session_id: 'impeccable-regression', cwd: world.project, ...event }),
        env: { USERPROFILE: world.home, IMPECCABLE_BIN: engine },
      });
      assert.equal(result.error, undefined);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stderr, '', 'success is quiet on stderr');
      assert.ok(Date.now() - start < hook.timeout * 1000, 'finishes within the event deadline');
      if (index < 2) {
        const output = JSON.parse(result.stdout);
        assert.equal(output.hookSpecificOutput.hookEventName, 'PostToolUse');
        assert.match(output.hookSpecificOutput.additionalContext, /\[impeccable@1\]/);
        assert.match(output.hookSpecificOutput.additionalContext, /gradient-text/);
      } else {
        assert.equal(result.stdout, '', 'no pending findings and non-UI edits are quiet');
      }
    }
  }
});

test('Windows interpreter startup errors stay visible failures', { skip: !isWindows && 'Windows only' }, t => {
  const world = makeWorld();
  t.after(world.cleanup);
  // Node 24.20 replaces a ComSpec that does not point at cmd.exe in a child's
  // environment with the system one, so a bad value passed through `env`
  // never reaches the hook. Set it inside cmd instead: the hook's PowerShell
  // inherits it from there, as it would from Codex, which is not Node.
  const missing = path.join(world.world, 'missing cmd.exe');
  const result = run('cmd', `set "ComSpec=${missing}" & ${hooksOf(codexHooks)[0].commandWindows}`, {
    cwd: world.project, input: payload,
    env: { USERPROFILE: world.home, IMPECCABLE_BIN: process.execPath },
  });
  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0, 'failure to start the launcher must not report success');
  assert.notEqual(result.stderr.trim(), '', 'startup errors retain diagnostics');
  assert.equal(fs.existsSync(world.record), false);
});
