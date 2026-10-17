# Review assignments

Supply a fixed candidate and the accepted scope to an independent reviewer.
Ordinary changes have one accountable review covering requirements, standards
and correctness; before a push it runs beside native OCR in round 1, then alone
in round 2. Risk may warrant a bounded specialist addition; see
[candidate review](push-review.md).

## The review facts

Give reviewers the same factual inputs through the existing assignment or
review record. A `review-facts.md` file is useful for tool handoffs, not mandatory
paperwork. It carries:

- Candidate identity, comparison base and in-scope contents, including untracked
  files; any independently matched prior review coverage being reused.
- Accepted requirements, non-goals, relevant project contracts and legitimate
  alternatives, including permitted departures on affected standards pages.
- Each affected feature's maturity tier, `experiment` unless the repository's
  `## Code Review Rules` declares it `production`, so the reviewer reports at
  the [finding triage](finding-triage.md) bar: no new validation or hardening
  proposals for `experiment` code.
- The validation receipt or existing check evidence: candidate and relevant
  inputs, commands, outcomes (`pass`, `fail`, `skipped`, `unavailable`,
  `cancelled`, `not_run`), skips and coverage gaps. Carry quality-tool
  baselines and unavailable tools; link raw outputs instead of repeating them.
- Additional specialist scope, if warranted, and the concrete risk it addresses.

Evidence owners remain authoritative. When saved evidence does not match the
current relevant inputs, mark the affected scope stale rather than presenting
it as a pass. Metadata-only commit/push changes and unrelated base movement do
not invalidate evidence by themselves.

When OCR runs in round 1, pass the same accepted context to
`ocr delegate preview --background-file <review-facts.md>` and
`native-slot.mjs --context-file <review-facts.md>`. Keep it within OCR's background
limits (8,000 sanitized characters, 1 MiB) by summarizing and linking detail;
do not truncate it. OCR's rule file supplies house rules, not the accepted
requirements. The native record names the context file in
`requested.context_file`; the file and raw run establish what it received.

## Sample ordinary assignment

> Independently review `<merge-base>...<head>` in `<repo>` against `<request>`.
> The affected features are `<experiment | production>` tier. Report every
> reachable defect, promised behaviour first and any security, privacy or
> data-loss defect at any tier; propose no new validation for experiment code.
> You did not author this candidate. Read its complete diff, affected callers,
> applicable project guidance and `<review-facts>`. Cover accepted behavior,
> standards and concrete reachable defects. Reuse `<prior coverage>` only after
> independently matching its scope and relevant inputs; inspect uncovered
> changes and integration interactions. Report each finding with severity,
> file/line, failure condition, evidence, governing requirement and smallest
> credible repair. Name obtained/reused coverage and verification limits. Edit
> nothing; return findings to the team lead for triage. No findings is a valid result.

Give that assignment to `reviewer`, or `fast_review` for a bounded,
straightforward candidate. Shared role files supply model/provider choices.
A related-ticket group can use this assignment once for its integrated PR.

## Sample round 2 assignment

> Check fix commit `<fix-commit>` in `<repo>` against round 1's findings
> `<findings list>`. For each finding marked `fix`, confirm the change repairs
> its failure condition, and report any change outside that finding's hunks.
> Check every new or changed line against the house rules in `<rule.json>`.
> Report new findings with severity, file/line, failure condition, evidence and
> governing rule; only a blocker is fixed in this round. Edit nothing; return
> findings to the team lead.

A surviving blocker's retry uses the same assignment with its new fix commit
and that one finding only.

## Sample specialist addition

A route handler and migration change introduces a concrete access-control and
schema risk. Ordinary review still owns the complete candidate; add a specialist
only for the additional judgment it needs:

> Independently review `<candidate>` in `<repo>` for `<stated risk>`. Read the
> accepted contract, affected callers, schema and fixture/configuration inputs
> in `<review-facts>`. Trace the protected behavior and an important permitted
> alternative. Report reachable failures with evidence and explicit limits.
> Do not edit source or assess unrelated axes. Return your findings to the team lead.

Keep specialist findings independent until reported; the team lead reconciles them.

## Forwarded reviews and recovery

For a Claude role that forwards to Codex, retain the background task's raw output
and exit status. Require a zero exit, a final review and the
`codex-forward: Codex thread <UUID>; its rollout is saved under ~/.codex/sessions`
line. Compare that id with the saved Codex rollout and confirm it received the
assigned candidate and requirements. A missing line, missing rollout or
non-forwarded "No findings" reply is an incomplete review, never a clean pass.
The marker alone does not prove coverage or a passing review.

Supply governing issue text and check evidence in the assignment or readable
files when the review sandbox cannot access their original location. Retain
candidate identity and evidence paths. If report writes or callbacks are
unavailable, accept a complete final reply through the supported return route;
the lead saves it at the resolved task evidence route before releasing the
reviewer's task or checkout. A failed callback leaves the raw output or task id,
output path and error as a recovery handback, and review remains incomplete
until the lead retrieves the result. Preserve a native denial rather than
switching routes to bypass it. Continue a permitted follow-up with the same
Codex thread and role; do not silently substitute another reviewer.

## Native OCR in round 1

Under [native OCR](ocr/native-mode.md)'s route and authorization, on the commit
the round 1 reviewer has:

```powershell
node skills/code-review/scripts/native-slot.mjs --out .state/review/ocr `
  --commit <hash> --repo <repo> `
  --context-file <review-facts.md> --scope <preview.json>
```

`--commit` reviews that one commit against its parent; for a branch of several
commits, pass `--from <merge-base> --to <hash>` instead. Either way the record
pins `<hash>` as its `candidate.resolved_head`, and its `slot-02-<runId>.json`
path is the triage record's `ocrRecord`.

OCR resolves house rules and reviews on its own. Retain its execution and
coverage evidence. Its report does not replace the independent review, and any
excluded in-scope paths need that reviewer's coverage.
