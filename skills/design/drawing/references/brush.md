# Brush media

Use a brush runtime when pressure, wash, bleed, hatch, stipple, charcoal or paper
interaction describe the subject better than clean geometry. p5.brush is the
usual choice; Canvas 2D, SVG brush engines or another installed runtime can
serve too. Inspect the installed module and record its version - brush engines
change visually between releases.

## Make marks serve the image

- Establish composition, value structure, dominant gesture and negative space
  before surface texture.
- Separate structural marks, tonal washes, accents and paper interaction into
  controllable passes.
- Tie stroke direction and density to form, light, wind, movement or another
  meaningful field.
- Use brush choice, pressure, weight, bleed, grain, spacing and opacity to
  describe material or emphasis. Vary marks within a bounded family so the result
  feels authored rather than uniformly random.
- Control accumulation: many translucent marks turn to mud.
- Use geometry or SVG construction underneath when precision improves the
  foundation.
- Inspect at thumbnail, intended display and full resolution for overdraw and for
  texture that ignores form.

## p5.brush notes (standalone build, as of 2.2.2)

- Runs on a WebGL2 canvas without a p5 sketch, or alongside one. The origin is
  the canvas centre: translate by minus half the width and height for top-left
  coordinates.
- Call `seed()` and `noiseSeed()` for reproducibility, and `render()` after each
  static pass or animation frame.
- Families worth knowing: brush definition (`add`, `set`, `pick`, `stroke`,
  `strokeWeight`); strokes and shapes (`line`, `flowLine`, `beginStroke`,
  `spline`, `rect`, `circle`, `polygon`); tone (`fill`, `wash`, `fillBleed`,
  `fillTexture`, `hatch`, `mass`); flow fields (`field`, `addField`, `wiggle`,
  `noField`); state (`push`, `pop`, `translate`, `rotate`, `scale`); and
  clipping, multiple canvases and custom tips.
- A reliable static pass: create the canvas, scale the built-in brushes for the
  output size, seed, push and translate, configure brushes, fills, hatches,
  fields and shapes, pop, then render.

This list is navigation, not an allowlist; the whole installed module stays
available.
