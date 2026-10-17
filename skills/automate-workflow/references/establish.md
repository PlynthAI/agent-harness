# Establish a workflow

Read this when a repeated job lacks a suitable executable path. Existing
workflows start with [operate](operate.md); reuse qualified steps rather than
relearning them.

## Observe checked work

Select representative jobs and reuse earlier traces with known inputs and
outcomes. Execute enough cases to expose normal variations and consequential
exceptions within the agreed budget. Check outputs against the domain procedure
and independently checked examples; the agent's answer is not its own ground
truth. Keep concise lessons about reusable mechanics, failed approaches and
missing evidence, linked to their cases.

Define supported inputs, required outputs, completeness checks and exception
conditions before extracting the common path. An unsupported format or source
remains an exception rather than silently reducing coverage.

## Extract the executable path

Use ordinary project code and established dependencies for mechanical operations,
bounded structured model calls where a decision needs interpretation, and agent
tasks for investigation or unresolved judgment. No particular DSL, model or
classifier is required.

Each step declares its needed inputs, output shape and failure outcome. Preserve
the full criteria and exceptions relevant to a decision when splitting the
procedure. Validate handoffs with the project's existing tools. Preserve source
evidence supporting interpreted fields; an unsupported claim cannot become an
accepted fact merely because it satisfies a schema. A report renders accepted
findings without deciding them again.

Implement retries, checkpoints, bounded loops and external calls in the runner
where it supports them. Keep domain thresholds and completion rules with their
project owner. Early stopping needs evidence that remaining work cannot change
the required result or violate required coverage. Self-reported model confidence
is not calibrated probability; use checked error behavior to justify routing and
escalation thresholds.

## Qualify before expanding coverage

Compare the candidate on checked development cases and reserved cases withheld
from its author, including meaningful exceptions and omissions. Use independent
evaluation for the reserved cases. Inspect both step behavior and full workflow
outcomes; count missing, failed and unsupported cases as part of the selected
workload, not as disappearing denominators.

Use [hillclimb](../../hillclimb/SKILL.md) for repeated measured experiments and
[validate-implementation](../../validate-implementation/SKILL.md) for applicable
project checks. Judge autonomous completion and recovery alongside quality;
lower cost alone cannot qualify a workflow.

Replay saved inputs without repeating external effects. A changed procedure or
new evidence requirement may require fresh collection rather than replay. Keep
test effects isolated from live data. Expand the supported path only when the
evidence meets the domain's acceptance; preserve agent or human escalation where
the procedure requires it. An inconclusive comparison stays inconclusive.

Deliver through the existing review and delivery routes described in
[improve](improve.md). The result includes executable steps, the supported-input
boundary, verified recovery and completion behavior, and links to qualification
evidence. Merely describing a workflow does not establish one.
