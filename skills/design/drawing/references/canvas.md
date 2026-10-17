# Canvas 2D

Use native Canvas 2D when a compact, dependency-free browser drawing, direct
pixel control, fast compositing or a single-file handoff is valuable. The native
context is the real drawing surface; projection and mark-making helpers sit on
top of it and never restrict it.

## Build a drawing system

- Separate subject grammar, camera and projection, scene commands, mark-making,
  palette and presentation furniture, so each can be parameterised.
- Seed every source of variation and keep the seed.
- Cache expensive static layers and redraw only the interaction or animation
  layers.
- Keep preview and export as different quality profiles: a lighter preview is
  fine, but the export is rebuilt at the intended final pixel dimensions and
  never loses detail for speed.
- Keep a self-contained HTML export when a compact handoff matters, while the
  structured recipe and drawing spec remain the source.

## Projected scenes without an engine

A small 3D authoring model can feed a 2D renderer. Dense interactive projected
scenes - the public GenCity tool (https://re-presentation.jp/tool/gencity.html)
shows one - need no 3D engine. Treat such work as a technique reference only; do
not copy its code, text or identity.

1. Freeze canvas, output size, palette, seed and projection.
2. Author subject geometry in world coordinates, project it through an
   orthographic or axonometric camera and compute view depth.
3. Buffer opaque scene commands and draw back to front by view depth, never by
   authoring order.
4. Draw base fills with face-specific tone, then silhouettes and structural
   edges.
5. Add form-following hatch, stipple, wash, grain and controlled roughness:
   resample long paths, perturb intermediate points with a seeded generator, and
   use a strong first pass plus a lighter offset pass.
6. Add type, scale, annotation and margins only when they support the brief.
7. Keep interaction light - pointer steering, zoom, deterministic regeneration,
   PNG export.

Keep grammar parameters - system, massing, terrain, density, palette, detail,
seed - separate, renaming them for non-architectural subjects.

## Avoid

Projected boxes presented as finished illustration; random detail that ignores
form; one tone and one line weight for every face and edge; unseeded jitter;
flattening the only editable source into a PNG.
