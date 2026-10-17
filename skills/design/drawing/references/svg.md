# SVG

Keep SVG as the editable source; render PNG previews from it.

## Build the drawing

- Keep stable coordinates and a responsive `viewBox`; preserve it, dimensions,
  aspect ratio, seed and provenance with the source.
- Group construction, primary contours, secondary lines, fill, tone, texture,
  type and annotations by role; never flatten all paths.
- Use paths for contours, symbols for repeated structures and masks/clip paths
  for bounded texture; verify bounds at full resolution.
- Unify stroke weight, opacity, dash, cap and join in one hierarchy.
- Use patterns/filters sparingly; check target browser and raster output.
- Package/outline fonts only when licensing and editability permit.
- Link readable IDs to parameters for later controls.
- Three.js can supply construction geometry; brush output can supply texture.

Use generic element interfaces when helpers lack SVG elements. Validate XML.

## Connectors

Measure each connector's ends against visible edges or junctions within 2 px
in SVG coordinates, including rounded box edges. Tree spines start at the lead's
label baseline and end at the last branch; branches stop 6 px before each leaf's
first glyph. Horizontal trees place the spine below the lead with branches down
to leaves. Keep connectors clear of labels.

Put heads on the receiving end towards the target along the final tangent,
including curves. Check the first tangent for start heads; `auto-start-reverse`
reverses `marker-start`. Inspect both rendered ends for floating tree ticks and
heads turned 90 or 180 degrees.

Run the dependency-free [connector check](../scripts/svg-connectors.mjs):

```sh
node scripts/svg-connectors.mjs <drawing.html-or-svg>
```

It measures line, polyline and absolute/relative M/L/H/V/C/S/Q/Z paths in every
figure: endpoint distance, marker orientation, label crossings and connectors
crossing each other (mark an unavoidable one `data-crossing`). Exit 1 reports
`figure | element | endpoint | nearest element | distance`; `--json` adds counts.
Exit 2 is a usage/read error. Defaults are 2 px edge tolerance, 6 px label gap,
0.62 em monospace width and 0.5 em proportional width at the class font size.
Omit the file for options; adjust estimates only from measurements.

HTML lowercases element/attribute names in ASCII and keeps first duplicates;
quoted, unquoted and bare attributes work. SVG retains XML case and requires
quoted values; duplicates are malformed. Class/id and custom-property names
retain case. The reader handles comments, raw text and quotes; malformed markup
reports uncertainty in JSON.

Ancestry supports explicit nesting, HTML void elements and omitted sibling li
ends within the same ul/ol. Ordinary HTML ignores a non-void self-closing slash;
SVG/XML empty elements retain it. Other implicit closures, mismatched nesting,
table, select, template and HTML/SVG integration contexts require renderer
measurement.

Lengths require finite unitless/px values; unsupported units, invalid coordinates and
point lists report findings. CSS supports tag/class targets and an optional
SVG-root class scope. Outer/inner scopes and complex relevant selectors are
unmeasured; siblings stay inactive. Quotes are opaque before rule boundaries and
selector punctuation. Unknown selectors keep possible effects; benign sizing and
provably unrelated HTML rules stay inactive. Named fonts require measured px sizes
or renderer uncertainty. Later ordinary size/family overrides of important
values are unmeasured. Quoted families need a generic fallback or measurement.
No general cascade,
selector-value matching or external stylesheet is resolved.

Paint keywords ignore case/whitespace. Declarations share quote-aware comment
removal and split outside quotes, functions and brackets. Curly-block
custom-property values are unsupported and may be misread; verify them in the
renderer. Known fills are none,
transparent, three/six-digit hex, black and white. A var(--token) cover requires
opaque literals for every possible stylesheet, inline and inherited value. Other expressions,
tag fills, inline/inherited paint and shape/group opacity disable covers.
Transforms, masks, clips and CSS markers are unmeasured; potentially headed strokes
receive no decorative/icon exemption.

Only intervening opaque shapes covering the entire estimated label box hide
crossings; partial covers remain findings. Rounded-edge normals and nearest
nonzero endpoint tangents set arrow direction, including repeated polyline
vertices. A command after a closed path starts a new open part.

When estimates fail, set text `data-glyph-width` to renderer-measured
`getBBox().width`. Nonnegative finite values are required; empty/invalid values
are findings. It changes checked label boxes, never type. Refresh after label/font
changes and inspect glyph edges, including small side bearings at centred/end
anchors.

The sep, wall, bracket and sample classes mark separators, boundaries, brackets
and legend samples. Free ends are exempt but stay junction targets; marker-bearing
lines always get endpoint checks. Closed paths are shapes; strokes wholly inside
shapes no larger than 24 px are icon detail. Curves are sampled, text estimated.
Marker art is assumed to face positive X. A clean static result supplements
browser/export inspection of glyph bounds, layering and arrowheads.
