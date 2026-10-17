---
name: drawing
description: Direct, build, critique and refine programmatic drawings - illustration, diagrams, generative art, animated scenes - as editable SVG, p5.js or Three.js artifacts. Use when a drawing or illustration is the deliverable; charts are design/data-visualization and interface motion design/motion.
---

# Drawing

A drawing is directed before it is rendered. Decide what the image must make
visible, then choose the medium that shows it best, then keep everything needed
to change it later: the spec, the parameters, the recipe, the seed, the assets
and the evidence. A drawing that can only be regenerated from scratch is a
screenshot, not an artifact.

## Bind the project first

Read the project's own drawing guidance before any visual decision: its design
authority, the style it selects for this drawing and the renderer or drawing
tool it already uses, with that tool's capability registry. Resolve them from
the repository's agent guide and the files it already carries; never assume a
tool is installed or write its path from memory. A project with no drawing tool
of its own, or a drawing started outside any project, finds the host's tool in
the design library's `DESIGN_SYSTEM.md` under Tools, with the checkout, the
pinned tag and the command that starts a new drawing folder.

- The project's style owns palette, line weights, paper, accent meaning and any
  motion character. This method owns how to reason, build and review. A style
  that derives from a project's interface authority is read from that authority
  (or from the design library's generated profile of it), never re-typed.
- A drawing tool's installed capabilities are the working surface. Its helpers
  guide common operations; they are never an allowlist, and no medium reference
  here owns exclusive access to a tool.
- Palette and contrast questions go through `design/colour` on this surface as
  on any other.

## Direct the work

- Establish the intended visual result before choosing a renderer: the dominant
  read, the supporting hierarchy and, for motion, the temporal arc.
- Write a medium-neutral drawing spec first - canvas, seed, composition, style,
  subject, layers - and expose only the controls that materially change the
  image.
- Choose the primary medium, or a hybrid, as creative direction rather than as a
  permission boundary. Add a medium only when it contributes something the
  others cannot.
- Keep independent variants in separate artifact bundles and present valid
  variants together; the user's choice between them is evidence to keep.
- Prefer deterministic rerendering and parameter edits over regenerating the
  whole recipe.
- When the brief calls for motion, direct an ambitious layered sequence with a
  readable arc - context, search, select, constraint, transform, resolve - and
  also deliver a resolved static state and a reduced-motion path. The fallback keeps
  the finding; it does not set the default art direction.
- Keep evidence honest. Decorative or approximate geography never passes as
  fact: mark it illustrative in provenance and hide it from assistive technology
  when it adds nothing. A factual map inside a drawing layers base, theme,
  focus, then labels, so nothing covers a name or value; label the few values
  that matter directly and put the full set in an accessible table.
- Run untrusted recipes in an isolated surface with no application credentials,
  without stripping legitimate SVG, Canvas, WebGL, font, worker or image
  capabilities through source-word bans.
- Render and model time are telemetry. Never trade drawing quality for speed
  without an explicit request.

Read [the artifact workflow](references/artifact-workflow.md) when authoring or
repairing an artifact bundle, and before a preview enters any review set.

## Choose the medium

| The drawing needs | Medium | Reference |
| --- | --- | --- |
| crisp scaling, authored paths, type, masks, semantic layers, editable vectors | SVG | [SVG](references/svg.md) |
| a compact, dependency-free browser drawing, direct pixel control, projected scenes without an engine | Canvas 2D | [Canvas 2D](references/canvas.md) |
| expressive generative studies, sketches, interaction or shaders with a creative-coding runtime | p5.js | [p5.js](references/p5.md) |
| pressure, wash, bleed, hatch, charcoal, stipple or paper - marks that describe material | a brush runtime | [brush](references/brush.md) |
| real geometry, projection, depth, occlusion, lighting, camera choreography | Three.js | [Three.js](references/threejs.md) |
| several of the above, each with a distinct role | hybrid | [hybrid composition](references/hybrid.md) |

Architectural and structural teaching plates, including matched analytical and
expressive pairs, follow [structural diagrams](references/structural-diagrams.md)
on top of the media they use. Plotted architectural sheets and their films,
single-idea lecture figures with label anchors, and seeded axonometrics of a
building or a city, including motion after the drawing, follow
[architectural sheets](references/architectural-sheets.md).

## Series of diagrams

Use the project's approved reference figure to fix the series' font families,
text hierarchy, spacing and displayed scale. Keep those values and the meanings
of colours, shapes and line styles across figures. Within a figure, draw each
kind of thing one way wherever it appears (every step box with the same lines in
the same order, every skill in one type style, every agent role in one colour,
every tree child hung from its parent on the same connector),
and let no element contradict the legend. Route connectors so none cross where
another route avoids it. A caption adds only what the figure cannot show, in one
or two sentences; it never explains the marks. Put a visual legend of sample
marks beside plain labels when marks encode meaning. Compare figures side by
side at their intended rendered size, including viewBox scaling; a common CSS
font size alone does not prove equal displayed type. Vary the composition to
fit the question while keeping labels readable at that shared scale.

## Critique and refine

After each render or revision, run the [post-drawing design check](references/post-drawing.md)
before the result enters review. It checks the whole consuming page or output,
including surrounding type and content. Recognized edits and Drawing Tools MCP
completion events can emit it through the Codex hook. After successful shell
rendering, including the Drawing Tools CLI and other generators, and for
any inline revision the callback cannot recognize (including label-only edits),
or a runtime without that hook, invoke the same check:

```sh
node <design-skill>/drawing/scripts/post-drawing.mjs --complete
```

Resolve `<design-skill>` to the loaded design skill's directory. The command
prints the requirements; complete them and retain the evidence. Hook coverage,
installation and runtime proof are described in [the hook reference](references/post-drawing-hook.md).

A drawing is not done until its connectors are measured: run [svg-connectors.mjs](scripts/svg-connectors.mjs) for SVG and check its lines, junctions and arrowheads in the rendered result.

Judge the visible result at its intended size and at full resolution, never the
code length or the novelty of the tool. Name the dominant read before listing
defects, locate each defect in the image, and propose the smallest change with
the largest visible effect - a parameter first, focused recipe source only when
no parameter can express it. Rerender with the same brief, references,
dimensions and seed, and keep both the evidence and the chosen source. Critique
never promotes, overwrites or deletes an artifact. Read
[critique](references/critique.md) for the structured form and for blinded
comparisons.

Do not start an automated research or promotion loop unless the user asks for
one. Direct creation and visible refinement are the default.

## What this method does not own

Charts and data-shaped visuals are `design/data-visualization`. Interface
transitions and gestures are `design/motion`. Colour decisions are
`design/colour`. Modelled 3D scenes, materials and photoreal renders follow the
project's own 3D guidance; this method uses Three.js to draw, not to model.

## References

- [artifact workflow](references/artifact-workflow.md): bundle, spec,
  refinement, preview integrity.
- [critique](references/critique.md): structured and pairwise critique.
- One per medium: [SVG](references/svg.md), [Canvas](references/canvas.md),
  [p5](references/p5.md), [brush](references/brush.md),
  [Three.js](references/threejs.md), [hybrid](references/hybrid.md).
- [structural diagrams](references/structural-diagrams.md): teaching plates.
- [architectural sheets](references/architectural-sheets.md): sheets, lecture
  figures, axonometrics, motion, film and print.
- [Third-party notices](../../../THIRD_PARTY_NOTICES.md) - source and licence context.
