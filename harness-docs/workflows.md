---
type: Reference
title: Workflows
description: Shared methods, specialist roles and how the library is maintained.
---
# Workflows

Reusable procedures live once in [skills/](../skills/), one directory per method
with a `SKILL.md` entrypoint and supporting references loaded only when needed.
[skills-list](../skills/skills-list/SKILL.md) reports which skills a session can
discover and from which roots.

| Need | Entrypoint |
|---|---|
| Clarify intent before a plan | [brainstorm](../skills/brainstorm/SKILL.md) |
| Architecture or implementation advice | [planner](../skills/planner/SKILL.md) |
| Implement a bounded slice | [implement-spec](../skills/implement-spec/SKILL.md) |
| Write behaviour-first tests | [tdd](../skills/tdd/SKILL.md) |
| Diagnose a hard failure | [diagnosing-bugs](../skills/diagnosing-bugs/SKILL.md) |
| Select the checks a change needs | [validate-implementation](../skills/validate-implementation/SKILL.md) |
| Independent review of a fixed candidate | [code-review](../skills/code-review/SKILL.md) |
| Commit, PR, merge or cleanup | [delivery](../skills/delivery/SKILL.md) |
| Route or resolve project documents | [docs-workspace](../skills/docs-workspace/SKILL.md) |
| Draft or revise prose for its audience | [writing](../skills/writing/SKILL.md) |
| Learn from a bounded correction or completed run | [harness's retrospective](../skills/harness/retrospective/METHOD.md) |
| Improve a measurable product or domain outcome | [hillclimb](../skills/hillclimb/SKILL.md) |
| Establish or improve project CI | [ci](../skills/ci/SKILL.md) |
| Delegate and integrate bounded parallel work | [orchestrate-work](../skills/orchestrate-work/SKILL.md) |
| UI, website or visual work | [design](../skills/design/SKILL.md) and its leaf methods |

The table is a sample of the library, not an itinerary: a skill is selected by the
work in front of the agent, and outside multi-ticket work there is no
compulsory sequence.

The harness group improves, maintains and packages the working environment.
Its lead, [harness](../skills/harness/SKILL.md), routes to nested methods:
retrospective, skill-refine, tool-eval and verify-eval learn from session
evidence; library changes the shared source; cloud-env and update-packages
keep a project's environment portable and current. `hillclimb` improves a
measured product or domain outcome through repeated tested changes; its
[skill](../skills/hillclimb/SKILL.md) owns the method.

## Roles

[agents/](../agents/) holds the specialist role definitions the runtime
discovers, and [agents/README.md](../agents/README.md) explains assignment.
Model and provider bindings are operator configuration: role files carry the
current candidate assignments, [MODELS.md](../MODELS.md) records the dated
snapshot, and an installed copy keeps the operator's own choices.

## Maintaining the library

[harness's library method](../skills/harness/library/METHOD.md) owns classification,
provenance, reviewable preparation and who may apply a change. Improve a method
in its existing owner rather than cloning it, keep project facts in project
documents, and route reusable improvements to this source instead of a local
replacement.
