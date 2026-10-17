# Development servers, logs and lifecycle

Use this route when launching, reusing, testing or debugging a local app. The
project's ordinary verification/runtime guide owns exact commands and paths;
this reference owns the shared method. Read the installed wrapper and its help
before borrowing upstream commands from another version or operating system.

## Identify and reuse

Inspect the project's status command and existing runner sessions before starting
a server. Reuse only an instance serving the intended checkout, current changes,
environment and test data. A familiar hostname or healthy port is insufficient.
Keep incompatible worktrees on separate named app routes and isolated mutable
state. Portless naming does not isolate databases, authentication or test data.

A project with a local server exposes this as commands in its own runner, not
as a procedure: an idempotent start that reuses the checkout's healthy instance
or launches one and prints its URL, a status command that reports URL, liveness
and checkout identity and exits non-zero when the instance is unusable, a stop
command that ends only that checkout's instance, and a test entry that takes
its base URL from status. Call them; do not read runtime metadata, build an
environment block or compare identities by hand. Where a guide still describes
those steps as prose, or a tracked launch configuration starts an unwrapped
server, report the gap and repair it in the project. The commands stay
project-owned; the harness ships no shared runner.

Stop proves ownership before each signal. The launcher records every PID with
its operating-system start time, and a process is this checkout's only when
that start time matches exactly and it runs the expected command. A launch
time window, a shared app name or a parent link does not prove it: a PID can be
reused within seconds by another worktree's identical command, and a dead
parent's PID stays on its children on Windows. Take start times from a stable
absolute source read as UTC (process creation time on Windows, `ps -o lstart`
on POSIX), never an elapsed-time estimate. Where the record has no start time,
require the checkout's own path on a process below the PID. Leave anything
unproven alone and report it. Write the launch record through a rename and let
readers re-read a partial one.

Prefer the project's launch command over invoking a framework directly. Retain
its session/run identifier, supervisor and child PID/start identity, checkout,
reported URL/port, log locations and stop command in existing runner output or
the task record. No extra service registry is needed.

On Windows, a launcher started detached has no console, so every console
program it starts (git, node, cmd, a package-manager shim, the project's own
scripts) opens a visible window unless the call asks for a hidden one:
`windowsHide: true` in Node, `CREATE_NO_WINDOW` in Python, `-WindowStyle
Hidden` for Start-Process. A child started hidden passes its hidden console on
to its own children, so the rule binds every call the launcher process makes,
including those in modules it imports and the call that starts each script. The
templates' `scripts/dev.mjs` hides every call and `checks/templates.test.mjs`
holds it there; a project launcher keeps the same rule with its own test over
its import graph, because one missed call in an often-run `dev:up` flashes a
window each launch.

## Tool and Node runtime checks

When setup or command resolution fails, use the on-demand, read-only
[environment preflight](../scripts/environment-preflight.mjs):
`node <script> --spec <project-tools.json>`. The project supplies the commands
and required versions, for example:

```json
{"tools":[{"name":"node","command":"node","args":["--version"]},
          {"name":"ripgrep","command":"rg","args":["--version"]}]}
```

Add `expectedVersion` for an exact required version. For npm's own Node runtime,
use `npm version --json` with `versionSource: "npm-node"`; on Windows, explicitly
invoke the intended npm PowerShell wrapper through `pwsh -NoProfile -File`.
On Windows a bare command resolves through PATHEXT in PATH order, as Windows
does. A `.cmd` or `.bat` launcher, such as npm, npx or another npm-installed CLI,
is reported as `needs-shell-wrapper` rather than run; probe its PowerShell
wrapper the same way.
Verify lifecycle children with an actual `npm run` script. `npm exec -- node`
can select an npm package named `node`, so it is not proof of ordinary child
runtime selection. The helper reports failures; it never installs or repairs.

Where fnm is installed, use the project's `.node-version` or `.nvmrc` and verify
the executable, npm runtime and lifecycle child agree. For dev servers, watchers,
automation and profile-disabled shells, use `fnm exec --using <pin> <command> ...`
to bind the runtime for the command's lifetime. The interactive profile shares
one mutable junction per shell: changing directories can change the Node found
by an already-running child's later subprocesses. `fnm exec` also fails when the
requested runtime is unavailable. Pin the package manager separately where the
project declares one. The harness keeps one Node line: fnm's `default` alias is
the current Node 24 release, and each repository declares the major only
(`.node-version` `24`, `engines.node` `>=24`). A separate pin needs a deployment
runtime fixed to another major or a dependency that breaks on the newer one.
A known-bad patch does not change the pin: raise the `engines` floor above it
(`>=24.20.0`) and have the repository's own dependency step enforce that floor
before it installs, because npm only warns on `engines` unless `engine-strict`
is on, and an exact `.node-version` would make every machine install that one
patch even when a newer release is already there.
Never override a project's declared requirement with the global default.

