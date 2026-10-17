---
name: hillclimb
description: "Improve a measurable outcome one tested change at a time: predict, measure against a frozen baseline, keep or revert, record what was learned. Use for repeated attempts to improve quality, coverage, speed or cost in any domain. A one-off defect goes to diagnosing-bugs."
metadata:
  group: harness
---

# Hillclimb

Climb a hill one step at a time: change one thing, measure it against a frozen
baseline, keep it or revert it, write down what you learned. Before the first
step, say what you expect to see and what result would prove you wrong. Never
claim a win from reading the code; measure the real thing. Stop when the number
clears its target, the budget runs out or the remaining ideas are not worth their
cost. Running out of budget with the target unmet is unfinished, not done.

You own the experiment's honesty and the choice of what to try next. A failed
attempt that teaches something is still progress.

For establishing or operating a repeated job, use
[automate-workflow](../automate-workflow/SKILL.md). It owns run supervision,
recovery and adoption, and calls this method for measured improvement experiments.

It works in any domain that has a number:

| Domain | Measure | Target, and what must still pass |
| --- | --- | --- |
| Page speed | LCP, median of 5 runs | 20% faster, tests still green |
| A prompt or model setting | Pass rate on 50 fixed cases | +10 points, no regression on the held-out 20 |
| SEO or content | Pages indexed or ranking after 14 days | Target agreed with the owner |
| Verification | Detection on fixed cases, false passes, flake rate or runtime | Declared numerical improvement, existing regressions still detected |

Verification itself can be the hill: improve a coverage gap, checker, fixture,
runner or evidence path through the existing project tooling. Prioritise gaps by
the consequential failures they miss, recurrence and cost to resolve. Choose one
bounded gap; do not require a new framework or a benchmark quota.

## 1. Frame

- Name what you are improving and what the user actually gets when it improves.
  Don't let an in-between score stand in for usable output.
