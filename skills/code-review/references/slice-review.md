# Review a completed slice

Use an early independent review when a completed slice benefits from feedback
before integration. It is optional, not a mandatory pass before every commit.
Related tickets may integrate locally and receive their complete
[candidate review](push-review.md) once at the group PR.

## The input

Pin the in-scope working contents and hashes, including untracked files, or a
fixed committed range. Give a fresh `fast_review` the accepted request,
applicable repository guidance, complete diff, affected callers and
[review facts](review-assignments.md#the-review-facts). It did not author the change
and receives no author conclusions. Use `reviewer` when the scope needs deeper
judgment; role configuration supplies model choices.

## Findings and coverage

Each finding carries severity, file/line, failure condition, evidence, governing
requirement and smallest credible repair. Reopen every cited location before
reporting and drop a finding that does not hold. End with candidate identity,
obtained coverage, reused evidence and anything not covered. No findings is valid;
an unavailable check or a moving candidate is a coverage limit, never a pass.

The team lead adjudicates findings and reviews accepted repairs' changed hunks and
interactions. Committing or pushing unchanged content does not expire coverage.
The final candidate reviewer may reuse it after independently matching the
relevant inputs, and reviews integration interactions and uncovered scope.
A slice report does not claim coverage of later edits it never inspected.

The reviewer edits nothing, launches no other agents and does not commit or push.
The team lead owns acceptance and repository enforcement; review does not establish that
every selected check ran.

## Provider unavailability

In Codex, fast_review uses Codex Router; in Claude Code it runs natively on
Haiku. A failed or unreachable provider is recorded as unavailable coverage.
Do not retry without a changed condition or weaken an enforced check. For
ordinary review, select an available authorized independent role suited to the
same scope; this does not require a separate early slice pass. If the repository mandates a
specific engine, follow [the supported outage policy](push-review.md#hosted-review-outage-or-quota).
