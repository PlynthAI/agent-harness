# Harness implementation and review standards

The shared principles are adopted from the harness coding-standards template
([`harness-docs-starter/templates/coding-standards.md`](harness-docs-starter/templates/coding-standards.md),
revision `d83624153862f71ad8856e664177654fd4623521`). The harness owns the
adopted rules and local exceptions below; a later template edit is reconciled
here rather than overwritten.

Architecture and intent live in [ARCHITECTURE.md](ARCHITECTURE.md). These entries
cover judgments that a generic linter cannot establish. Shared workflow details
remain in their skill owners; this is the harness project's own review input.

## One reusable procedure owner

Improve the existing shared method. Project requirements, commands and paths
belong in ordinary project guides reached through AGENTS.md and PROJECT.md.

Why: the operator rejected duplicated project review, TDD, planning and ticket
skills because shared changes then required maintenance in every repository.
Valid alternatives: a genuinely distinct domain procedure may retain its own
skill; different modes may use references under one shared entrypoint.
Evidence/check: inspect responsibility and consumers, not directory names alone.

## A rule must protect a demonstrated requirement

For a new restriction, identify the requirement, concrete failure or external
contract and legitimate alternatives it must permit. Prefer a working existing
check; review uncertain guidance as advice before enforcing it.

Why: automatic acceptance of a cloud review once broadened Git cleanup policy
to reject harmless dry-run inspection, contrary to the operator's stated goal.
Valid alternatives: a targeted executable guard is appropriate for a demonstrated
failure; an existing convention or repeated code can remain when it is suitable.
Evidence/check: review both the defect case and an important valid alternative.

## Separate source, installation and runtime evidence

Report which candidate was checked, what was copied and what actually ran.
Reviewing a source file does not prove installed discovery or a live app flow.

Why: the operator's factory depends on agents using working tools, not merely
finding copies of instructions. These states have different failure modes.
Valid alternatives: reuse unchanged evidence whose identity and scope still
match; small prose changes need no unrelated application build.
Evidence/check: source checks, scoped installed comparison and observed runtime
proof where the change requires it. State unavailable coverage honestly.

## Tests must provide independent evidence

Tautological tests considered harmful. Assert an observable contract against an
independent expectation. Do not use the production call under test as its own
oracle, copy its logic into the expectation, or only assert the test's setup.
Independent reference implementations, properties and boundary mocks are valid
when they can expose a real regression.

- Avoid tests that only detect that the implementation changed. A test that can
  fail only because internal shape moved, with no required behavior behind it,
  is not evidence; remove or replace it. A reviewed snapshot, golden file or
  reference render that protects required output is valid coverage: update it
  only from a deliberate, reviewed change to that output, never to silence a
  failing check.
- For bug fixes, add a regression test only when existing behavior tests leave a
  real gap; use `tdd` to write and observe it failing before the fix. `tdd` owns
  the specific red-first exceptions.
- Prefer E2E tests as the main proof of a changed outcome. Supplement them with
  focused unit or integration tests at public boundaries when those expose an
  important failure more directly; retain useful existing coverage.
- Use realistic interactions and consequential failure paths for complex features.
  Neither an arbitrary complexity level nor an exhaustive failure inventory is required.
- A replacement test must reliably protect the same required behavior and survive
  harmless refactoring. Remove a test without replacement only when its coverage
  is redundant, obsolete or meaningless.

Test authoring belongs to `tdd`; failure diagnosis and repair decisions belong to
`code-review`'s testing reference; reproducible evidence belongs to
`validate-implementation`. These standards do not duplicate those procedures.

## Improve the changed behavior without expanding the PR

Introduce no new violations of adopted standards. Fix confirmed defects in the
behavior the change promises and maintain the tests directly affected by it.
Where the repository keeps a baseline, remove the entries this change resolves.
Unrelated existing debt does not block the PR, except reachable security,
privacy or data-loss defects. No file-wide cleanup, test-count target or cleanup
quota is required. The project's own applicable checks decide what must pass.

## Comments

Keep comments short. Delete any claim from comments that is derivable from the code.
Keep rationale, external constraints and non-obvious tradeoffs that the code cannot
explain.
