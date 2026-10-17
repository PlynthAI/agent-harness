# Grouping and alignment

How spacing, shapes, shared edges and ordering communicate what belongs together and what matters most.

The markup and CSS below are illustrations from the method's source. The
project's own tokens, primitives and styling system replace them wherever they
conflict.

## Group with space, not lines

Three tools create grouping, in order of preference:

1. **Negative space**, the default. Related items sit close, unrelated ones far apart.
2. **Background shapes**, a card or filled container, where a group must read as one unit such as a selectable row or a draggable card.
3. **Separator lines**, a last resort for dense data where space costs too much, such as tables and long settings lists.

The structural rule is that the gap between groups is at least 2× the gap within one. At `8px` inside a group, groups need `16px`+ between them, or the eye can't tell where one ends.

```css
/* Good: spacing alone communicates the grouping */
.field-group { display: flex; flex-direction: column; gap: 8px; }
.form { display: flex; flex-direction: column; gap: 24px; }

/* Bad: uniform spacing plus lines to compensate */
.form > * { margin-bottom: 12px; border-bottom: 1px solid var(--separator); }
```

```html
<!-- Good: Tailwind -->
<div class="space-y-6">
  <div class="space-y-2">…field group…</div>
  <div class="space-y-2">…field group…</div>
</div>
```

Where a separator is genuinely needed, keep it quiet: hairline width, low contrast, never combined with a large gap that already did the job.

## Keep controls distinct from content

Interactive elements need a visual signal: a background, a border, an underline, or placement in a consistent control zone such as a toolbar or footer row. A control styled identically to static text is invisible.

```html
<!-- Bad: action looks exactly like the description text next to it -->
<p class="text-zinc-600">Your trial ends soon. Upgrade now</p>

<!-- Good: the action reads as an action -->
<p class="text-zinc-600">Your trial ends soon.</p>
<button class="font-medium text-blue-600">Upgrade now</button>
```

The inverse holds too. A non-clickable badge shaped exactly like the buttons beside it collects dead clicks.

## Align to shared edges

Pick a small set of alignment edges and put everything on them, because the eye tracks straight edges to scan content.

- Every stray edge reads as noise even when nobody can name it: an icon 2px off the text edge, a card padded unlike its neighbor.
- Use one project spacing step to express hierarchy. `16px` is a useful default where no scale exists, and deeper nesting repeats the same step.
- Numbers in tables align to the trailing edge, text to the leading edge. Tabular figures are the `design/app-ui` typography reference's.

```css
/* Good: one shared leading edge, one indent step */
.section { padding-inline: 24px; }
.section .child { margin-inline-start: 16px; }

/* Bad: three unrelated leading edges in one column */
.header { padding-inline-start: 20px; }
.list-item { padding-inline-start: 14px; }
.footer { padding-inline-start: 24px; }
```

### The grid comes first

Those edges come from a grid set before anything is placed: columns, gutters,
the leading edges text and controls start on, and the vertical rhythm, recorded
as tokens in the project's design authority. Text and controls start on a named
edge. A departure is named and deliberate: a full-bleed figure, an inset control,
an indented step. An edge that exists only because a row sized itself by its
content is not a departure; it is a defect.

The usual source is a row built as a flex row whose first item sets where the
second starts. A section header with a label then a title, beside a caption with
a label then a paragraph, puts the title wherever the label happens to end, a
different place for every label. A second reading edge that some blocks indent to
and others ignore produces the same drift across a page.

The default is one edge. Labels, headings, leads, captions, hints and prose all
start on the column's content edge, and a small label stacks a fixed gap above
the heading or copy it names, at every width:

```css
/* Good: one edge; every label stacks above what it labels */
:root { --label-stack: 8px; --term-gap: 14px; }
.section-head { display: grid; align-items: baseline;
  grid-template-columns: minmax(0, max-content) minmax(0, 1fr);
  gap: var(--label-stack) var(--term-gap); }  /* label row, then title and a rule filling its row */
.section-head > .label { grid-row: 1; grid-column: 1 / -1; }
figcaption { display: grid; gap: var(--label-stack); }
```

