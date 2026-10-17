---
name: review
description: Independently review composition, hierarchy and rendered behaviour in interfaces, diagrams and visual artifacts. Use for representative design checkpoints and final visual review within the existing review process; not for non-visual code or prose-only edits.
---

# Design review

Judge whether the visible result serves the user's purpose at its intended
viewing size. A diff and passing checks cannot establish reading order,
proportion or visual balance. This lens supplies that judgment for interfaces,
diagrams and other visual artifacts, even when the request names no design
criteria.

The reviewer did not author the work. Use the existing independent review route,
with this lens covering the visual result. The design workflow's early checkpoint
reviews a representative composition before a new pattern is extended; final
review covers the complete result. Small established edits need only affected
coverage. No permanent role or duplicate whole-candidate review is added.

## Bind the project first

Before judging anything visual, read the repository root and nearest `AGENTS.md`,
the project's own review supplement where one exists, its design authority, and
the commands it uses for quality. Those own the token values, the component
ownership, the severity scale, the blocked states and the required checks.

The user's request and corrections govern the task; project authority supplies
values and conventions. References inform judgment without replacing either.
Surface material conflicts. Missing formal standards or supplied references do
not waive review: use the brief, existing work and intended viewing context.

## What the lens adds

Read [references/lenses.md](references/lenses.md). Start with the contextual
renders and original request before the builder's conclusions or validation
summary. Assess hierarchy, relative scale, measure, grouping, whitespace and
balance as a whole, then inspect relevant rendering, interaction and
accessibility details. A sparse brief still needs coherent composition.

Apply only the state and interaction lenses the work reaches. A static diagram
needs no keyboard test; a screenshot cannot prove keyboard behaviour. Sound
alternative compositions are allowed. Do not impose universal sizes or ratios.

Useful signs to investigate:

- **Stray edges.** Use `design/layout`'s grouping and alignment reference to
  distinguish unexplained offsets from deliberate grouping.
- **Flattened type roles.** Compare headings, prose, captions, controls and
  diagram labels by their reading jobs. Repeated roles need consistent treatment;
  different jobs need sufficient distinction. Colour alone cannot carry it.

## Same candidate, shared evidence

Read [references/evidence.md](references/evidence.md) for the review inputs and
report. Reuse matching evidence for the fixed candidate. Interfaces use
`browser-verification`; artifacts use their medium's rendering workflow.
Changes to relevant content, layout, type or viewing context invalidate affected
coverage, which is refreshed or reported as missing. An unrelated commit does
not restart review.

When calibrating the lens or comparing a changed method, use
[references/calibration.md](references/calibration.md) for matched renders,
blind first judgment and the unchanged-rejection exercise. Ordinary review
retains its current scope; calibration is no additional gate for every edit.

Missing evidence is reported as missing. A skipped check, an unavailable browser
route and a screenshot that was never inspected are three different absences
from a pass, and none of them may be presented as proof of behaviour.

Give every explicit hierarchy or composition complaint a disposition: resolved,
partially resolved or unresolved, with visible evidence and remaining scope.
Tie version-specific feedback to the version it rejects. If that is still the
candidate, keep the concern open and report any disagreement to the lead;
another favourable opinion is not a repair. For a changed candidate, explain
what visibly changed at matched viewing sizes.
Contained labels, a clean detector or agreement between models cannot close a
concern that remains visible. Keep mechanical verification, visual judgment and
actual user acceptance distinct; review does not manufacture user approval or
make the user a routine approval gate.

## Findings and repair

Report in the existing findings list with the location, visible problem,
governing requirement and smallest credible repair. The lead adjudicates against
the brief and rendered evidence and returns accepted repairs to the design
owner in a batch. The same reviewer may verify repairs. Broader recomposition
reopens broader coverage; a repair-list verdict covers only that list.

The existing review protocol owns severity and bounded repair. Stop a round
that makes no progress and report the remaining concern to the lead. A reached
limit or unavailable review is unfinished coverage, never a pass. Use specialist
checks when warranted without restarting unaffected work.

## References

- [references/lenses.md](references/lenses.md) - whole-work visual judgment and
  applicable state and interaction checks.
- [references/evidence.md](references/evidence.md) - review inputs, browser or
  artifact evidence, reuse and concern dispositions.
- [references/calibration.md](references/calibration.md) - matched comparisons
  and a negative exercise that preserves unresolved rejection concerns.
