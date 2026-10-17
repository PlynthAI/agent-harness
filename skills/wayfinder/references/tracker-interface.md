# Tracker interface

The shapes Wayfinder relies on in the configured tracker. Names vary by
platform; the shape is what matters.

## The map issue

One issue carries the map: intent, scope, non-goals, acceptance criteria, the
destination, decisions so far, fog not yet specified, and what is out of
scope. It is the only map; there is no second board beside it.

## The decision ticket

A decision ticket asks one question precise enough for one focused session. It
states what should be true, not what to build. It is never an implementation
subtask and never a build ticket: an execution ticket carries what to build,
and the two are not interchangeable.

## Native relationships

- The map links to its children with the platform's native sub-issue
  relationship where one exists.
- A decision ticket expresses what gates it with the platform's native
  blocking link where one exists.
- The project keeps reading the high-level groups and views it already uses;
  the map does not replace them.
- On GitHub, to-tickets' [GitHub convention](../../to-tickets/references/github-convention.md)
  gives the parent, sub-issue and blocked-by routes with readback.

## Atomic claim

A ticket is claimed through the tracker's documented atomic mechanism, not by
assignment alone. Where the repository claims an issue by creating an issue
branch before assigning, the branch must exist first; only then is the issue
assigned. Where no atomic mechanism is documented, the frontier is rechecked
immediately before starting and the claim is recorded in the tracker.

## Link, not paste

A ticket links its related research, plan or finding at the path the workspace
resolves; it never pastes a whole execution plan into itself. A detailed local
plan linked from a ticket is context, not a second portfolio board.

## Human decisions

A human decision is recorded as what the person decided. Agreement is never
simulated: an unobjected option is not a decision, and a ticket closed without
a human answer says so.
