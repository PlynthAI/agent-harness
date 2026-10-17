# Reconciling a project's tracker

Tracking reconciliation brings the project's own tracker and its local records
back into agreement. It fixes the references that are current instructions and
leaves history readable.

## When to update

The lead or named record writer reconciles affected records when verified
delivery, handover, supersession, a material status change, contrary evidence or
a durable discovery changes what a later reader should do. Intermediate calls,
unchanged or already-recorded outcomes, and self-contained tasks with no relevant
record or durable finding need no write, method read or skip note for upkeep.

## Reconcile the smallest useful change

1. Read the owning record, its dependencies, the affected entry in the tracker
   the project names, and the nearest guidance. Identify the current branch or
   pull request, successor or blocker and actual result from live evidence.
   Keep source, installation and runtime acceptance distinct.
2. Update the owning record first. Use its existing fields for actual state,
   evidence, remaining acceptance and owner or next action, only where changed.
   Then reconcile only affected current goal, plan, tracker or Inbox pointers and
   the project's required log. Create only records the task needs.
3. Before processing a handoff or retiring a superseded plan, keep its evidence
   and every live obligation with a named owner or successor. Link the successor
   and preserve historical evidence. Release records through the project's
   authority and [retention](retention.md), after their consumers are accounted
   for. An acknowledgement or a source merge alone does not fulfil deferred
   acceptance.
4. Each shared record has one named writer. Children return evidence to that
   writer; a team lead returns the proposed central-pointer change in its team
   record when the coordinator owns the tracker. Re-read immediately before a
   narrow edit and preserve concurrent additions.
5. Compare the verified result with the current records. Repeated handling
   changes only a missing delta, including any missing required log entry. After
   interruption, resume from the existing plan, team record or checkout state and
   reconcile the unfinished pointers against live evidence. Keep a changed next
   action in existing recovery state when useful, per [plan and state](plan-and-state.md).
   Compaction reloads that checkpoint; an abrupt stop before a durable write can
   still lose progress.

For an unrelated durable discovery, reuse its owning issue or finding. If none
exists, capture one bounded follow-up through the project's findings route with
the observed failure, useful evidence, uncertainty and next owner or action.
Link it from the task record when needed. Capture does not dispatch unrelated
work or complete its repair.

## Fix active pointers, keep history

- Update only the references that are current instructions. A historical
  reference is provenance: keep it readable, and do not make it executable again
  by rewriting it.
- Keep the tracker and the workspace records distinct. Goals, findings, plans and
  artifacts stay in this method's routes; the tracker is not a second copy of
  them.
- Do not create a second ledger, packet or tracker to perform reconciliation.
  Follow the project's accepted tracker and durable document owners; temporary
  plans and evidence use the workspace. Preserve historical provenance.
- This shared method neither requires nor forbids a project completion marker, a
  finding record or a pruning schedule, and it makes none of them a delivery
  gate.
- A field the project's tracker already consumes, including a finding or
  completion marker another tool reads, stays until its consumers and purpose
  are checked and its retirement is authorised. Do not promote one project's
  local pruning convention to a global gate.
- Investigate conflicts between local notes, code and accepted contracts against
  their purpose and observable behaviour. Route unresolved domain or production
  questions to their owner; existing code does not automatically settle them.

## Validate

- Re-read the changed entry and confirm its links and route still resolve.
- Check every changed document against the nearest project guidance, and use the
  project's own document check where it has one.

## Respect a denial

A denial covers the operation and its target, not the spelling of the command
that carried it. Report it once and continue permitted work; retrying the same
operation through another command, shell, runtime or agent is not a remedy.

## Return

Return the item and its status transition, the successor or blocker, the
surfaces changed, the validation run, the historical references deliberately
left alone, and any remaining ownership conflict.
