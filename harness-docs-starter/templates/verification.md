# <Project> verification

New projects keep this guide at `docs/VERIFICATION.md`, linked from AGENTS.md
section 06. Existing repositories update the verification authority named by
their AGENTS.md instead of gaining a twin or moving a working route. Fill commands from the actual project; remove sections that add
nothing. A copied template is a draft until one journey has run end to end.

## What this proves

<User-facing surface and the accepted requirement or issue it checks. Link the
authority and the feature map. Name boundaries this local route cannot prove.>

## Run and identify the candidate

| Fact | Verified value or command |
|---|---|
| Checkout and content/build identity | <path, commit plus relevant dirty files or build ID> |
| Launch | <working directory, command, prerequisites> |
| Readiness / doctor | <read-only check proving this is the intended process and candidate> |
| URL, endpoint or CLI | <actual observed address or invocation> |
| Environment and isolated resources | <local/test target, port, process, profile, data directory> |
| Test auth and seed | <supported disposable route and owner; never credentials> |

If an identity disagrees with the candidate, correct the route before claiming
proof. A reachable port or passing build alone is insufficient.

## Drive and observe

<Existing browser, HTTP, CLI, app or test runner and exact project command. Pick
the driver for the claim. Name the user/public entrypoint, action, observable
result and relevant independent side effect. Link raw output, trace, screenshot,
response or readback in the task workspace. A screenshot alone does not prove an
interaction.>

## Map behavior evidence to the runner

<Map the shared contract in validate-implementation's
`references/behavior-evidence.md` once for this repository. Keep existing runner
reports authoritative; link native test, fixture and report fields. Remove
inapplicable rows. This is a map, not a required per-run report or schema.>

| Applicable fact | Existing definition or native run field | How it is checked |
|---|---|---|
| Stable scenario ID and accepted behavior/requirement | <case metadata and requirement link> | <semantic review of the promise> |
| Versioned test/case, setup and fixtures | <test path/case, setup route and fixture references> | <existing runner validator or source review> |
| Material inputs and data identity | <fixture/setup reference and safe parameters> | <replay route; never raw credentials> |
| Exact command/cwd and selected scope | <runner invocation and selected-case fields> | <existing runner receipt/validator> |
| Candidate, relevant dirty content and dependencies/config/environment | <captured run identity and target fields> | <existing identity checks; whether the candidate changed during the run> |
| Expected observable assertions and outcomes | <versioned assertions and executed native cases> | <runner outcome plus semantic review; actual values only if captured> |
| Unique retained run and native receipt locator | <run ID/destination and report/case route> | <retention/readback, including failed runs after cleanup> |
| Relevant context and attachments | <app URL/server/browser/viewport or request/job/response/side-effect/data fields; trace/render/readback routes> | <checks for the behavior claimed; attach only useful evidence> |
| Status and limits | <pass, fail, skipped, unavailable, cancelled, not_run; coverage limits> | <existing status checks and review of remaining gaps> |

<Use existing validators for structural facts they support. Semantic review
judges whether assertions prove the requirement and preserve legitimate
alternatives. Reusable scenario definitions stay versioned; generated runs use
unique retained destinations. Lint, type and docs checks need their ordinary
receipts, without this behavior detail.>

## Cleanup and reuse

<How to stop only the process started by this run and release its disposable
auth/data/ports, including after failure. Confirm retained evidence survives
cleanup. State which candidate, dependencies, environment and scope must still
match before prior evidence is reused. Do not delete another run's resources.>

## CI parity

One row per hosted CI job. Before a push, run the local command for every row
whose trigger paths the branch touches and validation has not already run, or
name its hosted-only reason. Local commands are lint, types and unit tests
only; build, smoke and browser jobs reuse validation's evidence or run in CI,
never as a local CI mirror. Update this table in the same change as any
workflow edit.

| CI job | Trigger paths | Local command | Hosted-only reason |
|---|---|---|---|
| <workflow: job> | <path filters, or all> | <exact command and working directory, or none> | <empty, or why it does not run at push: build or browser job, trusted base, secret, hosted service> |

## Initial qualification

<Dated run: candidate identity; mapped journey; launch/doctor/action/result;
evidence links; cleanup result; failures and untested journeys. Only mark this
route proven after the complete run succeeds.>
