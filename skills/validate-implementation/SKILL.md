---
name: validate-implementation
description: Select and record project checks for a change, or establish and maintain a project's runnable verification guide. Use after implementation, during project adoption, or when verification commands or feature guidance drift.
metadata:
  group: verify
  lead: true
---

# Validation

A method for choosing checks, not a list of commands. The project owns its tools,
its commands and its profile; this skill owns selection, honest recording and
reuse.

The aim is a change whose hosted CI passes on its first run, so select every CI
check the changed paths activate, run the ones that can run locally and name the
ones that cannot. A red CI on a change that passed local validation is a miss of
the local ladder, recorded so the selection is repaired rather than the symptom.

For a project that lacks a proved verification route, or whose route has drifted,
read [setup and maintenance](references/setup-and-maintenance.md). Ordinary change
validation uses the method below without that extra setup work. For a commit
hook, the push rung, a CI parity table or a CI miss, read
[check ladder](references/check-ladder.md). For the project's adopted lint,
layering, dead-code and suppression tools, with the baselines that only shrink,
read [quality kit](references/quality-kit.md).

Read the verification authority named by the repository's AGENTS.md first.
New projects use `docs/VERIFICATION.md`; an established testing guide keeps its
own route. Follow a project routing skill to that authority without creating
another guide or copying the shared method. Commands, selectors, runners and
native receipts stay with the project.

For app launch, Portless, server logs or process cleanup, use
[development runtime](references/development-runtime.md) with the project's
ordinary runtime guide. For code-graph impact evidence, use orchestrate-work's
[code intelligence](../orchestrate-work/references/code-intelligence.md); it helps
select affected checks but cannot establish that they passed.

The verify group's other skills carry the evidence a check ladder cannot. A
change whose acceptance depends on what a user sees or does proves its behaviour
in the correct running app through
[browser-verification](../browser-verification/SKILL.md). A delivery candidate
gets proportionate independent review through
[code-review](../code-review/SKILL.md), and when that slice touches a
user-visible surface the reviewer adds the rendering, interaction and
accessibility lens of [design/review](../design/review/METHOD.md).

## 1. Read the project's profile

The project names its profile in its own `AGENTS.md`, or keeps it at the path
that guidance names. Never assume a path and never write one from memory. A
profile may be existing guidance naming the project's runner and obligations,
not a new skill or a duplicate of the CI suite: see
[profiles.md](references/profiles.md) for the contract and the four shapes it
must be able to describe - backend, frontend/browser, docs or harness-only, and
a mixed change.

If the project has no profile, select from what the project's guidance and
package scripts actually declare, and say which checks you could not identify.
Tool names such as ESLint, Pyright, pytest or Playwright are the project's
values and examples, never this skill's commands.

## 2. Select for the change, then run

Select against the changed paths and the risk the change carries:

- A docs-only, prose-only or harness-only change does not run product tests.
- A mixed change keeps every product obligation the changed paths activate.
- Never run every installed tool by default. Select the checks that cover the
  change, and name the ones you deliberately left out.
- Prefer E2E evidence of the changed outcome, supplemented by relevant existing
  unit/integration checks. Use tdd when new behavior coverage is needed; do not
  add post-implementation unit tests or tests that mirror code. A regression test
  is warranted only for a real gap in existing behavior coverage.
- A required check that is unavailable is reported as unavailable. It is never
  silently dropped, and it is never recorded as passed.
- When the change's consumers are not obvious, use
  [blast radius](references/blast-radius.md) to find what else it could break
  before selecting.

Use the project's existing selector and runner when present. Read its supported
snapshot modes, risk triggers, escalation rules and selected obligations; do not
rebuild that registry in a shared profile or run a second selector over it.
If the runner and guidance disagree, investigate the requirement and behaviour:
either can be wrong. Correct a faulty checker rather than distorting valid code.

Distinguish selected local checks, required merge CI, scheduled qualification
and production proof. A selector's broader profile or database escalation
requires the next action its project defines; it does not by itself add a local
pre-merge gate. Preserve required gates and report unavailable qualification.

Repeated improvement of verification coverage, tooling, detection or reliability
uses [hillclimb](../hillclimb/SKILL.md): choose a priority gap, freeze the baseline
and numerical gate, preserve existing regressions and compare one bounded change.
That experiment supplements check selection; it does not replace required checks.

