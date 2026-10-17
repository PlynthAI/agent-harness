---
name: handoff
description: "Write a brief that hands work to the next chat: paste-ready in the reply, or a task note in the project brain's Inbox; cleanup releases handoff notes whose outcome checks out. Use for \"handoff\", \"brief for another agent\", \"write this up for a new chat\". Readiness judgment is delivery's."
metadata:
  group: records
---

# Handoff

End a stretch of work with a brief another chat can act on without this
conversation, and later clear the briefs whose work is done. The first word of
the argument names the mode: `prompt`, `inbox` or `cleanup`. With no word,
write the brief as `inbox` when the project resolves to a brain through
[docs-workspace](../docs-workspace/SKILL.md), otherwise as `prompt`.

This is not delivery's readiness assessment (`delivery handoff`,
[its reference](../delivery/references/handoff.md)) and not implement-spec's
[return record](../implement-spec/references/handoff.md) for a reviewer.

## The brief

Write for a reader with no access to this conversation, using writing's
[agent instructions](../writing/references/agent-instructions.md) reference for
the brief's prose. Include only what the next chat needs, in this order:

1. **Goal**: what to achieve and the done condition.
2. **Context it cannot see**: decisions made, what was tried and failed, and
   constraints such as "do not touch X".
3. **Current state, with evidence**: branch, commit, PR, paths, and the guide
   or runner that reproduces it.
4. **Steps**, or only the first step when the rest depends on its result. Name
   owners (files, guides, runners) and known pitfalls, never commands: the
   repository's AGENTS.md and guides own commands, and copied ones go stale.
5. **Report back**: what the taking chat returns, and where, including any
   harness issues it met (shared skills, roles, hooks, recipes, checks) with
   evidence, and a short lessons page (what held up, what to change) at a
   named path: "harness issues and lessons: <path>" or "none".

No chat-local names (a subagent, a scratch label, "the plan above"). Name
repository files by repo-relative path or URL; use machine paths only where the
next chat needs them. No em dashes.

## prompt

Return the brief in the reply inside one fenced block so it copies cleanly into
the Codex app, Claude or any other agent. When the brief holds its own fenced
code, fence the whole with four backticks. Save it to a file only when asked.

## inbox

File the brief as one inbox note through the [inbox](../inbox/SKILL.md) route,
which owns the template, the log line and the brain check. Resolve the brain
through docs-workspace and never assume a particular one; a project with no
brain gets `prompt` instead, said in one line. The note's shape:

- `Inbox/<YYYY-MM-DD> <title>.md` with `type: inbox`, `kind: task`,
  `project: <repo id>`, `status: draft`, `date`, `outcome: ""` and the
  description "Handoff: <one line>. Read when picking up <project> work."
- `## The drop` holds the brief. `## Why it might matter` says what is lost
  if nobody takes it.
- `## Route` names the chat that takes it and says: when finished, write one or
  two lines into the front-matter `outcome` field (what is true now, with the
  PR, commit or path that proves it, and "harness issues and lessons: <path
  or none>", plus any remaining acceptance and its owner)
  and leave `status` alone.

At handover or completion, the lead or named record writer reconciles affected
records through [tracking reconciliation](../docs-workspace/references/tracking-reconciliation.md).
An unchanged or already-recorded result needs no upkeep write, skill read or skip
note. Run the brain check after writing. Report the note's path and the chat it
is for.

## cleanup

A status pass over the resolved brain's `Inbox/`. List every note with
`kind: task`, then sort each one:

- **Open** (empty `outcome`): report its project and age from `date`, so stale
  notes surface. Change nothing.
- **Claimed done** (filled `outcome`): check the promised scope and claim where
  that is cheap: a PR merged (`gh pr view <n> --json state,mergedAt`), a commit on
  the default branch (`git log`), a file present, an issue open (`gh issue view`). An
  outcome that names no checkable evidence counts as unverified.
- **Verified**: file anything durable from the note or its outcome (a decision,
  a lesson, a fact a later chat would need) as a finding in the project's
  workspace through docs-workspace first. Keep remaining obligations with their
  owners and reconcile affected current pointers before release. Then delete the
  note, replace every wikilink to it in the brain (earlier `log.md` lines included)
  with its plain title, and add one `log.md` line under today's heading naming
  what was released.
- **Unverified**: keep the note and append a line under Route saying what did
  not check out and when.

Releasing a note is a deletion, so it is allowed only where the brain's
`AGENTS.md` grants it, normally a "Handoff notes" row in its Extensions table.
Without that grant, leave verified notes in place and report them as ready to
release. Run the brain check after the pass.

Report three lists: released (with any finding filed), kept open (with age),
and kept because unverified (with the reason).