```css
/* Bad: the title starts wherever each label ends */
.section-head { display: flex; align-items: baseline; gap: 16px; }
/* Bad: the lead indents to a second edge the heading above it ignores */
.lead { margin-inline-start: 124px; }
```

Lists that pair a term with a value (contents rows, definition lists,
specification tables) keep a term track, and that track starts on the same
content edge; its width is a named token, so the value column is a named edge.
Indents that show structure, such as list markers, tree levels and panel
padding, are named departures, not a second reading edge. A project that
chooses a side-label column instead names it in its design authority and puts
every label of a heading, lead or caption in it at every width; never mix the
two. A term track is not a side-label column, so the never-mix rule leaves term
tracks alone.

### The edge audit

Run it in the rendered surface at each supported width, because a content-sized
row looks aligned in the code:

1. List every text block a reader scans: labels, headings, leads, captions, list
   and table entries, and the controls that sit among them.
2. For each, take `getBoundingClientRect().left` (the inline-start side in RTL)
   minus the leading content edge of its column (the column's left plus its
   border and padding). A panel with its own columns is a column of its own.
3. Group the offsets by value, rounded to a tenth of a pixel, and list each
   group with its count and selectors.
4. Compare the groups with the grid tokens. Every group is a named edge or a
   named departure; anything else is a finding, reported with the elements in it.

A one-off group, or several groups a few pixels apart, is the tell: they are
almost always titles placed by the label before them. Where the project runs a
headless browser in its build, make the audit a check that fails on a stray edge.

## Logical properties, not physical

Express direction-dependent horizontal position as leading/trailing so the layout mirrors automatically under `dir="rtl"`:

| Physical (avoid) | Logical (use) |
| --- | --- |
| `margin-left` | `margin-inline-start` |
| `padding-right` | `padding-inline-end` |
| `left: 0` | `inset-inline-start: 0` |
| `text-align: left` | `text-align: start` |
| `border-right` | `border-inline-end` |

```html
<!-- Good: Tailwind logical utilities -->
<div class="ms-4 pe-6 text-start">…</div>

<!-- Bad: breaks in RTL -->
<div class="ml-4 pr-6 text-left">…</div>
```

Reserve physical properties for things that refer to physical screen sides whatever the language, such as positioning against a device notch or matching a gesture direction.

Where arrangement encodes progression, as in star ratings, step indicators and progress bars, the sequence mirrors in RTL and stars fill from the trailing side. Flexbox and grid with logical properties mirror automatically; hand-positioned elements do not. Digit order inside numbers never reverses, which with other bidi rules belongs to the `design/app-ui` typography reference.

## Order by importance

Readers scan top-to-bottom and leading-to-trailing. Place content accordingly:

- The most important information sits near the top and the leading edge. The further down and trailing something sits, the less attention it gets.
- Give essential information room. Never bury the one number the user came for under rows of secondary detail. Push that into collapsed sections, tabs, or detail views.
- Within a row, identifying content leads and metadata and actions trail.

```html
<!-- Good: primary fact first, detail demoted -->
<div>
  <p class="text-2xl font-semibold">$4,320.00</p>
  <p class="text-sm text-zinc-500">Available balance</p>
</div>

<!-- Bad: the key fact is buried below the fold of the card -->
<div>
  <p class="text-sm">Account 4402 · Opened 2019 · Standard tier</p>
  <p class="text-sm">Last statement: June 30</p>
  <p class="text-sm">Balance: $4,320.00</p>
</div>
```

With logical properties, the same hierarchy mirrors correctly in RTL locales.

## Don't overload the entry point

The first screenful is a table of contents, not the whole book. If everything is prominent, nothing is:

- One primary action per view. `design/colour` owns how colour enforces it.
- Group secondary actions behind a menu once they exceed two or three.
- Prefer a short view that links deeper over a long view that shows everything at level one.
