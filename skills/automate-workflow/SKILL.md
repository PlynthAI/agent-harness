---
name: automate-workflow
description: Establish executable workflows from repeated agent work, or operate and improve existing workflows with checkpoint oversight and recovery. Use for recurring jobs and batch automation; measured experiments belong to hillclimb and harness lessons to harness.
metadata:
  group: harness
---

# Automate workflow

Move established mechanics into executable steps and keep agents responsible for
exceptions and verified outcomes. Start with the project's existing domain
procedure, scripts and runner. A team lead can combine this skill with
[orchestrate-work](../orchestrate-work/SKILL.md); no extra coordinator is required.

Choose the activity the request needs:

| Activity | Read | Result |
|---|---|---|
| Establish a new workflow from observed agent work | [Establish](references/establish.md) | A qualified executable path with explicit exceptions |
| Start, resume or supervise an existing workflow | [Operate](references/operate.md) | A checked batch outcome, with supported recovery and unresolved items |
| Improve a workflow during or after a run | [Improve](references/improve.md) | A bounded detached assignment, existing work updated, or a justified no-change result |

## Establish the operating contract

Resolve the job's owner, domain procedure, supported inputs, required result,
runner and evidence location from project guidance. Carry current authorization,
permitted external processing and usage limits through the run and any handoff;
use orchestrate-work's [authorization reference](../orchestrate-work/references/authorization.md)
when those boundaries need investigation. A skill supplies instructions, not a
scheduler, a monitoring service or permission for new effects.

Record the workflow and procedure versions selected at the start. Pin the code,
configuration and relevant model/instruction identities for that batch using the
runner's existing mechanism. If a shared checkout can change beneath it, isolate
the execution before claiming version stability. Adoption happens between runs.

Use the project's existing time, usage and recovery budgets. Set proportionate
finite local bounds within established authority where guidance leaves a routine
choice open. Missing material limits or permissions remain explicit; continue
independent work and resolve them before the affected action.

## Keep useful evidence at its owner

Reuse structured run records and artifacts. Session logs supplement diagnosis;
they are not the only place completion or recovery state should exist. Through
[docs-workspace](../docs-workspace/SKILL.md), link the existing evidence sufficient
to reconstruct:

- Inputs and source snapshots or hashes, workflow and procedure versions.
- Checkpoints, expected and observed coverage, results and missing items.
- Interventions, retries and external effects, including uncertain outcomes.
- Final acceptance and measurable elapsed time, cost and agent effort. Unknown
  values stay unknown; include failed attempts in comparisons.

Retain evidence for open failures, reproducible checks and adoption under the
project's retention rules. Protect source material according to those rules.
Extend an existing record only for a demonstrated gap; do not add a parallel
ledger or database as a prerequisite.

## Close the requested outcome

Report complete, partial, failed or legitimately empty according to the domain
procedure, with evidence and unresolved items. Identify the supervision actually
provided and any detached work that has or has not started. A retrospective can
discover a failure; it cannot claim to have intervened during the earlier run.

Necessary recovery belongs to the batch's outcome. Optional improvement does not
hold a successful batch open. Domain changes stay in their owning project;
reusable harness lessons go to
[harness's retrospective](../harness/retrospective/METHOD.md), and shared-library changes use
[harness's library method](../harness/library/METHOD.md).
