# Sketch first

Design before implementing. Sketch types, function signatures, class shapes,
and module boundaries with `not implemented` bodies and pseudocode. Design it at
least twice, choose, then fill in code against the chosen sketch. If
implementation proves the sketch wrong, throw it out and redesign.

This is pstack's architect method with planner doing the sketching. Use it for
"architect this", "design this", or non-trivial work where jumping to code
would lock in the wrong shape. A change whose shape the codebase already
dictates does not need it.

## Start

Track the five phases where the work is tracked: one checklist item per phase
in the saved plan when there is one, otherwise in the conversation.

1. Ground
2. Sketch
3. Agree
4. Implement
5. Scrap

## Phase A: Ground the problem

Build a real mental model of every system the new code touches. Run the
[how](../../understand/how/METHOD.md) method over the relevant subsystems.

Naming a file isn't grounding. Produce the traced model `how` prescribes. If the
design redefines ownership or layering, also run the
[why](../../understand/why/METHOD.md) method on the existing shape so the
rationale becomes a constraint, not a guess.
Both are read-only assignments through
[orchestrate-work](../../orchestrate-work/SKILL.md); they return the model, you
keep the design.

Skip Phase A only when the work is genuinely greenfield with no surrounding
system to integrate.

## Phase B: Sketch

Design it twice. Produce at least two structurally distinct candidates before
choosing, even when the first looks sufficient. This is
[exhaust the design space](../../../principles-and-patterns/index.md) made
concrete. Whole-shape alternatives, not point fixes inside one shape, and not a
second flavor of the first.

Write each candidate as a design package: type sketch, function signatures,
module map, and the rationale shaped per the design sketch sections of
[writing a plan](writing-plans.md). Apply the sketch discipline below to each.
Write the second candidate without looking back at the first until both exist;
convergence on a safe-looking middle defeats the exploration.

Screen every candidate against [design red flags](design-red-flags.md) before
choosing. Reject or revise shallow modules, information leakage, temporal
decomposition, and pass-through methods.

Compare viable candidates on interface depth. Prefer the design that hides more
complexity behind a smaller, simpler public surface. A rich interface can keep
call chains short by concentrating capability instead of scattering it across
layers.

Choose one candidate as the base and graft what the others did better. The
choice, what was adapted from each other candidate, and what was rejected and
why populate the rationale's "Synthesis decision" section.

### The sketch discipline

- Caller's usage first. Write the README-style usage and two or three real call
  sites before the types, then derive the type sketch from them. The usage is
  the spec. The two must agree, so reconcile the sketch to the usage, not the
  reverse.
- Data structures first. Get the core types right and the code becomes obvious
  ([foundational thinking](../../../principles-and-patterns/index.md)). Trace each
  dominant access pattern through the proposed structure. If the answer is
  "we'll add a map / index / cache later," the structure is wrong.
- Interface depth. Compare the capability hidden behind the public surface
  relative to the size of that surface. Prefer a simple interface that pulls
  complexity into the callee, even when the implementation becomes less simple.
  Do not put transport or wire types on the public API. Parse into domain types
  behind the interface.
- Shared state: if two actors might both write, ask "what happens?" If the
  answer isn't "nothing," default to per-actor state with a merge at the read
  boundary.
- Make boundaries visible. `not implemented` errors for bodies, `// TODO`
  pseudocode for tricky logic, doc comments stating intent and invariants. A
  reader should trace data from input to output by reading types and signatures
  alone.
- Encode invariants in types: hard-to-misuse types > runtime checks > prose
  comments.
- Validate at boundaries, trust types inside. Business logic as pure functions.
  The shell stays thin.
- Single source of truth per invariant. Derive instead of sync.
- Idempotent state transitions where applicable. Ask what happens if the
  operation runs twice or crashes halfway.
- Short call chains. If tracing the flow needs more than three files, flatten
  the hierarchy.

## Phase C: Agree (opt-in)

Default: proceed directly to implementation with the chosen design. No human
checkpoint.

Opt in to a checkpoint when the invoker explicitly asks: "with checkpoint,"
"stop and show me before implementing," or similar. Then surface the chosen
design and pause for sign-off.

The sketch can ship as its own commit either way, as the "scaffold first" mode
of [foundational thinking](../../../principles-and-patterns/index.md). Planned and
scoped breakage during fill-in is fine, per
[outcome-oriented execution](../../../principles-and-patterns/index.md). When
the chosen sketch goes into a saved plan that gets a [plan review](plan-review.md),
that review is its independent check before implementing; do not add a second one. A sketch
kept in the conversation gets none unless the invoker asks for adversarial
pressure on it; then hand it to a `reviewer` through
[orchestrate-work](../../orchestrate-work/SKILL.md) with the rationale and the
grounding.

If the human pushes back on the shape (in a checkpoint or after the fact), treat
that as Phase A evidence. Re-ground and re-run Phase B before writing more code.

## Phase D: Implement against the sketch

Replace `not implemented` bodies with code, pseudocode with logic. The chosen
sketch is the contract. The work runs through
[implement-spec](../../implement-spec/SKILL.md) under the authorization the request
already carries; the plan hands the sketch over and names the next step.

Deviations from the sketch are signal worth surfacing, not friction to absorb
silently. If a function needs a parameter the sketch didn't anticipate, ask
whether the sketch was wrong, the requirement was missed, or the implementation
is overreaching.

## Phase E: Scrap when the architecture is wrong

If implementation keeps producing friction the sketch can't absorb, throw the
sketch out. Don't bolt fixes onto a wrong design, per
[redesign from first principles](../../../principles-and-patterns/index.md)
and [fix root causes](../../../principles-and-patterns/index.md).

The signal is a *pattern*, not single instances. Tells:

- The same shape of workaround appearing repeatedly across unrelated code.
- Multiple unrelated edge cases that all need special-case branches.
- Types that need escape hatches (`any`, casts, optional fields always set in
  practice) to compile.
- The "we need a lock" reflex when the sketch said the state wasn't shared.
- Callers having to know the abstraction's internal rules to use it.
- Two or more independent Phase D deviations of the same shape across the
  implementation.

Use judgment. A few edge cases don't condemn an architecture. Some problems are
legitimately complex. Complexity in the data is not complexity in the design.

When you scrap:

1. Re-run the [how](../../understand/how/METHOD.md) method over what's been built.
2. Redesign as if the new constraints had been day-one assumptions, per
   [redesign from first principles](../../../principles-and-patterns/index.md).
3. Subtract before adding, per
   [subtract before you add](../../../principles-and-patterns/index.md). The new
   sketch should be smaller than the old one before it grows.
4. Return to Phase B and design it twice again.

## Outputs

The caller's usage is written first and the type sketch derived from it. One
file with new types and signatures for small changes. Module map plus type
definitions for larger work. The rationale ships alongside, shaped per the
design sketch sections of [writing a plan](writing-plans.md), including the
usage sketch and the synthesis decision. When a saved plan exists, the sketch
sits under its Approach section with those headings as subsections.
