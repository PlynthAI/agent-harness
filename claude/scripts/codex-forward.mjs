#!/usr/bin/env node
// Forwards one Claude Code assignment to a Codex harness role as one headless
// `codex exec` run.
//
// A Codex-runtime forwarder agent (rendered by claude/sync-claude.ps1) calls:
//   node codex-forward.mjs --role <codex role> --cwd <dir> [--prompt-file <file>] [--write] [--resume <thread id>]
// The Codex role file stays the single source of model, provider, effort and
// instructions: this reads ~/.codex/agents/<role>.toml, assembles the prompt
// (role instructions as written, runtime note, assignment) and runs
// `codex exec --json` in Codex's sandbox (read-only unless --write) with
// approvals off and the prompt on stdin. The run is saved as an ordinary exec
// session under ~/.codex/sessions, so session digests can read its trace; the
// Codex app's default thread list shows editor threads, not exec ones. As soon
// as the run starts, stderr names its thread. Codex's final message, read from
// the --output-last-message file, is this script's stdout verbatim, and the
// exec exit code is its exit code, except a zero exit without a thread identity
// or final reply becomes 1. The exec log goes to stderr when no reply came back.
// A run still going after RUN_LIMIT_MINUTES is stopped and
// exits 124: a runaway guard, far beyond any review seen so far.
// With --resume <thread id> it runs `codex exec resume` instead, sending only
// the follow-up into that session (say, the answer to a reviewer's question),
// with the same binding, sandbox, approvals, reporting and limit.
// No dependencies; the pure functions are exported for checks/codex-forward.test.mjs.
import { spawn as spawnChild } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

class UsageError extends Error {}

export const RUN_LIMIT_MINUTES = 60;

export function parseArgs(argv) {
  const parsed = { role: null, cwd: null, promptFile: null, write: false, resume: null };
  const valued = { '--role': 'role', '--cwd': 'cwd', '--prompt-file': 'promptFile', '--resume': 'resume' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--write') { parsed.write = true; continue; }
    const [flag, inline] = arg.includes('=') ? [arg.slice(0, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)] : [arg, null];
    if (!(flag in valued)) throw new UsageError(`Unknown argument ${flag}. Usage: codex-forward.mjs --role <name> [--cwd <dir>] [--prompt-file <file>] [--write] [--resume <thread id>]`);
    const value = inline ?? argv[++i];
    if (value == null || value === '' || (inline == null && value.startsWith('--'))) throw new UsageError(`${flag} needs a value`);
    parsed[valued[flag]] = value;
  }
  if (!parsed.role) throw new UsageError('--role is required');
  if (!/^[A-Za-z0-9_-]+$/.test(parsed.role)) throw new UsageError(`'${parsed.role}' is not a role name`);
  if (parsed.resume != null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsed.resume)) {
    throw new UsageError(`--resume needs a Codex thread id (a UUID, as the "Codex thread" line prints it), not '${parsed.resume}'`);
  }
  return parsed;
}

export function codexHomeFrom(env) {
  return env.CODEX_HOME || path.join(env.USERPROFILE || env.HOME || os.homedir(), '.codex');
}

// The same grammar sync-claude.ps1 reads: single-line basic strings plus one
// multi-line developer_instructions block without escapes.
function basicString(text, key, source) {
  const match = text.match(new RegExp(`^${key}\\s*=\\s*"((?:[^"\\\\]|\\\\.)*)"\\s*$`, 'm'));
  if (!match) throw new Error(`${source} has no single-line ${key}`);
  try {
    return JSON.parse(`"${match[1]}"`);
  } catch {
    throw new Error(`${source} uses a TOML escape in ${key} that this reader does not decode`);
  }
}

export function parseRoleToml(raw, source) {
  const text = raw.replace(/\r\n/g, '\n');
  const role = {
    name: basicString(text, 'name', source),
    description: basicString(text, 'description', source),
    model: basicString(text, 'model', source),
    provider: basicString(text, 'model_provider', source),
    effort: basicString(text, 'model_reasoning_effort', source),
  };
  const block = text.match(/^developer_instructions\s*=\s*"""\n?([\s\S]*?)"""/m);
  if (!block) throw new Error(`${source} has no developer_instructions block`);
  role.instructions = block[1].trimEnd();
  if (role.instructions.includes('\\')) throw new Error(`${source} uses TOML escapes in developer_instructions, which this reader does not decode`);
  return role;
}

export function buildPrompt({ instructions, task, write }) {
  const runtime = [
    '# Runtime',
    '',
    '- This is a one-shot Codex run started from Claude Code; your final message is returned to Claude verbatim.',
    write
      ? '- The sandbox is workspace-write: you can write in the working directory and the configured writable roots; your role instructions say what you may write.'
      : '- The sandbox is read-only: you can read and run read-only commands but cannot edit or write files.',
    '- Approvals are unavailable: when a step needs one or the sandbox blocks it, state what you could not do and why.',
  ];
  return `${instructions.trimEnd()}\n\n${runtime.join('\n')}\n\n# Assignment\n\n${task}`;
}

