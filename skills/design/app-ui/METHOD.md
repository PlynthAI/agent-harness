---
name: app-ui
description: Compose or refine page, route or block hierarchy - spacing, type, responsiveness - under project design authority. For structure and hierarchy; components are design/components, charts design/data-visualization, maps design/map-gis-interface, chat design/ai-chat-interface, motion design/motion.
---

# UI design

Structure before surface. This method decides what a screen is made of and how it
is arranged. The project's design authority decides every value: colour, type,
spacing, radii, framing and density. A shared method explains how to reason; it
never imports another project's palette, density or card grammar.

## Bind the authority first

- Read the repository root and nearest `AGENTS.md`, then the project's design
  authority and one representative production block.
- Resolve the endpoint from project guidance rather than assuming a path. A
  missing endpoint is a finding to report, not a file to invent.
- If the project has no authority, say so plainly and draft a small one from the
  brief and the existing code, marking proposed values as proposed.
- Where this method and the project disagree, the project wins, and the
  disagreement is recorded where the project keeps decisions.

## Work in one coordinate system

- Set the gutters before the content. Every element edge lands on a measured
  gutter; labels share one starting line; trailing counts and controls share a
  stable column.
- Hierarchy comes from spacing, type scale and grouping before it comes from
  chrome. Reach for a frame only when it carries meaning.
- Count the framed surfaces between the container boundary and the data, and let
  the project set that budget. Do not double-frame a header, and do not
  double-frame adjacent separators.
- Keep nested geometry concentric: inner radius = outer radius - inset, with a
  floor. Use the same inset wherever the pattern repeats.
- Prefer optical alignment over mathematical bounds: centre icons by eye, and
  correct the icon with a small local offset rather than moving a measured
  gutter.

## Density, content and states

- Density is a project decision. Read the project's baseline before adding a
  compact variant, then keep the same coordinate system across both.
- Every figure is attributable: it states what it means, what it is compared
  with, where it came from and how trustworthy it is as the project's own
  evidence contract defines those fields, or the surface links to the owner that
  states them. Render a value once per view; a later reference links to its
  owner.
- Missing, partial, stale, suppressed and unavailable data is stated, never
  smoothed over or padded. Never invent data, counts, progress or capability to
  fill a layout.
- Implement the states the contract exposes - typically ready, loading, empty,
  error, stale, partial and unavailable - and keep them honest under a slow or
  failed source.
- Size a block from its measured container or an aspect-ratio contract, never a
  fixed rendered pixel height.

## Check it in the real surface

- Use the project's baseline widths and continue to the narrowest supported one.
- Treat internal scrolling as a budget the project sets, not a convenience.
- Verify long and sparse content, keyboard focus order, zoom and reflow, and
  reduced motion.
- Run the project's proportional checks. Do not copy another project's quality
  command, and do not claim rendered evidence that was not collected.

## References

- [references/layout-checks.md](references/layout-checks.md) - concrete geometry,
  typography, hit-area and transition checks.
- [references/typography.md](references/typography.md) - hierarchy, one role per
  job, font loading, line height, measure, wrapping, floors, truncation and text
  behaviour.
- [references/polish.md](references/polish.md) - surfaces, radii, optical
  alignment, icons, press feedback and interaction detail.

A colour question is the `design/colour` method's own business on every surface:
load it only when colour is actually the question, and read only the reference it
needs.

Structural detail beyond this method - grouping, shared edges, clearance between
targets, breakpoints and translation growth - is `design/layout`. Load it when the
layout itself is the work, and keep this method's hierarchy and coordinate-system
rules in front of it.

## Upstream

The typography and polish references adapt jakubkrehel/skills at commit
`267330e1adfc66a718fb65fa6918c1f06d0a689e`, and the typography reference also
draws on the fundamentals method in bergside/typeui at commit
`2a977f1f6616ae8a5ea84a478ca35601c67f4322`. Both MIT notices are in the
shared [third-party notices](../../../THIRD_PARTY_NOTICES.md).
