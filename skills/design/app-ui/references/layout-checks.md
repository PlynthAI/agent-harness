# Layout and detail checks

Concrete checks for a block or a surface. Apply them only after the project
authority and the owning production component are loaded; the project's tokens
win every conflict.

The concrete checks below are drawn from the `design/app-ui` polish and typography
references; their broader motion, image and generic-surface advice is deliberately
not copied here.

## Geometry

- Nested corners are concentric: inner radius = outer radius - inset, with a
  floor, and the same inset is used wherever the pattern repeats.
- Icons and glyphs are optically centred, not merely bound-centred.
- Borders, elevation and separators use the project's named surfaces. Do not add
  an ad hoc shadow, stack both as decoration, or frame a layout-only wrapper.
- Pointer and touch targets are at least about 44px in the smaller dimension. A
  visually smaller control may use a non-overlapping pseudo-element hit area.
- Press feedback is a small non-zero scale where the project's motion contract
  permits it, and it is never the only feedback.

## Typography

- Changing data values use tabular numerals.
- Long-form text keeps a readable measure, commonly 60-75 characters, narrowed
  further by the actual pane when it stays comfortable.
- If consequential text must truncate, the complete value is reachable through a
  visible or keyboard-operable disclosure. A label that identifies its own
  control never truncates; reflow the surrounding layout instead.
- Input text on small viewports is at least 16px, and user zoom is never disabled
  to avoid it.

## Transitions

- Name the properties that change. Never `transition: all` and never
  `will-change: all`.
- Animate `transform`, `opacity` and colour by default; reach for a layout
  property only where the project's authority allows it.
- Honour reduced motion: keep the state legible with an instant change or
  restrained opacity and colour.
