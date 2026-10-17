---
name: goal-setter
description: Draft, audit or activate a /goal in Codex or Claude Code with a Done clear enough that the run stops instead of looping. Use for /goal requests and for running a task list, checklist or reviewed plan end to end through the harness stages; an unclear ask goes to brainstorm first.
metadata:
  group: coordinate
---

# Goal Setter

Create the smallest goal that preserves outcome, Done evidence, boundaries, and stop rules.

The team lead uses this: running
[orchestrate-work](../orchestrate-work/SKILL.md), it gives a goal to an agent it
dispatches, such as smart_worker, so the agent keeps going until Done, and the
coordinator can give a team chat its goal the same way. In Codex the goal runs
as a loop. In Claude Code the lead cannot set one: it drafts the `/goal` line
for the user to send, and that path is on trial, monitored against Codex.

A goal runs the harness stages in order and does not restate their loops:
[implement-spec](../implement-spec/SKILL.md) for each ready task,
[validate-implementation](../validate-implementation/SKILL.md),
[code-review](../code-review/SKILL.md), then [delivery](../delivery/SKILL.md)
only as far as the step the person authorized. Keep the existing task list or
plan as the source of truth. Name the source, owned scope, evidence required,
artifact reuse rule, and terminal state. Merge follows delivery's merge gate and needs no
separate authorization; if deployment is not authorized, terminal success is
the merged PR plus the exact next step (`deploy`).

Goal shape:

`Complete <task/plan> from current repo state through implement-spec, validate-implementation, code-review and delivery <authorized step>. Done when <outcome> is true, <validation/evidence> passes, and required tracker/closeout updates are complete. Reuse existing artifacts instead of duplicating them, preserve unrelated work, and follow AGENTS.md. Stop only for a stop rule of the stage in hand, missing authorization/credentials, repeated validation blocker, or a scope decision that would change Done; report the exact next action.`

Before activating:

1. Read the task source and any active goal.
2. Ask only if objective, scope, evidence, or authorization is missing.
3. Codex: use `create_goal` for normal goals on the team lead's own thread; emit `/goal ...` when the user must send it or worker tools must be triggered.
4. Claude Code: only the user can set a goal, so emit one `/goal <condition>` line of at most 4,000 characters for them to send. A judge reads only the conversation after each turn, so word Done as a check the run itself shows there (the command and its result), and add a bound such as `or stop after 20 turns` where a loop is a risk.
