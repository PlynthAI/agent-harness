---
name: layout
description: Build and stress-test page, route and block layout - grouping, alignment, reading order, spacing, adaptivity, growth and RTL - in the project's tokens. Use for structural layout; components are design/components, and colour, type and motion belong to design/colour, design/app-ui and design/motion.
---

# Layout

Position, spacing and alignment carry hierarchy before a word is read. This
method builds that structure and then stress-tests it: resize it, translate it,
mirror it for RTL.

The project's design authority decides the values. Where it has a density,
spacing or breakpoint system, use that system as written rather than a
familiar-looking substitute; the numbers below are starting points for a surface
with no established scale. Deliberate platform chrome, compact professional tools
and existing tokens stay where they still pass the stress tests.

Hit areas, focus and target size belong to the project's accessibility method.
Radius and shadow detail belong to the `design/app-ui` polish reference, motion
to `design/motion`, and line length and text spacing to the `design/app-ui`
typography reference. This is the layout method,
not a design router for everything a site does: components are
`design/components`, charts are `design/data-visualization` and maps are `design/map-gis-interface`.

## Start from a grid

Before anything is placed, establish the surface's grid: its columns, gutters,
the leading edges text and controls start on, and its vertical rhythm. Record it
in the project's design authority as tokens, so every later element has an edge
to sit on. A block of text or a control starts on a named edge and nowhere else.
A departure, such as a full-bleed figure, an inset control or an indented step,
is deliberate, named and used for a reason, never the result of a component
sizing itself by its content. By default labels, headings, leads and captions
share one content edge, and each small label stacks a fixed gap above what it
labels, never a flex row sized by the label. Edge tokens and the audit are in
[grouping-and-alignment.md](references/grouping-and-alignment.md).

## Group with space, not lines

Space groups first, background shapes second, separator lines last and only where
space alone cannot carry the structure. The gap between groups must be at least
2× the gap within one (`8px` intra-group to `16px`+ inter-group), or the grouping
reads as noise. Alignment edges and importance ordering are in
[grouping-and-alignment.md](references/grouping-and-alignment.md).

## Keep controls distinct from content

Give every interactive element a background shape, a border, or a consistent
placement zone. A control styled like the static text beside it does not read as
a control. The reverse holds too: a non-clickable badge shaped like the buttons
beside it collects dead clicks.

## Align to shared edges

The edges are the grid's named edges; every stray edge reads as noise. An edge
that appears only because a row sized itself by its first item is stray, however
close it lands. Use one project spacing step per level of subordination, where
`16px` is a useful default.

Use logical properties for direction-dependent layout: `padding-inline-start`,
`margin-inline-end`. Reserve physical left and right for genuinely physical
geometry.

## Order by importance

The most important content sits near the top and the leading edge. Reading order
flows top-to-bottom, leading-to-trailing. Think in leading and trailing, not left
and right.

## Hint at hidden content

Progressive disclosure needs a visible affordance. Use the project's established
cue, or let the next item peek `16–32px` past the scroll edge, or show a
disclosure control. Content hidden with zero cue may as well not exist.

## Breathing room between targets

Without an established density system, start with `12px` between adjacent
bordered or filled controls and `24px` around borderless text- and icon-only
ones. Compact layouts may use less, as long as the project's hit areas do not
overlap and the controls stay distinct. Layout margins and breakpoint recipes are
in [spacing-and-adaptivity.md](references/spacing-and-adaptivity.md).

## Inset buttons from the edges

In content layouts, keep full-width buttons inside the layout margins with a
visible radius, starting near `16px` inline on mobile. Edge-to-edge actions work
when they follow established platform chrome, account for safe areas and stay
distinguishable from system UI.

## Content bleeds, controls float

Backgrounds and media extend to the viewport edges. Controls and text stay inside
the layout margins and safe areas (`env(safe-area-inset-*)`). Sticky chrome
floats above the content layer rather than blocking it.

## Hold structure until it breaks

Breakpoints come from the content, not device presets. Keep the expanded layout
as long as it genuinely fits and collapse late. Prefer container queries for
component-level adaptation, and test the smallest and largest sizes first.

## Plan for growth and clipping

Translated strings grow, and short ones grow proportionally more, so a one-word
button label is the riskiest thing on the screen. Put no fixed width or height on
a text container, and let rows wrap. Test with pseudo-localization and one
representative locale rather than budgeting a percentage.

Never park a critical action where resizing or scrolling clips it. Keep it in the
normal flow, or in stable chrome suited to the product.

## Before you finish

| Mistake | Fix |
| --- | --- |
| `margin-left` / `padding-right` in a localizable layout | `margin-inline-start` / `padding-inline-end` |
| Content-layout button touches the viewport edge | Inset within the project margins; keep intentional platform chrome |
| Breakpoints at 768/1024 because they're the defaults | Break where the content actually stops fitting |
| Fixed-width text container sized to one language | `max-width` and wrapping; test pseudo-localization |
| Primary action at the clip-prone bottom of a pane | Sticky positioning or stable chrome with safe-area padding |
| More leading edges in a column than the grid names | Rebuild the stray row on the grid; a content-sized row is the usual culprit |

Check the edges in the rendered surface, not the code: list the distinct leading
edges inside each column. Every one is a named edge or a named departure.

## Reporting

**Severity.** `HIGH` blocks content or an action at a supported viewport.
`MEDIUM` harms hierarchy, reading order, or adaptability. `LOW` is isolated
alignment or spacing polish.

**Verification.** Without a browser: logical properties in place of physical
ones, container and media queries against the supported viewport list and DOM
order against the intended reading order. With one: every supported width, 200%
zoom and the RTL mirror. Report every check you could not run as `Not verified`.

**Format.** Group findings under the principle each violates, ordered by
severity, one row per root cause listing every location it appears in:

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |

`Location` is `path/to/file:line`. `Why` names the principle and the user impact.

The verdict covers this layout pass, not the whole change: end with `Block` when
any `HIGH` remains and `Approve` otherwise, and leave the rest in the table as
work to do. The project's own review rules still decide whether the change is
accepted. Never `Approve` coverage you did not inspect. With nothing to report,
state "No actionable layout findings" and report verification.

## References

- [references/grouping-and-alignment.md](references/grouping-and-alignment.md) -
  grouping, the grid and shared edges with the edge audit, logical properties,
  ordering and the entry point.
- [references/spacing-and-adaptivity.md](references/spacing-and-adaptivity.md) -
  control clearance, edge insets, disclosure cues, bleed layers, breakpoints,
  growth and clipping.
- [Third-party notices](../../../THIRD_PARTY_NOTICES.md) - source pin and licence.
