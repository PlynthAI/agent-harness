# Evidence of behavior

Use this contract when a check claims that an accepted behavior works. The
project's existing runner report is authoritative. Its tests, fixtures,
configuration and reports can carry these facts in their native structures;
link them rather than requiring a wrapper, a schema migration or a second
agent-authored report. Lint, type and docs checks keep their ordinary receipts.

## Connect the requirement to the run

A repeatable scenario is a versioned definition. A run is generated evidence
of executing that definition against identified inputs. Trace the accepted
requirement through the scenario, setup and fixtures to its executed assertions
and native report or test case. Map the applicable facts below once in the
repository's verification guide; values may be shared by cases in the same run.
In the optional JSON example, common execution facts come from the record and
check. The `behavior` extension links case-specific definitions and results;
native references supply material differences within a run.

| Fact | Evidence to find in the project |
|---|---|
| Requirement and scenario | Stable scenario ID, accepted behavior and its requirement or issue reference |
| Definition | Versioned test path and case, or repeatable scenario steps, with setup and fixture references |
| Inputs | Fixture/data identity or supported setup reference, plus material parameters such as seed, account role or request options |
| Execution | Exact command and working directory, selected cases or scope, candidate and relevant dirty content identity |
| Dependencies and environment | Relevant dependency/toolchain, configuration and execution target; reference the runner's captured values where available |
| Assertions | Expected observable result and the runner's outcome, linked to the native case or assertion that executed |
| Run receipt | Unique run ID or destination and a retained native report/test-case locator |
| Attachments | Relevant trace, render, interaction, response, log or independent readback that supports the claim |
| Limits | Missing, skipped, unavailable or unexercised coverage and what the run cannot establish |

The versioned case supplies the expected assertion; a native case pass may supply
its outcome. Record actual values only when the runner captured them. A passing
assertion does not require an invented response, measured value or screenshot.
If the report cannot show which case or assertions ran, state that evidence gap.
Use the existing statuses: `pass`, `fail`, `skipped`, `unavailable`, `cancelled`,
`not_run`. Keep the cause of a failure separate from its outcome.

## Include the context the behavior depends on

For a frontend check, identify the app URL and server/build candidate, browser
and viewport when they affect the claim. Preserve rendering and interaction
evidence for the changed behavior. A screenshot can show a render; the executed
interaction and assertion show that the action worked. Native traces, case
results and relevant renders can provide this evidence together.

For a backend check, identify the request or job, its response and relevant side
effects. Include database target and data/fixture identity when they can change
the result, using the project's database guidance. A pure calculation needs no
database context; a persistence claim needs independent readback of its effect.

Choose attachments for the claim and diagnosis. Every test does not need a
screenshot or a payload dump. Keep replay data safe through fixture references,
redacted material parameters and the supported credential/setup route. Retain
no raw credentials or unnecessary private data in commands, reports or
attachments. A safe reference must still let an authorized replay obtain the
required input; name what is unavailable rather than claiming full replay.

## Retain runs and assess what they prove

Allocate a unique retained destination before execution. Later runs keep their
own receipts instead of overwriting earlier failures. Retain available reports
and output for failure, cancellation and launch errors; cleanup releases the
run's owned resources while preserving its evidence. Use the project's existing
retention route and keep reusable definitions separate from generated runs.

Use existing runner validators for structural facts they can establish, such as
case IDs, selected scope, attachment existence and run identity. The optional
shared evidence helper checks selection, statuses and reuse identity; it does
not validate optional behavior fields. Semantic review decides whether the
inputs represent the requirement, the assertions prove its observable result
and legitimate alternatives remain supported. Review uses code-review's
[testing guidance](../../code-review/references/testing.md) for test quality and
failure diagnosis.

Reuse follows [the validation skill](../SKILL.md#4-reuse-evidence-only-while-it-is-still-true).
This contract adds context for interpreting a run; the project's existing
identity mechanism still decides whether that evidence is current.
