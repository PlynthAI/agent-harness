---
name: ci
description: Establish project CI or improve its feedback time, reliability and resource cost through measured changes and recurring evidence review.
metadata:
  group: deliver
---

# CI

Improve time to trustworthy feedback and cost per validated change. Read the
project's current check owners and requirements; this skill supplies the method,
not a replacement validation authority.

## Choose the useful work

- Establish CI or adopt this method in a new project: [adoption](references/adoption.md).
- Once the owner declares the product production-ready, make the quality kit a blocking merge gate: [the quality gate](references/adoption.md#the-quality-gate).
- Inspect current performance or run a scheduled review: [recurring review](references/recurring-review.md).
- Compare a concrete change: [experiments](references/experiments.md).
- Collect GitHub Actions metadata: [collector](references/github-collection.md).
- Interpret timing, consumption and billing: [metric contract](references/METRICS.md).
- Respond to a CI failure: delivery's [babysit CI step](../delivery/references/babysit.md) routes every one to the harness retrospective.

A small question needs only the relevant reference. No compulsory report stack,
new dashboard, service, paid tool or benchmark run follows from invoking CI.

## Evidence and judgment

Resolve the project workspace with docs-workspace and read its instructions.
Read the latest relevant finding and current source/configuration before repeating
work. Historical reports, generated telemetry and old review comments are evidence,
not authority to change today's checks.

Use configured cheap inspection roles for bounded collection and analysis when
that saves work. The team lead supplies the question, existing authority and evidence path;
the inspector writes a short result under the task's artifacts and returns the path.
The team lead decides to act, investigate, reuse an existing owner, defer or reject.
Model choices remain in role configuration. Do not spawn a fixed team for every run.

Rank contributions to required-path latency separately from resource consumption.
Include failures, cancellations, reruns, setup/post-work and observation overhead.
Keep measured runner time, estimated prices and actual billing distinct.
A faster noncritical job need not shorten feedback; fewer review findings may mean
less review. Unknown data remains unknown.

## Improve and verify

Use ordinary CI and existing receipts before commissioning another benchmark.
Pick a coherent bottleneck, define equivalent inputs and a decision criterion, and
make the smallest useful change. Consider maintenance, retries and false positives
alongside the execution savings. No worthwhile change is a valid outcome.

Use existing project validation, code-review and delivery. A separate configured
cheap reviewer assesses a fixed code candidate; do not add a review stage merely
to sign off each weekly report. The team lead adjudicates findings against actual behavior
and legitimate alternatives. Continue authorized work across handoffs and runs;
reuse established external-processing scope from the project's existing owner.

Preserve selection/coverage, isolation, exact execution identity, authenticated
evidence, independent verification and publication semantics wherever the project
requires them. A material trust, runner qualification or publication-order change
needs an explicit proposal within the user's authority. Do not weaken a gate to
obtain a shorter green run.

After delivery, record whether the change remains present, what was actually
measured and the new bottleneck. Update the same project finding with evidence,
conditions and rejected approaches. Shared lessons go to the harness owner through
the harness library; project automation does not silently rewrite the shared skill.

[Origin and scope](references/origin.md) records the kit this method develops.

