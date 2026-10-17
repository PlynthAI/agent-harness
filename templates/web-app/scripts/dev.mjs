#!/usr/bin/env node
// Project-owned dev server runner: node scripts/dev.mjs up | status | stop
//
// up      reuse this checkout's healthy server, or start one in the background and wait for it.
//         With Portless installed it runs under `portless run` on a named <name>.localhost route;
//         otherwise on 127.0.0.1 at PORT, or a port derived from the folder name. Before reusing
//         or starting, it refuses a Portless whose version is older than 0.15.4 or unreadable; a
//         new route must be a .localhost name. It does not probe which addresses the proxy uses.
// status  print URL, pid and checkout; exit 1 with the fix when the server is not usable
// stop    stop the recorded process tree, only if its OS start time still matches the record
// serve   run the framework on 127.0.0.1:$PORT in the foreground; `serve --portless` runs that
//         under `portless run`. `up` starts these; people use `pnpm run dev`.
//
// Record: .cache/dev/launch.json. Log: .cache/dev/server.log (stdout and stderr appended).

import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import http from "node:http";
import https from "node:https";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { stripVTControlCharacters } from "node:util";

// The framework's CLI, its flag for the listening host, and the path that answers once ready.
const framework = {
  name: "next dev",
  bin: "next/dist/bin/next",
  hostFlag: "--hostname",
  health: "/api/health",
};

const self = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(self), "..");
const cacheDir = path.join(root, ".cache", "dev");
const recordPath = path.join(cacheDir, "launch.json");
const logPath = path.join(cacheDir, "server.log");
const isWindows = process.platform === "win32";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** @param {string} name */
export function derivePort(name) {
  return 3000 + (createHash("sha256").update(name).digest().readUInt32BE(0) % 1000);
}

/** @param {Record<string, string | undefined>} env @param {string} folder */
export function resolvePort(env = process.env, folder = root) {
  if (!env.PORT) return derivePort(path.basename(folder));
  const port = Number(env.PORT);
  if (Number.isInteger(port) && port > 0 && port < 65536) return port;
  throw new Error(`PORT must be a whole number from 1 to 65535, not "${env.PORT}".`);
}

