# Claude Code adapter

Claude Code on this host reads the same installed harness as Codex. It does not
get a second copy: the Codex home stays the one installation, and this folder
holds only the small pieces Claude needs to consume it. Nothing here is copied
into the Codex home.

| File | Purpose |
|---|---|
| [user-CLAUDE.md](user-CLAUDE.md) | The managed block of `~/.claude/CLAUDE.md`: imports `~/.codex/AGENTS.md` and maps its Codex terms to Claude Code |
| [claude-map.json](claude-map.json) | Operator bindings: per Claude agent, either a Claude model and effort or the Codex runtime; the Codex-only skills to leave out, the whole folders to link, the hooks to register and the scripts to install |
| [hooks/session-start-fresh-worktree.ps1](hooks/session-start-fresh-worktree.ps1) | SessionStart hook for new sessions: brings a Claude-made worktree up to date with origin, or says how far behind it is |
| [hooks/session-env-trim.ps1](hooks/session-env-trim.ps1) | SessionStart hook for every source: removes repeated lines from the session's environment scripts so the Bash tool keeps working |
| [../hooks/compact-reload.ps1](../hooks/compact-reload.ps1) | SessionStart hook after compaction, shared with Codex: tells the agent to re-open the skills, references and plan state the summary replaced |
| [scripts/](scripts/) | Scripts installed into `~/.claude/scripts/`. [codex-forward.mjs](scripts/codex-forward.mjs) runs one assignment on a Codex role for a Codex-runtime forwarder agent |
| [sync-claude.ps1](sync-claude.ps1) | Plans or applies the reconciliation below |
| cloud/ | The same installation inside a Claude Code cloud container, from a token-gated bundle Kitchen serves |

## What a sync does

- Keeps a marked block at the top of `~/.claude/CLAUDE.md` equal to
  `user-CLAUDE.md`. Personal lines outside the block are the operator's and are
  kept.
- Renders each mapped role from the installed `~/.codex/agents/<role>.toml` into
  `~/.claude/agents/<key>.md`. A Claude-runtime role keeps the Codex name,
  description and instructions and adds the Claude `model` and `effort` from
  the map. A Codex-runtime role (`"runtime": "codex"`) renders a forwarder
  instead, described below. The role's prose therefore has one owner, the Codex
  role file. A role file changed since the last sync wrote it is reported as a
  conflict and left alone; `-Force` replaces it after the operator has reviewed
  it.
- Copies each script under the map's `scripts` into `~/.claude/scripts/`,
  guarded the same way: backed up, reported as a conflict when edited, and
  removed once the map drops it.
- Removes the file of a role dropped from the map, if it is still what the last
  sync wrote. An edited one is reported as a conflict and kept; `-Force` removes
  it after review.
- Links every installed Codex skill into `~/.claude/skills` as a junction,
  except the excluded Codex-only names. It removes only links it would have
  made itself, named after a Codex skill and pointing at it, once that skill is
  retired or excluded. Any other link into the Codex home is the operator's; it
  is listed as foreign and left alone. It never overwrites a real directory, or
  a link at a skill's name that points somewhere else; it reports them as
  conflicts.
- Links each folder under the map's `folders` (the principles and patterns
  library) from `~/.claude/<name>` to the installed `~/.codex/<name>` as a
  junction, so a skill's relative link such as
  `../../principles-and-patterns/index.md` resolves in the Claude home too. A
  folder not yet deployed to the Codex home is reported and skipped. A folder
  link this sync made is removed once the map drops it; a real directory or a
  link elsewhere at that name is reported as a conflict.
- Copies each hook script in the map into `~/.claude/hooks/`, from this folder
  or from the `source` its entry names inside the checkout (a hook shared with
  Codex keeps its one copy in the root `hooks/` folder), and registers it
  in `~/.claude/settings.json` under the map's event, matcher and timeout, as
  one matcher group whose single handler runs the installed copy with `pwsh`.
  A hook with no matcher in the map gets a group with no `matcher` key, which
  Claude runs for every source of that event.
  Its own entry is the one whose handler names that installed script; it is
  added beside any other hooks at that event, replaced only while it is still
  what the last sync wrote, and removed with the script once the map drops it.
  Every other setting and hook is kept. An entry or script edited since the
  last sync is a conflict; `-Force` replaces it after review.
