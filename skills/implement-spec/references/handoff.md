# Implementation handoff

The return a fresh reviewer reads without the originating chat. One handoff
per bounded request or ticket, written when the candidate is ready for review.

## Changed behaviour

What changed and why: the behaviour the candidate carries, the approach taken,
and where evidence-driven improvement overrode an illustrative plan step. A
harmless difference from the plan is stated, not hidden.

## Candidate

The exact candidate: branch or worktree, commit or working diff, and the
changed paths. What was deliberately not touched is named alongside. The
worktree carries no accidental local-plan or generated artifacts.

## Checks

The checks that were run, each with its exact outcome: pass, fail, or missing.
A missing check is reported as missing with what it leaves unverified - never
as passed, never silently dropped. Check selection follows the shared check
selector.

## Remaining gaps

The concrete remainder: unimplemented acceptance, actual scope uncertainty,
deferred follow-ups with their owners, and any residual risk. Nothing
formal: no requirements certificate, no signed plan, no per-criterion
certificate - their absence is not a finding.

## What this handoff is not

Not a second verdict on soundness - that is the shared review skill. Not a
delivery step - commit, push, pull request, merge and deployment stay with the
shared delivery skill, and a merge follows delivery's merge gate.
