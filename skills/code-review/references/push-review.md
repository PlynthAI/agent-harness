# Review the delivery candidate

Use for the integrated branch or PR candidate. This is the complete independent
review ordinary delivery needs; it is not a second full pass layered over every
[slice review](slice-review.md). Related tickets may integrate locally and receive
candidate review once at their group PR.

Pin the comparison base, head and any in-scope working contents. Use the accepted
issue/request/plan and relevant project guidance as authority. A missing formal
spec does not erase accepted requirements; report a material authority gap
instead of inventing one.

## Two rounds before push

Every push gets these rounds, with or without a pull request.

**Round 1.** Pin one commit. In parallel on that commit, one independent
`reviewer`, or `fast_review` for a bounded straightforward candidate, gets the
complete scope and its [review facts](review-assignments.md#the-review-facts)
and covers requirements, interactions, architecture and docs (the sections
below), while [native OCR](review-assignments.md#native-ocr-in-round-1) covers
every in-scope file for defects and the house rules. The team lead triages both
reports once with [finding triage](finding-triage.md) and makes the accepted
fixes in one fix commit. With no fix, round 1 ends the review.

**Round 2.** The reviewer alone checks the fix commit: each fix against its
finding, and the new lines against the [house rules](ocr/project-rules.md#the-house-rules)
(`~/.opencodereview/rule.json`, installed from the harness's
`config/ocr/rule.json`). OCR does not rerun. Only blockers are fixed; any
other new finding is settled as `decline` or `follow-up`.

- A fix that goes past its findings' hunks restarts at round 1 on the new commit.
- A blocker that survives round 2 gets one more fix and a check of that blocker
  only. If it still fails, stop and take it to the planner.

**Clean** means no open blocker and every finding settled as `fix`, `decline`
with a reason, or `follow-up`. The team lead writes the
[triage record](finding-triage.md#the-triage-record) after each round, and
delivery's `review-status.mjs` posts it on the head as `harness/review` and
`harness/ocr`. OCR counts as clean on a head when its round 1 commit is that
head, or is an ancestor of it and round 2 covered the commits after it.

A configured authenticated hosted report can meet the reviewer's coverage when
the project accepts it. Additional specialists have a concrete risk and
assigned scope, rather than a compulsory axis or reviewer count.

Reuse recorded slice coverage whose content and governing inputs still match.
The accountable reviewer reviews uncovered changes and integration interactions,
and names the coverage reused and the coverage it obtained. It need not repeat
an unchanged slice merely to produce a full-candidate report. Candidate identity
and coverage remain explicit; an author summary is not review evidence.

### Requirements and behavior

Check acceptance, observable behavior, affected callers, meaningful scope creep
and an important legitimate alternative. Cite the requirement and failure
condition for each finding. Assess documentation made wrong by changed behavior,
entrypoints, launch/auth/configuration, commands or cleanup. Update the affected
existing guide; an unaffected map needs no separate review.

### Project standards

Read relevant architecture and coding-standards pages and the
[principles and patterns index](../../../principles-and-patterns/index.md).
Open only fitting `diff` principles, patterns for changed languages and
dependency patterns the change touches. Do not load the whole library or require
a separate principles reviewer.

A permitted departure is not a defect, nor is debt this change does not extend.
Changed rules are reviewed as changes: tie a new restriction to an accepted
requirement, decision, reproduced failure or owner instruction, including the
legitimate alternatives it permits. A project rule outranks a generic principle.
Each standards finding names the governing section and concrete consequence.

Tool results stand instead of a second lint. Still inspect what a passing
baseline can hide, such as a new suppression or a swapped violation. Mark a
finding from a `status: trial` entry as `trial`, so it can be assessed as advice.

### Correctness and specialist scope

Trace concrete reachable defects and changed interactions on the fixed candidate.
Automated checks supply execution evidence; review supplies independent judgment.
A concrete security, schema, publication-authority or architectural risk may need
additional specialist review. Explain the risk and give that reviewer the affected
scope. Round 2 reviews only accepted repair hunks and affected interactions;
unaffected evidence remains valid.

Retain round 1 OCR's authenticated provider/model and manifest evidence under
[native OCR](ocr/native-mode.md). Reconcile its reviewed, skipped and excluded
paths with the complete candidate. Its output alone cannot cover files it
excluded, and zero findings with partial coverage is not a completed review.
The round 1 reviewer may cover those gaps without rerunning covered paths. No
other engine is added merely because the candidate will be pushed.

## Hosted review outage or quota

Record the actual provider failure or quota result and its affected coverage.
Do not fabricate a review, mark an unavailable result successful, suppress an
enforced check, impersonate a bot or repeat an unavailable request without a
changed condition.

When a repository requires hosted review, delivery waits unless that repository
has implemented a supported alternative. An alternative must authenticate the
independent reviewer and report, bind the reviewed candidate and relevant inputs,
cover the required scope, record every actionable finding's disposition and
require confirmed blockers to be resolved. A local note or self-attestation is
insufficient. The repository owns the permitted route and gate; this skill grants
no exception or new approval hierarchy.

Where no hosted engine is mandated, choose an available authorized independent reviewer
with the required coverage and preserve its provenance. An unavailable round 1
OCR run is a recorded limit and `harness/ocr` fails until a complete run; it is
not a reason to duplicate a completed independent review. Respect actual provider authorization and permission boundaries.

## Handoff and final verification

Findings and the team lead's dispositions go in the triage record. Use the
existing project review record, or one task-owned artifact when none exists, for
candidate/base, accepted authority, checks and their limits, reviewer provenance
and obtained and reused coverage. Link raw outputs rather than pasting them into
the PR. No extra packet is required.

The team lead adjudicates reachable failures against the requirement, assigns accepted
repairs and obtains round 2. Confirmed blockers prevent delivery.
Before merge, independently compare the final integrated candidate with the
reviewed inputs. Reuse unchanged coverage and check evidence; rerun checks and
review only affected scope when dependencies, fixtures, configuration, behavior
or requirements changed. Unrelated base movement requires this impact comparison,
not every review again. Record final identity, remaining limits and the next
authorized delivery step. Repository merge checks remain enforced.
