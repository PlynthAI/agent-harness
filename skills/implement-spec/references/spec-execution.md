# Execute a specification's task graph

Use this mode when the team lead is implementing a larger settled specification with
multiple tasks. Wayfinder can resolve linked decisions, to-spec can preserve
the requirement and to-tickets can express dependencies. For multi-ticket work,
reuse adequate existing outputs and resume at the first stage whose output is
missing rather than manufacturing tickets from scratch; a bounded request takes
implement-spec directly.

Read the spec, acceptance, non-goals and dependency links. The ready frontier is
tasks whose prerequisites are integrated and checked, not simply tasks whose
worker reported completion. Preserve one execution checklist or existing tracker;
do not create a second task ledger. If dependencies are unclear, inspect the
contract and resolve that uncertainty before dispatching dependent work.

Give each worker a bounded outcome, owned paths, spec/task pointers, current
integration candidate, relevant project guides, expected checks and a shared
workspace evidence destination. Optional exploration saves useful notes there
once for later workers. Communicate concise results and context pointers rather
than repeating the entire plan. Worker tasks use the normal implement-spec method.

Run independent ready tasks concurrently when useful, within the team shape in
orchestrate-work's [team reference](../../orchestrate-work/references/team.md).
A worker executes its slice and does not coordinate the spec. Checkout
selection follows that reference. The team lead owns Git integration, so workers do not
race commits. A worker in its own worktree confirms it is based on the integration
branch before starting and merges the integration tip before reporting, so
the team lead's merge is a fast-forward. Never mutate the candidate under an active
reviewer.

The team lead integrates each result, checks affected interactions and advances the ready
frontier. A completed worker returns changed behavior, candidate identity,
checks and remaining gaps; the team lead verifies these against the task before marking
it complete. Run relevant types/tests during implementation and the project's
appropriate aggregate checks at the end. Select early slice review where it
catches useful risk, rather than for every commit. Reuse matching coverage;
accepted repairs and newly affected interactions need delta review.

The intended result is one coherent reviewable branch/PR for the accepted spec,
unless the existing plan deliberately splits delivery. Create or update its
draft PR only within the user's delivery authority; reference existing spec and
ticket IDs and claim closure only for work actually completed by that PR. A
draft PR cannot open on a branch with no commits ahead of main, so open it only
after the first integrated slice. When the tracker closes work without PRs,
resolve the tickets the way the tracker closes work and report the integration
branch.
Before delivery, use one accountable independent review of the integrated
candidate, covering requirements, standards and correctness together. Add
specialist coverage where the risk warrants it; related tickets receive this
review once at their group PR.
The team lead assesses findings, routes confirmed repairs
and returns a ready PR with evidence, rather than blindly applying every comment.

Delivery owns publication, merge and any authorized worktree/branch retirement.
Release disposable task output when its consumer is finished; keep useful
findings and review evidence at the workspace owner. No automatic merge or
checkout deletion is implied by completing a task.

Adapted from Matt Pocock's implement-spec; see
[third-party notices](../../../THIRD_PARTY_NOTICES.md) for the source pin and licence.
