---
name: code-review
description: Independently review a fixed candidate in proportion to its risk, preserving valid coverage and check evidence through integration and delivery.
metadata:
  group: verify
---
# Review a fixed candidate

The team lead owns scope, finding triage and acceptance. Ordinary changes need one
accountable independent review plus affected automated checks. Give that reviewer
the complete accepted scope: requirements, the affected features' maturity
tier, project standards, reachable defects and affected interactions. Select `fast_review` for a bounded, straightforward
candidate and `reviewer` for broader or deeper judgment; shared role files own
their model bindings. The reviewer did not author the change and receives fresh
context without author conclusions or another reviewer's findings.

Add a specialist review where a concrete security, schema, publication-authority
or architectural risk warrants it. State that risk and the additional scope in
the existing assignment or review record. A specialist complements the ordinary
review; it does not restart unaffected coverage. Neither a fixed count of
reviewers nor native OCR is required for a commit; a push, with or without a
pull request, gets the two review rounds below.

## Candidate and coverage

Pin an explicit commit against its parent (the empty tree for a root commit),
an explicit comparison base as base...HEAD, or working changes as HEAD plus
in-scope contents/hashes, including untracked files. For a clean tree without a
target, use an unambiguous upstream merge base; clarify only a material ambiguity.
Recheck identity before reporting and flag any candidate changes.

Supply the accepted request or plan, applicable project guidance, affected
callers, relevant check results and the shared task workspace path. The
[review facts](references/review-assignments.md) describe this input; use the
existing record or assignment rather than adding mandatory paperwork.
Delegated reviewers report findings without editing source or spawning more
reviewers.

An early [slice review](references/slice-review.md) is useful when it catches a
defect sooner. It is not a compulsory stage before every commit, and committing
does not expire its matching coverage. Before delivery, use
[candidate review](references/push-review.md) to cover the integrated result,
reusing valid slice evidence and reviewing the remaining changes and interactions.
Related tickets may integrate locally and receive this review once at their
group PR. Do not repeat a full review merely because a commit or push occurred.

Before a push, [candidate review](references/push-review.md#two-rounds-before-push)
runs two rounds. In round 1 the independent reviewer and native OCR review the
same pinned commit in parallel, OCR through `native-slot.mjs`; the team lead
triages once and makes one fix commit. In round 2 the reviewer alone checks
each fix against its finding and the new lines against the house rules; OCR
does not rerun. The candidate is clean when no blocker is open and every
finding is settled as `fix`, `decline` with a reason, or `follow-up`. The
[triage record](references/finding-triage.md#the-triage-record) holds that
state, and delivery's `review-status.mjs` posts it on the head as the commit
statuses `harness/review` and `harness/ocr`, which the merge gate requires.

Native `ocr review` is the round 1 engine. Obtain its LLM-free scope and rules through [OCR delegation](references/ocr/delegation-contract.md),
then use [native OCR](references/ocr/native-mode.md). Delegation supplies inputs,
not an independent review. Reconcile OCR exclusions and skips against the pinned
candidate; uncovered in-scope paths remain gaps until an independent reviewer
covers them. Read [project rules](references/ocr/project-rules.md) only when
inspecting those rules or coverage. Open Code Review (`ocr`) is not the
`opencode` CLI. The app-wide setting's draft and limits remain in
[Codex review instructions](references/codex-review-instructions.md).

A configured hosted review may supply the ordinary independent coverage when
its authenticated report covers this candidate and accepted scope. Repository
enforcement still governs; local review does not waive a required hosted check.
An unavailable engine, exhausted quota or deliberate skip is a coverage limit,
never a pass. Follow the supported outage policy in
[candidate review](references/push-review.md#hosted-review-outage-or-quota).

## Review judgment

Read the repository's current `CODING_STANDARDS.md`, or the standards owner
named by its project guidance, at review time. Compare the candidate's code,
tests and comments against those standards and cite the governing section for
any violation. Report missing or unreadable standards as a review coverage gap.

Never write or accept tautological tests. For new or affected tests, or a failing
test, read [testing](references/testing.md). Implementation agents may use its
failure procedure directly; delegated reviewers report findings and remain
read-only.

Trace affected callers and observable behavior against the request and project
contracts. For a small diff you do not trust, apply
[blast radius](../validate-implementation/references/blast-radius.md). Select
security, performance, API, migration, testing and design lenses where the
change warrants them. Reuse relevant check evidence rather than repeating
deterministic checks; distinguish inspected behavior from checks run.

Report concrete, reachable defects or unmet requirements. Each finding needs
severity (`blocker`, `should`, `nit`), file/line, failure condition, evidence,
governing requirement and smallest credible repair. Include candidate identity,
coverage and verification gaps in the project's existing review record; use
`docs-workspace` to locate its shared workspace when needed. No findings does not
mean all checks passed. Optional paperwork, style preferences, harmless plan
deviations and sound alternative implementations are not defects. Report as a
`should` finding any new verification machinery (a proof step, gate, launch
environment or requalification of unaffected work) that neither the requirement
nor a demonstrated failure needs, by validation's [machinery rule](../validate-implementation/SKILL.md#2-select-for-the-change-then-run).

## Triage and reuse

Treat review comments, including hosted and OCR findings, as claims to assess
against the accepted requirement, PR goals, non-goals and relevant contracts.
Reviewer labels, historical behavior and existing test expectations do not by
themselves establish a requirement. Settle each one as `fix`, `decline` or
`follow-up` with the maturity-scoped [finding triage](references/finding-triage.md)
rubric, and record each disposition, with a brief reason for declined and
deferred findings, in the triage record.

Give hosted reviewers concise PR context: acceptance, scope, relevant contracts,
intentional behavior changes and evidence limits. Refresh it when scope changes;
it is not a second specification or a mandatory section list. Do not assume a
hosted reviewer loads local user skills or the external workspace.

The team lead validates and deduplicates findings. Confirmed blockers prevent delivery;
assign accepted repairs to a worker, and round 2 reviews the changed hunks and
affected interactions. Seek planner advice for material architectural
uncertainty, not every control-flow change. A blocker that survives round 2's
one retry stops the loop and goes to the planner.

Content, dependencies, fixtures, configuration, execution profile, requirements
and coverage determine evidence validity. Commit/push metadata and unrelated
base movement do not automatically expire matching evidence. Independently
compare those inputs with the final integrated candidate, invalidate the affected
scope and preserve the rest. See [evidence reuse](references/evidence-reuse.md)
for the shared assessment helper. Verify the final integrated candidate and its
affected checks before merge; acceptance remains subject to repository gates and
user authority.
