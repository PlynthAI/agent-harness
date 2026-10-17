# Check evidence - <task or change id>

This is an optional summary for projects choosing `evidence.json`; every review
reads that chosen record. A native runner report can satisfy the same
[behavior evidence contract](../references/behavior-evidence.md). Use the
project's authoritative receipt and link its facts rather than filling a second
report merely to fit this template.

Candidate: `<commit, range or tree identity>`
Profile: `<project profile path or name>`
Profiles activated: `<docs | backend | frontend | mixed | ...>`
Raw output: `<artifacts path>`

## Identity

The optional shared helper uses these five identity fields. The record's
identity is what the checks ran against; the current identity is obtained
separately from the current checkout or runner and supplied to the assessor.
Evidence is reusable only while all five match.

| Field | This run | Notes |
|---|---|---|
| Project | `<project or repository>` | prevents cross-repository reuse |
| Content | `<in-scope content, deletions, untracked files, callers, contracts and fixtures; for review, also scoped comparison-base content and scope mode>` | the actual input set |
| Dependency | `<configuration, rules, selector, toolchain and check commands>` | what the run depended on |
| Environment | `<stable execution profile or target>` | not a machine nickname |
| Scope | `<the exact obligations covered>` | unknown or widened coverage cannot reuse |

## Selection

| Check | Command and cwd | Required | Status | Notes |
|---|---|---|---|---|
| `<id>` | `<exact command and working directory>` | yes | `<pass|fail|skipped|unavailable|cancelled|not_run>` | `<baseline comparison, skip reason, or link to native output>` |
| `<quality kit tool>` | `<exact command>` | yes | `<status>` | `<baseline file: before -> after, new, stale>` |

Deselected on purpose: `<checks or profiles that were considered and left out,
and why>`
Unmapped changed paths: `<paths that no profile covered, or none>`

## Behavior, when selected

Link the native run to its versioned scenario, setup/fixtures and material
parameters using the repository's mapping. Record the expected observable
assertion and native case outcome; include actual values only when captured.
Relevant app/server/browser/viewport or request/job/data context and attachments
follow the claim. Lint, type and docs checks need no behavior packet. The shared
helper does not validate the optional `behavior` fields.

The JSON example inherits the record's candidate and five-field identity, the
check's command/cwd/status and the unique retained native run at `rawOutput`.
Use native case references for any material differences within that run rather
than repeating common run facts in each scenario.

| Scenario and accepted requirement | Definition and safe inputs | Assertion and outcome | Retained native run/case |
|---|---|---|---|
| `<stable id, accepted behavior and requirement reference>` | `<versioned test/case, setup, fixture/data identity and material parameters>` | `<expected observable assertion; runner status>` | `<unique run destination, native report/case and relevant attachments>` |

Limits: `<what this selected behavior evidence cannot establish, or none>`

## Reuse

Reused from: `<earlier evidence path, or none>`
Still valid because: `<the record's identity and the current identity agree on
project, content, dependency, environment and scope - a bare new commit is not
by itself a reason to rerun>`
Superseded: `<earlier receipts whose identity no longer matches the current
input, or none>`

The saved validation assessment and every selected review are compared with an
independently captured current identity before reuse. One independent review is
the default; selected specialist coverage remains required. Authentic project
records establish reviewer identity, independence and coverage. Native review uses
a binding envelope naming the record bytes' SHA-256, resolved candidate, captured
identity and explicit blockers triage; a bare normalized record stays diagnostic.
Commit/push metadata and unrelated base movement do not expire matching evidence.
Recheck affected inputs and the final integrated candidate before merge.
## Outcome

Qualification: `<qualified for the selected scope | not qualified>`
Blocking checks: `<failed or required-but-unavailable checks, or none>`
Next required action: `<the broader check, review or delivery step still needed>`
