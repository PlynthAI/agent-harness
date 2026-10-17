# Preserve valid review evidence

Evidence validity follows the inputs that produced it, not the number of commits
or delivery steps since it ran. Independently compare saved coverage with the
current integrated candidate. Content, dependencies, fixtures, configuration,
execution profile, requirements and covered interactions must still match.

| Change | Treatment |
|---|---|
| Commit or push with identical relevant contents | Preserve matching check and review evidence |
| Unrelated base change | Compare impact, preserve matching scope and verify final integration |
| Affected dependency, fixture, configuration, behavior or requirement | Invalidate and repeat affected checks and review coverage |
| Accepted repair | Review changed hunks and affected interactions; preserve the rest |
| Confirmed unresolved blocker | Delivery remains blocked regardless of matching identity |

An unchanged path alone is insufficient when an imported dependency, shared
fixture, runtime setting or caller changed its behavior. An old base SHA alone
is insufficient to call evidence stale when the change is unrelated. Record the
input comparison and its limits in the existing evidence record; do not add a
parallel ledger. A reused result is not a check rerun.

## Shared helper

Use this section only for projects using
`validate-implementation/scripts/select-checks.mjs assess-review`. Existing
project records need no conversion or extra receipt.

```text
assess-review --current <identity.json> --validation <assessment.json> --review <record.json>
```

`--review` is repeatable. One complete independent review is the default;
`--required-reviews <positive integer>` reflects justified additional coverage
chosen by project policy. Every supplied record is selected required coverage;
a stale, skipped or blocked selected review remains a gap. Keep an unavailable
round 1 OCR run in the existing review record as a recorded gap, never as
successful coverage; `harness/ocr` fails until a complete run. The helper does
not choose risk policy.
Ordinary reviewer records and normalized native binding envelopes are supported;
native output is assessed through its binding evidence, not an unbound result.
Record identity and completion fields do not authenticate a reviewer: retain
the existing task/provider or repository provenance proving independence.

The helper compares saved validation and supplied reviews with an independently
obtained current identity. It reports reusable scope, stale inputs, failures,
unresolved confirmed blockers and coverage gaps; a saved `ok` does not prove
present validity. It neither runs reviewers nor grants merge authority.
`--slot01` and `--slot02` remain input aliases for existing records; their names
set no review policy, which [candidate review](push-review.md#two-rounds-before-push)
owns.