- Backs up anything it replaces or removes, settings.json included, with a manifest, under
  `~/.claude/.harness-backup/<id>`. The id is the UTC time plus a random
  suffix, so two runs never share a backup.

## Deploying

Run it with `-Apply` after every approved Codex deployment, whatever changed. It
is idempotent and reports "Nothing to change" when the Claude side is current.
The Claude-runtime roles embed their role text, so even a prose edit to a role
file reaches Claude only through this step. Plan mode, the default, writes
nothing:

```powershell
pwsh -NoProfile -File claude/sync-claude.ps1
pwsh -NoProfile -File claude/sync-claude.ps1 -Apply
```

Claude reads repository `AGENTS.md` natively only when no `CLAUDE.md` exists in
the working directory or above it. So that repositories can keep one shared
instruction file and still add a Claude-specific `CLAUDE.md`, the user settings
need this key. The sync warns when it is missing:

```json
"pluginConfigs": {
  "agents-md@builtin": { "options": { "instructionFiles": "claude-md-and-agents-md" } }
}
```

## Codex-runtime roles

A map entry with `"runtime": "codex"` lets Claude Code delegate a harness role
to the model its Codex role file binds, through the Codex CLI's headless
`codex exec`. The key is the Claude agent name; `role`
names the Codex role when the two differ (a key `codex-fast_worker` with
`"role": "fast_worker"` would run `fast_worker`); `"write": true` allows edits.
The entry carries no model or effort: those stay in the Codex role file.

A machine's own bindings go in `claude-map.local.json` beside the map: an
untracked file holding only `roles`, each replacing the map's binding for that
role. A machine without Codex binds `reviewer` to a Claude model there, as
[SETUP.md](../SETUP.md) describes; the sync names the file when it reads it.

The current map has eight roles. smart_worker (Opus `high`: design, UI,
frontend and taste work, and harder implementation and investigation),
fast_worker, explorer and researcher (Sonnet 5.5 `high`), planner (Opus `xhigh`,
advice and plans), tester (Haiku `xhigh`) and fast_review (Haiku `xhigh`,
read-only, a completed slice) are Claude-runtime roles. reviewer is the one
Codex-runtime role: it forwards to its OpenAI model for final review before
push. It keeps `write` so it can record findings as it goes in a
findings file in `.state/` at the root of the checkout it reviews, which
survives a compaction of its own context; its role text limits it to that file.

