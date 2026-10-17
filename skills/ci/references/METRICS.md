# Shared CI metric contract — proposed version 1

Use this contract for both repositories. Store the contract version beside every report. Do not turn an API field into a more precise measurement than it supports.

## Primary scorecard

| Metric | Definition | Interpretation / exclusions |
| --- | --- | --- |
| First actionable failure | Admitted revision event to first valid failure relevant to its selected required checks | Separate from success/readiness. Correlate the exact current revision and provider. |
| Required validation latency | Admitted revision event to successful completion/authentication of all selected mandatory CI checks | p50/p90/p95 by comparable successful cohort; incomplete/failed/cancelled runs reported separately. |
| Full PR eligibility | Admission to simultaneous satisfaction of CI, current-range reviews and other live merge rules | Separate review waiting and status-publication delay. Do not claim workflow completion proves mergeability. |
| Runner execution | Sum of `completed_at − started_at` for actually executed jobs across every attempt | Includes setup and post steps; does not sum step durations again. Keep runner class. Unknown is not zero. |
| Reference compute cost | Provider-specific billable duration × verified SKU price, summed over jobs | Estimate until matched to an actual usage ledger; don't infer price just from a custom label. |
| Cost per validated revision / PR lifetime | Allocated cost across all attempts and superseded revisions, not just the final green run | Maintain shared/unallocated buckets; include closed/unmerged PR costs and report denominators. |
| Reliability and coverage | Failure categories, confirmed flakes, reruns, cancellations, timeouts/OOM, selection agreement, test/gate identities | A same-SHA pass on rerun is a flake candidate, not proof of flakiness. |

Supplement with job starts per revision, critical-path gate overhead, dependency/cache overhead, slowest/median shard ratio, reuse hit rate and failed-run cost. Normalise tests only within stable suites; tests are not uniform units of value or compute.

## Time boundaries and queue measurements

For initial historical analysis, workflow `created_at` may serve as an explicitly labelled admission proxy. It is not a Git commit timestamp or necessarily the PR event timestamp. A rerun needs its attempt's admission boundary; the latest `run_started_at` must not be used to time earlier attempts. The collector therefore retains latest-run metadata and each job's attempt number separately.

Do not use `updated_at` as completion: a metadata update is not necessarily a job ending. Use the relevant check/status/job completion and authenticating publisher evidence. Do not use `job.started_at − workflow.created_at` as runner queue time; it includes dependency gating. `observed_prestart_seconds` in the export is simply job-created to job-started and is not guaranteed to be capacity queue time either.

Use the executed workflow DAG, dependency completion and known admission/concurrency semantics to decompose ready-to-run delays. Where GitHub does not expose a precise ready timestamp, label the decomposition inferred or unavailable. A Gantt/critical-path reconstruction must account for queue gaps and required post-work, not just the longest individual job.

Review work and CI may overlap. Full eligibility is the point where all valid conditions hold for one current range, not the sum of independently measured review and CI durations. A base advance can invalidate previously satisfied evidence.

## Cost boundaries

For GitHub's applicable per-minute runners, a reference calculation is:

`sum(ceil(observed_job_seconds / 60) × verified_runner_price_per_minute)`

GitHub documents per-job minute rounding. The observed interval is still a proxy for billed usage, so reconcile the result with the account ledger. A third-party provider may use different rounding, minimums, storage charges or reserved-capacity accounting; implement its policy rather than applying this formula universally. [S4]

Record currency and the effective date/source of every price. Keep provider-native USD and any AUD conversion separate with a sourced conversion date. Report list-price resource value, allowance/discount-adjusted marginal cost and actual invoice attribution distinctly. Do not treat an unknown rate, allowance or external bill as zero.

Include artifact/cache storage, LFS/image transfer, runner-provider charges and external service/model/evaluation charges where the workflows incur them. Tag usage to run/job/attempt when possible; otherwise disclose an unallocated bucket. Do not infer API token cost from runtime. Report observation infrastructure and benchmark spend too.

Cost collected for runs CREATED during a window is a cohort measure, not an exact accounting-period total. Reconcile carry-in executions, later reruns, deleted runs and unfinished jobs before claiming a monthly invoice match.

GitHub marks the old workflow usage/timing endpoint as closing down; avoid making a new cost system depend on it. Use execution metadata plus current usage/billing exports. [S3]

## Required enrichment fields

Retain `repository`, `run_id`, `job_id`, `run_attempt`, event, workflow path and actual revision, PR identity, tested head/base/merge identities, selected profile/gate/test set, status and conclusion, runner/image/runtime/tool/lockfile identities, timestamps, cache/reuse eligibility and result, and resource SKU/cost provenance.

Some fields are unavailable from run/job APIs alone. The returned PR base/head association is not proof of historical frozen execution inputs. For Create prefer authenticated receipts for exact range; for frontend preserve synthetic-merge/head/base context from execution evidence. Never guess a PR association from branch naming or actor identity.

Use native identity keys to deduplicate. Do not count a job both in a workflow rollup and an underlying matrix total. Correlate `workflow_run`/status-publication work to the originating revision or keep it in a shared bucket when no exact attribution is possible.

## Cohorts and reporting

Start with repository, event, workflow version and selected validation profile. Add runner class and outcome; distinguish first attempts/reruns, cache cold/warm, and receipt reuse/fresh execution. For frontend record the selected set (quality/unit/E2E/security/data/API). For Create record local-harness-only, fast-affected, affected, database, full, reuse and portability where observed.

Changing profile mix can make aggregate medians improve while each profile gets slower. Always show sample size and workload mix. Use paired treatment/control comparisons for claims. Keep aborted runs in occupancy/cost statistics while reporting readiness statistics as censored/unavailable rather than fast success.

The dashboard should answer: which predecessor delayed the last required result, which jobs consumed the most priced resources, why retries occurred, and whether selection/coverage remained correct. A compact generated Markdown/JSON report is sufficient initially; a paid analytics platform is not a prerequisite.

## Collection safety and completeness

`collect_ci.py` uses authenticated `gh api` GET requests with Actions read permission. It collects runs/jobs/step summaries, not secrets, raw logs or repository source. Exported names, branches and metadata can still be confidential: retain them in approved private storage.

It includes old job executions using `filter=all`, paginates jobs and runs, and subdivides crowded run-creation searches before GitHub's 1,000-result limit. [S2; S3]

`collection.json` records pagination success, incomplete errors, unknown execution duration count and missing attempt metadata. Unknown durations are excluded from observed totals, making those totals incomplete—not zero-cost jobs. Already skipped jobs are zero even when GitHub supplies synthetic/reversed timestamps. No scalar summary is a reliable report without these flags.

The collector was tested with synthetic fixtures; it was not used to execute a full remote collection during preparation. Authentication, retention, rate limiting and live API behaviour must be checked in the adopting environment. It deliberately fails on inaccessible/inconsistent pagination instead of silently claiming completeness. Recollect into a new empty directory after addressing the failure; it is a small bootstrap collector, not a resumable data warehouse.
