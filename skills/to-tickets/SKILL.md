---
name: to-tickets
description: Assess incoming issues or PRs, or split settled requirements into actionable tickets with acceptance criteria and real dependencies.
metadata:
  group: plan
---

# Ticket intake and breakdown

Use the project's tracker conventions and accepted requirements. For assessing
an existing issue or PR, load [intake](references/intake.md). For a breakdown,
identify independently verifiable outcomes and the dependencies between them.
A request for one bounded change does not need a ticket hierarchy.

Resolve the configured tracker from project guidance. Prefer its existing
views, templates, parent links and blocking relationships. A ledger or progress
note is context unless the project explicitly uses it as the tracker. Maintain
one record of the work; do not create a parallel board or mirror.

## Shape the work

Each ticket states the outcome, relevant scope and constraints, observable
acceptance, and actual blockers. Link the requirement or decision that supplies
its context. Done and delivery acceptance are written before dispatch, not
after the work returns. Leave incidental implementation choices to the worker; use
[planner](../planner/SKILL.md) when implementation needs a separate plan.

Prefer slices that deliver a verifiable behavior across the layers actually
needed. Avoid arbitrary layer-by-layer tickets, forced UI/database steps, or
splits that cannot be verified independently. Size work for a bounded handoff.
For a cross-cutting change that cannot land in independent slices, consult
[wide refactors](references/wide-refactors.md).

When decomposing an existing issue, preserve its scope and represent it as the
parent under the project's conventions. Make clear which children own the work,
so the parent and a child are not independently assigned the same deliverable.
Link existing children instead of creating duplicates. State real blockers;
a sequence in a list does not itself establish a dependency.

## Draft or publish

Use the project's issue template, or the compact [ticket template](templates/ticket.md)
when none exists. The user may want a draft, a recommendation, or published
changes: act within that request. Do not insert another approval cycle for an
already authorized publication or settled breakdown. Clarify only a material
ambiguity or an external action outside the authorization.

If no tracker is configured, keep a draft in the response unless persistent
files are useful or requested. Resolve their location through
[docs-workspace](../docs-workspace/SKILL.md); use one task's artifacts directory
and link it from the existing task record. Do not invent a repo-local `.scratch`
folder or establish a second tracker. An explicit project-owned ticket route
still takes precedence.

Publish blockers before dependents when native relationships need their IDs.
When publishing a sliced spec to GitHub, follow the
[GitHub convention](references/github-convention.md).
Report the resulting links or draft locations and any unresolved dependencies.
