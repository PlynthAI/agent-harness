---
name: implement-spec
description: "Implement a settled request, ticket or multi-ticket spec, coordinating ready work and returning a reviewable candidate."
metadata:
  group: build
  lead: true
---

# Implement spec

Execute the accepted request, issue or ticket, then return a handoff a fresh
reviewer can assess without the originating chat. Use an existing local plan
when it helps; a small settled request needs no planner call, saved checklist or
new issue unless the project requires it. Preserve useful investigation and make
the smallest correct change.

Multi-ticket work takes the route [brainstorm](../brainstorm/SKILL.md),
[to-spec](../to-spec/SKILL.md), [to-tickets](../to-tickets/SKILL.md), then this
skill; bounded work comes here directly. For a larger specification with
linked tasks, use
[spec execution](references/spec-execution.md). This is the shared home of
upstream implement-spec, not another callable skill. The team lead owns the dependency
frontier and integration; each worker owns a bounded ready task.

## Load the handoff

Read the handoff, not the entire history: the request's intent, scope, non-goals
and acceptance. Read the existing local checklist or `planner` plan when supplied,
at the path [docs-workspace](../docs-workspace/SKILL.md) resolves. Use applicable
`AGENTS.md` guidance and inspect the named files, callers, seams and tests needed
for this change; reuse relevant context already available. When the change
crosses a module, service or ownership boundary, trace that subsystem through
[how](../understand/how/METHOD.md) before editing. When it stays inside the seam you
inspected, say so in one line and continue.

If a plan conflicts with the accepted request, investigate against that request
and current evidence. Do not silently replan across a material scope or product
boundary. Return the exact unresolved choice to the team lead; continue unaffected work.
A harmless difference from an illustrative plan step is not a conflict: the
plan is guidance, not line-by-line conformance.

## Execute the checklist

Work through the checklist in dependency order when one exists; otherwise work directly from the accepted request. Reconfirm the mapped seam first: the current code still matches it. Make the smallest change that satisfies the task. Fix a bug at its root cause and add the planned regression check. Run the focused validation the change needs, using the plan and project guidance where available. Mark each existing checklist item complete with concise evidence; do not create a checklist just to mark it.

Keep local coding choices local. Add no boilerplate. Add no speculative abstractions, extension points, or dependencies. Add no scaffolding for later. Prefer deletion over addition, existing seams over new layers, and boring code over clever code.

Route each procedure the task touches: the project's own design guidance through
[design](../design/SKILL.md), the guarded database route through
[database-workflow](../database-workflow/SKILL.md), and test authoring through
[tdd](../tdd/SKILL.md). Something broken, throwing, failing or slow that the
change uncovers goes through [diagnosing-bugs](../diagnosing-bugs/SKILL.md)
rather than a guessed fix. An in-progress merge or rebase conflict is resolved
directly, then the project's checks run.
Protected database execution returns to the team lead, never to a
subagent: a subagent reads, drafts, and runs disposable checks. A subagent never executes a production write. A subagent never applies a migration. A subagent never performs a destructive action.

If implementation evidence invalidates the plan, update only the local
checklist and continue when the acceptance boundary is unchanged. A material
scope or product change goes back to the user or planner.

## Return the handoff

A fresh reviewer reads this handoff, not the originating chat. Return the changed behaviour with the candidate that carries it, through the [handoff template](references/handoff.md). Return the checks that were run with their exact outcomes: a missing check is reported as missing, never as passed. Return the concrete remaining gaps, including actual scope uncertainty. Name what was deliberately not touched.

Create no formal requirements certificate. Soundness inside the accepted context is the review question. The absence of a signed plan is not a finding. The absence of a per-criterion certificate is not a finding. The detail is evidence for [code-review](../code-review/SKILL.md), not a second verdict.

## Stop at the boundary

Return the candidate to the team lead at the assigned boundary. The team lead continues any remaining authorized validation, review or delivery; a handoff does not end the broader request. Commit does not imply push, and merge does not imply deployment; a pull request merges through [delivery](../delivery/SKILL.md)'s merge gate, which owns each step beyond the candidate.

## References

- `references/handoff.md` - the implementation handoff: changed behaviour,
  candidate, checks with outcomes, remaining gaps, and what was not touched.
- [planner](../planner/SKILL.md) - advice or a local how-to-build plan when
  useful; the plan is guidance, not conformance.
- [code-review](../code-review/SKILL.md) - the review question this handoff
  serves; soundness, not paperwork.
- [validate-implementation](../validate-implementation/SKILL.md) - which checks
  the change actually needs; a missing check is reported, never dropped.
- [delivery](../delivery/SKILL.md) - the commit, push, pull request, merge and
  deployment authorities beyond the candidate.
- [tdd](../tdd/SKILL.md) - test authoring for the regression check.
- [diagnosing-bugs](../diagnosing-bugs/SKILL.md) - the diagnosis loop for a
  hard failure or performance regression met during the change.
- [database-workflow](../database-workflow/SKILL.md) - the guarded database
  route; protected execution stays with the team lead.
- [design](../design/SKILL.md) - the project design authority for
  visual work.
