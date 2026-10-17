# <Project> architecture

Recipe guidance; delete it once the page is filled. The usual owner is the
repository's root `ARCHITECTURE.md`, linked from `PROJECT.md`; reconcile an
existing architecture guide in place rather than creating a competing file.

Write this page from the target conventions, never by describing the tree as it
stands: code written before those conventions would turn its old mistakes into
the convention. A short page of names, bindings and departures guides a model
far better than a long accurate inventory, so aim for about one screen and link
manifests, contracts and source at their owner instead of copying them.

- **Name** the pattern the model already knows: the framework's own layout,
  ports and adapters, a modular monolith. Prefer an established name over a
  coinage; coin a term only where none exists, and define it in one line.
- **Bind** each part of that pattern to the real thing: the folder, module or
  entry point that plays it, as a backticked path (a folder ending in `/`)
  that the quality kit's binding paths check can find.
- **State each departure** with the pattern it breaks and the reason. A
  departure stated flatly loses to the model's prior.

Sort every mismatch between the tree and the target into one of three states,
as the audit (planner's `audit` reference) does:

| What the audit finds | What the page says | What enforces it |
|---|---|---|
| Tree matches the target | A binding | A check that fails on a new violation |
| Tree departs on purpose | "The pattern would put X here; this repository keeps it in Y because Z" | The same check, with Y allowed by name |
| Tree departs by accident | Nothing; it is listed once as debt with its issue | The baseline, which only shrinks; suppression comments count toward it |

- Debt lives in one place per repository: one issue per rule and area, with a
  `debt` label. The page never lists debt.
- An accident that will catch the next change earns one line under Known
  traps, pointing at its issue and saying plainly that it is not the pattern.
- A case nothing settles is listed as unsettled in the audit's output and stays
  off the page until it is settled.

## Pattern

<Project> follows <established pattern name>. <One or two lines, only where the
repository narrows the general pattern.>

## Bindings

| Part of the pattern | Where it lives |
|---|---|
| <part, in the pattern's own words> | <path, module or entry point> |

## Departures

- The pattern would put <X> in <place>; this repository keeps it in <Y> because
  <Z>.

## Known traps

- <Accident that will catch the next change>: not the pattern; tracked in
  <issue>.

## Boundaries and choices

<What belongs to other repositories or services, and consequential tradeoffs the
departures do not already state, with existing ADR links. A small diagram only
when a flow is hard to say in a line.>

Written against <commit or date>. Delete any section with nothing to say.
