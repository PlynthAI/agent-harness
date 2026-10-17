// Fixtures for claude/scripts/codex-forward.mjs, the script a Codex-runtime
// forwarder agent in Claude Code calls. Nothing here starts Codex: the spawn,
// the file system and the environment are injected, and the one real spawn
// runs a stand-in for the Codex CLI.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import * as fsSync from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as forward from '../claude/scripts/codex-forward.mjs';

const {
  parseArgs,
  codexHomeFrom,
  parseRoleToml,
  buildPrompt,
  buildExecArgs,
  buildResumeArgs,
  browserAccess,
  resolveCodexCommand,
  threadIdFrom,
  RUN_LIMIT_MINUTES,
  run,
} = forward;

const here = path.dirname(fileURLToPath(import.meta.url));

const roleToml = [
  'name = "explorer"',
  'description = "Trace bounded code paths and say \\"why\\"."',
  'model = "opencode-go/deepseek-v4.1-flash"',
  'model_provider = "codex-router"',
  'model_reasoning_effort = "max"',
  'developer_instructions = """',
  'Map the assigned code path.',
  'Return evidence.',
  '"""',
  '',
].join('\r\n');

test('a role file is read with the same grammar the Claude sync uses', () => {
  const role = parseRoleToml(roleToml, 'explorer.toml');
  assert.equal(role.name, 'explorer');
  assert.equal(role.description, 'Trace bounded code paths and say "why".');
  assert.equal(role.model, 'opencode-go/deepseek-v4.1-flash');
  assert.equal(role.provider, 'codex-router');
  assert.equal(role.effort, 'max');
  assert.equal(role.instructions, 'Map the assigned code path.\nReturn evidence.');
});

test('a role file missing a binding or using escapes in its instructions is refused', () => {
  const noModel = roleToml.replace(/^model = .*$/m, '');
  assert.throws(() => parseRoleToml(noModel, 'x.toml'), /x\.toml has no single-line model/);
  const noProvider = roleToml.replace(/^model_provider = .*$/m, '');
  assert.throws(() => parseRoleToml(noProvider, 'x.toml'), /x\.toml has no single-line model_provider/);
  const noEffort = roleToml.replace(/^model_reasoning_effort = .*$/m, '');
  assert.throws(() => parseRoleToml(noEffort, 'x.toml'), /x\.toml has no single-line model_reasoning_effort/);
  const escaped = roleToml.replace('Return evidence.', 'Use C:\\path.');
  assert.throws(() => parseRoleToml(escaped, 'x.toml'), /TOML escapes/);
  assert.throws(() => parseRoleToml('name = "x"\n', 'x.toml'), /no single-line description/);
});

test('the prompt is the role instructions, then the runtime note, then the assignment', () => {
  const prompt = buildPrompt({ instructions: 'ROLE BRIEF', task: 'List the folders.\n', write: false });
  assert.ok(prompt.startsWith('ROLE BRIEF\n\n# Runtime'), 'no title line precedes the role instructions');
  const order = ['ROLE BRIEF', '# Runtime', '# Assignment', 'List the folders.'].map((part) => prompt.indexOf(part));
  assert.ok(order.every((index) => index >= 0), `every part is present: ${order}`);
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'parts appear in order');
  assert.match(prompt, /one-shot Codex run started from Claude Code/);
  assert.doesNotMatch(prompt, /thread|companion/i, 'the runtime note no longer speaks of threads or the companion');
  assert.match(prompt, /read-only/);
  assert.match(prompt, /[Aa]pprovals are unavailable/);
  assert.ok(prompt.endsWith('List the folders.\n'));
  const note = prompt.slice(prompt.indexOf('# Runtime'), prompt.indexOf('# Assignment'));
  assert.equal(note.split('\n').filter((line) => line.startsWith('- ')).length, 3, 'the runtime note stays three lines');

  const writable = buildPrompt({ instructions: 'ROLE BRIEF', task: 'Fix it.', write: true });
  assert.match(writable, /workspace-write/);
  assert.doesNotMatch(writable, /read-only/);
});

test('the role instructions reach the prompt as written, on read-only and write-capable runs alike', () => {
  const instructions = 'Write evidence-backed findings to your assigned local scratch file; include file/line.\nReturn a short summary and the scratch path.';
  for (const write of [false, true]) {
    const prompt = buildPrompt({ instructions, task: 'Review it.', write });
    assert.ok(prompt.startsWith(`${instructions}\n\n# Runtime`), `write=${write}: ${prompt.slice(0, 120)}`);
  }
});

