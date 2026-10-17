# __PROJECT_NAME__ coding standards

Adopted from the harness coding-standards template
(`harness-docs-starter/templates/coding-standards.md`), revision
`d83624153862f71ad8856e664177654fd4623521`; __PROJECT_NAME__ owns these rules
and their local exceptions. A later template edit is reconciled here, never
overwritten.

## Conventions

__PROJECT_NAME__ code follows Astro's and React's documented patterns, TypeScript strict mode and
typescript-eslint's recommended type-checked rules. Tools enforce what they can; this page binds
to them.

| Convention                                   | Bound to                                                         |
| -------------------------------------------- | ---------------------------------------------------------------- |
| TypeScript strict, Astro templates checked   | `tsconfig.json` (`astro/tsconfigs/strict`), `pnpm run typecheck` |
| Lint, type-aware for TypeScript; Astro rules | `eslint.config.js`, `pnpm run lint`                              |
| React hook rules in islands                  | `eslint-plugin-react-hooks` in `eslint.config.js`                |
| Formatting, Tailwind class order             | `.prettierrc`, `pnpm run format:check`                           |
| Design tokens only, no raw colours           | `src/styles/global.css` resets Tailwind's palette; `DESIGN.md`   |
| Article front matter                         | `src/lib/article-schema.ts`; the build fails on a bad entry      |
| Behaviour proof                              | `tests/e2e/site.spec.ts`; pure logic in `tests/unit/`            |

- Keep logic that a test can call without a browser in `src/lib/`, and keep components thin.
- shadcn components are this project's source: change them in `src/components/ui/` to fit
  `DESIGN.md` rather than overriding their colours from outside.
- The `@typescript-eslint/no-floating-promises` rule allows `node:test`'s `describe` and `it`,
  and `no-misused-promises` allows async handlers in JSX attributes, because both runners handle
  those promises themselves.

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

None yet. The project's retrospective adds a lesson only when a real correction would change a
future decision.
