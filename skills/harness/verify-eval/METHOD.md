---
name: verify-eval
description: Retrospective of the review, validation and CI loop. Reads session logs, CI results and review threads to find friction and misses in how code is checked and reviewed, then fixes the owner so the loop is agent friendly and catches what matters.
---

# Verify eval

The loop under review is how a change is proven: the shared
[validate-implementation](../../validate-implementation/SKILL.md),
[code-review](../../code-review/SKILL.md) and [ci](../../ci/SKILL.md) methods,
the shared checks and quality kit, and each project's verification guide (the
authority its AGENTS.md names, normally `docs/VERIFICATION.md`) with its CI
configuration. Two questions: is it **effective** (it catches what matters,
before merge) and is it **low friction** (agents run the right checks once,
read the results, and move on)?

## 1. Gather the evidence

- **Sessions** that validated or reviewed, through
  [session logs](../references/session-logs.md):
  `--skill validate-implementation`, `--skill code-review`, `--skill delivery`,
  bounded by `--last` or `--since`.
- **CI runs** on recent PRs: failures, re-runs, and red that local checks
  passed. Delivery records misses under the workspace's `findings/ci-green/`.
- **Review threads**: findings fixed, declined, or later shown wrong, and
  defects that reached main after a green review.

## 2. Read for effectiveness and friction

| Effectiveness | Friction |
|---|---|
| A defect review or CI caught: which check, how early | Checks re-run with no code change in between |
| A defect that got through: which check could have caught it | A slow or flaky check that agents wait on or retry |
| CI red that the local profile did not run | Agents unsure which checks to run, reading several references first |
| Review findings repeatedly declined as noise | A check whose output is too long to read, or fails without saying why |
| A check that never fails and costs time | Environment gaps: a missing browser, tool or secret that blocks a check |

Count each across sessions; repetition ranks, a reproduced miss grounds.

## 3. Fix the owner

- A miss CI caught but the local profile did not: the profile or check
  selection in validate-implementation, per its
  [check ladder](../../validate-implementation/references/check-ladder.md).
- A mechanical defect that got through: a deterministic check in the project's
  linter, hook or CI, cheapest first, as the retrospective's
  [session evidence](../retrospective/references/session-evidence.md) sets out.
- A judgement review keeps needing: the project's `CODING_STANDARDS.md` or the
  review reference, with the requirement and legitimate alternatives.
- Noise: narrow or delete the check or finding category; a check stays only if
  it makes the code better and easier for agents to change.
- Slowness or flakiness: measure first, then fix or scope the check; never skip
  or quarantine a test to get green.
- A blocked check in a cloud container: the environment, through
  cloud-env.

A shared method or check changes through [library](../library/METHOD.md) and a
skill-level problem through [skill-refine](../skill-refine/METHOD.md); a
project's guide, CI and standards change in that project. Report before and
after on the same evidence: misses, re-runs and time to green.