/** @param {any} value */
export function validateRecord(value) {
  if (typeof value !== "object" || value === null) return { ok: false, problem: "not an object" };
  if (!Number.isInteger(value.pid) || value.pid <= 0)
    return { ok: false, problem: "pid is invalid" };
  for (const field of ["startTime", "cwd", "url", "log"]) {
    if (typeof value[field] !== "string" || !value[field]) {
      return { ok: false, problem: `${field} is missing` };
    }
  }
  if (!/^https?:\/\//.test(value.url)) return { ok: false, problem: "url is not http(s)" };
  return { ok: true, record: value };
}

/** @param {{ startTime: string }} record @param {string | null} observed */
export function isSameProcess(record, observed) {
  return observed !== null && observed === record.startTime;
}

/** Validates the record `up` is about to write, so `stop` can act on it later. */
export function launchRecord(fields) {
  if (!fields.startTime) {
    throw new Error(
      `Could not read the OS start time of pid ${fields.pid}, so dev:stop could not verify it later. Stopped it; try again.`,
    );
  }
  const result = validateRecord(fields);
  if (!result.ok) throw new Error(`Could not record the dev server: ${result.problem}.`);
  return result.record;
}

/**
 * What `stop` does with the record: "kill" the tree, "drop" the record, "keep" it untouched, or
 * "fail" (keep it and exit 1). `observed` is the pid's current OS start time, or null when it is
 * gone; after the kill, the record goes only once the process is gone.
 * @param {{ ok: boolean, problem?: string, record?: any }} result @param {string} checkout
 * @param {string | null} observed @param {{ killed?: boolean }} [phase]
 */
export function planStop(result, checkout, observed, { killed = false } = {}) {
  if (!result.ok) return { action: "drop", message: `Nothing to stop: ${result.problem}.` };
  const { pid, url, cwd } = result.record;
  if (cwd !== checkout) {
    return {
      action: "keep",
      message: `Left the record alone: it belongs to another checkout (${cwd}). Run dev:stop there.`,
    };
  }
  if (killed) {
    return observed === null
      ? { action: "drop", message: `Stopped the dev server at ${url} (pid ${pid}).` }
      : {
          action: "fail",
          message: `The dev server at ${url} is still running as pid ${pid}; kept the record.`,
        };
  }
  if (!isSameProcess(result.record, observed)) {
    return {
      action: "drop",
      message: `Left pid ${pid} alone: it has exited or its start time differs from the record. Removed the stale record.`,
    };
  }
  return { action: "kill" };
}

/**
 * "portless" when `portless --version` ran and succeeded, else "port". A missing or failing
 * binary means Portless is not installed; PORTLESS=0, false or skip is Portless's own opt-out.
 * @param {Record<string, string | undefined>} env
 * @param {{ status: number | null, error?: Error, stdout?: string }} probe
 */
export function chooseMode(env, probe) {
  const optedOut = ["0", "false", "skip"].includes(env.PORTLESS?.toLowerCase() ?? "");
  return !optedOut && !probe.error && probe.status === 0 ? "portless" : "port";
}

// Portless 0.15.4 is the first release whose proxy listens only on loopback outside LAN mode;
// earlier ones listen on every interface, so the route would be reachable from the network.
const PORTLESS_FLOOR = [0, 15, 4];
const PORTLESS_FIX =
  "Update it (npm install -g portless@latest) or set PORTLESS=0 to run on a port.";

/** Why the installed Portless must not run this server, or null. `text` is `portless --version`. */
export function portlessVersionProblem(text) {
  // Only a whole line counts as the version, so an update notice's numbers never do.
  const found = /^\s*(?:portless\s+)?v?(\d+)\.(\d+)\.(\d+)(-[0-9A-Za-z.-]+)?\s*$/m.exec(
    String(text ?? ""),
  );
  if (!found) {
    return `Could not read a version from \`portless --version\`; 0.15.4 or later is required. ${PORTLESS_FIX}`;
  }
  const [, major, minor, patch, prerelease = ""] = found;
  const versus = [major, minor, patch].map((part, i) => Number(part) - PORTLESS_FLOOR[i]);
  const order = versus.find((difference) => difference !== 0) ?? 0;
  // A pre-release sorts before its release, so 0.15.4-beta.1 is still older than the floor.
  if (order > 0 || (order === 0 && !prerelease)) return null;
  return `Portless ${major}.${minor}.${patch}${prerelease} is older than 0.15.4, the first release whose proxy listens only on loopback. ${PORTLESS_FIX}`;
}

/** Why a Portless route is not private to this machine, or null. LAN mode drops `.localhost`. */
export function portlessRouteProblem(url) {
  if (new URL(url).hostname.endsWith(".localhost")) return null;
  return `Portless gave ${url}, not a .localhost route, so its proxy is in LAN mode or uses another name and the network can reach it. Restart the proxy on loopback, or set PORTLESS=0 to run on a port.`;
}

/** App routes in `portless list` output as { url, pid }; aliases have no pid and are skipped. */
export function parsePortlessList(text) {
  return stripVTControlCharacters(text)
    .split(/\r?\n/)
    .flatMap((line) => {
      const match = /^\s*(https?:\/\/\S+)\s+->\s+\S+\s+\(pid (\d+)\)/.exec(line);
      return match ? [{ url: match[1], pid: Number(match[2]) }] : [];
    });
}

/** The root pid and every pid below it, from a table of "pid ppid" lines. */
export function processTree(table, rootPid) {
  const children = new Map();
  for (const line of table.split("\n")) {
    const [pid, parent] = line.trim().split(/\s+/).map(Number);
    if (pid) children.set(parent, [...(children.get(parent) ?? []), pid]);
  }
  const tree = new Set([rootPid]);
  for (const pid of tree) for (const child of children.get(pid) ?? []) tree.add(child);
  return tree;
}

function capture(command, args) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    windowsHide: true,
  });
}

const powershell = (script) => capture("powershell.exe", ["-NoProfile", "-Command", script]);

/** The OS start time of a process, or null when it is not running. */
function startTimeOf(pid) {
  try {
    const out = isWindows
      ? powershell(
          `(Get-Process -Id ${pid} -ErrorAction Stop).StartTime.ToUniversalTime().ToString('o')`,
        )
      : capture("ps", ["-o", "lstart=", "-p", String(pid)]);
    return out.trim() || null;
  } catch {
    return null;
  }
}