test('the exec argv saves a normal session, streams JSON events, carries the role binding, never asks for approval and reads the prompt from stdin', () => {
  const base = { cwd: 'C:\\harness', model: 'gpt-6.1-sol', provider: 'openai', effort: 'high', outputPath: 'C:\\t\\last-message.md' };
  assert.deepEqual(buildExecArgs({ ...base, write: false }), [
    'exec', '--json', '--skip-git-repo-check',
    '-C', 'C:\\harness',
    '-m', 'gpt-6.1-sol',
    '-c', 'model_provider="openai"',
    '-c', 'model_reasoning_effort="high"',
    '-c', 'approval_policy="never"',
    '-s', 'read-only',
    '-o', 'C:\\t\\last-message.md',
    '-',
  ]);
  const writable = buildExecArgs({ ...base, write: true });
  assert.equal(writable[writable.indexOf('-s') + 1], 'workspace-write');
  assert.equal(writable.at(-1), '-', 'the prompt is never an argument');
  assert.ok(!writable.includes('--ephemeral'), 'the run keeps its rollout so session digests can read it');
});

const threadId = '019dc0de-1234-7abc-8def-0123456789ab';

test('a resume argv continues the named session with the same binding, sandbox, approvals, JSON events and last-message file, prompt on stdin', () => {
  const base = { threadId, model: 'gpt-6.1-sol', provider: 'openai', effort: 'high', outputPath: 'C:\\t\\last-message.md' };
  // `codex exec resume` takes neither -s nor -C, so the sandbox goes as a -c
  // override and the working directory is the child's own.
  assert.deepEqual(buildResumeArgs({ ...base, write: false }), [
    'exec', 'resume', '--json', '--skip-git-repo-check',
    '-m', 'gpt-6.1-sol',
    '-c', 'model_provider="openai"',
    '-c', 'model_reasoning_effort="high"',
    '-c', 'approval_policy="never"',
    '-c', 'sandbox_mode="read-only"',
    '-o', 'C:\\t\\last-message.md',
    threadId,
    '-',
  ]);
  assert.ok(buildResumeArgs({ ...base, write: true }).includes('sandbox_mode="workspace-write"'));
});

test('--resume takes a Codex thread id and refuses anything else', () => {
  assert.deepEqual(parseArgs(['--role', 'reviewer', '--resume', threadId]), { role: 'reviewer', cwd: null, promptFile: null, write: false, resume: threadId });
  assert.equal(parseArgs([`--resume=${threadId.toUpperCase()}`, '--role', 'reviewer']).resume, threadId.toUpperCase());
  for (const bad of ['019d-run', 'last', `${threadId} --write`, `${threadId}x`, '../019dc0de-1234-7abc-8def-0123456789ab']) {
    assert.throws(() => parseArgs(['--role', 'reviewer', '--resume', bad]), /--resume needs a Codex thread id/, bad);
  }
  assert.throws(() => parseArgs(['--role', 'reviewer', '--resume']), /--resume needs a value/);
});

test('the thread id is read from the thread.started event and nothing else', () => {
  assert.equal(threadIdFrom('{"type":"thread.started","thread_id":"019d-abc"}'), '019d-abc');
  assert.equal(threadIdFrom('{"type":"turn.started"}'), null);
  assert.equal(threadIdFrom('{"type":"item.completed","thread_id":"not-this"}'), null);
  assert.equal(threadIdFrom('not json'), null);
  assert.equal(threadIdFrom(''), null);
});

test('the run ceiling is a runaway guard well beyond a long review', () => {
  assert.ok(RUN_LIMIT_MINUTES >= 45 && RUN_LIMIT_MINUTES <= 120, String(RUN_LIMIT_MINUTES));
});

test('the role effort reaches exec unchanged, max included, since Codex reads the same role files natively', () => {
  const args = buildExecArgs({ cwd: 'C:\\x', model: 'm', provider: 'codex-router', effort: 'max', outputPath: 'o', write: false });
  assert.ok(args.includes('model_reasoning_effort="max"'), args.join(' '));
  assert.equal(forward.mapEffort, undefined, 'no companion effort mapping remains');
});