// A workspace-write run can drive playwright-cli. On Windows its daemon and
// browser data live in %LOCALAPPDATA%\ms-playwright, so that folder becomes
// the run's writable root (replacing any listed in config.toml), and Chrome's
// own sandbox is switched off because it cannot start inside Codex's; Codex's
// sandbox still contains the browser. The sandbox account has no PowerShell
// execution policy of its own, so it falls back to Restricted and refuses
// npm's .ps1 command shims; this process tree gets the user's RemoteSigned.
// Elsewhere nothing changes.
export function browserAccess({ env, write }) {
  if (!write || !env.LOCALAPPDATA) return { args: [], env };
  const root = path.join(env.LOCALAPPDATA, 'ms-playwright');
  return {
    args: ['-c', `sandbox_workspace_write.writable_roots=${JSON.stringify([root])}`],
    env: { ...env, PLAYWRIGHT_MCP_SANDBOX: 'false', PSExecutionPolicyPreference: 'RemoteSigned' },
  };
}

// The effort goes through as the role file says it: Codex reads these same role
// files natively, so any value it accepts there it accepts here. Values are
// TOML strings for -c; JSON quoting is valid TOML for them.
export function buildExecArgs({ cwd, model, provider, effort, write, outputPath, extra = [] }) {
  return [
    'exec', '--json', '--skip-git-repo-check',
    '-C', cwd,
    '-m', model,
    '-c', `model_provider=${JSON.stringify(provider)}`,
    '-c', `model_reasoning_effort=${JSON.stringify(effort)}`,
    '-c', 'approval_policy="never"',
    '-s', write ? 'workspace-write' : 'read-only',
    ...extra,
    '-o', outputPath,
    '-',
  ];
}

// Continues an earlier run's session with the same binding. `codex exec resume`
// accepts --json, -m, -o and --skip-git-repo-check but not -s or -C, so the
// sandbox goes as a -c override and the caller starts the child in the
// working directory.
export function buildResumeArgs({ threadId, model, provider, effort, write, outputPath, extra = [] }) {
  return [
    'exec', 'resume', '--json', '--skip-git-repo-check',
    '-m', model,
    '-c', `model_provider=${JSON.stringify(provider)}`,
    '-c', `model_reasoning_effort=${JSON.stringify(effort)}`,
    '-c', 'approval_policy="never"',
    '-c', `sandbox_mode="${write ? 'workspace-write' : 'read-only'}"`,
    ...extra,
    '-o', outputPath,
    threadId,
    '-',
  ];
}

// The thread id from one line of `codex exec --json` output, or null.
export function threadIdFrom(line) {
  try {
    const event = JSON.parse(line);
    return event?.type === 'thread.started' && typeof event.thread_id === 'string' ? event.thread_id : null;
  } catch {
    return null;
  }
}

