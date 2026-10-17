# Evidence for a design review

Use the fixed candidate and matching evidence from the existing review. Request
missing contextual renders from their owning workflow; do not commission a
duplicate test suite or turn an absence into a pass.

## Inputs and assessment order

The reviewer receives the original request and corrections, the light brief,
applicable authority, references if present, candidate identity and contextual
renders. Identify which choices came from the user, the project or the designer.
When feedback rejects a particular version, identify it and the subsequent
changes, if any. Use its captures for a matched comparison where available;
report an unknown feedback-to-version relationship as a limit.
Absence of a formal brief or supplied reference is not a missing prerequisite.

Keep the builder's conclusions and previous review verdicts out of the initial
visual assessment. First inspect the work against its purpose and original
concerns. Then inspect relevant mechanical results, which remain available as a
separate input. Pixels first reduces anchoring; the composition questions in
the lenses reference still need an explicit judgment.

## Matched comparisons

Compare actual output at the same intended displayed sizes, with surrounding
content or the complete artifact. Freeze the common brief, corrections,
authority, content, permitted assets, components, theme, data, browser/device
scale, scroll positions and relevant animation or interaction states. Identify
the method and resource bytes, model/runtime, settings, launcher and render
hashes in the owning evidence record. Disclose unavoidable differences and
limit claims to the coverage they permit. A source pin or empty output slot is
not a rendered result; both halves must exist before paired assessment.

Give the independent reviewer the common brief, authority, original concerns
and neutrally labeled renders. Keep the label-to-method mapping, builder reports,
previous verdicts and mechanical results separate until the first visual
judgment is recorded. Then reveal those inputs and reconcile discrepancies,
without replacing the original observations. Use the existing concern
dispositions and report concrete benefits, regressions and confounds. Run the
bounded set defined for the task; see [calibration.md](calibration.md) when
checking this assessment behavior. This comparison adds no scoring system or
routine review stage.

## Use the project's own checks

Read the project's quality commands and the shared check selector's evidence
record for this candidate. Which results may be reused, and on what condition, is
the review's rule rather than this leaf's; what this lens adds is that interface
evidence is bound to the candidate it was collected on. A skipped, unavailable or
failed check is reported as exactly that, and a command echoed into a log is not
an executed check.

## Browser and artifact proof

For an interface, inspect the running surface. How to obtain that evidence -
binding the running instance's identity, the exact
URL, the environment, the production boundary, the states to exercise, and what
a missing capability looks like - belongs to the `browser-verification` method,
which owns it. Read that method rather than reconstructing it here: a restatement
drifts, and it drifts in the direction that admits evidence the owner rejects.

What this lens needs from that evidence is only this:

- exploratory and repeatable evidence are not interchangeable - one shows what a
  person saw once, the other can be reproduced by someone else;
- a screenshot is not interaction proof, and a passing automated check is proof
  neither that the surface looks right nor that a state nobody entered works.

For drawings, slides, documents or other artifacts, use the medium's rendering
workflow, including `design/drawing`'s post-drawing check where applicable. Inspect
actual output at the intended display or export size, with the surrounding
content when embedded. A large source image or isolated crop cannot establish
readability in a smaller consuming surface. A series needs contextual evidence
for every final member; the early check uses the smallest representative set
that covers its materially different compositions and density.

Do not restate the owner's detail. Where this lens and the owner's method
disagree, the owner's method decides how evidence is obtained.

## Same candidate, or it does not count

Bind evidence to relevant content, rendering dependencies and viewing context.
Refresh affected captures and coverage when these change, including when a type
or colour adjustment changes wrapping or emphasis. Preserve matching evidence
for unaffected work; commit metadata alone does not invalidate it. Report the
affected result as unverified until the replacement evidence is inspected.

## Report

Report inside the review that is already running:

- findings in the review's own shape, with the location, what was observed, the
  consequence, governing requirement and a concrete repair;
- a short assessment of hierarchy, relative scale, reading measure, grouping,
  whitespace and balance in relation to the work's purpose;
- each explicit hierarchy or composition concern marked resolved, partially
  resolved or unresolved, with a render location and explanation;
- one short statement of which checks and which states were actually exercised;
- the residual limits - what could not be verified, which files or states were
  not covered, and why.

Keep mechanical results, model visual judgment and actual user acceptance
separate. A fit check does not establish composition, and review agreement does
not establish user approval. State plainly when there are no findings within
the covered scope. An early representative pass or verified repair list is not
a final whole-work verdict. Use the existing review record and bounded repair
rules; unresolved concerns retain their owner and next decision when a round
cannot progress.
