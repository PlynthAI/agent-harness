# Recurring CI efficiency and reliability review

Begin by reconciling the last finding, existing owner/PR and any rejected experiment.
Refresh current workflow/command identities. Verify delivered changes rather than
rediscovering an already prepared patch.

Use the latest seven complete UTC days with exact inclusive/exclusive boundaries
when comparing weekly reports across projects. Retain snapshots to build a rolling
28-day view; until enough comparable post-change days exist, label it partial.
A historical baseline stays separate. Recollecting the full historical window each
week is not a useful default.

Collect all workflow categories and observed attempts, including canceled/failed work
and closed/unmerged revisions. Revisit unfinished and changed runs with supported
resume. Creation-window cohorts miss old runs rerun outside that window; report that
refresh horizon and keep accounting-period usage separate. A bounded collector result
must disclose coverage, not silently become a population total.

Inspect detailed logs/receipts only for the leading questions. Retain necessary metadata,
bounded redacted excerpts and source links; do not archive bulk raw logs or secrets.
Keep authenticated originals intact at their owner; a redacted derivative cannot be
represented as authenticated evidence.

## What changes the decision

Use the metric contract and show sample size and workload mix:
- Required-path completion versus test-only completion, final publication and review.
- Resource consumers by workflow/runner/outcome, with failed/canceled/rerun work.
- Exact execution/selection identity and cache/reuse state where available.
- Missing attempts, durations, historical associations or external/billing data.
- Recurring failures and review findings, with deduplication and review-coverage gaps.
- Monitoring/experiment overhead and net expected benefit.

New findings must be tested against current protections and valid alternatives.
Recurrence can justify investigation; it does not make a proposed restriction correct.
A single demonstrated serious defect can warrant repair. An existing check with false
positives can itself be the problem. Do not promote more rules because a report ran.

Rank latency and cost opportunities separately, then choose a focused next action or
no action. Reuse the existing owner before starting a competing implementation. The team
lead continues authorized implementation, validation, independent review and delivery.
A source change gets the ordinary review; unchanged weekly analysis does not need an
additional reviewer or approval.

## Retain enough to resume

Use a short finding under the resolved findings/ci route and dated artifacts under
artifacts/ci when these match project conventions. An existing equivalent record wins.
The finding states the question, evidence/conditions, decision, current owner or PR,
actual versus expected effect, and next action. Update it when the conclusion changes,
preserving why a hypothesis was rejected. Do not create per-agent ledgers.

A report can link this finding and summarize the meaningful change. Reuse the existing
finding/handoff templates, omitting irrelevant sections; there is no CI paperwork schema.

Where cost is a target, periodically compare repository-filtered provider usage with
execution estimates. Monthly is a useful cadence, not a compulsory extra schedule.
Keep gross/net/allowances and unresolved allocations separate; refresh prices from their
source before calculating. Do not build a billing warehouse to make a small decision.

Respect actual API/usage limits and persist progress before exhausting them. Tune the
collection scope and reuse from observed overhead; no universal 30-minute, 500-request
or weekly-experiment quota is imposed by this skill.