function processTable() {
  return isWindows
    ? powershell(
        'Get-CimInstance Win32_Process | ForEach-Object { "$($_.ProcessId) $($_.ParentProcessId)" }',
      )
    : capture("ps", ["-A", "-o", "pid=", "-o", "ppid="]);
}

/** Portless's CLI; on Windows its npm shim, portless.cmd, runs through cmd.exe. */
function portlessCommand(args) {
  return isWindows
    ? [process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "portless.cmd", ...args]]
    : ["portless", args];
}

function portless(args) {
  const [command, commandArgs] = portlessCommand(args);
  return spawnSync(command, commandArgs, { cwd: root, encoding: "utf8", windowsHide: true });
}

/** The URL of the Portless route served from the process tree under pid, once it is listed. */
function routeUnder(pid) {
  const listing = portless(["list"]);
  if (listing.status !== 0) {
    const reason = (listing.stderr || listing.error?.message || "").trim();
    throw new Error(`\`portless list\` failed: ${reason}\nFix: portless doctor`);
  }
  const routes = parsePortlessList(listing.stdout);
  const tree = routes.length ? processTree(processTable(), pid) : new Set();
  const url = routes.find((route) => tree.has(route.pid))?.url ?? null;
  const exposed = url && portlessRouteProblem(url);
  if (exposed) throw new Error(exposed);
  return url;
}

/** Whether the server answers at url. *.localhost goes to loopback, as browsers resolve it. */
function answers(url) {
  const target = new URL(framework.health, url);
  const loopback = target.hostname.endsWith(".localhost") && { hostname: "127.0.0.1" };
  const client = target.protocol === "https:" ? https : http;
  const options = { ...loopback, headers: { host: target.host }, servername: target.hostname };
  return new Promise((resolve) => {
    const request = client.get(target, { ...options, timeout: 2000 }, (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 400);
    });
    request.on("timeout", () => request.destroy());
    request.on("error", () => resolve(false));
  });
}

function portIsFree(port) {
  return new Promise((resolve) => {
    const probe = createServer().once("error", () => resolve(false));
    probe.listen(port, "127.0.0.1", () => probe.close(() => resolve(true)));
  });
}

function readRecord() {
  if (!fs.existsSync(recordPath))
    return { ok: false, problem: "no dev server is recorded for this checkout" };
  try {
    const result = validateRecord(JSON.parse(fs.readFileSync(recordPath, "utf8")));
    return result.ok ? result : { ok: false, problem: `the record is invalid (${result.problem})` };
  } catch {
    return { ok: false, problem: "the record is not valid JSON" };
  }
}

/** Why the recorded server is not usable, or null when it is healthy. */
async function diagnose(result) {
  if (!result.ok) return result.problem;
  const { record } = result;
  if (record.cwd !== root) return `the record belongs to another checkout (${record.cwd})`;
  if (!isSameProcess(record, startTimeOf(record.pid)))
    return `pid ${record.pid} has exited or is another process`;
  if (!(await answers(record.url))) return `${record.url} does not answer`;
  return null;
}

function killTree(pid) {
  try {
    if (isWindows) capture("taskkill", ["/PID", String(pid), "/T", "/F"]);
    else process.kill(-pid, "SIGTERM"); // the detached root leads its own process group
  } catch {
    // already gone
  }
}

/** Runs a command in the foreground on this process's stdio and exits with it. */
function hold(command, args) {
  // windowsHide gives the child a hidden console that its own children inherit, so no
  // framework worker opens a console window.
  const child = spawn(command, args, { cwd: root, stdio: "inherit", windowsHide: true });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
  child.on("error", (error) => {
    console.error(error.message);
    process.exit(1);
  });
  child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
}

async function serve() {
  if (process.argv[3] === "--portless") {
    return hold(...portlessCommand(["run", "node", "scripts/dev.mjs", "serve"]));
  }
  if (!process.env.PORT) throw new Error("serve runs on the PORT that dev:up or Portless sets.");
  const args = ["dev", framework.hostFlag, "127.0.0.1", "--port", String(resolvePort())];
  hold(process.execPath, [path.join(root, "node_modules", framework.bin), ...args]);
}

