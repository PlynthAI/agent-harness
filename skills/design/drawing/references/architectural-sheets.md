# Architectural sheets, figures and drawn films

The method for drawing architecture the way a draughtsperson does: a sheet a pen
plots, a single-idea figure that sits in someone else's document, and a seeded
axonometric of a building or a piece of a city. Each can be a still, a film, a
loop or a print. The project's drawing tool does the rendering. Its own guide
names the commands, the configuration and the templates. This page covers the
choices those tools leave to you.

## House conventions

These hold for every genre below. A tool can lint the mechanical ones, but most
of them need judgement, so read the output.

- **No invented precision.** Draw no dimension, level or figure that the source
  doesn't give. A flood level, datum or finished floor level goes in words on a
  card or caption, not as a line across a section or elevation.
- **Plans use line weight, hatching and poché, not dot patterns.** Dots read as
  noise at film resolution and as decoration in print.
- **The title block and the close carry the identity.** Put no stamps, seals,
  roundels or badges on the sheet. A round window is architecture, not a badge.
- **Get the architecture right:**
  - Roof pitches, eaves and ridges agree between elevation and plan. A hip is
    drawn as a hip, and the roof overhead is dashed on the plan.
  - Poché appears only where the section plane cuts. The earth under a section
    is hatched too.
  - Doors swing, and stairs show their direction.
  - Every building stands on its ground: a ground line, a plinth or a site,
    never floating. Repeated bays change where the building does (an entrance,
    a corner, a crown), and hatching follows surfaces and light rather than
    decorating them.
  - An opening has depth: a frame, a narrower reveal, a thin contact shadow
    and a darker interior, never one flat fill. Every cast shadow on a sheet
    follows one light direction, and crosshatch is kept for the deepest cut.
- **The line hierarchy is fixed and small:** cut, then object, then detail,
  then construction and guides. It uses one accent, and named hatches tell
  materials apart (earth at 45°, glass as paired ticks). Tone never carries a
  material on its own.
- **Draw your own simplification, never a tracing.** Work from dimensions and
  descriptions. Prefer a composite of a building type to a specific building.
- **Real buildings need sources.** Draw one only from published dimensions,
  name the architect and year, attach a source to every factual claim, and
  credit a figure made after a published drawing ("after …").
- **No personal details:** no student numbers, client names or people's names on
  title blocks without permission.

## Genre: the plotted sheet film

A pen plots one sheet: a main view to scale with the ground at zero, a plan
below it (portrait) or beside it (landscape), and a title block. Then a beat,
then a notes card, then a close on the brand's mark.

- **The drawing order is the explanation:** ground, structure, envelope,
  openings, detail, hatch. A viewer should be able to follow the building's
  logic from the order alone.
- **Hidden lines:** each solid lays a paper-coloured mask of its silhouette,
  then its own lines. Leave more than a frame between a mask and the strokes it
  covers, because brush strokes flush at the end of a frame.
- **The notes card** carries the term, one or two lines on what the drawing
  shows, the era or supports in the accent colour, and muted notes. Every claim
  on it is sourced.
- **The close:** the sheet clears to paper, and the mark is drawn dimensioned on
  a ground line, then the tagline and address. When the logo opens the film
  instead, end on an end card.
- **Timing marks:** draw start, draw end, card in, card done, end and close.
  Name them, because stills, posters and edits cut on them. The poster is the
  finished sheet just after draw end, before the card.

## Genre: the lecture figure

One still that explains one idea, cut out of its paper as a transparent image,
with named label anchors. The host document sets the labels in its own type.

- **One idea.** The accent goes on the one thing the figure is about: a load
  path, a new element, a flow. Everything else is ink and grey.
- **Projection:** use plan-oblique 30/60 for measurable 3D (the plan stays true
  shape and verticals stay vertical), or a plain plan.
- **Labels are never drawn into the image.**
  - Put the anchor on the element itself, where a leader should touch it, not
    in empty space.
  - Keep anchor keys stable, because documents refer to them.
  - Check a preview with each anchor marked before handing off.
- **Draw for the cut-out.**
  - Alpha comes from the difference from the paper, so never draw in the paper
    colour, and avoid very pale greys, which fall below the threshold. Use the
    finest weight instead.
  - Never use flood fills, or fills that bleed past their outline.
  - For a dark slide, draw on a light paper theme and place the cut-out on the
    dark ground.

## Genre: the seeded axonometric

A building on its block, or a piece of a city, drawn in pencil in overlapping
waves: ground and water, then streets and kerbs, then buildings and structures,
then life (cars, people, trees).

- **World in metres.** Buildings stand on lot lines, footpaths and kerbs.
  Project at 30°, and fit the world box to the sheet for each format.
- **Seeded.** One integer seed and a small deterministic generator choose
  everything, so the same seed always draws the same place. An environment
  (city centre, terraces, harbour, suburb, coast, port) can be chosen by the
  seed or given.
- **Pieces in painter's order.** Each element carries its strokes, its screen
  bounds and its world box. Sort far to near with a topological sort of the
  pieces' overlaps, not a single depth key.
- **Waves, not a queue.** A piece waits only for earlier pieces it overlaps on
  screen, so distant parts draw at the same time. Fit the pen speed to a target
  duration.
- **The generator is project code.** Building types, street rules and local
  vernacular belong to the project and its style, not to this method.

## Motion after the drawing

A finished drawing can keep moving without redrawing its ink every frame:

1. Anything that moves (a car, a boat, a train, a crane, a door) is left out of
   the ink.
2. Before the clock starts, draw each kind of mover once into hidden sprite
   slots. Lift them into an image with the paper turned to transparency and the
   masks kept opaque.
3. Draw the movers on an overlay each frame, at a position that is a **pure
   function of time and the seed**: a route sampled by arc length, a timetable,
   or a loop off the sheet. Every frame can then be rendered on its own, in any
   order.
4. Keep the painter's order. Cut anything nearer than a mover out of its sprite,
   and cache the result per position.

## Films, stills and prints

- **Frame-exact clocks.** Render on a fixed clock at a fixed frame rate. Never
  use wall time, so every frame is reproducible and a single frame can be
  re-rendered.
- **Masters are silent.** Add sound in the publishing tool. Deliver 16:9, 9:16
  and 1:1 cuts, with a poster frame beside each film.
- **Review stills** go on the timing marks and at the end of each wave. Scrub
  the moving tail for movers that cross buildings.
- **Prints** render at a large output extent, and the line weights must hold at
  the printed size.
- **Copy travels with the asset:** alt text, and a caption whose claims carry
  their sources. A project may write its post copy in several voices. That copy
  is part of the deliverable, not an afterthought.

## Checklist

- [ ] The main view and plan agree: the same openings, and the roof overhead
      dashed on the plan.
- [ ] The accent is on one idea only.
- [ ] Anchors sit on their elements in the preview.
- [ ] Nothing is invented: every dimension and claim traces to a source, and
      every real building is credited.
- [ ] No mover crosses a building, and routes run on streets, rails and water.
- [ ] The tool's own check is clean, and the stills on each mark have been
      looked at.
