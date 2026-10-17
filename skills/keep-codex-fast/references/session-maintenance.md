# Optional session maintenance

These are the existing bundled script's operating notes, loaded only for a
specific session/history maintenance request. They do not govern cache, artifact
or worktree cleanup. No script apply or history change is part of ordinary storage
maintenance. Prefer supported app operations; never edit a running app's database.
The script and its executable behavior were not changed by this documentation split.
## Safety Rules

- Inspect before mutating.
- The first run must be report-only. Report mode must not write files, create backups, move folders, or change local Codex state.
- Back up before applying changes. Use `--backup-only` when the user wants backups without moving or changing local state.
- This script deletes nothing: it archives sessions and logs, and reports worktrees without moving them. Do not have it permanently delete user chats, logs, worktrees, memories, skills, plugins, or automations.
- Retiring a worktree, or deleting history within the user's retention scope, is an authorised lifecycle operation outside this script: route it through the shared delivery reference (`../delivery/references/worktree-retirement.md`) or the app's own supported operation. Do not keep every archive forever, and do not treat archiving as the only permitted outcome.
- Write manifests and restore scripts when sessions are moved.
- If Codex is running, default to report-only. Apply changes only after Codex is closed or when the user explicitly accepts waiting for Codex to exit.
- Never modify or copy credential files unless the user explicitly asks for that. Back up memory/skill/plugin/automation files before touching local state.
- Treat backup folders as private local artifacts because they can contain Codex metadata. Do not ask users to publish or share backups unless they have reviewed them first.
- Do not print raw thread IDs, chat titles, local paths, or process paths unless the user asks for details or runs `--details`.
- Before applying changes, tell the user to create handoff docs for active repo chats they may continue.
- Before archiving any active repo chat the user may want to continue, recommend creating a comprehensive handoff doc plus a reactivation prompt.
- Do not archive old-but-important active repo chats until the user either confirms a handoff exists or confirms they do not need one.

## Default Workflow

1. Reassure the user: the first run is read-only, privacy-safe, and later apply archives sessions and logs instead of deleting them while leaving worktrees in place.
2. Run the bundled script in report mode:

```bash
python <skill-root>/scripts/keep_codex_fast.py
```

Use `--sessions-only` when only session archival/reporting is wanted. This scope skips path normalization, config pruning, worktree inspection/sizing, log rotation, and process reporting in both report and apply modes:

```bash
python <skill-root>/scripts/keep_codex_fast.py --sessions-only
python <skill-root>/scripts/keep_codex_fast.py --sessions-only --apply --backup-root <private-local-folder> --archive-older-than-days 10
```

Session-only apply requires Codex to be closed and an explicit operator-supplied `--backup-root`. Before moving anything, it copies the cold SQLite family and every candidate rollout into that private backup, verifies payload hashes and free space, freezes the candidate plan, and writes the restore helper. It then records durable move events and rolls back files plus the database transaction on a handled interruption. Keep this backup private because its manifest and payloads contain session metadata.

