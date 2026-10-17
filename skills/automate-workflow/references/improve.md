# Improve and adopt

Read this for evidence discovered during a run or a retrospective. Current-run
recovery stays with [operate](operate.md).

## Decide whether work is warranted

Ground a candidate in a reproduced defect, unmet domain requirement or measurable
repeated effort. Use structured records first, then session logs to explain
friction. Search the project's existing tickets and active assignments before
creating work. Repeated observations update the matching assignment; no useful
change is a valid outcome. Missing records justify a bounded evidence repair,
not invented conclusions about the run.

Use [hillclimb](../../hillclimb/SKILL.md) for a measured experiment and
[harness's retrospective](../../harness/retrospective/METHOD.md) for a reusable harness
lesson. Domain bugs and optimizations remain in their owning repository.

## Dispatch detached work

Use [orchestrate-work](../../orchestrate-work/SKILL.md) for the assignment and
ownership contract. Normally link or create a ticket through the project's
tracker, then use the available chat and worktree tools to start a separate
improvement chat in that repository. Carry the human's existing authorization
for chat creation and messaging; if the runtime requires explicit authorization
not present in this invocation, keep the brief ready and request only that
missing authority. A skill's invocation alone does not grant it.

The brief carries the demonstrated problem, required behavior, reproducible
inputs and version identities, owned paths, acceptance checks, finite budget,
permitted processing and usage, delivery owner and adoption target. Include the
active batch's identity so the new work cannot change its inputs or outputs.

A new worktree isolates source changes. Separately isolate test data, credentials
where needed and external destinations, or replay without effects. Candidate
tests must not publish to or mutate the active batch's data. Use existing project
mechanisms rather than inventing a new test environment for every assignment.

Record the returned ticket, chat and candidate links at the existing run or task
record. Verify actual dispatch; a pending setup or an unavailable tool stays
pending or undispatched. Reuse matching running work. The current batch continues
without waiting for optional improvements; the improvement chat owns that change
through delivery. Keep necessary recovery visible in the batch outcome.

## Adopt on the next run

The improvement passes the project's checks through
[validate-implementation](../../validate-implementation/SKILL.md), independent
[code-review](../../code-review/SKILL.md), and its existing OCR, CI and
[delivery](../../delivery/SKILL.md) requirements. Compare domain quality and
completion behavior as well as the intended gain. A merge or a green experiment
alone does not prove that the runnable version was delivered.

After verified delivery, make the accepted version the default for the next run
under existing authority, recording the selected version when that run starts.
Preserve active batches on their original version. Where evidence warrants a
comparison run, suppress candidate external effects; this is verification, not
an extra human approval stage. Respect explicit holds and genuine new authority
boundaries without asking again for existing authorization.

Record observed regressions and use supported recovery or one bounded repair.
Stop improvement when the assignment is satisfied, evidence no longer warrants
change or its budget is exhausted. A follow-up needs a distinct supported outcome
within the remaining authorized budget; do not recursively spawn work for every
note. Report unachieved acceptance explicitly when the budget ends.