test('the companion, broker and thread-filing paths are gone', () => {
  for (const name of ['resolveCompanionPath', 'buildCompanionArgs', 'buildCompanionEnv', 'BROKER_ENDPOINT_ENV', 'companionThreadName', 'buildThreadTitle', 'fileThreadInSection', 'fileThreadDirect', 'THREAD_SECTION', 'claudeHomeFrom']) {
    assert.equal(forward[name], undefined, name);
  }
});

test('arguments are parsed strictly', () => {
  assert.deepEqual(parseArgs(['--role', 'reviewer', '--cwd', 'C:\\x', '--prompt-file', 'a.md']), { role: 'reviewer', cwd: 'C:\\x', promptFile: 'a.md', write: false, resume: null });
  assert.deepEqual(parseArgs(['--role=tester', '--write']), { role: 'tester', cwd: null, promptFile: null, write: true, resume: null });
  assert.throws(() => parseArgs([]), /--role is required/);
  assert.throws(() => parseArgs(['--role', '../evil']), /not a role name/);
  assert.throws(() => parseArgs(['--role', 'x', '--model', 'y']), /Unknown argument --model/);
  assert.throws(() => parseArgs(['--role']), /--role needs a value/);
});

test('the Codex home honours CODEX_HOME before the user profile', () => {
  assert.equal(codexHomeFrom({ CODEX_HOME: 'D:\\codex', USERPROFILE: 'C:\\home\\a' }), 'D:\\codex');
  assert.equal(codexHomeFrom({ USERPROFILE: 'C:\\home\\a' }), path.join('C:\\home\\a', '.codex'));
});