For projects choosing the shared helper, [select-checks.mjs](scripts/select-checks.mjs)
accepts the profile and changed-path list and prints selection as JSON. It is
optional; the project's own runner still executes commands.

The strongest proof is a script a reviewer can rerun, not a one-time look.
When verification fails, suspect the observation method before the system.

Verification machinery serves the outcome; it is not the work. Get the real
signal first: run the actual operation on a verified disposable target through
the project's existing wrappers before building proof around it, and reuse
evidence that still matches. That run proves the operation, not production,
which keeps database-workflow's protected route and readback. A machinery
failure after the real operation passed is recorded as a `fail` with its
established cause; by itself it does not show the change or data unsafe, so
repair it only as far as the outcome needs. Rerun a failed disposable run once
its cause is fixed; it is not a consumed allocation. A denied operation is
still never retried or routed around. A new proof step, gate, launch
environment or requalification of unaffected work needs a demonstrated risk the
existing checks miss; required checks still run. A requirement no supported
observation can establish goes to its owner as a decision; more local tests
cannot prove it.

## 3. Record one result for every reviewer

Keep the project's existing receipt as the authoritative record of that run,
linked from the task's artifacts or handoff. Every review execution reads the
same result; do not translate it into a second mandatory receipt or repeat
checks to populate a shared format. Record command, candidate/input identity, scope, environment,
outcome, skips and raw-output location. Missing evidence remains an explicit gap.
Allocate a durable, unique run destination before execution and print or link
it. Failure, cancellation and launch errors retain available receipts and raw
output after the runner exits and across later runs. Use the project's existing
evidence route; never let temporary-directory cleanup or a reused output path
erase the failure needed for diagnosis. Name the failure's cause and smallest
corrective action, including when execution remains unverified.
A retained test or browser receipt names the candidate it ran against (commit
plus working-tree state, and the server's launch identity where one exists) and
whether that candidate changed during the run; the mechanism is the project's.

For checks of behavior, use [behavior evidence](references/behavior-evidence.md)
to link the accepted requirement, versioned scenario and inputs to the executed
assertions in the native report. Map those facts to the project's existing
structures once in its verification guide. Lint, type and docs checks need their
ordinary command, identity, scope and outcome, without a behavior packet.

If no suitable record exists, [evidence.json](templates/evidence.json) and
[evidence.md](templates/evidence.md) are optional starting formats. The assessor
commands below apply only to users of those helper formats; a native receipt is
assessed by its own tooling or by inspecting the same evidence requirements.
The helper checks selection, status and reuse identity; it does not validate the
optional behavior fields or judge whether assertions prove the requirement.

`select-checks.mjs assess --record <file> --current <identity.json>` checks that
record against the selection, so a skipped, unavailable or cancelled required
check cannot be presented as a pass, and a record whose identity no longer
matches the current input cannot be presented as current.

The accountable independent reviewer and any selected specialist read the same
chosen record through their supported inputs. Reuse matching check results;
reviewer count and commit/push events do not require another run. The optional
review-evidence assessor in section 4 reports which selected reviews can be reused.

Record, for every selected check: the exact command, the candidate identity it
ran against, the environment or target, the result, the baseline comparison
where one applies, and where the raw output lives. Use the plain status
vocabulary - `pass`, `fail`, `skipped`, `unavailable`, `cancelled`, `not_run`.
Do not round a skip, a cancellation or an unavailable tool up to a pass. A
`fail` caused by the host rather than the change (browser binaries not
installed, a corrupted generated folder) records `cause: environment` and what
fixes it: it still counts as a failure, never as a pass or `not_run`, and it is
not reported as a product defect. A test that fails under load or on one run and
passes on another needs the cause established from the retained evidence. Use
code-review's [testing guidance](../code-review/references/testing.md) to
distinguish a product regression, an environment failure and a defective test,
then repair the owning cause.

Each [quality kit](references/quality-kit.md) tool the change activates is one
check in that record, so reviewers read its result instead of repeating lint
and type checking as review work. Its `baseline` names the baseline file and
the entries before and after, how many are new and how many went stale; a new
inline suppression or a grown baseline is something review should see. A kit
tool left out is named under deselected with its reason, and one that could not
run is `unavailable`, never absent.

## 4. Reuse evidence only while it is still true

Earlier evidence is reusable only while its identity still matches the current
input. Use the project's existing identity and freshness checks first; a bare
pass flag is not enough. The shared helper's record carries a five-field `identity` object, each field a non-empty
project-issued string: `project`, `contentIdentity`, `dependencyIdentity`,
`environment` and `scope`. The record's `candidate` is an audit reference, not
the reuse key.

The caller obtains the current identity independently from the current checkout
or runner and supplies it as `--current <snapshot.json>`; the assessor never
reads the old record's own `reuse` block as current truth. A missing or
incomplete current identity means freshness is unknown, and unknown cannot
qualify. The factory only validates and compares the values - it does not claim
that a JSON file is cryptographically trusted.

What each issuer obligation covers:

- `project` prevents cross-repository reuse.
- `contentIdentity` covers the actual input set: in-scope content including
  deletions and in-scope untracked files, plus the relevant callers and
  contracts and relevant fixtures/data inputs. For a review it also includes
  the comparison-base content within that scope and the
  scope mode, because an unchanged target tree can still carry a changed review
  diff. A base commit SHA alone is not a scoped content identity; unrelated
  base movement does not change the covered base blobs.
- `dependencyIdentity` covers the applicable configuration, rules, selector,
  toolchain and check-command identity.
- `environment` names a stable execution profile or target, not merely a machine
  nickname.
- `scope` describes the exact covered obligations; unknown or widened coverage
  cannot reuse.

Use the project's existing tree/blob or runner fingerprints where they exist. If
the project cannot establish a safe scoped identity, use its conservative
whole-content identity and say that narrower reuse is unavailable.

A bare new commit or push is not by itself a reason to rerun: metadata does not
enter the content identity. Compare relevant comparison-base blobs, dependencies,
fixtures, configuration, behavior and covered obligations independently against
the final integrated candidate before merge. Unrelated base movement leaves valid
evidence current. A changed relevant input or widened scope makes affected
evidence stale: rerun those checks/reviews, record which receipts were superseded
and retain unrelated coverage. A historical green CI is not final merge proof;
run the repository's required checks on the integrated candidate.

For projects choosing the optional helper, `select-checks.mjs assess-review
--current <identity.json> --validation <assessment.json> --review <record.json>`
assesses one selected independent review by default. Repeat `--review` for selected
specialist coverage and set `--required-reviews <positive integer>` only when the
project's policy requires additional reviews. Each supplied record is selected
coverage: a stale, incomplete, skipped, failed or blocked record cannot qualify,
and a missing required review stays a visible gap. Identical records do not count
as separate independent reviews. The existing `--slot01` ordinary and `--slot02`
native input names remain usable without requiring both. The output's `slots` and
`reusableSlots` identify supplied records, not compulsory engines.

The saved validation assessment is recompared against the current identity
rather than trusted because its own `ok` says so. An ordinary reviewer record names
the candidate, captured identity, completed result and explicit `blockers` triage.
The project's authentic review record or task assignment establishes who reviewed,
their independence and obtained coverage; this helper does not authenticate a JSON
file or grant hosted-review outage exceptions.

A normalized native record uses a binding envelope,
`{ recordPath, recordSha256, reviewedCandidate, identity, blockers }`. Its named
bytes are read once, hashed and parsed as the same bytes. `reviewedCandidate` must
equal the candidate the normalized record resolved and `candidate.match` must be
true; the envelope's captured identity is compared with the current inputs, and
explicit blocker triage is required. Missing triage is incomplete and unresolved
confirmed blockers block qualification. A bare normalized record stays diagnostic.
The helper does not run a reviewer or decide merge/publication authority.
A passing receipt is evidence about checks. It is not a review, a merge approval
or a production authorisation; those stay with the processes that own them.

## References

- [references/profiles.md](references/profiles.md) - the profile contract, the
  four change shapes, and what a project owns.
- [templates/evidence.md](templates/evidence.md) - an optional summary of the
  chosen evidence record.
- [references/behavior-evidence.md](references/behavior-evidence.md) - the
  shared contract linking accepted behavior to repeatable scenarios and native
  run evidence.
- [references/setup-and-maintenance.md](references/setup-and-maintenance.md) -
  project adoption and drift repair using ordinary docs and existing runners.
- [references/quality-kit.md](references/quality-kit.md) - the lint, layering,
  dead-code and suppression tools per language, with baselines that only shrink.
- [references/blast-radius.md](references/blast-radius.md) - what a change could
  break beyond the diff, and the one safety fact proved by running real code.
