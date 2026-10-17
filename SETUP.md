# Setting up the harness

This page is for the agent asked to install the harness on someone's machine.
Interview the user first, then install for the runtimes they have, then prove
it worked. Ask rather than guess: every personal detail comes from the user.

## 1. Interview

Ask these in one message, then read back a short summary and get a yes before
changing anything.

1. Which coding agents do you use: Codex, Claude Code, or both? If Codex, do
   you run Codex Router or another third-party model provider?
2. Your name, and what you work on (your role, business or kinds of projects).
3. How you like answers: length, tone, anything to avoid.
4. Where your projects live on this machine, and which notes and todo apps you
   use, if any.
5. Where to keep the harness checkout (default: `~/agent-harness`). It stays
   there; updates are pulled into it.

## 2. Prerequisites

The scripts need `git`, Node.js 24 or later and PowerShell 7 (`pwsh`) on
Windows, macOS or Linux. Check each with its version command. Install anything
missing with the platform's package manager, after telling the user what you
will install. Clone this repository to the folder from question 5.

## 3. The personal section

Copy `AGENTS.private.example.md` to `AGENTS.private.md` in the checkout and
fill its section 01 from answers 2 to 4. Keep the `## 01` heading and add no
other section; leave out any line the user had no answer for. The file is
git-ignored and never leaves the machine. Deploy installs `AGENTS.md` with this
section in place of the generic one.

## 4. Install into the Codex home

Claude Code reads the installed copy from the Codex home too, so this step runs
for every user. Create `~/.codex` if it does not exist, then from the checkout:

1. Run `pwsh -NoProfile -File config/deploy.ps1` and summarise the plan for
   the user: the counts, and every `CONFLICT` line in full. A conflict is a
   file of theirs that differs; ask before re-running with `-Force`, which
   replaces it and keeps a backup.
2. Run it again with `-Apply`.

For Codex users:

- Codex roles run only when Codex is signed in: check `codex login status`
  and, if needed, ask the user to run `codex login` themselves.
- `fast_worker` and `fast_review` pin the `codex-router` provider. Without
  Codex Router, ask which model they want for these two; `codex debug models`
  lists the models their sign-in offers, and MODELS.md the current bindings.
  Edit `model`, `model_provider` and `model_reasoning_effort` in
  `~/.codex/agents/fast_worker.toml` and `fast_review.toml`. Later deploys keep
  these edits and list them as conflicts, which is expected.
- Codex runs a new hook only after the user trusts it: tell them to review the
  harness hooks with `/hooks` in their next session.

## 5. Claude Code

Skip this step if the user does not use Claude Code. Otherwise create
`~/.claude` if it does not exist.

- With Codex: `reviewer` stays a Codex role, which Claude Code runs through
  `codex exec`, so it needs the Codex CLI on the path and signed in (step 4).
- Without Codex: run `reviewer` on Claude instead, through
  `claude/claude-map.local.json` in the checkout (git-ignored). Create it if
  it is absent:

  ```json
  { "roles": { "reviewer": { "model": "opus", "effort": "high" } } }
  ```

  If it exists, it holds the user's own bindings: keep every other role and
  ask before changing an existing `reviewer` entry.

Then run `pwsh -NoProfile -File claude/sync-claude.ps1`, summarise the plan,
and run it again with `-Apply`. Add this to `~/.claude/settings.json`, keeping
everything already there, so repository `AGENTS.md` files load:

```json
"pluginConfigs": {
  "agents-md@builtin": { "options": { "instructionFiles": "claude-md-and-agents-md" } }
}
```

## 6. Prove it

- The deploy plan lists nothing to add or update (only expected conflicts).
- The Claude sync plan, if run, says `0 change(s) planned` and no longer warns
  about `instructionFiles`.
- `~/.codex/AGENTS.md` starts its section 01 with the user's own text.

Then ask the user to start a new session in each runtime and ask it which
roles it can delegate to. The roles, and in Claude Code the skills, should be
listed.

## 7. Report

Tell the user, briefly: what was installed and where, the choices made from
the interview, and what is optional and not set up. Optional: Codex Router,
Open Code Review (`ocr`, used by code review), Portless, playwright-cli and the
codebase-memory code index. Each skill says what it does without them.

## Updating and undoing

To update, pull in the checkout and repeat steps 4 to 6; deploy and sync change
only what differs. Both keep a backup of every file they replace or retire.
Deploy's go in a dated folder under `~/.codex/.harness-backup/`, beside
`deploy-state.json`, which records what is deployed. Sync's go in a dated folder
under `~/.claude/.harness-backup/`, with a `manifest.json` naming each change.
