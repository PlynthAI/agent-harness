# Establish or adopt CI

Discover the project before choosing workflows:
- Actual build/test/check commands and command owners, relevant runtimes and lockfiles.
- Change events and tested identity: branch head, synthetic merge or frozen range.
- Required versus conditionally selected checks, legitimate skips and terminal status.
- Current provider rules, privileges, runner qualification and deployment boundaries.
- Existing dependency caches, receipts, reports and project document/workspace routes.

For a project with no CI, start from its real local validation commands and provider.
Build a small reliable path with correct failure propagation; add selection, caching
or parallelism when their benefit and correctness can be demonstrated. Do not import
another project's workflow, runner contract or receipt system by default.

Keep project facts in existing subject guides or PROJECT.md's development/checks
section. Several skills can use that same reference. A machine-readable adapter is
optional descriptive data, not a new policy or required per-skill project file.

Adopt the harness workspace starter through docs-workspace. Existing projects keep
their records and authoritative maps. The CI method uses normal findings and artifact
routes; an empty CI folder, new tracker or document registration is not required.

Schedules call the installed shared CI skill and identify their project and intended
autonomy. Preserve operator cadence/model choices. Reuse existing schedules and active
owners. The scheduler is replaceable: the skill also works manually or with another
host. Actual project writes, metered experiments and delivery follow established
authorization; a template or credential does not invent that scope.

The initial executable collector supports GitHub Actions using authenticated gh and
standard-library Python. Other providers can supply equivalent metadata, with explicit
gaps until an integration exists. Neither Windows paths nor GitHub are method-wide
requirements.

Verify adoption with a small read-only collection, a no-change decision and recovery
from interrupted collection. Verify a non-example project resolves its own commands
and storage. Do not run its application suite merely to test documentation routing.

## The quality gate

Gates scale with maturity. Until its owner declares the product production-ready,
a repository's pull request gate holds only the checks a trustworthy result needs.
From then on, it blocks merges on the
[quality kit](../../validate-implementation/references/quality-kit.md): lint,
types, layering, dead code and the suppression count, each against a baseline
that only shrinks, and the binding paths check on the conventions pages. The
kit page owns the commands and config; this section owns how they run in CI.

- One job, or steps in the existing pull request gate, running the kit's
  commands for each language the repository uses. A repository whose lint runs
  only when a path filter matches needs this job, not only config.
- Trigger it on every pull request that changes source, config, a baseline
  file or a conventions page. The layering, dead-code, count and binding tools
  read the whole project, so a narrow path filter skips them on changes that
  break them.
- Make it a required status check on the default branch. A workflow file alone
  does not make a check required; the branch rules do.
- Install dependencies before it: dependency-cruiser and knip read the installed
  packages and the TypeScript config.
- Fetch the base branch, for example `actions/checkout` with `fetch-depth: 0`.
  The suppression count's `check --base` fails when the base ref does not
  resolve, so a shallow checkout shows up as a failure, never a silent pass.
- Blocking only: no `continue-on-error` and no warn-only step. A count that
  only warns is how debt grows unnoticed.
- A baseline that CI regenerates (dependency-cruiser in shrink-only mode) is
  followed by `git diff --exit-code` on that file. CI never commits a baseline;
  the author does.

The kit's tools took 2 to 17 seconds each on a workstation with a warm runner
cache; hosted runner times were not measured. Measure the first runs with the
[metric contract](METRICS.md) before tuning caches or splitting the job.
