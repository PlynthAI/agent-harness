# Starters

A starter is one finished look written as a complete `DESIGN.md` in the Google
DESIGN.md format: tokens in the front matter, the eight spec sections in the
body, and how its figures and page shell are drawn. A new project copies one in
as its own design authority. A starter seeds a project; it never parents one.

## Using a starter

1. Copy the starter's `DESIGN.md` to the new project's root as `DESIGN.md`.
2. From then on it is the project's own file. Rename it, retune it and record
   decisions there. Nothing flows back to this folder, and later changes here
   do not reach the copy.
3. Follow it exactly. The direction is chosen; use the
   [staged workflow](../references/workflow.md) to resolve only the choices the
   starter leaves open. An explicitly requested Impeccable command retains its
   own contract.
4. Lint the copy with the project's `designmd lint`, and add the project's
   profile to the design library once it has a surface to show.

## Local recipes

Asset needs says what a project must supply beyond code. Proven gives the date
a real surface was built from the starter and checked in a browser, or "not
yet".

| Starter | Look | Source | Date | Asset needs | Proven |
| --- | --- | --- | --- | --- | --- |
| [drawing-set](drawing-set/DESIGN.md) | An architectural drawing set: sheets with title blocks, keyed notes and one blue ink path, drawings redrawn tall for phones; light and dark | The harness explainer re-run of 2026-10-03 | 2026-10-03 | Drawn figures only | 2026-10-03 (`<scratch-root>\harness-difference-test\starters-work\drawing-set-proof`) |
| [parchment-dossier](parchment-dossier/DESIGN.md) | Warm parchment field report: one grotesk in two weights, tracked capital tags, 1px line schematics and one dark aubergine band per page; light, derived dark | Captured style reference of the Pravah website | 2026-10-03 | One licensed infrastructure photograph, dot-mapped by script (or a generated source image); schematics drawn in SVG | not yet |
| [sociotype](sociotype/DESIGN.md) | White specimen wall: huge display type as the subject, tiny tracked labels, square corners, hairlines and one full-bleed photograph as the only colour; light, derived dark | Captured style reference of the Sociotype type foundry website | 2026-10-03 | One atmospheric refracted-light photograph per hero slide (or generated); everything else is live type and code | not yet |

## Paper Blue

Paper Blue's maintained recipe and opt-in profile live in Design Library. Find
the registered `design-library` root through `docs-workspace`, then read its
`DESIGN_SYSTEM.md` and `starters/websites/paper-blue/DESIGN.md`. The starter's
Preview shows the current contract; its separately labelled legacy composition
retains declared gaps. `profiles/paper-blue/` supplies generated tokens and type
styles through the existing project copier's `--design paper-blue` route.

The previous harness copy is retired to avoid seeding a second, conflicting
version. Kitchen's own `site/DESIGN.md` owns its adaptation, and its maintained
website specimen is `/design-reference/`. Selecting Paper Blue never changes
another project's defaults. The approved Kitchen reference does not approve a
legacy library composition or replace the library's review route.

## Adding a starter

1. Capture the look from a real page into `<name>/DESIGN.md`, a lowercase
   folder name, with a `name:` in the front matter and a provenance line naming
   the source page and its date. A captured starter is a style abstraction:
   tokens, type, layout and component rules, with no brand name, imagery,
   product or copy. The brand is named once, in the provenance line.
2. Keep one file. The front matter is the one source of values: drop any
   `tokens.json`, `variables.css` or `theme.css` that came with a capture,
   since they export the same values. Give it light and dark; where the source
   has only light, derive a restrained dark set and say so in the prose.
3. Where the look depends on more than code, add two sections. "Fonts" names
   each original face first, then the closest face in the catalogue for its
   category from the design skill's [fonts.md](../references/fonts.md), and
   "to licence" with its foundry where the look depends on a paid original.
   "Imagery and assets" says what is drawn by code, what needs source
   photography and what would be generated.
4. Lint it with the design library's linter:
   `npx --prefix <design-library> designmd lint <path>`. It passes with no
   errors.
5. Add one row to the table above: the folder link, the look in a few words,
   the source, the capture date, the asset needs and "not yet" under Proven
   until a real surface has been built from it.
6. Run `checks/design-router.ps1`, which requires `name:` front matter and a
   row here for every starter.
