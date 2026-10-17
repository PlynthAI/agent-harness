---
name: to-spec
description: "Write a durable PRD or specification from settled requirements when the request or issue alone is insufficient."
metadata:
  group: plan
---

# To Spec

Turn what is already settled into a durable specification, and only when one is
actually needed. This skill owns the durable requirement: the problem, the
intended behaviour, the acceptance and the non-goals. It does not own the ticket
set, and it does not own the how-to-build plan.

Synthesize what is already known - the conversation, the issue and the codebase.
Do not interview for a spec, and do not manufacture requirements the work does
not have.

## Skip it when it is not needed

Most work needs no specification at all. Write one only when the requirement is
durable and others will build on it.

| Situation | Response |
|---|---|
| Routine work: a small fix, a rename, a bounded change | Skip the specification. The request or issue is usually enough; use [planner](../planner/SKILL.md) only when the approach needs it. There is no mandatory PRD or saved plan for a small fix. |
| A requirement the next reader must still be able to act on | Write the PRD or spec, then link it. |
| A decision with real tradeoffs others will build on | That is an ADR, recorded by the project's own route, not this skill. |
| More than one slice of work to land | Write the requirement here if it is durable; send the breakdown to [to-tickets](../to-tickets/SKILL.md). |

There is no ratification ceremony, no revision procedure and no mandatory
approval gate. The document is written once and linked; a later change is an
ordinary edit, not a versioned amendment process. Include user stories, settled
implementation decisions and testing decisions when they clarify the contract;
do not require exhaustive lists or a seam-confirmation interview. Keep execution
steps in the plan and avoid duplicating an existing design or architecture owner.

## Resolve the storage route first

Resolve before writing; do not guess a path. Use the explicit user or project
path when known; otherwise use [workspace resolution](../docs-workspace/references/resolution.md).
Read the workspace's AGENTS.md and follow [docs-workspace](../docs-workspace/SKILL.md):

- `prds` holds the product problem, its value and its scope;
- `specs` holds the detailed behaviour or interfaces worth keeping.

A durable PRD or spec belongs at the resolved `prds`/`specs` route when the
project has one, or when an owned task says to initialise it. Where the project
keeps that document as tracked prose in Git instead, write it there and keep the
existing convention. Product-Git storage is not mandatory for accepted prose: an
accepted PRD or spec does not have to live in the repository, and moving prose
into Git for its own sake is not the point.

A resolved route reported as `missing` does not block an authorized document:
create only the folder it needs, never at a guessed path. An ambiguous owner,
conflicting route or unreadable destination needs resolution, not a substitute
folder. Edit the document directly under the project's storage conventions;
no separate writer or database is required.

## What the document carries

Follow [docs-workspace](../docs-workspace/SKILL.md) for optional recipes at the
workspace AGENTS-declared template path. Use `prd.md` for the product problem
and `spec.md` for detailed behaviour or interfaces when helpful; missing recipes
never block direct Markdown. The [route guidance](../docs-workspace/references/routes.md)
keeps storage ownership explicit.

<spec-expectations>

A PRD or spec written here carries:

- **Problem:** what is wrong or missing today, and who is affected, with evidence.
- **Intended behaviour:** what the product or interface should do, at the level a
  reviewer could accept or reject. A PRD states this at product level; a spec adds
  the interfaces a builder can test against.
- **Acceptance:** the observable conditions that mean the requirement is met.
- **Non-goals:** what this deliberately does not cover.
- **Local links:** the resolved path of the durable document, so a local agent
  links to it rather than copying it into an issue.

For larger changes, use the project's domain vocabulary and relevant ADRs. Add
the user journeys, settled interfaces, constraints and observable testing seams
needed to implement and review them. Prefer the highest useful existing seam;
evaluate prior tests against the requirement rather than copying expectations.
Keep code/file detail out unless it conveys a decision more precisely (for
example, a prototype's compact state machine or schema). Link volatile detail.

</spec-expectations>

Do not restate everything known. A concise synthesis of what is already settled
beats a complete transcript.

## The issue carries what, the document carries why

When a tracker is used, the issue carries the high-level intended behaviour, the
acceptance and the non-goals; the durable document carries the fuller why. Link
the local context for local agents rather than copying it into the issue.

Check first for an existing issue that already carries this requirement, and
reuse or link it. Do not open a second issue for work that is already tracked.
Report what you found before publishing anything.

Publishing to a tracker is optional here. This skill does not require the issue
to carry the `ready-for-agent` triage label; the tracker's own conventions and
[to-tickets](../to-tickets/SKILL.md) own the ticket vocabulary and its labels.

## The remote consumer gets only task context

A remote reviewer that is actually used receives only the relevant part of the
task in the input that consumer supports - its own prompt, or the issue or pull
request body. Attaching the whole workspace or requiring a versioned-document
platform is not required, and neither is standing up a separate document home
for a remote reader.

## Hand off, do not absorb

Keep this skill to the durable requirement:

- a multi-slice breakdown goes to [to-tickets](../to-tickets/SKILL.md), which owns
  the ticket set and the blocked-by edges;
- the how-to-build plan goes to [planner](../planner/SKILL.md), at the plan
  path [docs-workspace](../docs-workspace/SKILL.md) resolves.

## References

- [docs-workspace](../docs-workspace/SKILL.md) - where a document goes and the
  optional recipes for its shape.
- [workspace resolution](../docs-workspace/references/resolution.md) - resolves the route
  rather than guessing it.
- [to-tickets](../to-tickets/SKILL.md) - the ticket set and the blocked-by edges.
- [planner](../planner/SKILL.md) - the local how-to-build plan.