3. Summarize:
   - active session size
   - archived session size
   - largest active sessions
   - stale worktree candidates (report-only; retirement routes to the shared delivery reference)
   - log size
   - bad Windows `\\?\` path counts
   - config project prune candidates
   - top Node/dev processes
4. Before applying changes, recommend that the user create handoffs for all active repo chats they may continue. Explain that handoffs let them archive heavy chats and resume from docs in fresh threads.
5. Identify large/old active repo chats that may still matter. For each one the user wants to continue, create or update:
   - a handoff in the shared project workspace
   - a reactivation prompt that can start a fresh chat without losing the thread
6. If the user wants to apply the recommended maintenance, ask them to close Codex or use `--wait-for-codex-exit`, then run:

```bash
python <skill-root>/scripts/keep_codex_fast.py --apply --archive-older-than-days 10
```

Worktree retirement is not part of this apply. It is a per-worktree delivery decision (`../delivery/references/worktree-retirement.md`, summarised in `references/storage-lifecycle.md`). The legacy `--worktree-older-than-days` flag is accepted for compatibility and ignored for eligibility: no age, size or count makes a worktree disposable, and this tool never moves or deletes one.

7. Verify after applying:

```bash
python <skill-root>/scripts/keep_codex_fast.py
```

8. Ask whether the user wants a recurring report-only reminder:
   - weekly for heavy Codex use across many repos/terminals
   - biweekly for lighter use
   - no reminder if they prefer manual maintenance

If the user wants automation and the Codex app automation tool is available, create only a recurring report/reminder automation. Do not recommend recurring mutating maintenance, because automation cannot know whether the user created handoffs. The prompt must say not to pass `--apply`, not to archive/move/prune/rotate/normalize/delete/mutate local state, and to remind the user that manual apply should happen only after handoffs are confirmed and Codex is closed.

## What Apply Does

- Backs up important metadata to `~/Documents/Codex/codex-backups/keep-codex-fast-*`.
- Archives old non-pinned sessions to `~/.codex/archived_sessions/`.
- Normalizes Windows extended paths like `\\?\C:\...` inside local SQLite text fields.
- Prunes missing/temp project blocks from `config.toml` and writes UTF-8 without BOM.
- Reports worktree candidates found under `$CODEX_HOME/worktrees` only, without moving or deleting them. Worktrees under other roots (for example a project's own worktree directory) are out of scope for this scan and are handled by the shared delivery reference.
- Rotates `logs_2.sqlite*` into `~/.codex/archived_logs/` only when above the threshold.
- Reports heavy Node processes without killing them.

Report mode does none of those mutations. It only prints counts and pseudonymous candidates. Use `--details` when raw IDs, titles, or paths are needed for diagnosis.

## Recommended Policy

- Use age to prioritize inspection, not to decide which chats the user still needs.
- Use handoff docs for important old threads.
- Start fresh threads from handoff docs instead of repeatedly resuming giant chats.
- Run weekly maintenance if Codex is used daily across many repos/terminals.
- Offer weekly or biweekly report-only reminders after the first successful apply; do not assume the user wants recurring maintenance.
- When in doubt, leave a chat active or ask the user. Never archive a chat that is pinned, current, or explicitly marked as still needed without a handoff.

## Handoff Doc + Reactivation Prompt

For important active repo chats, create a handoff before archiving. Use the project workspace resolved by docs-workspace.

Use `references/handoff-template.md` when the user wants a concrete template.

A handoff document converts an old chat into durable project memory. It should let a fresh Codex thread continue after reading the repo and the handoff, without needing the original chat history.

Offer this prompt for each active repo chat the user may want to continue:

```text
Create a comprehensive handoff document for this repo/session before I archive Codex history.

Include:
- repo/path and branch
- current goal
- what we already completed
- files touched or investigated
- commands/tests already run
- known errors, warnings, or failing checks
- open decisions
- constraints, user preferences, and do-not-touch areas
- the next 3-7 concrete steps

Also include a reactivation prompt I can paste into a fresh Codex chat so it can continue from this handoff without relying on the old chat context.

Save the handoff in the project workspace using docs-workspace.
```

The handoff should capture:

- repo/path and branch
- current goal
- what was already done
- key files touched or investigated
- commands/tests already run
- known failures or warnings
- open decisions
- next 3-7 concrete steps
- any constraints, user preferences, or "do not touch" areas

Add a reactivation prompt at the top or bottom:

```text
We are continuing from this handoff. Read this document first, inspect the current repo state, verify what still applies, and continue from the next steps without assuming the old chat context is available.
```

## Automation Reminder Prompt

Offer this after the first report/apply/verify cycle:

```text
Use $keep-codex-fast to create a recurring Codex maintenance reminder.

Schedule it weekly if I use Codex heavily, or biweekly if that seems safer.

The reminder should:
- run the keep-codex-fast report first
- never pass --apply or run mutating maintenance automatically
- never archive, move, prune, rotate, normalize, delete, or mutate local Codex state
- remind me to create comprehensive handoff docs and reactivation prompts for active repo chats before any manual apply
- summarize active session size, archived session size, extended path candidates, old session candidates, worktree candidates, log size, and top Node/dev processes
- report heavy Node/dev processes without killing them
- tell me that manual apply should only happen after I confirm handoffs exist or are not needed and Codex is closed
```

## Anti-Patterns

Avoid these behaviors:

- deleting sessions, logs, memories, plugins, or skills permanently, or letting this script move, archive or delete a worktree
- applying changes while Codex is actively writing the DB
- archiving important repo chats before creating handoff docs
- treating active history size as "bad" without checking whether the user needs continuity
- killing Node/dev processes automatically
- rewriting `config.toml` without a backup and parse check
- writing UTF-8 TOML with a BOM on Windows
- promising speed gains as universal fact; frame improvements as local-state maintenance results
- making users feel like they did something wrong by using Codex heavily

## User-Facing Caution

Tell users this script permanently deletes nothing and never moves, archives or deletes a worktree. It archives chats and logs into archive folders and writes restore helpers, and it reports worktree candidates for a per-worktree delivery decision. Retiring a worktree, or deleting history the user no longer wants, is a deliberate authorised operation outside this script. The only content this script removes is stale metadata, such as project entries pointing to folders that no longer exist, and even that happens after backing up `config.toml`.

Also tell users backup folders can contain private local Codex metadata. They should keep backups local and avoid publishing or sharing them unless they have reviewed what is inside.