- Write the hypothesis: a prediction plus the result that would disprove it, not
  an explanation you are sure of. For an exploratory attempt a weak one is fine
  ("this is different enough to be worth seeing; it should move the number at
  all"). The mechanism is what you learn afterwards.
- Agree the finish line before starting: which cases and out of how many, the
  target, what must still pass, and a budget (attempts, time or tokens). Use the
  user's numbers when given. Add a minimum number of attempts only when a lucky
  early win is a real risk.
- For verification work, declare a falsifiable numerical gate before changing
  tooling: the metric, denominator, comparison operator, threshold and tolerated
  regressions. Detection and false-pass cases need known expected outcomes;
  green output alone does not qualify a gain. Use existing accepted targets, or
  resolve missing material targets before activating the experiment.
- One main number helps. When quality, coverage, speed and cost trade off, report
  them separately; a combined score must not hide a failed check.
- Unfamiliar mechanism: ground it through [understand](../understand/SKILL.md),
  using [how](../understand/how/METHOD.md) when architecture matters. A one-off
  defect goes to [diagnosing-bugs](../diagnosing-bugs/SKILL.md), an unresolved
  priority to [brainstorm](../brainstorm/SKILL.md) and a real choice of approach
  to [planner](../planner/SKILL.md).

## 2. Baseline

- Decide how you measure. Reuse an existing script or tool when it fits, but
  prove it tells the relevant cases apart before trusting it. Script it, so a
  reviewer can rerun it.
- Sample enough to address the actual noise. Repeat noisy runtime or flake
  measurements as needed; deterministic case accounting needs no repeat quota.
- Record the baseline and a green run of what must still pass, chosen through
  [validate-implementation](../validate-implementation/SKILL.md), before any
  change. Visual results also go through the artifact's rendering or browser
  verification. No baseline yet? The first loop is measuring one.
- Freeze it. Inputs, settings, cases and conditions stay the same within a
  comparison. If you change how you measure, version it and re-baseline; never
  compare scores from two different measures.
- For verification work, freeze the selected positive and negative cases,
  expected outcomes, candidate and baseline content, tool/configuration versions
  and environment. Record detection and false passes, or flake/runtime baseline
  as applicable. Preserve existing regression cases and valid alternatives;
  a coverage count cannot replace evidence that the checker detects the failure.
- For verification work, settle these before the first candidate runs:
  - When the contract covers every operation of a kind ("any read", "any
    write"), the test and the frozen defect set count those operations in a
    good run and fault each in turn. Hand-picked samples leave the rest for
    review to find one at a time.
  - An independent reviewer (a fast_review) reads the frozen defect set against
    the contract and names at least one plausible defect it omits, or says
    there is none.
  - The attempt budget bounds attempts to meet the gate. Repairs of review
    findings after the gate is met follow
    [code-review](../code-review/SKILL.md) and fall outside it.
  - Defects found after freezing form a held-out set, reported beside the gate
    and never re-scored into it.
  - A time or cost guardrail declares how it handles noise (interleaved
    baseline and candidate pairs, the runner's own reported time, the median)
    before the first measurement.
  - Measure planted defects with
    [scripts/mutation-runner.mjs](scripts/mutation-runner.mjs) (`--help`). It
    refuses an ambiguous anchor, restores every file and scores the gate and
    the held-out set apart. It checks that git status and the content of
    tracked, untracked and dirty files end as they started; ignored files are
    out of scope. Selections run through the platform shell: cmd.exe on
    Windows (quote with double quotes), sh elsewhere. A killed run leaves its
    mutant in place until the next invocation restores it; if that invocation
    refuses, settle the file by hand. The same runner answers "does this test
    protect anything?" for a test-suite cleanup: a test that kills no planted
    defect prompts review of the test and the selected mutations through
    [code-review's testing procedure](../code-review/references/testing.md).
    That result alone does not establish that the test has no useful coverage.

## 3. Change and measure

- Change one thing per attempt, so the result points at its cause. The exception
  is a radical candidate (a rewrite, a different approach): run it as its own
  attempt against the same baseline, and if it wins, bisect later to find what
  mattered. Name any combined change and what it costs you in attribution.
- Give exploration a bounded share of the run, around one attempt in four or a
  share agreed up front. Exploratory attempts are logged and kept or reverted
  like any other.
- Measure before and after the same way and run what must still pass. Keep what
  someone needs to reproduce the claim: inputs and their versions, original
  outputs, commands, costs and timings, failed attempts included. An unknown cost
  stays unknown, not zero.
- Count against the frozen selected cases, including failures, errors,
  cancellations and cases not run. Missing or duplicate case records make the
  assessment incomplete, rather than shrinking the denominator. Label metrics
  conditional on completed cases; total cost includes failed attempts and
  retries. Zero-case, unscored, nonfinite or mismatched inputs cannot pass a
  numerical gate; unknown cost cannot pass a cost gate.
- Hand bounded attempts to workers through
  [orchestrate-work](../orchestrate-work/SKILL.md) when it helps. Parallel
  attempts each run in their own worktree, so no two share mutable state.
- For an unattended run, use the runtime's loop where it offers one (`/loop` in
  dynamic mode), waking when the next measurement is worth taking. This skill's
  stop rule decides when to stop, not the loop's.

## 4. Understand

After each result, before choosing the next attempt:

- Separate what you saw from why you think it happened. Look at which cases
  failed and at rival explanations when they would change the next step: a
  faulty checker, bad data or a retrieval miss each needs a different test.
- Ask two things: does this evidence still support the hypothesis, and is there
  now a cheaper or more promising alternative than there was before? Two rejects
  in a row on the same hypothesis, or any result that surprises you, re-opens the
  premise. Write down why you are staying on it or what you are switching to.
  Effort already spent is not a reason.
- Keep the two kinds of failure apart. Rejecting a candidate does not by itself
  disprove its hypothesis: a candidate can fail for a shallow reason. And an idea
  can be wrong though every attempt was clean.
- Write down what the evidence rules out and what is still untested. Observed,
  Understood, Decision and Next are useful headings for this, not mandatory ones.
- Keep the note with the result and read it before the next attempt. For a
  sustained run use [the decision log](references/decision-log.md);
  [docs-workspace](../docs-workspace/SKILL.md) says where it lives.

## 5. Decide or stop

- Adopt a candidate only when the gain clears the noise and everything that must
  still pass does. Otherwise reject it and revert it in full, keeping its
  evidence. Inconclusive is a legal decision too. Finishing the comparison is
  not the same as achieving the improvement. Correctness and simplicity outrank
  the number: revert a win that breaks behavior, keep a simplification that holds
  the number.
- For verification work, adopt only when the declared gate passes and preserved
  regressions and valid alternatives still hold. Reject a comparable failed
  candidate; use inconclusive for missing evidence or an unresolved comparison.
  Record the next bounded gap, hypothesis and gate. A completed tooling loop
  establishes only its measured verification gain, not product acceptance.
- On a plateau, several rejects in a row, pivot category, combine near-misses,
  re-read the source or try something more radical before concluding the hill is
  climbed.
- A hypothesis that keeps failing is a result. Log it as rejected and move to the
  next hill rather than refining the candidate until it passes.
- After repeated tuning, confirm on fresh cases the tuning never saw, and against
  what the user actually gets. Winning an experiment does not make a change
  production-ready.
- Stop by the rule at the top, and don't relax the target to meet it. A finding or a
  chosen next experiment can be the complete output; a commit or PR is not
  mandatory. An adopted change that needs building out goes to
  [implement-spec](../implement-spec/SKILL.md), then review and
  [delivery](../delivery/SKILL.md) only as far as authorized. Commit and PR are
  separate steps; a PR merges through delivery's merge gate.

**Reply:** the outcome with its numbers (baseline to final, out of how many
cases), what you learned and what is still uncertain, the decision, the next
hypothesis with its target, and where the result or log lives. Say which wider
checks of what the user actually gets have not been run.

## References

- [references/decision-log.md](references/decision-log.md) - keep the experiment
  trail without imposing a report format.
- [assets/decision-log-template.tsv](assets/decision-log-template.tsv) and
  [scripts/log.sh](scripts/log.sh) - optional TSV format and append helper.
- [scripts/mutation-runner.mjs](scripts/mutation-runner.mjs) - the shared runner
  for planted-defect (mutation) measures.
