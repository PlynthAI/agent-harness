---
name: data-visualization
description: Select, build or review charts, visual tables, scorecards and analytical legends so the encoding stays honest and readable - evidence contract, scale, uncertainty, accessibility and review. Use for any data-shaped visual; not for decorative graphics.
---

# Data visualization

Make evidence easier to understand without making it look more certain than it
is.

The project's chart contract and design authority outrank this method. Where they
disagree, the project wins and the disagreement is recorded where the project
keeps decisions.

## Start from the question, not the form

Complete the evidence contract before choosing a chart:
[references/evidence-contract.md](references/evidence-contract.md). State the
question and the decision it supports, the primary comparison, and the data
relationship. Record the metric definition and denominator, units and format,
geography and reference population, period, vintage and cadence, source and trust
state, aggregation method, the missing and suppressed semantics, any estimate or
projection, and the baseline, target or prior period.

Do not continue while a decision-critical field is unknown. Surface the gap, or
route it to the contract that owns it, rather than guessing. Never design from
invented fields, and never replace a missing value with a plausible one. If the
project has no approved chart family for the shape, report the gap and propose an
addition rather than inventing a one-off chart.

## Choose by data shape

- **Trend over time:** a line; use area only when magnitude or accumulation is
  meaningful, and keep observed and projected segments distinct.
- **Category comparison or ranking:** aligned bars or dots, sorted by value
  unless the categories have a natural order.
- **Distribution:** a histogram for ordered bins; a ranked list for named
  categories.
- **Part to whole with few parts, about five or fewer:** a segmented bar. Avoid
  pie and donut charts.
- **Current against a prior vintage or a target:** a delta bar with one reference
  tick, rather than grouped bars.
- **Different units on one time axis:** index both to a common base. Avoid dual
  axes.
- **Position against a policy or threshold:** a threshold, range-dot or
  segmented-band treatment. A gauge is not decoration.
- **Shared domain and axis:** one layered chart with toggles beats sibling charts.
  Treat sibling charts as a smell, and separate them only when units, scales or
  comparison tasks genuinely conflict.
- **Several comparable views:** small multiples on consistent scales.
- **Geographic pattern:** a map encoding plus a ranked or tabular alternative.
  Never let a choropleth imply precision or comparability the geography does not
  support.
- Never 3D, and never novelty over perceptual comparison.

The strongest channel is shared position, then aligned length. Angle, area and
colour come later.

## Keep the encoding honest

- Quantitative bars start at zero. A non-zero line baseline is allowed only when
  the visible range is decision-relevant and clearly disclosed.
- Keep scales consistent across a comparison, or label the difference plainly.
- Preserve denominators, units, geography, period, sample size, confidence and
  aggregation method wherever omitting one could change the interpretation.
- Show missing, suppressed, stale, estimated and partial data honestly.
- Correlation is association, not causation. A forecast is not an observation. A
  composite score is not a raw measurement.
- Colour encodes meaning, not decoration. Add a redundant channel - a direct
  label, marker, line style or pattern - so the reading survives without colour.
- Annotate only the values and events that change a decision. Do not label every
  mark.
- Size a chart from its measured container or an overridable aspect ratio. A
  minimum size is a legibility floor, never a fixed rendered height.
- Animate a transition only when it preserves object constancy or explains a
  change. Never animate from a misleading baseline, and never delay routine
  reading.

## Always ship a non-visual equivalent

- A concise semantic summary of the principal finding.
- The underlying values in a table or an equivalent accessible structure.
- Labelled axes, units, series, controls and state changes.
- Interaction that is optional for understanding the primary finding, and never
  hover-only.

## Reviewing an existing visualization

Default to review and brief unless the request was to change the chart; then
implement and verify. Check the guidance above against the rendered result, in the
states the contract exposes, at the project's widths, and with representative real
data. Reuse valid lint, type and test evidence, and say plainly which checks were
unavailable.

## Upstream

The reasoning here adapts the data-visualization skill from Anthropic's Knowledge
Work Plugins
(https://github.com/anthropics/knowledge-work-plugins/tree/main/data/skills/data-visualization),
Apache-2.0. Implementation guidance specific to Python plotting stacks,
standalone HTML and generic palettes is deliberately excluded: the project's own
chart contracts and components take precedence.
