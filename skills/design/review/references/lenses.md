# Lenses for visual review

Assess composition in the affected whole surface or artifact, then apply only
the state and interaction lenses the change reaches. Each asks for evidence,
not a new test suite.

## Composition against the task

Name what the viewer should understand or do, then inspect the whole composition
at the intended viewing size. For a page, inspect the first viewport and the
flow through later sections. For a figure, inspect its heading, nearby prose
and caption; for a slide or standalone artifact, inspect the complete output.

- **Hierarchy and reading order.** Identify what leads, what supports it and
  where the eye goes next. The strongest emphasis should serve the explanation
  or action, not an incidental label or oversized figure.
- **Typography.** Check the visual roles across the surface or series: size,
  weight, line height, measure and surrounding space. Repeated jobs should match;
  headings, prose and supporting detail should remain distinguishable where
  their jobs differ. Semantic heading levels describe content structure rather
  than serving as arbitrary styling hooks. Uniform text size alone proves no
  hierarchy, and consistency does not require it.
- **Proportions and density.** Compare figure scale, text measure and surrounding
  content. A diagram can fit its canvas yet dominate the page or make its labels
  too small at the displayed scale. Look for crowded detail and excessive empty
  regions that distort the explanation.
- **Grouping and whitespace.** Spacing, alignment and proximity should expose
  relationships and section boundaries. Whitespace supports emphasis and rhythm;
  check its distribution, not just whether gaps meet tokens.
- **Comparison and series.** Information meant to be compared should be readable
  together without squeezing or needless scrolling. Check shared roles, colour
  meanings and rhythm across members while allowing different explanations to
  use different layouts.

These questions apply to sparse requests as well as detailed briefs. At the
early checkpoint, assess the representative's coverage of dense and structurally
different content. At final review, inspect every member in its consuming context.

A finding cites the render, observed reading or comprehension cost, and the task
or authority it conflicts with. Explain the visible consequence instead of
requiring the user to have named the design principle. A justified hero metric,
progressive disclosure or another sound arrangement is not a defect. No
universal font scale, density score or figure-to-text ratio decides the result.

## Rendering and states

Does the surface render correctly in the states this change can put it in -
loading, empty, partial, stale, error, and the honest unknown? Check with real
content and real data shapes rather than the tidy happy path, and check the
longest and sparsest content the surface can receive.

## Layout, responsive behaviour and reflow

Check the project's own viewport baseline. Look for overflow, clipping, collapsed
or jumped layout, and text that reflows into an unreadable measure. Zoom and
large text settings are part of this lens, not a separate accessibility pass.

## Keyboard and focus

Reach every interactive element by keyboard, in a sensible order, with a visible
focus state, and confirm that focus is not trapped or lost when the change opens,
closes, replaces or reorders content. This is the lens a screenshot cannot cover.

## Accessibility

Names, roles and relationships for controls and regions; contrast; motion that
respects a reduced-motion preference; and structure that survives the change.
Where the project ships repeatable accessibility checks, run them and read the
result rather than reasoning about it from the diff.

## Interaction and feedback

Does the change confirm input, prevent double submission, and avoid leaving a
user in an unexplained state? Check the failure path and the interrupted path -
cancelled, retried, navigated away - not only the successful one.

## Visible performance

Judge what a user would notice: input latency, jank on scroll or drag, layout
shift, and content that arrives in a way that makes an earlier reading wrong.
Route deeper performance work to its own method rather than expanding this lens.

## Project design authority

Confirm the change uses the project's own tokens, primitives and production
components, and that any new value is proposed rather than smuggled in. Where the
project has a design router, that router decides which design methods apply; this
lens does not select them for it.

## What is not a design-review finding

Style preference that cites no task or project rule, a restyle the design
authority already permits, and a rendering concern on a surface the change
cannot reach are all not findings. A composition mismatch that cites the task
or the authority is a finding. Reviewing a change does not authorize
redesigning it.
