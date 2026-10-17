# Finding triage

One rubric for every review finding: local `fast_review` and `reviewer`
reports, OCR, and hosted review such as Codex cloud review or Bugbot. A finding
is advice about the candidate, not a requirement. The team lead settles each
one with this rubric and asks the owner only about a product or permission
decision.

## Maturity tier

A feature is `production` only when the owner has declared it production-ready.
Everything else, MVP features and experiments alike, is `experiment` tier, with
no setup: a repository records declared features in its AGENTS.md
`## Code Review Rules` section, which hosted Codex review also reads, only once
it has some.

- `experiment`: the minimum a trustworthy result needs. Moving fast and
  breaking things is allowed where the owner chooses.
- `production`: the shipped behaviour and its contracts are defended, including
  regressions, compatibility and the hardening the feature's users rely on.

## Four questions

Ask them of each finding, after confirming the claim against the code:

1. Does it break something this change promises: the request, PR goal or
   acceptance criteria?
2. Is the affected feature `production` tier?
3. Does a real producer, caller or run emit the input it describes, or only a
   shape nothing real produces?
4. Would the fix leave the code harder for agents to change, by adding rules,
   branches or tests that pin incidental shapes?

## Classes

- `fix`: a confirmed defect in behaviour the change promises, at the feature's
  tier; for `production` that includes its shipped behaviour and contracts. A
  security, privacy or data-loss defect reachable with real data is `fix` at
  any tier, whatever the non-goals say, and so is a security, privacy or
  data-loss claim that cannot be disproved.
- `decline`: new validation or gates beyond the requirement, hardening of
  `experiment` code, input shapes no real producer emits, style or speculative
  robustness. The reason names the rule or question that settles it. Reopen
  it only when the feature moves to `production` or a real producer appears.
- `follow-up`: real but outside this change. Open an issue only when it is
  worth tracking; otherwise the reply's reason is the record.

On a review thread the agent replies once, `fix: <sha>`, `decline: <reason>`
or `follow-up: <reason>`; the reply settles the finding and the agent then
resolves the thread. A refused resolve is reported as a denial, never routed to
the owner or bypassed.

For `experiment` code the default is `decline` unless the finding breaks the
stated requirement. "Plausible", "best practice" or a reviewer's severity label
does not make a finding `fix`.

## Standards and existing debt

Locate a standards finding in new code, directly affected behavior or tests, or
unrelated existing debt. A new violation of an adopted standard is `fix`, as is a
defect in the change's promised behavior or required affected coverage. Unrelated
debt is `follow-up` unless it exposes a reachable security, privacy or data-loss
defect. Touching a file does not require cleaning up its whole baseline or meeting
a cleanup quota. Required checks and actual acceptance outcomes still apply.

For a test finding or failure, use [testing](testing.md) to determine what evidence
and coverage a repair must preserve.

## Rounds

Code review's [two rounds](push-review.md#two-rounds-before-push) set the
cadence. Round 1 settles the reviewer's and OCR's findings together before any
code changes, then makes the `fix` class in one commit. Round 2 fixes only
blockers; any other new finding is `decline` or `follow-up`.

- Stop rule: when a fix itself adds validation surface (a new check, rule,
  guard or test of input shape), stop and re-ask the four questions before
  pushing. A new rule gives the next pass fresh edge cases to flag.
- A finding that repeats a declined class gets the same reply, not new code.
- A finding about the verification machinery rather than the product (an
  observer, harness, proof step or launch environment) is `fix` only when it
  can produce a false pass, blocks the real run or a required check, or is a
  reachable security, privacy or data-loss defect; otherwise it is `decline` or
  `follow-up`.
- Two review passes in a row on the same input surface: stop fixing instances (a
  reachable security, privacy or data-loss defect stays `fix`). Close the
  category, preferring to refuse or narrow the input over accommodating
  it, and state that boundary in the PR body the hosted reviewer reads.
- Proof that a check is unnecessary is the acceptance measure holding without
  it. Removing such a check is a valid repair, except a guard against a
  security, privacy, auth or data-loss defect, which acceptance runs rarely
  exercise.

## The triage record

The team lead writes `.state/review/triage.json` in the checkout after each
round, and delivery's after-push scoped check updates it the same way.
Delivery's `review-status.mjs` reads it to post `harness/review` and
`harness/ocr` on a head. A restart at round 1 writes a fresh record.

```json
{
  "ocrCommit": "<40-hex round 1 commit>",
  "ocrRecord": "<path to native-slot's slot-02-<runId>.json for ocrCommit>",
  "reviewedHead": "<40-hex last commit the reviewer checked>",
  "round2": { "head": "<40-hex last commit round 2 checked>", "houseRules": "<path of the rule.json round 2 applied>" },
  "findings": [
    { "source": "reviewer|ocr", "severity": "blocker|should|nit", "summary": "...", "disposition": "fix|decline|follow-up|open", "reason": "..." }
  ]
}
```

- `ocrRecord` is absolute or relative to the checkout root.
- `round2` is `null` until round 2 runs; it then covers every commit after
  `ocrCommit` through `round2.head` and names the `houseRules` it applied
  (coverage without it does not count), each fix against its finding and the new
  lines against the house rules. After round 2, `reviewedHead` equals
  `round2.head`.
- `fix` means the fix is in and the reviewer checked it at `reviewedHead`;
  `decline` and `follow-up` need a non-empty `reason`; `open` is unsettled.
- `harness/review` is clean on a head when `reviewedHead` equals it and no
  finding is `open`.
- `harness/ocr` is clean on a head when `ocrRecord` reads `complete: true`
  (or `empty-coverage`: the house scope selected none of the changed paths,
  as in a generated-file-only change), `candidate.match: true` and `candidate.resolved_head` equal to `ocrCommit`,
  no `ocr` finding is `open`, and either `ocrCommit` is the head or it is an
  ancestor of the head and `round2.head` equals the head.

Hosted-review mechanics (replies, the bot's review state, recurring decline
patterns) are in delivery's [babysit](../../delivery/references/babysit.md)
and [bugbot triage](../../delivery/references/bugbot-triage.md).
