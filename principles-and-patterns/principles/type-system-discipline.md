---
type: "principle"
title: "Type system discipline"
description: "Apply when a diff designs or changes types or signatures in a typed language: make illegal states unrepresentable, brand semantic primitives, refuse casts and let the compiler check every variant."
applies_to: ["diff"]
status: "trial"
---
# Type system discipline

Make illegal states unrepresentable. Use the type checker to rule out
impossible states, mixed-up primitives and unhandled variants at compile time,
and define special cases out of existence rather than handling them. What a
compiler setting or linter enforces belongs in tool configuration; this page is
the judgement those tools cannot make. The language pattern pages show the
idioms.

**Why:** A case the types let you ignore becomes a runtime failure the
compiler could have stopped.

**The pattern:**

- **Variants are sum types,** not a bag of optional fields where contradictory
  combinations compile.
- **Build the type from the values you want:** a non-empty list is a head plus
  a rest, not a list with a length check.
- **Brand semantic primitives.** Two IDs that share a primitive should not be
  interchangeable; validate once at creation and trust the type after.
- **External data is untyped until parsed,** at the boundary (see boundary
  discipline).
- **Don't lie to the compiler.** A cast or assertion that bypasses it is a
  latent crash; prove the fact by narrowing or parsing instead.
- **Matches are exhaustive,** so a new variant fails compilation where it is
  unhandled.
- **Derive types from the schema that owns the shape** (OpenAPI, a migration,
  a protobuf) instead of hand-writing a parallel one.
- **Strengthen a type only where partiality appears:** a runtime assertion or
  "never happens" throw marks a type too weak for its use. Stop there.

**The tests:**

- "Can I write a comment explaining when this combination of fields is valid?"
  Then split it into a sum type.
- "Do two arguments share a primitive but mean different things?" Brand them.
- "Where did this cast or non-null assertion come from?" Parse at the boundary
  instead.
- "Will the compiler show where a new variant needs a case?"
- "Am I strengthening this type to keep an operation total, or only to be more
  precise?" If nothing would fail, keep the plain type.
