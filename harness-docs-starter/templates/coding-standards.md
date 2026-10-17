# <Project> coding standards

Recipe guidance; delete it once the page is filled. The usual owner is the
repository's root `CODING_STANDARDS.md`, linked from `PROJECT.md`; reconcile an
existing standards guide in place rather than creating a competing file.

This template holds general principles and defaults; the shared procedures they
name stay with their skill owners. A repository adopts the principles into its
own `CODING_STANDARDS.md`, keeping the target's conventions, local reasons and
deliberate exceptions, and records the source: this template's path
(`harness-docs-starter/templates/coding-standards.md`) and the immutable
revision adopted
(`<harness-repository-url>/blob/<revision>/harness-docs-starter/templates/coding-standards.md`).
The repository owns the adopted rules. Reconcile a later template edit locally;
there is no requirement to track every upstream change or to block a PR on one.

`ARCHITECTURE.md` says where things live. This page says how code is written
inside those boundaries, in two parts:

- **Conventions**, written once from the target conventions during adoption or
  an audit (planner's `audit` reference), never by describing the code as it
  stands. Name the established convention the model already knows (the
  language's style guide, the framework's documented patterns), bind it to the
  real config, check and example module (paths backticked, as in the
  architecture recipe), and state each deliberate departure
  with its reason. Sort every mismatch by the three states in the
  [architecture recipe](architecture.md):
  an accidental departure becomes a `debt` issue, not a line here, unless it
  will catch the next change, when it earns one Known trap line.
- **Lessons**, a living list kept by the project's retrospective (the
  `harness` retrospective route), which adds, sharpens or removes entries as real
  corrections accumulate. No separate approval, hook or automation is needed
  for that project-owned write. An empty lessons section is fine; do not invent
  lessons to fill it.

Anything a tool can check belongs in the tool, and this page binds to its
config; prose carries only what a tool cannot express. Keep the page short:
link the contract, design authority or architecture decision instead of
restating it.

## Conventions

<Project> code follows <established style guide or convention>. <One line, only
where the repository narrows it.>

| Convention | Bound to |
|---|---|
| <rule family, by its established name> | <config file, check command or example module> |

- The convention would <X>; this repository <Y> because <Z>.
- Known trap: <accident that will catch the next change>; not the pattern;
  tracked in <issue>.

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

## <Short lesson tied to a real requirement>

<What to do, and the code or work to which it applies.>

- **Why:** <Reproduced failure, owned external contract or explicit project
  decision, with a source link.>
- **Valid alternatives:** <Sound implementations this rule still permits.>
- **Evidence/check:** <Existing check or short review example, if useful.>

Add a lesson only when it changes a future decision. A repeated pattern,
historical convention or test expectation is not by itself a requirement.
Prefer an existing linter, type checker or meaningful test for a demonstrated
mechanical mistake; correct an unwired or faulty check before writing a prose
rule. An uncertain judgement starts as review advice. Remove a lesson when its
reason no longer holds or it blocks legitimate alternatives.