For an authorized Windows PowerShell setup, the optional
[profile integration](../scripts/windows-node-profile.ps1) initializes an
installed fnm 1.39 or later, searches parent directories for version files and
keeps its per-shell junctions in the writable Codex working area. Dot-source the
installed helper as the last statement in the user's PowerShell profile. When
fnm has no `default` alias, or one pointing at nothing installed, it runs
`fnm install 24` and `fnm default 24` once, so a folder with no version file
resolves to that default. It replaces fnm's cd hook with one that never stops at
fnm's interactive install prompt: a declared version fnm cannot resolve fails
the `cd` with the exact `fnm install <version>` command, and it never installs a
repository's version itself. Where fnm's store is read-only, as in a sandbox, a
missing default fails with the two commands to run on the host. It preserves any
existing `XDG_RUNTIME_DIR` after initialization; Node installations need only
read/execute access. fnm's automatic directory hook covers `cd`; after other
directory APIs, run `fnm use` explicitly. A profile-disabled shell must use
`fnm exec` or initialize fnm itself. Initialization errors are visible but do not
prevent PowerShell from running subsequent commands; use explicit `fnm exec` when
missing runtime pins must stop execution. Test a fresh actual sandbox as well as
the host shell after setup.

## Portless

Where configured, Portless owns the named URL/proxy route; the project's wrapper
may own the actual app process and lifecycle. Confirm that division in the
launcher before starting or stopping anything. Use the reported URL, including
its actual scheme and port. Check installed version/help and project guidance
for supported list/status and app-stop commands; do not assume current upstream
commands work in an older project pin.

Reuse a suitable shared proxy. Stop your app through its owning runner when
finished; do not stop a shared proxy merely because your test ended. Route
removal, app shutdown and proxy shutdown are different actions. If your task
started a proxy, verify it has no remaining consumers before retiring it.
Certificate trust, privileged ports, global installation and machine settings
are separate setup actions, not implicit parts of a routine verification run.

The shared proxy is one per machine, so it belongs to no single task. It starts
on the first `portless run` (or `portless proxy start`, rarely needed); `portless
list` shows the active routes and so its live consumers. Stop it with `portless
proxy stop` only when that list holds no route from another checkout; a task
that started it records that in its runner output like any other process it
owns. `portless prune` removes orphaned dev servers from crashed sessions, never
a live one.

## Locate and read the logs

Start with the project's status/logs/errors commands. Inspect their help and
implementation when needed to learn whether reads consume or rotate output.
Distinguish app stdout/stderr, proxy diagnostics, browser console/network events
and test-runner artifacts. A proxy log alone rarely explains an application error.

Use an existing supervisor's session polling or log command while a process is
running. If no capture exists, redirect app stdout and stderr to distinct files
in the project's configured runtime root or task scratch, using the existing
launch mechanism. Do not introduce a second background supervisor. Keep the
paths discoverable in the same run output. Tool-owned logs stay with their tool;
the project's host storage map governs shared runtime locations.

For file logs on Windows, read a bounded tail with
`Get-Content -LiteralPath <log-path> -Tail 100`, then narrow by timestamp, request
identifier or failure text. Use short session polls or bounded reads while the
failure is reproduced; avoid leaving a `-Wait` tail or watcher alive. Inspect
server logs alongside the browser's console and failed network response for the
same action. Redact credentials and personal payloads from quoted evidence.

Retain the minimal useful excerpt or runner artifact in the resolved workspace,
with command, checkout/candidate, URL, timestamp, scenario and outcome. Preserve
the relevant evidence before destructive/consuming log reads or run cleanup.
Logs show what happened; an assertion of the expected result supplies the check.

## Finish the run

Prefer commands that exit, and use the runner's scoped stop/cleanup path. Recheck
PID start identity and parentage before any direct process termination; PID reuse
can target an unrelated process. Stop only the task-owned app/process tree,
watchers and test resources. Preserve reused services, other users' browser tabs,
shared proxies and data. A deliberately retained preview needs an explicit
handoff of its owner, URL, logs and stop command.

Verify shutdown through runner status and owned process/route state. Release
task-owned temporary output after capturing useful evidence; do not sweep shared
runtime folders. Use docs-workspace retention, keep-codex-fast for broader host
maintenance and delivery for worktree retirement.

Official Portless behavior: [v0.15.0 README](https://github.com/vercel-labs/portless/blob/v0.15.0/README.md).
Project version and wrapper remain authoritative for executable commands.
