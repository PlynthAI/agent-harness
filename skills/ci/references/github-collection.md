# GitHub Actions metadata collector

Requires Python 3.10+ and an already authenticated GitHub CLI with Actions read
access. Use the host's existing Python executable; no pip packages or project
dependency installation are required.

Run commands from the installed ci skill directory, substituting an actual
repository, UTC dates and a resolved private project artifact directory:

```text
python scripts/collect_ci.py --help
python scripts/collect_ci.py --repo OWNER/REPO --since YYYY-MM-DD --until YYYY-MM-DD --out ABSOLUTE_OUTPUT --max-runs 5
python scripts/collect_ci.py --repo OWNER/REPO --since YYYY-MM-DD --until YYYY-MM-DD --out ABSOLUTE_OUTPUT --resume
python -m unittest discover -s tests -p "test_*.py" -v
```

Dates select run creation time, inclusive since and exclusive until. All job
attempts for those retained runs are requested; executions outside the creation
window can therefore appear. This is not an accounting-period ledger. Runs created
before the window and rerun later are not discovered by this query.

A new output directory is required unless --resume is explicit. Resume requires
the same repository/window and compatible checkpoint format. It refreshes the run
inventory and reuses unchanged completed per-run snapshots; changed or in-progress
runs are collected again. Native IDs avoid duplicate consumption. Per-run snapshots
preserve prior observations; aggregates describe the current invocation.

--max-runs bounds job-refresh work in one invocation, not total run inventory or
API requests. There is no imposed default benchmark or API allowance. At the cap,
retain the checkpoint and report incomplete coverage; resume the same output to
continue. Exit 0 means the invocation finished, 2 means the cap left pending runs,
and 1 means a collection error. Argument/usage errors also exit 2 before a
checkpoint is created; inspect the CLI message and manifest before resuming.
Read collection.json before using aggregates: complete does
not mean every historical attempt or duration is known.

Inspect:
- complete and pending work: successful pagination alone is not measurement completeness.
- declared/observed attempt sets and missing attempts: a whole attempt without job rows
  is distinct from a job row lacking its attempt field.
- unknown durations and runner-assignment evidence: no observation is not zero usage.
- capture time, refreshed versus reused runs and the stated refresh horizon.
- runs/jobs/steps metadata and summary: execution seconds are not costs or eligibility.

The collector makes gh API GET requests only. It does not download logs/source,
execute repository code, dispatch workflows, retrieve credentials, calculate prices,
publish checks or decide merge readiness. Output still contains confidential project
metadata; use the existing project evidence owner.

On an interruption or changing pagination, retain output and retry with --resume
after the cause is understood. An incomplete collection must not inherit a stale
successful summary. Do not overwrite a different task or incompatible window.

Current execution identity, selected coverage, runner-image/cache details and
billing require focused enrichment from their actual source; current PR association
fields do not prove historical tested base/head/merge identity. See
[METRICS.md](METRICS.md) and [experiments](experiments.md).

Provider references: [workflow runs](https://docs.github.com/en/rest/actions/workflow-runs)
and [workflow jobs](https://docs.github.com/en/rest/actions/workflow-jobs).

