---
okf_version: "0.2"
---
# Principles and patterns

Named principles and patterns that reviewing skills read: `plan` entries for
plan review, `diff` entries for diff review. Open an entry only when its
description applies; a pattern with a dependency applies only where the
project uses that package. Built from each entry's front matter by
the harness library's `scripts/library-index.mjs --write`; edit the entries, never
this page.

## Principles

- [Boundary discipline](principles/boundary-discipline.md) (plan, diff; trial): Apply when wiring validation, error handling or framework adapters: parse untrusted data into typed values where it enters the program, trust those types inside and keep business logic in pure functions.
- [Exhaust the design space](principles/exhaust-the-design-space.md) (plan): Apply when a novel UI interaction or architectural decision has no precedent in the codebase: build two or three competing prototypes and compare them side by side before committing.
- [Fix root causes](principles/fix-root-causes.md) (plan, diff): Apply when debugging or reviewing a fix: reproduce first, trace each symptom to its root cause and fix it there, and refuse guards that only silence the failure.
- [Foundational thinking](principles/foundational-thinking.md) (plan): Apply before writing logic: choose the core types and data structures, sequence scaffold before features and ask what concurrent actors share, so downstream code becomes obvious.
- [Model the domain](principles/model-the-domain.md) (plan, diff; trial): Apply when code grows branches, parallel booleans or repeated shape assumptions across files: encode the domain in one structure instead of scattered conditionals.
- [Outcome-oriented execution](principles/outcome-oriented-execution.md) (plan): Apply to a planned rewrite or migration with explicit phase boundaries: converge on the target architecture instead of keeping intermediate states smooth with throwaway compatibility code.
- [Redesign from first principles](principles/redesign-from-first-principles.md) (plan, diff): Apply when a new requirement meets an existing design: redesign as if the requirement had been a founding assumption from day one, instead of bolting it on.
- [Subtract before you add](principles/subtract-before-you-add.md) (plan, diff): Apply when sequencing an addition, refactor or rewrite: remove dead code, redundant guards and stubs first, prefer deletion and the smallest change, then build on the simpler base.
- [Type system discipline](principles/type-system-discipline.md) (diff; trial): Apply when a diff designs or changes types or signatures in a typed language: make illegal states unrepresentable, brand semantic primitives, refuse casts and let the compiler check every variant.

## Patterns

- [FastAPI](patterns/fastapi.md) (diff; dependency `fastapi`): Apply when a diff adds or changes FastAPI path operations, parameters, dependencies, routers, response types or the async and blocking work inside them.
- [Postgres patterns](patterns/postgres.md) (plan, diff): Apply when a plan or diff adds or changes SQL, migrations, schema files, indexes, RLS policies, database functions or the queries an application sends to Postgres.
- [Pydantic](patterns/pydantic.md) (diff; dependency `pydantic`): Apply when a diff adds or changes Pydantic models, fields, constraints, validators, discriminated unions or the parsing of external data with Pydantic.
- [Python patterns](patterns/python.md) (diff): Apply when a diff adds or changes Python type hints: Any and object, argument and return types, narrowing functions and exhaustive matches.
- [React composition](patterns/react-composition.md) (plan, diff; dependency `react`): Apply when a plan or diff adds or changes a React component's API: its props, variants, compound parts, context providers or shared state.
- [React performance](patterns/react-performance.md) (diff; dependency `next`, `react`): Apply when a diff changes React or Next.js code: data fetching, server components, server actions, route handlers, imports, client state, effects or rendering.
- [Supabase security checklist](patterns/supabase-security.md) (plan, diff; dependency `@supabase/supabase-js`, `@supabase/ssr`, `supabase`): Apply when a plan or diff touches Supabase auth, RLS policies, grants, views, database functions, storage policies, client creation or the environment variables that hold Supabase keys.
- [TypeScript patterns](patterns/typescript.md) (diff): Apply when a diff adds or changes TypeScript (.ts or .tsx): check state modelling, branded identifiers, narrowing, casts, exhaustiveness and parsing at the boundary.
