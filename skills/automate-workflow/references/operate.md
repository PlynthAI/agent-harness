# Operate and recover

Read this to start, resume or supervise an existing workflow.

## Check readiness

Inspect the current domain procedure, supported runner commands and a bounded
sample of its records. Confirm they distinguish complete, partial, failed and
legitimately empty results. Establish expected coverage from the source inventory
or domain evidence, not just the count the script returned. A zero exit code or
verified file alone does not prove enumeration or ingestion completeness.

If records cannot support that distinction, name the missing evidence and scope
the smallest repair through [improve](improve.md). Continue work that can be
checked, with the limitation visible; do not claim unattended reliability.

## Supervise meaningful checkpoints

Start or resume through the owning runner. Use its events, wait mechanism or
persisted checkpoints for batch boundaries, failures and final verification.
Let code perform routine waiting and polling. State which mechanism invokes or
returns control to the agent. If none does, provide session-bound supervision
and say what remains unsupervised; a saved skill cannot wake itself.

At each relevant checkpoint, compare actual progress and coverage with the
operating contract. Investigate suspicious empty output, source changes, missing
items and stalled progress even when the process reports success. Apply the
project's risk-based audit of apparent successes; if none exists, choose a
bounded sample including source changes and unusual outcomes, and state its
coverage limits. A sample alone does not establish full inventory coverage.

## Recover without losing accepted work

Classify the exception before acting: a supported retry or session renewal, an
input/source mismatch, an unresolved decision, an unknown external effect, or a
repair to the workflow itself. Follow existing retry, resume and reconciliation
commands within the run's bounds. Preserve verified work and check its input
identity before reuse. Escalate cases the procedure reserves for an agent or
person with their evidence and the exact unresolved question.

Reconcile an unknown external-write outcome before retrying: establish whether
the accepted record, publication or submission exists using its stable identity
and the owning system. If that cannot be established, leave the effect unresolved
and stop its retry. Isolated source code does not isolate external effects.

Keep the active batch on its original workflow version. If recovery requires a
code or procedure change that cannot run under that version, identify affected
work as incomplete and continue unaffected items where supported. A later
delivered repair can enable a subsequent run or a supported resume with the
version transition recorded; an improvement ticket is not recovery evidence.

## Verify and close

Use domain completion checks and audit evidence to account for the whole batch:
accepted results, justified exclusions, failed or unresolved items, and required
downstream effects. Distinguish acquisition from storage, ingestion, indexing or
publication when the job includes more than one. Finish under the established
budget with an honest outcome even when recovery cannot complete.

Assess interventions and suspicious results through [improve](improve.md).
When invoked only after completion, inspect retained records and report detected
gaps without pretending the earlier run had live oversight.