async function up() {
  // The Portless gate comes first, so an unsuitable Portless is refused on reuse too.
  const probe = portless(["--version"]);
  const mode = chooseMode(process.env, probe);
  const refused = mode === "portless" ? portlessVersionProblem(probe.stdout) : null;
  if (refused) throw new Error(refused);
  const current = readRecord();
  if ((await diagnose(current)) === null) {
    return console.log(
      `Reusing the dev server at ${current.record.url} (pid ${current.record.pid}).`,
    );
  }
  const port = mode === "port" ? resolvePort() : null;
  if (port && !(await portIsFree(port))) {
    const hung =
      current.ok && planStop(current, root, startTimeOf(current.record.pid)).action === "kill";
    throw new Error(
      hung
        ? `Port ${port} is held by this checkout's dev server (pid ${current.record.pid}), which does not answer. Run pnpm run dev:stop, then pnpm run dev:up.`
        : `Port ${port} is in use by a process this checkout did not start. Stop it or set PORT.`,
    );
  }
  fs.mkdirSync(cacheDir, { recursive: true });
  const log = fs.openSync(logPath, "a");
  // Detached: on POSIX the root leads its own process group; on Windows it has no console and
  // is outside this process's kill-on-exit job, so it outlives `up`.
  const child = spawn(process.execPath, [self, "serve", ...(port ? [] : ["--portless"])], {
    cwd: root,
    env: port ? { ...process.env, PORT: String(port) } : process.env,
    detached: true,
    windowsHide: true,
    stdio: ["ignore", log, log],
  });
  fs.closeSync(log);
  let exited = false;
  child.once("exit", () => (exited = true));
  const via = port ? `on 127.0.0.1:${port}` : "through Portless";
  console.log(`Starting ${framework.name} ${via}; log: ${logPath}`);
  const fix = port ? `Read ${logPath}.` : `Read ${logPath}.\nFix: portless doctor`;
  let url = null;
  try {
    for (const deadline = Date.now() + 120_000; !url; await sleep(500)) {
      if (exited) throw new Error(`${framework.name} exited before it was ready. ${fix}`);
      if (Date.now() > deadline) throw new Error(`The server did not answer within 120s. ${fix}`);
      const candidate = port ? `http://127.0.0.1:${port}` : routeUnder(child.pid);
      if (candidate && (await answers(candidate))) url = candidate;
    }
    const startTime = startTimeOf(child.pid);
    const record = launchRecord({ pid: child.pid, startTime, cwd: root, url, log: logPath });
    const temporary = `${recordPath}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(record, null, 2)}\n`);
    fs.renameSync(temporary, recordPath);
  } catch (error) {
    killTree(child.pid);
    throw error;
  }
  child.unref();
  console.log(`Dev server ready at ${url} (pid ${child.pid}).`);
}

async function status() {
  const current = readRecord();
  const problem = await diagnose(current);
  if (problem !== null) {
    console.error(`Dev server not usable: ${problem}.\nFix: pnpm run dev:up`);
    return void (process.exitCode = 1);
  }
  const { record } = current;
  console.log(`URL:      ${record.url}\nPID:      ${record.pid} (started ${record.startTime})`);
  console.log(`Checkout: ${record.cwd}\nLog:      ${record.log}`);
}

async function stop() {
  const current = readRecord();
  const pid = current.record?.pid;
  let plan = planStop(current, root, current.ok ? startTimeOf(pid) : null);
  if (plan.action === "kill") {
    killTree(pid);
    for (let i = 0; i < 40 && startTimeOf(pid) !== null; i += 1) await sleep(250);
    plan = planStop(current, root, startTimeOf(pid), { killed: true });
  }
  if (plan.action === "drop") fs.rmSync(recordPath, { force: true });
  if (plan.action === "fail") {
    console.error(plan.message);
    return void (process.exitCode = 1);
  }
  console.log(plan.message);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const command = { up, status, stop, serve }[process.argv[2] ?? ""];
  if (!command) {
    console.error("usage: node scripts/dev.mjs up|status|stop|serve");
    process.exit(2);
  }
  command().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
