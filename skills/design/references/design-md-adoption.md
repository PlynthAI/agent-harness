# DESIGN.md adoption

Every project with a visual surface keeps one complete `DESIGN.md` at its
repository root in the Google DESIGN.md format
(https://github.com/google-labs-code/design.md, spec version `alpha`). It holds
the colour, type, spacing, shape and component tokens and the prose that
explains them. Pointers to the library profile, drawing theme, component index,
Figma or token files live in PROJECT.md's design row, never in the file. The
format has no inheritance: a shared library seeds a new file, it never parents
one.

Find the starting state, follow its route, then prove the result.

## 1. No DESIGN.md

Derive it from what the project already ships: CSS custom properties, the
Tailwind theme, token JSON and the components in use. Never invent a value to
fill a slot; a gap stays a gap and is named in the prose or under `omitted`.

- The shared `design/impeccable` skill (Impeccable 4.3.1) drafts the file from
  the running code through its `document` route.
- When that route does not fit, copy the harness template
  `harness-docs-starter/templates/design.md` and fill it by hand from the same
  sources.

A value whose approval is still pending, such as an entry in a token file
marked unapproved, is carried with that status stated in the prose beside it.
The owner approves the result before it is committed as the authority.

## 2. A DESIGN.md that is nested, a pointer or prose only

Move or rebuild it at the repository root in the format. The previous document
stays linked from the section it informs, a layout contract from Layout or a
brand book from Overview, and loses its claim to be the authority. Update every
AGENTS.md and PROJECT.md reference in the same change.

## 3. A root DESIGN.md already in the format

Normalise only:

- `version: alpha` in the front matter;
- one title, as an optional H1 before the first section;
- the eight H2 sections in order: Overview, Colors, Typography, Layout,
  Elevation & Depth, Shapes, Components, Do's and Don'ts;
- no top-level keys outside the spec: motion, shadows and breakpoints go to
  prose or the Impeccable sidecar (`.impeccable/design.json`);
- `omitted` for any token group the project has no need of.

An extra prose section, such as Motion, may stay; its values must not become a
front matter key.

## Proof

The same four results in every route, listed in the alignment PR:

1. `npx designmd lint DESIGN.md` reports no errors and no warnings (a dangling
   token reference is only a warning and still exits 0), and the repository's
   check script runs it.
2. The project's design library profile (`profiles/<project>/profile.json`,
   `inputs.designMd`) points at the root file, and `npm run profiles:check`
   passes in the design library.
3. Any Drawing Tools theme's `design` path points at the root file, and
   `drawing-tools check` passes.
4. In a fresh session, the `design` skill resolves the root file as the
   project's authority.

## When there is no visual surface

A repository without one, such as a CLI or a data pipeline, keeps no
`DESIGN.md`. Do not create an empty or `omitted`-only file for uniformity.
