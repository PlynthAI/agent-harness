---
type: adr
title: "ADR: <decision, as a short statement>"
description: "<What was decided and for which part of the system>. Read when <changing that part or reopening the choice>."
status: draft
area: ""
related: []
---
# ADR: <decision, as a short statement>

Date: <YYYY-MM-DD>

`status` carries the decision's state: `draft` while proposed, `stable` once
accepted (set by a person), `deprecated` when superseded. A superseded ADR names
its replacement in `related` and in the text.

Use this only for a consequential, durable decision. A routine change keeps its
rationale in the task's plan instead of growing an architecture document.

Detailed prose belongs in the workspace by default. If this project already keeps
ADRs in the repository - `docs/adr/NNNN-slug.md` beside its `GLOSSARY.md`, the
`domain-modeling` convention - follow that instead; the resolver reports it in
`trackedRoutes`. Use one place, not both.

## Context

<The forces that made this a decision: constraints, existing behaviour, what was
tried or rejected.>

## Decision

<What was decided, in one or two sentences.>

## Consequences

- Now easier: <...>
- Now harder or given up: <...>
- Needs revisiting if: <the condition that would reopen this>

One decision per record. If this reverses an earlier ADR, say so and name it.
