---
name: recall
description: "Rebuild where work stands from earlier sessions and hand back a brief with one next move. Use for \"catch me up on X\", \"where did we leave off\", \"what happened with X last week\", \"recall my work on X\" or before resuming. How or why questions go to understand; external docs to research."
metadata:
  group: investigate
---

# Recall

Hand back a short current-state brief built from what earlier sessions already
learned, so the next move starts where the last one stopped. Read only what the
in-scope threads need, then stop. Recall changes nothing.

## Scope first

- One named prior chat to resume is long-runs'
  [Session pickup](../orchestrate-work/references/long-runs.md#session-pickup),
  not this. A state capsule the caller already supplied (paths, branch, the
  change) is used as given, with no mining.
- Pin the window (default the last seven days), the topic if named, and the
  project (default the active one). State the scope back. Never quietly narrow
  "all" to "recent".

## Sources, in order

1. **The project workspace.** Goals, findings, plans and state matching the
   topic, found through docs-workspace's
   [discovery](../docs-workspace/references/discovery.md) route. The team lead
   reads these itself. Most catch-ups end here.
2. **This project's transcripts**, only for what the record does not hold.
   Search for the topic first across both runtimes' roots, `~/.claude/projects`
   and `~/.codex/sessions` (the roots delivery's `repo-inventory.mjs --chats` scans).
   Read only this project's sessions: its Claude project folder, and Codex
   sessions whose recorded working directory is this project. Order candidates
   by real modification time, read only the matching regions, and skip the
   current chat and subagent or test chats. For more than two chats, split the
   corpus across `explorer` roles through
   [orchestrate-work](../orchestrate-work/SKILL.md); each returns one block per
   chat (topic, goal, decisions, open threads, corrections, and the PRs,
   branches and tickets it touched) citing the session file. The raw
   transcripts stay with the explorers.
3. **Live state.** Check what the record and the transcripts name against
   `git log`, branches, worktrees and open PRs.
4. **The shared record**, last and only when the repository's AGENTS.md or
   PROJECT.md names an external record for the topic (a tracker other than
   GitHub issues, team chat, error tracking). Run [why](../understand/why/METHOD.md)'s
   investigators for those sources with the question re-aimed at "what is the
   current state, what was tried and did not hold, and what are users still
   reporting". A null result is a finding.

## The brief

Lead with the capsule, then the threads, the problems and the next move. When it
outgrows a screen, cut detail before cutting threads.

- **Capsule.** At most five bullets: what this work is and where it stands.
- **Threads.** One line each, with exactly one tag: `[merged #N]`,
  `[open PR #N]`, `[in flight <branch>]`, `[verified, uncommitted]`,
  `[reverted #N]` or `[planned, not started]`. An untagged thread is not done,
  so tag it.
- **Problems.** At most five recurring ones, including symptoms still reported
  and any fix that shipped and was reverted.
- **Next move.** The single most useful concrete action.

Cite workspace records by path, transcript findings by session file and shared
record findings by source (PR number, ticket, permalink). Keep an adjacent
thread out unless it blocks this one. A thread recovered only from transcripts
is a finding that was never written: say so in the brief, so the team lead can record it
through [docs-workspace](../docs-workspace/SKILL.md). Remove private context
before any of it goes public.

## Hand on

The brief returns to the team lead, which routes the next move:
[implement-spec](../implement-spec/SKILL.md) for settled work,
[diagnosing-bugs](../diagnosing-bugs/SKILL.md) for a failure,
[understand](../understand/SKILL.md) for an open question, or
[planner](../planner/SKILL.md) for an unsettled approach.
