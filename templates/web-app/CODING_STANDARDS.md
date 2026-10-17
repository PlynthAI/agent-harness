# __PROJECT_NAME__ coding standards

Adopted from the harness coding-standards template
(`harness-docs-starter/templates/coding-standards.md`), revision
`d83624153862f71ad8856e664177654fd4623521`; __PROJECT_NAME__ owns these rules
and their local exceptions. A later template edit is reconciled here, never
overwritten.

## Conventions

__PROJECT_NAME__ code follows the Next.js and React documentation's patterns, TypeScript in
strict mode, and the shadcn rules for composing its components. Tools enforce what they can.

| Convention                                        | Bound to                                                  |
| ------------------------------------------------- | --------------------------------------------------------- |
| Next.js core web vitals and React hooks rules     | `eslint.config.mjs` (`eslint-config-next`)                |
| Type-aware TypeScript rules (promises, `any` use) | `eslint.config.mjs` (typescript-eslint, `projectService`) |
| Strict types, unchecked index access              | `tsconfig.json`                                           |
| Formatting, LF line endings                       | `.prettierrc`, `.editorconfig`, `.gitattributes`          |
| Validate at the boundary with a shared zod schema | `lib/notes.ts`, `app/api/notes/route.ts`                  |
| Colour, type and focus only from design tokens    | `app/globals.css` (`--color-*: initial` removes raw hues) |
| Behaviour proved in a browser                     | `tests/e2e/notes.spec.ts`, run by `pnpm run test:e2e`     |

- shadcn would draw focus as a ring; this repository uses one focus indicator
  instead. A bordered control (a field, an outline button) turns its border Ink
  with its fill unchanged, and an unbordered control takes the tinted fill
  (`focus-visible:bg-focus-fill`). `DESIGN.md` allows no outline or ring outside
  forced-colours mode, which the generated CSS answers with a 2px CanvasText
  outline.
- An async event handler is passed as `(event) => void handler(event)`, and the handler itself
  catches and shows its own failure, so no rejected promise goes unhandled.

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

## Lessons

None yet. The project's retrospectives add lessons here when a real correction changes a future
decision.
