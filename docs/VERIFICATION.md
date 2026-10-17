# Harness verification

Shared `validate-implementation` selects the checks; this page holds the
harness source's commands. A source pass does not prove installed discovery or
live deployment.

## What this proves

That the harness source in this checkout passes its own checks: skill and role
wiring, references and links, scripts and their fixtures, and skill discovery
from the filesystem. Installed-copy and runtime acceptance need their own
evidence.

## Run

From the identified source checkout:

Before image-acquisition tests, install the helper's pinned decoder with
`npm ci --prefix skills/design/scripts --omit=dev --include=optional`.
Search, inspection and credit reading use Node's built-ins; acquisition requires
this skill-local dependency. The same setup is required after copying the skill
to an installed home, using that copy's absolute `skills/design/scripts` path.
Dependency installation and a source pass do not qualify the installed copy.

| Purpose | Command |
|---|---|
| Aggregate (over five minutes; run it in the background) | `pwsh -NoProfile -File checks/run-all.ps1` |
| One skill's check | `pwsh -NoProfile -File checks/<skill>.ps1` |
| Evidence and discovery fixtures | `node --test skills/validate-implementation/tests/select-checks.test.mjs skills/skills-list/tests/claude-skill-stubs.test.mjs` |
| Generated Claude stubs | `node skills/skills-list/scripts/claude-skill-stubs.mjs --check --root .` |
| Skill discovery | `node skills/skills-list/scripts/list-skills.mjs --cwd . --source filesystem --format json` |
| Post-drawing callback and completion command | `node --test checks/post-drawing.test.mjs` |
| Composition lookup and selected imagery with credits | `node --test skills/design/tests/compositions.test.mjs skills/design/tests/assets.test.mjs` |

The selector fixtures exercise valid, missing and stale evidence; the stub
fixtures use disposable roots for creation, orphan and collision behaviour.
Post-drawing fixtures cover callback selection, emitted requirements and command
launching. Fresh trusted Codex callback evidence remains a separate runtime check,
as described in [the hook reference](../skills/design/drawing/references/post-drawing-hook.md).
Do not edit harness files while `run-all.ps1` runs: `install-recovery`
compares the installed copy against the live source.

## Evidence

Retain results with their content, dependency and environment identity at the
registered artifact route. Fresh Codex and Claude discovery are separate
checks; filesystem results and source checks do not establish them.

## Behavior evidence mapping

For changed executable behavior, use validation's
[shared evidence contract](../skills/validate-implementation/references/behavior-evidence.md).
Prose-only changes use the relevant source/link checks without a behavior packet.

| Contract field | Harness source |
|---|---|
| Requirement and scenario | Accepted request and selected named test in the owning skill or `checks/` suite |
| Repeatable definition and inputs | Versioned test, fixture/setup and executable assertions; name the public command or interface exercised |
| Command and scope | Exact command from this guide and selected test cases; retained runner output |
| Candidate and environment | Source commit plus relevant working changes, runtime versions/configuration and fixtures; installed target identity separately when installation is exercised |
| Result and attachments | Existing PowerShell/Node/Python runner output and matching case/assertion; attach only useful failure output or public-interface observations |
| Limits and retention | Source, installed and fresh-consumer outcomes remain distinct; retain records at the existing task evidence route |

These source runners do not all emit a common receipt or capture candidate identity.
Retain the missing run facts with their existing output; do not create another
reporting framework or treat an agent's summary as execution evidence.

## Improving the checks

For a demonstrated gap, use `hillclimb` against the same frozen inputs with a
numeric gate and regression guardrails, repair the existing check owner and
record the decision and the next bounded experiment. Do not create another
selector or receipt format.