test('the Codex CLI is found on PATH; on Windows the npm shim runs its node script directly, without a shell', () => {
  const bin = (...parts) => path.join(...parts);
  const shim = bin('C:\\npm', 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
  const fromShim = resolveCodexCommand({
    env: { Path: ['C:\\empty', 'C:\\npm'].join(path.delimiter) },
    platform: 'win32',
    exists: (p) => p === bin('C:\\npm', 'codex.cmd') || p === shim,
  });
  assert.deepEqual(fromShim, { command: process.execPath, prefix: [shim] });

  const native = resolveCodexCommand({
    env: { PATH: ['C:\\tools', 'C:\\npm'].join(path.delimiter) },
    platform: 'win32',
    exists: (p) => p === bin('C:\\tools', 'codex.exe') || p === bin('C:\\npm', 'codex.cmd') || p === shim,
  });
  assert.deepEqual(native, { command: bin('C:\\tools', 'codex.exe'), prefix: [] }, 'the first PATH folder holding codex wins');

  const posix = resolveCodexCommand({ env: { PATH: ['/a', '/b'].join(path.delimiter) }, platform: 'linux', exists: (p) => p === bin('/b', 'codex') });
  assert.deepEqual(posix, { command: bin('/b', 'codex'), prefix: [] });

  assert.throws(() => resolveCodexCommand({ env: { PATH: 'C:\\none' }, platform: 'win32', exists: () => false }), /Codex CLI/);
  const bareShim = { env: { PATH: 'C:\\npm' }, platform: 'win32', exists: (p) => p === bin('C:\\npm', 'codex.cmd') };
  assert.throws(() => resolveCodexCommand(bareShim), /Codex CLI/, 'a shim without its node script is not runnable');
});

function fakeDeps(overrides = {}) {
  const files = new Map([
    [path.join('C:\\codex', 'agents', 'explorer.toml'), roleToml],
    [path.resolve('assignment.md'), 'List the top-level folders and stop.\n'],
  ]);
  const calls = { spawned: [], removed: [], out: [], errors: [] };
  const deps = {
    env: { CODEX_HOME: 'C:\\codex', PATH: 'C:\\bin' },
    readFile: (p) => {
      if (!files.has(p)) throw Object.assign(new Error(`ENOENT ${p}`), { code: 'ENOENT' });
      return files.get(p);
    },
    exists: (p) => files.has(p) || p === path.resolve('C:\\repo'),
    codexCommand: () => ({ command: 'C:\\bin\\codex.exe', prefix: [] }),
    readStdin: async () => 'from stdin',
    makeTempDir: () => 'T:\\forward',
    removeTemp: (dir) => calls.removed.push(dir),
    spawn: async (command, args, options) => {
      calls.spawned.push({ command, args, options });
      options.onStdout('{"type":"thread.st');
      options.onStdout('arted","thread_id":"019d-run"}\n{"type":"turn.started"}\n');
      files.set(args[args.indexOf('-o') + 1], 'CODEX REPLY\n');
      return { code: 7, stderr: 'progress\n', timedOut: false };
    },
    stdout: (text) => calls.out.push(text),
    stderr: (text) => calls.errors.push(text),
    ...overrides,
  };
  return { deps, calls, files };
}

test('run starts one exec with the prompt on stdin, names its thread at once, prints the last message verbatim and returns the exit code', async () => {
  const { deps, calls } = fakeDeps();
  const code = await run(['--role', 'explorer', '--cwd', 'C:\\repo', '--prompt-file', 'assignment.md'], deps);
  assert.equal(code, 7, 'the exec exit code is the forwarder exit code');
  assert.equal(calls.spawned.length, 1, 'exactly one process is started: no thread filing follows');
  const { command, args, options } = calls.spawned[0];
  assert.equal(command, 'C:\\bin\\codex.exe');
  const outputPath = path.join('T:\\forward', 'last-message.md');
  assert.deepEqual(args, buildExecArgs({ cwd: path.resolve('C:\\repo'), model: 'opencode-go/deepseek-v4.1-flash', provider: 'codex-router', effort: 'max', outputPath, write: false }));
  assert.ok(options.input.startsWith('Map the assigned code path.'), options.input.slice(0, 80));
  assert.ok(options.input.endsWith('# Assignment\n\nList the top-level folders and stop.\n'));
  assert.equal(options.timeoutMs, RUN_LIMIT_MINUTES * 60_000, 'the spawn carries the run ceiling');
  assert.deepEqual(calls.out, ['CODEX REPLY\n'], 'stdout is the last message, verbatim');
  assert.deepEqual(calls.errors, ['codex-forward: Codex thread 019d-run; its rollout is saved under ~/.codex/sessions\n'], 'stderr names the thread once and keeps the exec log to itself');
  assert.deepEqual(calls.removed, ['T:\\forward'], 'the temp folder is removed afterwards');
});

test('a resumed run sends only the follow-up into the named session, from the working directory, and reports like a fresh run', async () => {
  const { deps, calls } = fakeDeps();
  const code = await run(['--role', 'explorer', '--cwd', 'C:\\repo', '--prompt-file', 'assignment.md', '--resume', threadId], deps);
  assert.equal(code, 7, 'the exec exit code is the forwarder exit code');
  assert.equal(calls.spawned.length, 1);
  const { args, options } = calls.spawned[0];
  const outputPath = path.join('T:\\forward', 'last-message.md');
  assert.deepEqual(args, buildResumeArgs({ threadId, model: 'opencode-go/deepseek-v4.1-flash', provider: 'codex-router', effort: 'max', outputPath, write: false }));
  assert.equal(options.input, 'List the top-level folders and stop.\n', 'the session already holds the role instructions, so only the follow-up is sent');
  assert.equal(options.cwd, path.resolve('C:\\repo'), 'resume has no -C, so the child starts in the working directory');
  assert.equal(options.timeoutMs, RUN_LIMIT_MINUTES * 60_000);
  assert.deepEqual(calls.out, ['CODEX REPLY\n']);
  assert.deepEqual(calls.errors, ['codex-forward: Codex thread 019d-run; its rollout is saved under ~/.codex/sessions\n']);
  assert.deepEqual(calls.removed, ['T:\\forward']);

  const writable = fakeDeps();
  await run(['--role', 'explorer', '--cwd', 'C:\\repo', '--resume', threadId, '--write'], writable.deps);
  assert.ok(writable.calls.spawned[0].args.includes('sandbox_mode="workspace-write"'));
});

test('a write run on Windows can drive playwright-cli: its data folder is writable and Chrome skips its own sandbox; read-only runs get neither', async () => {
  const env = { CODEX_HOME: 'C:\\codex', PATH: 'C:\\bin', LOCALAPPDATA: 'C:\\home\\a\\AppData\\Local' };
  const root = path.join(env.LOCALAPPDATA, 'ms-playwright');
  for (const resume of [[], ['--resume', threadId]]) {
    const { deps, calls } = fakeDeps({ env });
    await run(['--role', 'explorer', '--cwd', 'C:\\repo', '--prompt-file', 'assignment.md', '--write', ...resume], deps);
    const { args, options } = calls.spawned[0];
    assert.ok(args.includes(`sandbox_workspace_write.writable_roots=${JSON.stringify([root])}`), args.join(' '));
    assert.ok(args.indexOf('-o') > args.indexOf(`sandbox_workspace_write.writable_roots=${JSON.stringify([root])}`), 'overrides come before the output file');
    assert.equal(options.env.PLAYWRIGHT_MCP_SANDBOX, 'false');
    assert.equal(options.env.PSExecutionPolicyPreference, 'RemoteSigned', 'npm .ps1 shims run in the sandbox account');
    assert.equal(options.env.PATH, 'C:\\bin', 'the rest of the environment passes through');
  }
  const readOnly = fakeDeps({ env });
  await run(['--role', 'explorer', '--cwd', 'C:\\repo', '--prompt-file', 'assignment.md'], readOnly.deps);
  assert.ok(!readOnly.calls.spawned[0].args.some((arg) => arg.startsWith('sandbox_workspace_write.')));
  assert.equal(readOnly.calls.spawned[0].options.env.PLAYWRIGHT_MCP_SANDBOX, undefined);
  assert.equal(readOnly.calls.spawned[0].options.env.PSExecutionPolicyPreference, undefined);
  assert.deepEqual(browserAccess({ env: { PATH: '/bin' }, write: true }), { args: [], env: { PATH: '/bin' } }, 'without LOCALAPPDATA nothing changes');
});

test('a run stopped at the ceiling says so, names its thread and exits 124', async () => {
  const { deps, calls } = fakeDeps({
    spawn: async (command, args, options) => {
      options.onStdout('{"type":"thread.started","thread_id":"019d-slow"}\n');
      return { code: 1, stderr: 'partial log\n', timedOut: true };
    },
  });
  assert.equal(await run(['--role', 'explorer', '--cwd', 'C:\\repo', '--prompt-file', 'assignment.md'], deps), 124);
  assert.deepEqual(calls.out, []);
  const err = calls.errors.join('');
  assert.match(err, new RegExp(`stopped the Codex run after ${RUN_LIMIT_MINUTES} minutes`));
  assert.match(err, /019d-slow/);
  assert.deepEqual(calls.removed, ['T:\\forward']);
});

test('the shim prefix goes ahead of the exec argv', async () => {
  const { deps, calls } = fakeDeps({ codexCommand: () => ({ command: 'node.exe', prefix: ['C:\\npm\\codex.js'] }) });
  await run(['--role', 'explorer', '--cwd', 'C:\\repo', '--prompt-file', 'assignment.md'], deps);
  assert.equal(calls.spawned[0].command, 'node.exe');
  assert.deepEqual(calls.spawned[0].args.slice(0, 3), ['C:\\npm\\codex.js', 'exec', '--json']);
});

test('a run without a reply passes the exec log to stderr and keeps the exit code', async () => {
  const { deps, calls } = fakeDeps({ spawn: async () => ({ code: 1, stderr: 'error: model not found\n' }) });
  assert.equal(await run(['--role', 'explorer', '--cwd', 'C:\\repo', '--prompt-file', 'assignment.md'], deps), 1);
  assert.deepEqual(calls.out, []);
  assert.match(calls.errors.join(''), /model not found/);
  assert.deepEqual(calls.removed, ['T:\\forward']);

  const thrown = fakeDeps({ spawn: async () => { throw new Error('spawn blew up'); } });
  await assert.rejects(run(['--role', 'explorer', '--cwd', 'C:\\repo', '--prompt-file', 'assignment.md'], thrown.deps), /spawn blew up/);
  assert.deepEqual(thrown.calls.removed, ['T:\\forward'], 'the temp folder is removed even when the spawn throws');
});

test('a clean-looking reply without a forwarded thread is an incomplete forward, with the reply retained', async () => {
  const fixture = fakeDeps();
  fixture.deps.spawn = async (command, args) => {
    fixture.files.set(args[args.indexOf('-o') + 1], 'No findings.\n');
    return { code: 0, stderr: '', timedOut: false };
  };
  assert.equal(await run(['--role', 'explorer', '--cwd', 'C:\\repo', '--prompt-file', 'assignment.md'], fixture.deps), 1);
  assert.deepEqual(fixture.calls.out, ['No findings.\n'], 'failure does not discard the available result');
  assert.match(fixture.calls.errors.join(''), /incomplete forward.*no Codex thread identity/i);
});

test('a started thread with no final reply is an incomplete forward even when Codex exits zero', async () => {
  const fixture = fakeDeps();
  fixture.deps.spawn = async (command, args, options) => {
    options.onStdout(`{"type":"thread.started","thread_id":"${threadId}"}\n`);
    fixture.files.set(args[args.indexOf('-o') + 1], '  \n');
    return { code: 0, stderr: 'review interrupted\n', timedOut: false };
  };
  assert.equal(await run(['--role', 'explorer', '--cwd', 'C:\\repo', '--prompt-file', 'assignment.md'], fixture.deps), 1);
  assert.match(fixture.calls.errors.join(''), /incomplete forward.*no final reply/i);
  assert.match(fixture.calls.errors.join(''), /review interrupted/);
});

test('run reads the assignment from stdin when no prompt file is given, and honours --write', async () => {
  const { deps, calls } = fakeDeps();
  await run(['--role', 'explorer', '--cwd', 'C:\\repo', '--write'], deps);
  const { args, options } = calls.spawned[0];
  assert.equal(args[args.indexOf('-s') + 1], 'workspace-write');
  assert.ok(options.input.endsWith('from stdin'));
});

test('run refuses an empty assignment, a missing role file, a renamed role or a missing Codex CLI', async () => {
  const empty = fakeDeps({ readStdin: async () => '   \n' });
  assert.equal(await run(['--role', 'explorer', '--cwd', 'C:\\repo'], empty.deps), 2);
  assert.match(empty.calls.errors.join(''), /empty assignment/);
  assert.equal(empty.calls.spawned.length, 0);

  const missing = fakeDeps();
  assert.equal(await run(['--role', 'planner', '--cwd', 'C:\\repo'], missing.deps), 2);
  assert.match(missing.calls.errors.join(''), /planner\.toml/);

  const renamed = fakeDeps();
  const original = renamed.deps.readFile;
  renamed.deps.readFile = (p) => (p.endsWith('explorer.toml') ? roleToml.replace('name = "explorer"', 'name = "scout"') : original(p));
  assert.equal(await run(['--role', 'explorer', '--cwd', 'C:\\repo'], renamed.deps), 2);
  assert.match(renamed.calls.errors.join(''), /declares name 'scout'/);

  const noCli = fakeDeps({ codexCommand: () => { throw new Error('The Codex CLI is not on PATH'); } });
  assert.equal(await run(['--role', 'explorer', '--cwd', 'C:\\repo', '--prompt-file', 'assignment.md'], noCli.deps), 2);
  assert.match(noCli.calls.errors.join(''), /Codex CLI/);
  assert.equal(noCli.calls.spawned.length, 0);
});

// A stand-in for the Codex CLI's node entry: it checks the argv, reads the
// prompt from stdin, writes a reply to the -o file and exits 3, also printing
// events on stdout and noise on stderr that must not reach the forwarder's
// stdout. An assignment asking it to hang never ends on its own.
function codexStandIn() {
  const fs = require('node:fs');
  const args = process.argv.slice(2);
  const chunks = [];
  process.stdin.on('data', (chunk) => chunks.push(chunk));
  process.stdin.on('end', () => {
    const prompt = Buffer.concat(chunks).toString('utf8');
    const ok = args[0] === 'exec' && args.includes('--json') && !args.includes('--ephemeral') && args.at(-1) === '-' && args.includes('model_provider="codex-router"');
    process.stdout.write('{"type":"thread.started","thread_id":"stand-in-thread"}\n');
    if (prompt.includes('HANG')) {
      fs.writeFileSync(require('node:path').join(args[args.indexOf('-C') + 1], 'stand-in.pid'), String(process.pid));
      setInterval(() => {}, 1000);
      return;
    }
    process.stderr.write('stderr noise\n');
    fs.writeFileSync(args[args.indexOf('-o') + 1], `reply ok=${ok} "quoted" ${prompt.endsWith('List the top-level folders and stop.\n') ? 'prompt-ok' : 'prompt-missing'}\n`);
    process.exit(3);
  });
}

test('the default deps find a shim on PATH, feed it stdin and pass its last message through', async () => {
  const root = fsSync.mkdtempSync(path.join(os.tmpdir(), 'codex-forward-test-'));
  try {
    const bin = path.join(root, 'bin');
    const script = path.join(bin, 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
    fsSync.mkdirSync(path.dirname(script), { recursive: true });
    fsSync.writeFileSync(path.join(path.dirname(path.dirname(script)), 'package.json'), '{"type":"commonjs"}\n');
    fsSync.writeFileSync(script, `(${codexStandIn})();\n`);
    if (process.platform === 'win32') {
      fsSync.writeFileSync(path.join(bin, 'codex.cmd'), '@echo the shim itself must not run\r\n@exit /b 9\r\n');
    } else {
      fsSync.writeFileSync(path.join(bin, 'codex'), `#!/bin/sh\nexec "${process.execPath}" "${script}" "$@"\n`);
      fsSync.chmodSync(path.join(bin, 'codex'), 0o755);
    }
    const agents = path.join(root, 'codex', 'agents');
    fsSync.mkdirSync(agents, { recursive: true });
    fsSync.writeFileSync(path.join(agents, 'explorer.toml'), roleToml);
    const assignment = path.join(root, 'assignment.md');
    fsSync.writeFileSync(assignment, 'List the top-level folders and stop.\n');

    const out = [];
    const err = [];
    const code = await run(['--role', 'explorer', '--cwd', root, '--prompt-file', assignment], {
      env: { ...process.env, CODEX_HOME: path.join(root, 'codex'), PATH: bin, Path: undefined },
      stdout: (text) => out.push(text),
      stderr: (text) => err.push(text),
    });
    assert.equal(code, 3, `the stand-in's exit code passes through: ${err.join('')}`);
    assert.deepEqual(out, ['reply ok=true "quoted" prompt-ok\n'], 'only the last message reaches stdout');
    assert.deepEqual(err, ['codex-forward: Codex thread stand-in-thread; its rollout is saved under ~/.codex/sessions\n'], 'only the thread line reaches stderr on a run that replied');

    fsSync.writeFileSync(assignment, 'HANG\n');
    const hungErr = [];
    const started = Date.now();
    const hung = await run(['--role', 'explorer', '--cwd', root, '--prompt-file', assignment], {
      env: { ...process.env, CODEX_HOME: path.join(root, 'codex'), PATH: bin, Path: undefined },
      runLimitMs: 1500,
      stdout: () => {},
      stderr: (text) => hungErr.push(text),
    });
    assert.equal(hung, 124, hungErr.join(''));
    assert.ok(Date.now() - started < 15_000, 'the hung stand-in is stopped, not waited out');
    assert.match(hungErr.join(''), /stopped the Codex run/);

    // A tree kill that fails leaves the stand-in running; the forwarder's own
    // process must still exit with 124 instead of waiting on it.
    fsSync.rmSync(path.join(root, 'stand-in.pid'), { force: true });
    const harness = path.join(root, 'forward-once.mjs');
    fsSync.writeFileSync(harness, [
      `const { run } = await import(${JSON.stringify(pathToFileURL(path.join(here, '..', 'claude', 'scripts', 'codex-forward.mjs')).href)});`,
      `process.exitCode = await run(['--role', 'explorer', '--cwd', ${JSON.stringify(root)}, '--prompt-file', ${JSON.stringify(assignment)}], {`,
      `  env: { ...process.env, CODEX_HOME: ${JSON.stringify(path.join(root, 'codex'))}, PATH: ${JSON.stringify(bin)}, Path: undefined },`,
      '  runLimitMs: 1500, stopTree: () => {}, stdout: () => {}, stderr: () => {},',
      '});',
    ].join('\n'));
    const once = spawnSync(process.execPath, [harness], { timeout: 20_000, windowsHide: true });
    const leftover = Number(fsSync.readFileSync(path.join(root, 'stand-in.pid'), 'utf8'));
    try { process.kill(leftover); } catch { /* already gone */ }
    assert.equal(once.error, undefined, 'the forwarder process exits on its own after a failed kill');
    assert.equal(once.status, 124);
  } finally {
    // A just-killed stand-in can hold the folder for a moment on Windows (EPERM).
    fsSync.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});

test('every source role file parses with a provider and an effort', async () => {
  const agents = path.join(here, '..', 'agents');
  const tomls = fsSync.readdirSync(agents).filter((name) => name.endsWith('.toml'));
  assert.ok(tomls.length >= 7);
  for (const name of tomls) {
    const role = parseRoleToml(fsSync.readFileSync(path.join(agents, name), 'utf8'), name);
    assert.equal(`${role.name}.toml`, name);
    assert.ok(role.provider, name);
    assert.ok(role.effort, name);
  }
});
