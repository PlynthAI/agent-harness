---
name: tdd
description: Test-driven development as a test-authoring method. Use when the user wants to build a feature or fix a bug test-first, mentions "red-green-refactor", or wants tests that pin changed behaviour without mirroring the implementation.
metadata:
  group: build
---

# Test-driven development

TDD is the red → green loop for authoring a test before new code or a fix. Apply
the project's current test standards during the loop. This method owns the
authoring sequence; the repository owns what useful coverage must protect.

This is a test-authoring method for any repository and stack. It names no
framework, runner or command: the repository's own testing conventions own the
specifics, and the shared skills named at the end own check selection and review.

When exploring the codebase, read `GLOSSARY.md` (if it exists) so test names and
interface vocabulary match the project's domain language, and respect ADRs in the
area you're touching.

## What a good test is

Before writing a test, name the required outcome and a realistic regression it
must catch. Use the current coding standards to judge the evidence, then choose
the public interface that exposes that outcome. Distinguish:

- A **behaviour test** states an outcome a caller can observe through the public
  interface and would fail if that outcome regressed. It is the target of every
  cycle.
- A **mirrored-internals test** restates the implementation: it spies on an
  internal collaborator or asserts a private call that is not a required
  interaction. Its dependency on internal structure can break on a harmless
  refactor while missing a defect in the caller's outcome.

See [tests.md](tests.md) for a worked pair of each, and [mocking.md](mocking.md)
for the boundary where a double is legitimate.

## Seams: where tests go

A **seam** is the public boundary you test at: the interface where you observe
behavior without reaching inside. Tests live at seams, never against internals.

Choose seams from the accepted task scope, the public interface, and the
repository's existing contracts. Identify the seams under test before writing
tests and proceed when the interface and scope are clear. Ask the user only when
the seam or interface is materially ambiguous; do not require a separate
confirmation for every inferred seam. Select scenarios from real callers and
consequential failures in the accepted scope. Complex features need realistic
interactions, not an exhaustive inventory of imagined inputs.

Read the project's test standards for the required level of proof. Use
[validate-implementation](../validate-implementation/SKILL.md) for check selection
and reproducible evidence.

Ask: "What's the public interface, and which seams should we test?" when that
question is needed to resolve material ambiguity.

When the shape of that interface is itself in question (how deep the module is,
where the seam belongs, what the interface should expose), consult the
[planner architecture reference](../planner/references/architecture.md).
Use it for the design decision; no separate planning session is required.

## Refusals

Each of these is tempting, and none of them belongs in the suite:

- **A test that merely repeats the implementation.** If the assertion can only
  fail when the implementation changes shape, it is not testing behaviour.
  Expected values come from an independent source of truth. For the same reason
  a reversible, low-impact change needs no test that mirrors the implementation:
  if you choose to verify that work with tests, they must still be meaningful and
  necessary.
- **An arbitrary coverage quota.** A percentage target, a per-file threshold or a
  "one test per function" rule buys volume, not meaning. Cover the changed
  behaviour and stop.
- **A test for a prose-only change.** Documentation, comments and other prose
  edits do not earn a new test. If the change is prose-only, say so and run the
  checks it actually needs.
- **Deleting an existing essential test to satisfy a simplification preference.**
  Assess removal or replacement through code-review's
  [testing reference](../code-review/references/testing.md); simplification alone
  does not settle what coverage remains required.

## Anti-patterns

- **Implementation-coupled**: does a harmless internal refactor break the test?
  Observe the required public outcome or contracted boundary interaction instead.
- **Tautological**: would the expected result share the defect in the production
  logic? Use [tests.md](tests.md) to distinguish a copied oracle from an
  independent reference or property. A calculation is not automatically a copy.
- **Unobservant**: would a plausible missing result or effect still pass? Assert
  the required outcome. Absence can itself be required, and a boundary call can
  be a contracted effect; prove the test detects a violation of that promise.
- **Horizontal slicing**: writing all tests first, then all implementation. Bulk
  tests verify _imagined_ behavior: you test the _shape_ of things rather than
  user-facing behavior, the tests go insensitive to real changes, and you commit
  to test structure before understanding the implementation. Work in **vertical
  slices** instead: one test → one implementation → repeat, each test a **tracer
  bullet** that responds to what the last cycle taught you.

## Rules of the loop

- **One slice at a time.** One seam, one test, one minimal implementation per
  cycle, each test a tracer bullet for the behaviour just agreed.
- **Red before green.** For new code or a fix, write and observe the failing test
  before implementation, then only enough code to pass it. Don't anticipate
  future tests or add speculative features.
- **Check existing coverage before adding a regression.** A bug needs a new
  failing regression only when existing behavior tests leave a real gap. Reuse
  an existing test that already catches the diagnosed cause.
- **When red-first proof is not available, record the exception.** A bug fix
  prefers a failing regression that reproduces the bug before the fix when
  coverage is missing. If that proof is infeasible, record why and perform the
  relevant permitted verification without claiming red-first evidence. Never
  write unit tests after writing the implementation or fix; an exception to
  red-first proof does not authorize post-implementation unit tests. A test that
  pins existing behaviour must fail against a credible planted regression before
  it is trusted, then pass after restoring the code. Choose a plausible defect
  in the required behavior, not a mutation that merely changes internal shape.
  This proves new coverage of existing code; it does not make a test written
  after a new implementation a red-first test. Mechanical changes do not require
  new tests merely to fill a checklist.
- **Run the checks the change needs.** Which checks a change requires is
  `validate-implementation`'s decision, not this skill's. Run them as that method
  directs, and broaden or repeat testing only when new changes, failures or
  unresolved concerns justify it.
- **Refactoring is not part of the loop.** It belongs to the review stage (see the
  `code-review` skill), not the red → green implementation cycle.

## The repository owns the specifics

Frontend and backend specifics - the test framework, the runner, fixture layout,
test naming, the browser harness, the assertion library, snapshot policy - come
from the repository's own testing conventions. Read the project's `AGENTS.md`,
current `CODING_STANDARDS.md` or named standards owner, test documentation and
relevant existing tests. Existing tests are evidence, not proof of the intended
contract. This skill states the method; the project states how it is spelled there.

Technology references are optional. When a language, framework or runner appears
in [tests.md](tests.md) or [mocking.md](mocking.md), it illustrates the point; it
is not a required stack. Translate it to the conventions in front of you.

## What this skill does not do

- It does not choose which checks a change needs. That is
  `validate-implementation`'s job: it selects from the project's own profile and
  records the evidence.
- It does not review the change. That is [code-review](../code-review/SKILL.md)'s
  job on the fixed candidate. For a failing test or a removal/replacement
  decision, use its [testing reference](../code-review/references/testing.md).
- It does not restate either procedure, and passing the red → green loop is not
  evidence that a change is validated or reviewed.

## References

- [tests.md](tests.md) - worked pairs: behaviour against mirrored internals, and a
  tautological assertion rewritten.
- [mocking.md](mocking.md) - where a double is legitimate, and how to shape a
  boundary so a test can replace it.