// Stops a process and everything it started: the npm shim's node script runs
// the native Codex binary as a child. On POSIX the child leads its own process
// group (spawned detached), so the whole group is killed.
function stopTree(child) {
  try {
    if (process.platform === 'win32') spawnChild('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true }).on('error', () => {}).unref();
    else process.kill(-child.pid, 'SIGKILL');
  } catch {
    // Already gone.
  }
}

// Finds `codex` on PATH. On Windows the npm install is a .cmd shim, which
// cannot be spawned without a shell, so its node script runs directly instead.
export function resolveCodexCommand({ env, platform = process.platform, exists }) {
  const pathKey = Object.keys(env).find((key) => key.toUpperCase() === 'PATH' && typeof env[key] === 'string');
  const folders = (pathKey ? env[pathKey] : '').split(path.delimiter).filter(Boolean);
  for (const folder of folders) {
    if (platform !== 'win32') {
      if (exists(path.join(folder, 'codex'))) return { command: path.join(folder, 'codex'), prefix: [] };
      continue;
    }
    if (exists(path.join(folder, 'codex.exe'))) return { command: path.join(folder, 'codex.exe'), prefix: [] };
    const script = path.join(folder, 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
    if (exists(path.join(folder, 'codex.cmd')) && exists(script)) return { command: process.execPath, prefix: [script] };
  }
  throw new Error('The Codex CLI is not on PATH. Install it with `npm install -g @openai/codex`, then run `codex login`.');
}

const defaultDeps = {
  env: process.env,
  readFile: (p) => fs.readFileSync(p, 'utf8'),
  exists: (p) => fs.existsSync(p),
  codexCommand: (deps) => resolveCodexCommand({ env: deps.env, exists: deps.exists }),
  readStdin: async () => {
    if (process.stdin.isTTY) return '';
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    return Buffer.concat(chunks).toString('utf8');
  },
  runLimitMs: RUN_LIMIT_MINUTES * 60_000,
  makeTempDir: () => fs.mkdtempSync(path.join(os.tmpdir(), 'codex-forward-')),
  removeTemp: (dir) => fs.rmSync(dir, { recursive: true, force: true }),
  // After the ceiling, the run resolves within a short grace even if the kill
  // failed or a surviving descendant keeps the pipes open: the pipes are closed
  // and the child unreferenced, so this process can still exit.
  stopTree,
  spawn: (command, args, { input, env, cwd, onStdout, timeoutMs, stop }) => new Promise((resolve) => {
    const child = spawnChild(command, args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, env, cwd, detached: process.platform !== 'win32' });
    const log = [];
    let timedOut = false;
    let grace;
    const finish = (code, stderr) => {
      clearTimeout(timer);
      clearTimeout(grace);
      resolve({ code, stderr, timedOut });
    };
    const timer = setTimeout(() => {
      timedOut = true;
      stop(child);
      grace = setTimeout(() => {
        child.stdin.destroy();
        child.stdout.destroy();
        child.stderr.destroy();
        child.unref();
        finish(1, Buffer.concat(log).toString('utf8'));
      }, 5_000);
    }, timeoutMs);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', onStdout);
    child.stderr.on('data', (chunk) => log.push(chunk));
    child.stdin.on('error', () => {});
    child.stdin.end(input);
    child.on('error', (error) => finish(1, `could not start the Codex CLI: ${error.message}\n`));
    child.on('close', (code, signal) => finish(code ?? (signal ? 1 : 0), Buffer.concat(log).toString('utf8')));
  }),
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
};

function readOptional(deps, file) {
  try {
    return deps.readFile(file);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

export async function run(argv, overrides = {}) {
  const deps = { ...defaultDeps, ...overrides };
  let prepared;
  try {
    const args = parseArgs(argv);
    const cwd = path.resolve(args.cwd ?? process.cwd());
    if (!deps.exists(cwd)) throw new UsageError(`--cwd ${cwd} does not exist`);

    const tomlPath = path.join(codexHomeFrom(deps.env), 'agents', `${args.role}.toml`);
    const tomlText = readOptional(deps, tomlPath);
    if (tomlText == null) throw new Error(`No installed Codex role file at ${tomlPath}`);
    const role = parseRoleToml(tomlText, tomlPath);
    if (role.name !== args.role) throw new Error(`${tomlPath} declares name '${role.name}', expected '${args.role}'`);

    const task = args.promptFile ? deps.readFile(path.resolve(args.promptFile)) : await deps.readStdin();
    if (!task || !task.trim()) throw new UsageError('Refusing to forward an empty assignment; pass --prompt-file or pipe the assignment on stdin');

    prepared = { args, cwd, role, task, codex: deps.codexCommand(deps) };
  } catch (error) {
    deps.stderr(`codex-forward: ${error.message}\n`);
    return 2;
  }

  const { args, cwd, role, task, codex } = prepared;
  // A resumed session already holds the role instructions and runtime note, so
  // it gets the follow-up alone.
  const input = args.resume ? task : buildPrompt({ instructions: role.instructions, task, write: args.write });
  const dir = deps.makeTempDir();
  try {
    const outputPath = path.join(dir, 'last-message.md');
    const browser = browserAccess({ env: deps.env, write: args.write });
    const binding = { model: role.model, provider: role.provider, effort: role.effort, write: args.write, outputPath, extra: browser.args };
    const execArgs = args.resume ? buildResumeArgs({ ...binding, threadId: args.resume }) : buildExecArgs({ ...binding, cwd });
    let pending = '';
    let threadId = null;
    const onStdout = (chunk) => {
      if (threadId) return;
      const lines = (pending + chunk).split('\n');
      pending = lines.pop();
      threadId = lines.map(threadIdFrom).find(Boolean) ?? null;
      if (threadId) deps.stderr(`codex-forward: Codex thread ${threadId}; its rollout is saved under ~/.codex/sessions\n`);
    };
    const { code, stderr, timedOut } = await deps.spawn(codex.command, [...codex.prefix, ...execArgs], { input, env: browser.env, cwd, onStdout, timeoutMs: deps.runLimitMs, stop: deps.stopTree });
    if (timedOut) {
      deps.stderr(`codex-forward: stopped the Codex run after ${deps.runLimitMs / 60_000} minutes${threadId ? ` (thread ${threadId})` : ''}; no reply was returned\n`);
      return 124;
    }
    const reply = readOptional(deps, outputPath);
    if (reply?.trim()) deps.stdout(reply);
    else if (stderr) deps.stderr(stderr);
    if (!threadId) {
      deps.stderr('codex-forward: incomplete forward: no Codex thread identity was received; the reply cannot satisfy delegated review\n');
      return code || 1;
    }
    if (!reply?.trim()) {
      deps.stderr('codex-forward: incomplete forward: no final reply was returned; the started thread alone cannot satisfy delegated review\n');
      return code || 1;
    }
    return code;
  } finally {
    deps.removeTemp(dir);
  }
}

function isMain() {
  if (!process.argv[1]) return false;
  const self = fileURLToPath(import.meta.url);
  const invoked = path.resolve(process.argv[1]);
  return process.platform === 'win32' ? self.toLowerCase() === invoked.toLowerCase() : self === invoked;
}

if (isMain()) {
  process.exitCode = await run(process.argv.slice(2));
}
