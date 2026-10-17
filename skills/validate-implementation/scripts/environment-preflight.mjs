// On-demand, read-only probes supplied by a project. Usage:
// node environment-preflight.mjs --spec path/to/project-tools.json
// Spec: { "tools": [{ "name": "node", "command": "node", "args": ["--version"],
//   "expectedVersion": "24.20.0" }] }
// For npm's own runtime use args ["version", "--json"] and
// versionSource "npm-node". Probe an npm child separately using a
// project-supplied read-only command; this helper never installs anything.
// On Windows a bare command resolves through PATHEXT. A .cmd or .bat launcher
// is reported as needs-shell-wrapper rather than run; probe its PowerShell
// wrapper through pwsh -NoProfile -File instead.
import { readFileSync, lstatSync, readlinkSync, accessSync, constants, existsSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { hostname, userInfo } from 'node:os';
import { delimiter, dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_ERROR = 240;
const MAX_OUTPUT = 64 * 1024;
const DEFAULT_TIMEOUT = 3000;

function errorCode(error) {
  return typeof error?.code === 'string' ? error.code : 'UNKNOWN';
}

function classifyAccess(error) {
  const code = errorCode(error);
  if (code === 'ENOENT' || code === 'ENOTDIR') return 'missing';
  if (code === 'EACCES' || code === 'EPERM') return 'inaccessible';
  return 'fails-to-launch';
}

function cleanError(error) {
  if (!error) return null;
  const code = errorCode(error);
  // No child output is included. An exit code or OS launch error is enough to
  // locate the failure without printing project output or inherited secrets.
  return String(code).slice(0, MAX_ERROR);
}

function pathValue() {
  const pair = Object.entries(process.env).find(([key]) => key.toLowerCase() === 'path');
  return pair?.[1] || '';
}

function candidates(command) {
  const pathLike = isAbsolute(command) || command.includes('/') || command.includes('\\');
  const base = pathLike ? [resolve(command)] : pathValue().split(delimiter).filter(Boolean).map((dir) => join(dir, command));
  if (process.platform !== 'win32') return base;
  // Windows launches a bare name through PATHEXT, in PATH order, and never runs
  // an extensionless file such as npm's POSIX shell script. Such a file is only
  // reported when no launchable candidate exists anywhere on PATH.
  const extensions = (process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean);
  const hasExtension = (candidate) => /\.[^\\/.]+$/.test(candidate);
  const launchable = base.flatMap((candidate) => hasExtension(candidate) ? [candidate] : [
    ...extensions.map((extension) => candidate + extension.toLowerCase()),
    ...extensions.map((extension) => candidate + extension.toUpperCase())]);
  return [...launchable, ...base.filter((candidate) => !hasExtension(candidate))];
}

// Node refuses to spawn a .cmd or .bat file without a shell, and this helper
// never adds one to project-supplied arguments.
function needsShellWrapper(executable) {
  return process.platform === 'win32' && /\.(cmd|bat)$/i.test(executable);
}

function locate(command) {
  let denied = null;
  let missingLink = null;
  for (const candidate of candidates(command)) {
    let linkTarget = null;
    try {
      const stat = lstatSync(candidate);
      if (stat.isDirectory()) {
        if (isAbsolute(command) || command.includes('/') || command.includes('\\')) {
          return { executable: candidate, linkTarget: null, status: 'fails-to-launch', error: 'EISDIR' };
        }
        continue;
      }
      if (stat.isSymbolicLink()) {
        const raw = readlinkSync(candidate);
        linkTarget = isAbsolute(raw) ? raw : resolve(dirname(candidate), raw);
        lstatSync(linkTarget);
      }
      accessSync(candidate, constants.X_OK);
      return { executable: candidate, linkTarget, status: null, error: null };
    } catch (error) {
      if (classifyAccess(error) === 'inaccessible') {
        denied = { executable: candidate, linkTarget, status: 'inaccessible', error: cleanError(error) };
        break;
      }
      if (linkTarget && classifyAccess(error) === 'missing') {
        missingLink ||= { executable: candidate, linkTarget, status: 'missing', error: cleanError(error) };
      }
    }
  }
  return denied || missingLink || {
    executable: isAbsolute(command) ? command : null,
    linkTarget: null,
    status: 'missing',
    error: 'ENOENT',
  };
}

function versionFrom(stdout, source) {
  if (source === 'npm-node') {
    try {
      const parsed = JSON.parse(stdout);
      return typeof parsed.node === 'string' ? parsed.node.replace(/^v/, '') : null;
    } catch {
      return null;
    }
  }
  const match = stdout.match(/\bv?(\d+\.\d+\.\d+(?:[-+][\w.-]+)?)\b/);
  return match?.[1] || null;
}

function normalizedVersion(version) {
  return version?.replace(/^v/, '') ?? null;
}

function inspect(tool) {
  const found = locate(tool.command);
  const result = {
    name: tool.name,
    requestedCommand: tool.command,
    executable: found.executable,
    linkTarget: found.linkTarget,
    status: found.status,
    version: null,
    expectedVersion: normalizedVersion(tool.expectedVersion),
    exitCode: null,
    error: found.error,
  };
  if (!found.status && needsShellWrapper(found.executable)) {
    result.status = 'needs-shell-wrapper';
    result.error = 'batch launcher; probe it through an explicit wrapper';
  } else if (!found.status) {
    const child = spawnSync(found.executable, tool.args, {
      encoding: 'utf8',
      timeout: tool.timeoutMs || DEFAULT_TIMEOUT,
      maxBuffer: MAX_OUTPUT,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    result.exitCode = child.status;
    if (child.error) {
      const code = errorCode(child.error);
      result.status = code === 'ETIMEDOUT' ? 'timed-out'
        : code === 'EACCES' || code === 'EPERM' ? 'inaccessible' : 'fails-to-launch';
      result.error = cleanError(child.error);
    } else if (child.status !== 0) {
      result.status = 'command-failed';
      result.error = child.signal ? `signal ${child.signal}` : `exit ${child.status}`;
    } else {
      result.version = versionFrom(child.stdout || '', tool.versionSource);
      result.status = result.expectedVersion && result.version !== result.expectedVersion
        ? 'version-mismatch' : 'works';
      if (result.status === 'version-mismatch') result.error = 'version did not match expectation';
    }
  }
  if (tool.expectedRestriction && result.status === 'inaccessible') {
    result.observedStatus = result.status;
    result.status = 'expected-restriction';
  }
  return result;
}

function validateSpec(spec) {
  if (!Array.isArray(spec?.tools) || spec.tools.length === 0) throw new Error('spec.tools must be a non-empty array');
  for (const tool of spec.tools) {
    if (typeof tool?.name !== 'string' || !tool.name || typeof tool.command !== 'string' || !tool.command ||
        !Array.isArray(tool.args) || !tool.args.every((arg) => typeof arg === 'string') ||
        (tool.expectedVersion !== undefined && typeof tool.expectedVersion !== 'string') ||
        (tool.versionSource !== undefined && !['first-semver', 'npm-node'].includes(tool.versionSource)) ||
        (tool.expectedRestriction !== undefined && typeof tool.expectedRestriction !== 'boolean') ||
        (tool.timeoutMs !== undefined && (!Number.isInteger(tool.timeoutMs) || tool.timeoutMs < 1 || tool.timeoutMs > 30000))) {
      throw new Error('each tool needs name, command and string args; optional version, source, restriction and timeout must be valid');
    }
  }
}

function main(argv) {
  if (argv.length !== 2 || argv[0] !== '--spec') throw new Error('usage: node environment-preflight.mjs --spec <project-tools.json>');
  const spec = JSON.parse(readFileSync(argv[1], 'utf8'));
  validateSpec(spec);
  const results = spec.tools.map(inspect);
  const identity = { platform: process.platform, arch: process.arch, hostname: hostname(), user: userInfo().username };
  const ok = results.every(({ status }) => status === 'works' || status === 'expected-restriction');
  process.stdout.write(JSON.stringify({ schemaVersion: 1, identity, ok, results }) + '\n');
  if (!ok) process.exitCode = 1;
}

// Compare real paths: Node runs a linked script from its real file, so through a
// junction or symlink the invoked path differs and main() would silently not run.
if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try { main(process.argv.slice(2)); }
  catch (error) {
    process.stderr.write(`environment-preflight: ${error.message}\n`);
    process.exitCode = 2;
  }
}