- The sync renders a forwarder: a Haiku agent with only the Bash tool. It
  writes the assignment to a temporary file and makes one call to
  `~/.claude/scripts/codex-forward.mjs --role <codex role>`, then returns its
  stdout verbatim (Codex's final message), or the
  error and exit code if the call fails.
- The script reads the installed Codex role file, puts its instructions (as
  written) and a short runtime note ahead of the assignment, and runs one
  `codex exec --json` with the role's `model`, `model_provider` and
  `model_reasoning_effort` passed as `-m` and `-c` overrides, the prompt on
  stdin and `-o` naming a temporary file for the final message. The effort
  goes through unchanged, `max` included, because Codex reads the same role
  files natively; the selected OpenCode route's effective upstream effort has
  not been verified, so source `max` does not prove upstream `max`. The
  script prints that final message as its stdout, exits with exec's exit
  code, and shows exec's own log on stderr only when no reply came back.
- The run is saved as an ordinary exec session under `~/.codex/sessions`, so
  the harness skill's session digest can read the reviewer's trace and token
  use. Codex indexes it as an exec thread; the app's default thread list
  shows editor threads, which is where the plugin companion's runs used to
  appear. As soon as the run starts, the script prints its thread id on
  stderr, and the forwarder returns that line with the reply. `codex exec`
  ends with the run, so nothing keeps the checkout as its working folder
  afterwards and a review worktree can be removed straight away.
- The script finds `codex` on `PATH`. On Windows the npm install is a `.cmd`
  shim, so the script runs the shim's `node_modules/@openai/codex/bin/codex.js`
  with node directly rather than through a shell; a `codex.exe` earlier on
  `PATH` is run as is.
- Each forwarded turn is one-way and cannot ask for approvals. A reviewer's
  question is answered by a follow-up forward with `--resume <thread id>`:
  the script runs `codex exec resume <thread id> -` with only the follow-up on
  stdin, and that continues the same Codex session with its earlier context.
  The binding, approvals, JSON events, thread line, run limit, final message
  and exit code match a fresh run. `exec resume` takes no `-s` or `-C`, so
  the sandbox goes as `-c sandbox_mode=...` and the child starts in the
  working directory. The script refuses a `--resume` value that is not a
  thread UUID. Resume with the same `--role` as the original run, since the
  role sets the model, effort and sandbox. Steering a run while it is still going is not supported; the
  background task can be stopped or its output file read.
- Codex runs with `approval_policy="never"`. The sandbox is read-only unless the entry sets
  `write`, and Codex is told to state what it could not do. With `write` the
  sandbox is workspace-write: the working directory plus one writable root,
  `%LOCALAPPDATA%\ms-playwright`, which the script passes as
  `sandbox_workspace_write.writable_roots` (replacing any list in
  `~/.codex/config.toml`) together with `PLAYWRIGHT_MCP_SANDBOX=false` and
  `PSExecutionPolicyPreference=RemoteSigned`, so the run can drive
  `playwright-cli` (Chrome's own sandbox cannot start inside Codex's, and the
  sandbox account otherwise refuses npm's `.ps1` shims). The reviewer's findings file sits inside the checkout it reviews,
  so it needs no other root.
- Skills, hooks and the repository `AGENTS.md` load on the Codex side, from
  `~/.codex`, so nothing is passed across except the assignment.
- The forwarder is always a background subagent (`background: true`), since
  a foreground subagent's background commands stop when its run ends. Its one
  Bash call runs in the background with a 75-minute `timeout`, past Claude's
  ten-minute foreground limit and the 30-minute default that Claude Code
  before 2.1.288 gives every background command; it prints the output once
  the completion notice arrives. On 8 October 2026 a live Sol review of an 18-file
  slice took about 5.5 minutes, and a DeepSeek fast_review forwarded the same
  way before fast_review moved to Haiku took about 16.5. The script stops a
  run still going after 60 minutes, names its thread and exits 124: a
  runaway guard, not a review budget.

## Fresh worktrees

Claude branches a new worktree from the cached `origin/HEAD` and fetches only
when the repository has gone 24 hours without a fetch, so a session can start
hours behind the default branch while Codex keeps pushing to it. The
fresh-worktree SessionStart hook closes that gap for new sessions (`startup` only; a resumed or
compacted session keeps its base).

It acts only in a linked worktree under a Claude worktree root: the Claude
home's `worktrees` folder (the desktop app's, followed through its junction)
or `<main checkout>\.claude\worktrees` (the CLI's). Claude's docs mention a
marker in the git metadata of worktrees it creates, but name no key and the
desktop app's worktrees on this host carry none, so the location is the test.

| State | What the hook does and prints |
|---|---|
| Not a linked worktree, not under a Claude root, or no `origin` | Nothing |
| Fetch of the default branch (`origin/HEAD`, else `main`) fails or takes over 5 s | `could not fetch origin, working from the last fetched <default>` |
| Already at or ahead of `origin/<default>` | Nothing |
| Behind, tree clean (untracked included), no commits of its own | `merge --ff-only`, then `Fast-forwarded <branch> by N commits to origin/<default> (<sha>).` |
| Behind, with changes or its own commits | `<branch> is N commits behind origin/<default>; sync before starting (...)`; nothing touched |

It never resets, stashes or checks out, and always exits 0.

## Session environment

Claude runs each Bash tool call as one `bash -c` string that inlines the
session's environment script: every `*.sh` file that SessionStart hooks wrote
into `~/.claude/session-env/<session id>/`. The Codex plugin's SessionStart hook
appends three `export` lines to its file on every SessionStart event (startup,
resume and compact) without checking what is already there. On Windows, Git
Bash cuts a `-c` string off past about 8,190 characters, so a session resumed
or compacted a few dozen times reaches the point where every Bash call fails
with an "unexpected end of file" error, whatever the command. Claude switches
to a launcher script only past 32,000 characters, too late to help.

The session-env trim hook runs for every source (its group has no matcher)
and rewrites each `*.sh` file in the session's own folder to its distinct
non-blank lines, keeping the first occurrence of each and their order, with LF
endings. It prints one line naming what it trimmed, writes nothing when nothing
repeats, never creates the folder, ignores a session id that is not a plain
name, touches no other session and always exits 0. Claude does not guarantee
the order in which SessionStart hooks run, so when the plugin's hook runs after
this one a file can still hold one repeat of its lines: the script stays
bounded, not perfectly clean.

## After compaction

A compaction keeps AGENTS.md but re-attaches invoked skill bodies only up to
5,000 tokens each and 25,000 in total, and reduces reference files read earlier
to the summary; Codex documents no skill carry-over at all. The compaction
reload hook, `hooks/compact-reload.ps1` at the checkout root, prints one
reminder to re-open the skills and references in use, then re-read
`.state/state.md` at the root of the checkout if it exists, and the task's
`plan.md` if it has one. Both runtimes add a SessionStart
hook's plain stdout to the model's context. The sync registers it under the
matcher `compact`; deploy installs it and `hooks/hooks.json` (as `hooks.json`)
in the Codex home (default `~/.codex`) with matcher `^compact$`. It prints only
for a `compact` payload, and on any error exits 0 silently.

## Differences from Codex

- Claude discovers skills only in `~/.claude/skills` and a repository's
  `.claude/skills`, not in `.codex/skills` or `.agents/skills`. A repository
  keeps its skills in `.codex/skills` and Claude reaches them through generated
  stubs in `.claude/skills`, written by
  `skills/skills-list/scripts/claude-skill-stubs.mjs --write` and kept fresh by
  its `--check` mode in the repository's check script.
- Native subagents run Claude models. reviewer hands bounded tasks to its
  Codex role through the forwarder above; the router lives
  on that Codex side. That is why the codex-router skill is excluded.
- `goal-setter` is linked like any shared skill. Only the user can type
  `/goal` in Claude Code, so it drafts the line for them to send.
- The built-in Explore and Plan agents skip CLAUDE.md and AGENTS.md. The
  generated explorer and planner load them, and each review forwarder's Codex
  thread loads AGENTS.md on the Codex side.
- A personal `code-review` skill replaces the bundled `/code-review`.
- Reading AGENTS.md natively needs Claude Code 2.1.277 or later. Cowork
  desktop sessions skip user-level imports that resolve outside the working
  directory, so the harness import is absent there without an error.

`checks/claude-adapter.ps1` exercises the sync against a fixture built from this
repository's role and skill files. `checks/fresh-worktree-hook.ps1` runs the
hook against fixture repositories and the sync's settings.json handling against
a fixture Claude home. `checks/session-env-hook.ps1` runs the trim hook against
a fixture Claude home's session-env folders and checks that the sync registers
it with no matcher beside the fresh-worktree group. `checks/compact-reload-hook.ps1`
runs the compaction hook directly, runs the Codex registration's command
through each shell Codex may use, and checks the sync's `compact` registration.
Installed state and fresh-session discovery are separate
evidence, reported separately.
