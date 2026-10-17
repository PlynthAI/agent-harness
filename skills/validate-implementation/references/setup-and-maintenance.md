# Establish and maintain a project's verification route

Use this reference when adopting the harness in a software project, when agents
cannot exercise the real entrypoint, or when an existing verification guide has
become unreliable. Routine changes continue to use the skill's normal check
selection. The project owns its commands, tests and documentation location.

This method adapts the setup and maintenance ideas in [pstack's pinned
source](https://github.com/cursor/plugins/tree/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack),
under its MIT license; see [third-party notices](../../../THIRD_PARTY_NOTICES.md).
We produce ordinary project docs and only justified project helpers.

## One authoritative guide

AGENTS.md names the repository's verification authority. Keep an established
testing guide at its owning route; new projects use `docs/VERIFICATION.md`.
Repair that guide and its callers rather than creating a twin or moving it to
satisfy a guessed path. Its journey map, runner config and native receipts stay
where they are and the guide links them.

A project routing skill may point to its guide and distinct project procedures;
it does not maintain a second copy of the shared validation method. Reconcile
duplicated prose and consumers through repository adoption before retiring a
route. The acceptance check is a fresh agent: run
`claude -p "<a small change in this repo: which checks prove it and how do you run them?>" --allowedTools "Read,Glob,Grep"`
(or `codex exec --sandbox read-only -C <checkout> "<same question>"`) from the
checkout, and keep its answer with the proof run below. It passes when the
agent reaches the guide from AGENTS.md and names the right commands.

## Establish a route

Inspect the project's AGENTS.md, PROJECT.md or existing map, manifests, scripts,
test configuration and runtime guidance. Identify what a user can exercise: UI,
HTTP service, CLI, library, mobile app or another surface. Prefer the existing
runner, dev supervisor, test fixtures and identity checks. A reachable port or a
green build alone does not identify the candidate or prove its behaviour. For
each manual verification procedure the repository's guides describe, name the
automated check that owns it; a manual procedure with none is the first gap to
rank.

Complete the existing authoritative guide, or create `docs/VERIFICATION.md`
from `harness-docs-starter/templates/verification.md` when there is none.
Record exact supported commands and working directories for:

- launch and readiness/doctor, including checkout or build, URL or process,
  environment, data/profile and auth identity;
- one real user or public-entrypoint action and its observable result;
- logs, traces, screenshots, responses or independent data readback that prove
  the action and result, with a workspace evidence destination;
- disposable test auth/seed setup and the supported route to restore it;
- isolation of ports, processes, profiles and data between concurrent runs;
- cleanup of the resources this run started, preserving its evidence;
- the local check ladder: the commit hook's staged checks, the push-step CI
  mirror and a CI parity table mapping each CI job to its local command or
  hosted-only reason, per [check ladder](check-ladder.md);
- the selected checks from the [quality kit](quality-kit.md): their commands,
  config files and baseline files, with a parity row for each adopted tool.

Map [behavior evidence](behavior-evidence.md) to the runner's existing test,
fixture, report and retention fields once in this guide. Use the starter's
mapping table, linking native fields and validators rather than duplicating
reports or migrating their schemas. Confirm one retained run can be traced from
its requirement through its versioned scenario, setup and inputs to the
executed assertions and native case. Keep reusable definitions in source and
generated runs at unique evidence destinations, including failed runs.

Apply the quality checks selected by the project's accepted tool pack. The
tool-choice owner settles additions or deferred choices before adoption; this
verification pass does not select new tools or gates. New projects start selected
checks with empty baselines. Existing projects adopt them in the order
[repository adoption](../../orchestrate-work/references/repository-adoption.md)
gives; ci's [adoption](../../ci/references/adoption.md) owns the selected CI gates.

Where the existing guide already covers these facts, repair it at its owning
route rather than rewriting or moving it. Do not copy secrets, write to production or shared test state without the project's
authorization, or turn a missing disposable fixture into a production trial.

Start a small feature index at the project's chosen docs owner. Use the starter
feature-map and feature-page recipes if useful. Index about 3–5 important
journeys when they exist; a smaller product needs fewer. Each entry identifies
the user entrypoint, prerequisite, accepted requirement, existing drive command
or interaction, observable result and known gap. Link the relevant code/tests.
The map helps an agent find and drive a feature; it does not replace the spec or
make observed behaviour correct by default. Split pages only when the index
becomes hard to use.

Prove the guide before calling setup complete: launch, doctor against the
**actual candidate**, drive one mapped journey, capture action and result,
clean up owned resources, then confirm evidence remains. Run the guide's own
evidence and cleanup steps word for word in that proof, so a step that silently
drops evidence shows up. Test-runner temp roots (pytest basetemp, Playwright
output) contain links: remove each link's own entry, never through it, before
copying or deleting the root. Record an unreachable prerequisite or failure precisely and repair the
route when possible. A copied
template or a run against another checkout remains draft guidance. Other mapped
journeys remain unverified until exercised.

If an operation is missing, first try the project's existing Playwright, HTTP,
CLI or supervisor route. Add one small project-owned helper only for a
demonstrated gap. Its help, exit code, machine-readable output where useful,
recovery error and dry-run behaviour should match what it really does. Exercise
the helper against a legitimate case and a failure case. Do not scaffold a
general control service or install every tool in the optional
`harness-docs/verification-toolkit.md` catalogue.

## Maintain the route

For an ordinary PR, inspect the affected journeys and commands; run the
relevant checks and live flow where the change can affect them. A focused pass
claims only its actual coverage. A periodic broader audit may inspect each map
entry from source and drive each reachable entry live; only that full source
and live coverage can support a whole-map clean verdict. One owner controls a
mutable app instance. Parallel read-only source inspection is fine, and
independent live instances may run concurrently only when they really isolate
ports, profiles and data.

A changed CI workflow updates the parity table in the same change, and a CI miss
repairs the rung that missed it; see [check ladder](check-ladder.md).
Check index links against files and recent user-facing changes. A changed route
may be guide drift, a helper gap or a product regression. Confirm the governing
requirement before changing the map: do not rewrite an accepted expectation to
match broken product behaviour. Repair project docs/helpers within their owner;
route product defects through the normal project work. Re-drive a changed helper
or corrected flow before claiming repair. Record covered, unreachable, failed
and untested entries separately, with candidate identity and raw evidence links.
Clean up each run's owned state, including failed iterations; keep evidence
while it has a review or recovery consumer and release bulky output under the
workspace retention route.

Do not schedule a full-app daily drive merely because this reference exists.
Measure the runtime and isolation of a useful scoped pass first. A scheduled
audit should be quiet on no change and explicit about partial coverage.
