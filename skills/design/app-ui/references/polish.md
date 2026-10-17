# UI polish

Adapted from the `better-ui` method in jakubkrehel/skills at commit
`267330e1adfc66a718fb65fa6918c1f06d0a689e` (MIT), whose notice is in the
shared [third-party notices](../../../../THIRD_PARTY_NOTICES.md). The values below
are the source's, not a range to approximate: a
neighbouring curve is a different curve and a neighbouring scale is a different
scale. The project's component library, tokens and density still win, and its
motion language is matched except where a rule here prescribes one interaction.

Polish is a pile of small details that compound. When reviewing, slow the
interface down: what looks wrong at a tenth of normal speed is what is subtly
wrong at full speed.

Text wrapping, font rendering and tabular numbers belong to
[typography.md](typography.md). Hit areas, focus and keyboard support belong to
the project's accessibility method. Grouping, section spacing, breakpoints and
spatial direction belong to `design/layout`. Motion behaviour belongs to
`design/motion`.

## Surfaces and geometry

- Nested radii stay concentric: outer radius equals inner radius plus the
  padding between them. Mismatched radii on nested elements is the most common
  single thing that makes an interface feel off.
- Where a border exists only to create depth, prefer a layered transparent
  shadow. Keep the borders that communicate structure or state: dividers,
  separators, selection and focus.
- Give an image a hairline outline at low opacity for consistent depth, and take
  it from the neutral the surface is built on - full black in light mode, full
  white in dark, each at low alpha. A near-neutral from the palette, or a tinted
  one, picks up whatever sits underneath and reads as dirt on the image edge.
- When geometric centring looks wrong, align optically and nudge the element,
  rather than moving a measured gutter. Icons beside text, play triangles and
  asymmetric glyphs all need it.

## Icons

- An icon carries the optical weight of the text beside it: a lighter stroke
  beside regular text and a heavier one beside semibold. One stroke weight per
  icon set and one icon library per surface.
- Icons take their hover, selected and disabled states from current colour and
  opacity rather than from separate assets. The outline variant is the default
  and the filled one marks the active state.
- Animate an icon change with opacity, scale and blur together rather than
  toggling visibility: a small scale range into place, fully transparent to
  fully opaque, and a short blur clearing to zero. Keep the blur small.
- Where the project already has a motion library, use that package and a spring
  with no bounce for this. Where it has none, keep both icons in the document,
  absolutely position one, and cross-fade them with the project's entering curve
  - that is enter and exit with no new dependency.

## Interaction detail

- Press feedback is a small scale, around `0.96`; lower reads as exaggerated.
  Where motion would distract, make it switchable off.
- Use CSS transitions for interactive state changes, because they can be
  interrupted mid-animation, and reserve fixed timelines for staged sequences
  that run once.
- For an infrequent staged entrance where sequence communicates hierarchy, break
  the content into semantic chunks and stagger them by roughly a tenth of a
  second. Leave high-frequency interactions unstaggered. Animating one container
  costs the same and communicates less.
- Exits are softer than enters: a small fixed translation rather than a full
  height, with the same entering curve in both directions.
- Name the exact properties that change. Never animate all properties.
- Give a high-frequency interaction instant feedback, or a very short opacity
  and colour transition. A custom animation there charges its attention cost on
  every trigger.
- Every animated state change also needs a static cue - colour, an icon or a
  label. Motion is never the only feedback channel.

## Load and theme switches

- Keep enter animations off the first render, and check that intentional page
  entrances survive.
- A theme flip changes colour, background, border and shadow on nearly every
  element at once, so every transition on those properties fires together and the
  switch smears instead of snapping. Suppress transitions for the swap, force a
  reflow, and restore them on the next frame.
- Reserve the compositor hint for the properties the compositor can actually
  handle, add it when first-frame stutter is real rather than in advance, and
  never apply it to everything.

## Reviewing polish

Without a browser, read every state the component defines - hover, focus,
active, loading and empty - plus the declared durations and curves. With one,
walk each state and replay the motion at a tenth of speed in the browser's own
animation inspector. Report every check you could not run as not verified.

Group findings under the principle each violates, highest severity first, one row
per root cause listing every location it appears in, with the location, the
before, the after and the principle the change restores. A blocking finding
breaks an interaction, makes motion unusable, or leaves a state change visible
only while the animation runs; a noticeable one is a visible inconsistency in
surfaces, icons or motion; the rest is polish. State plainly when there is
nothing to report, and never claim coverage that was not inspected.
