# Team

How one execution team runs a ticket or a related group of tickets.
[coordinate](../../coordinate/SKILL.md) opens a chat per team; this reference is
how each of them works.

## The team

One persistent team lead plus up to six descendants: seven at most, a ceiling
and not a roster. The team lead of the project chat holds one ticket or a related
group and
leads its execution team, assigned through
[the assignment contract](assignment.md). Its assigner is the chief-of-staff chat
above it, or the user when there is none. Persistence is the team lead's ownership
and context.
Workers, reviewers and helpers are fresh for each slice and released when it
returns.

## Admission

- At most three implementation workers at once.
- Each worker has one partner slot beside it, so all six can be in use. The
  lead fills it when that worker needs a reviewer, explorer, researcher, tester
  or planner, and releases it when the partner returns.
- A partner review is staged on the worker's fixed slice, not held open while
  the worker edits.
- The actual runtime limit applies when it is smaller. Release finished
  assignments before admitting more.

Each ticket gets a fresh worktree by default. Reuse one only after a live
two-team run has measured the setup and cleanup cost. Concurrent tickets keep
disjoint owned paths; overlapping edits and mutable app or test resources are
serialised. Before CPU-heavy validation, browser or benchmark batches, or shared
installation/sync, request the exact command, resource and execution window in
the team record. The coordinator, or sole lead when there is none, admits it
against current load and existing allocations. Keep lightweight work moving.
An overloaded failure is investigated under an available window, not hidden by
blind retries or longer timeouts. Reuse the owning runner's process records.

## The lead owns to closure

The lead owns its assignment until every ticket in it is Done and closed and the
team's resources are retired. It assigns implementation, investigation and
review to the shared roles, integrates what they return, settles routine choices
and ordinary failures, and never edits product source itself.

Within a group that needs integration, each ticket lands as one local commit
with its affected checks on the group's integration branch. Early independent
review is selected for useful risk coverage, not required again for every ticket.
One accountable independent review covers the integrated group candidate at its
pull request; matching earlier coverage is reused and the reviewer checks the
new interactions. Specialist coverage is added where the risk warrants it.
Related tickets do not each repeat a full push review. Final integration is
verified before merge, with unaffected evidence retained across base movement.
A group that can be delivered on its own opens its own pull
request and merges as it finishes. Each step follows
[delivery](../../delivery/SKILL.md) within the authority the assignment carries.

The lead returns to its assigner only for a permission or product decision: an
action outside existing authority, or a requirement or scope choice the
assignment and the evidence do not settle. It brings the evidence and a recommendation, and
keeps unaffected work moving while it waits.

A repair that fails twice with the same result stops there; there is no third
identical attempt. The lead involves planner with the requirement, the attempts,
their evidence and the decision needed.

## Shared integration and installation

Name one writer for the shared integration candidate and one for installation
and sync; the same lead may own both. Other teams return proposed deltas and
evidence rather than concurrently applying them. Record the checked candidate
revision, integration/default-branch revision, source checkout and exact files
approved for application, then the installed file hashes/revision and runtime
acceptance separately in the existing team record.

Use the reviewed source at that revision. Re-read source and target bytes before
application, preserve foreign dirty or incomplete changes, and apply only the
reviewed owned scope through [harness's library method](../../harness/library/METHOD.md)'s
copy/reconciliation route. A
whole-tree deploy or sync is suitable only when every included change is reviewed
and assigned to that writer; a dirty canonical checkout is not an implicit
integration source. Conflicting target bytes stay held for their owner.

## Done and Integrated

Each ticket carries its own Done and delivery acceptance, written by
[to-tickets](../../to-tickets/SKILL.md) before dispatch. The lead holds the
ticket to that statement, not to a generic finish line.

- Integrated: the ticket's candidate is merged into the integration branch, with
  its checks and review evidence recorded.
- Done: the ticket's own Done statement holds and the change has landed on the
  default branch, or is deployed when the ticket says so.

Dependents unlock on Integrated evidence, not on issue closure. A ticket closes
only when it is Done. The lead records each state in its team record with the
evidence behind it; the assigner reads Integrated and Done from those files and
GitHub, not from the lead's conversation.

At material transitions the lead reconciles its owned records through
[tracking reconciliation](../../docs-workspace/references/tracking-reconciliation.md).
Children return evidence; the lead returns a proposed pointer change in its team
record for the coordinator's central tracker. Only that tracker's named writer
applies it. Repeated or unchanged outcomes need no upkeep write or skip note.

## Closeout

When a ticket is Done, the lead retires what it made: the ticket's worktree and
branch, and the integration branch once its pull request has merged, through
delivery's [`cleanup`](../../delivery/references/worktree-cleanup.md). Anything
worth keeping in a worktree's `.state/` is copied to the task's artifacts first.
A branch a dependent still builds on stays until that dependent is Integrated.
Every process the team started is stopped, unless handed over with a named owner
and its stop command.

For a managed checkout, apply delivery's
[descendant-owner preflight](../../delivery/references/worktree-retirement.md#release-completed-descendant-owners)
before requesting archival so cleanup authority releases verified completed
task-owned child chats while live, foreign and uncertain owners remain.

The lead then returns the delivered result to its assigner, through its team
record when the assigner is a coordinator chat: candidates, checks, review
outcomes, closed tickets and the real remaining limits.

## Recovery

A compaction or a fresh session resumes from records, not memory.

- Each chat's team lead alone writes `.state/state.md` at the root of its own
  checkout, as [plan and state](../../docs-workspace/references/plan-and-state.md)
  describes, and points it at the team records it reads or keeps.
- The lead keeps its team record and evidence in the task workspace, at the path
  its assignment names beside the plan (`plans/<task-id>/team-<label>.md`),
  current at every handoff: each ticket's state (dispatched, Integrated or Done),
  its candidate, the next action and any warning. The record and GitHub are the
  assigner's source of truth.
- A lead resumed after a compaction reads its team record; a coordinator chat
  reads its `.state/state.md` and then the team records.

The assigner recovers a missing handback from the assigned evidence path and
available native task reads/waits. Confirm the actual candidate and remaining
gates against GitHub and Git; an idle peer is not automatically Done. Keep a
failed or denied callback recorded, without repeating it through another route.

Before retrying any mutation, such as a push, a pull request, a merge or an
issue write, reconcile GitHub, Git and the team record, so a step that already
landed does not run twice.
