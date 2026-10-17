---
type: "pattern"
title: "TypeScript patterns"
description: "Apply when a diff adds or changes TypeScript (.ts or .tsx): check state modelling, branded identifiers, narrowing, casts, exhaustiveness and parsing at the boundary."
applies_to: ["diff"]
source: "https://github.com/cursor/plugins/tree/adf3218ca2f5b9971eedc07a76bef22df7701539/pstack/skills/typescript-best-practices/references/patterns.md"
reviewed: "2026-10-02"
---
# TypeScript patterns

Read this when a diff adds or changes TypeScript. Each rule names the tell to
look for in the diff; a finding cites the rule's heading. The rules are the
code-level form of the [type system discipline](../principles/type-system-discipline.md)
and [boundary discipline](../principles/boundary-discipline.md) principles. Style, formatting and anything the compiler or the
repository's lint already reports are left to those tools (see the last
section).

## Discriminated unions

**Tell:** a type with a boolean flag plus optional fields that only make sense
in some states.

Model variants with one literal discriminant, so contradictory states cannot
be written.

```ts
// Don't. Boolean + optionals lets contradictory states exist.
type DiffState = { loading: boolean; diff?: GitDiff; error?: string };

// Do. Only valid states exist.
type DiffState =
  | { kind: "loading" }
  | { kind: "ready"; diff: GitDiff }
  | { kind: "error"; error: string };
```

Use the discriminant name the codebase already uses (`kind`, `type` or `tag`).

## Branded types

**Tell:** two identifiers or units of the same primitive type that a caller
could swap without a compile error.

Brand the primitive and create it in one parse function at the boundary.
Downstream code trusts the type.

```ts
type AgentId = string & { readonly __brand: "AgentId" };

function parseAgentId(input: string): AgentId {
  if (!isUUID(input)) throw new Error(`Invalid agent id: ${input}`);
  return input as AgentId;
}
```

Match the `readonly __brand: "X"` shape, or the brand helper the repository
already has.

## Constructive modeling

**Tell:** an invariant held by a comment or by a runtime check every caller
repeats.

Build the type from parts that are all legal, so the bad value cannot be
constructed.

```ts
type NonEmpty<T> = [T, ...T[]];          // not T[] plus a length check
type Pairs<T> = [T, T][];                // even length
type TimeRange = { start: Date; durationMs: number }; // not start/end with "start <= end"
```

Where a plain `T[]` arrives, narrow it once with a guard
(`arr is NonEmpty<T>`), and let the fact travel in the type.

## Simplest total type

**Tell:** a non-null `!`, `arr[0] as T`, or a "should never happen" throw at a
use site.

Keep the loose type while every operation on it is total
(`xs.reduce((a, b) => a + b, 0)` is fine on `number[]`). Strengthen it only
where it forces a lie:

```ts
// Don't: partiality smuggled past the compiler
function newestSession(sessions: Session[]): Session {
  return sessions.at(0)!;
}

// Do: strengthen the input, or return Session | undefined
function newestSession(sessions: NonEmpty<Session>): Session {
  return sessions[0];
}
```

## Schemas before hand-rolled guards

**Tell:** a property-by-property guard, or a schema plus a separate interface
for the same shape.

Use the repository's runtime schema library and derive the type from the
schema, so validation and type cannot drift.

```ts
const UserSchema = z.object({ id: z.string().uuid(), role: z.enum(["admin", "member"]) });
type User = z.infer<typeof UserSchema>;
const parseUser = (input: unknown): User => UserSchema.parse(input);
```

Use `safeParse` when failure is an expected branch. A new schema dependency
for one guard is a finding, not a fix.

## No `as` casts

**Tell:** `as SomeType` on data the code has not validated.

A cast is a claim the compiler cannot check. It is acceptable only after
validation has earned it, as in a parse function. When a cast appears, name
the reason TypeScript could not infer and the fix that removes it:

| Reason | Fix |
|---|---|
| Missing discriminant | Add one; switch to a discriminated union |
| Overly wide source type, such as `Record<string, unknown>` | Narrow it |
| Untyped boundary | Add a parse function or schema |
| Genuinely inexpressible | A branded type or `satisfies` |

## `satisfies` over `as`

**Tell:** `as Config` on an object literal.

`satisfies` checks the value against the type without widening its literal
types; `as` silences the check.

```ts
const config = { theme: "dark", cols: 3 } satisfies Config; // theme stays "dark"
```

## Narrowing hierarchy

**Tell:** a type guard or cast where a simpler narrowing would do.

From best to last resort: a discriminant `switch` or `if`; the `in` operator;
`typeof` or `instanceof`; a user-defined type guard; an `as` cast after
validation.

## Type guards

**Tell:** an `x is T` function whose body checks less than `T` promises.

A guard must verify the whole claim. A lying guard is worse than `as`, because
the bug hides behind a name that says it is safe. Name guards `isX` or `hasX`,
and prefer discriminant narrowing when it is available.

## Exhaustiveness

**Tell:** a `switch` or `if` chain over a union or enum with no `never` check
in its default arm.

```ts
default: {
  const _exhaustive: never = s;
  return _exhaustive; // or `void _exhaustive;` in a statement switch
}
```

The compiler then fails when a variant is added. Where the repository enables
`@typescript-eslint/switch-exhaustiveness-check`, this rule is the tool's.

## Boundary validation

**Tell:** external data used without a parse, or re-validated deep inside the
code.

External data is `unknown` until parsed: RPC payloads, `JSON.parse`,
`response.json()`, `postMessage`, IPC, file contents, environment variables
and database results. Several of these return `any` implicitly, which no
default lint flags, so annotate them `unknown` and parse once, into a named
domain type, where the data crosses in. Inside, trust the type.

- Wire formats: parse so unknown fields are ignored, so a forward-compatible
  change does not break old clients.
- Persisted JSON: a versioned blob, with the parse inside a `try`.
- No re-validation deep in call chains.

## Schema-derived types

**Tell:** a new interface that restates a shape a `.proto`, OpenAPI spec,
GraphQL schema, database migration or existing type already defines.

Derive it instead, with `Pick`, `Omit`, `Parameters`, `ReturnType`, `Awaited`
or `typeof` over the generated or existing type.

## Object arguments

**Tell:** a function with several positional arguments of the same type.

Pass one object so the call is order-independent and self-documenting:
`openFile({ uri, selection })`, not `openFile(uri, start, end)`. Skip on hot
paths (per-frame render, tokenizers, parsers), where the allocation matters.

## Left to tools

These are not review work when the repository's checks ran (the validation
receipt says which did). Raise one only when its tool did not run.

| Concern | Tool |
|---|---|
| Explicit `any` | `@typescript-eslint/no-explicit-any`, in `typescript-eslint` recommended and Next.js's `next/typescript` |
| Type errors, implicit `any` parameters, null safety | `tsc` with `strict` |
| Exhaustive `switch` | `@typescript-eslint/switch-exhaustiveness-check`, where enabled |
| Unused code, formatting, import order | The repository's lint and formatter |
