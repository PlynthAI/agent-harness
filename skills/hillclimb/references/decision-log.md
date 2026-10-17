# Decision log

Keep one experiment trail per project, where the project keeps its evidence. An
existing results record or tracker can serve. For a sustained run, read its
latest note before choosing the next attempt. Keep rejected and inconclusive
attempts as well as adopted ones.

## What the trail keeps

Each attempt that matters records its hypothesis, the predicted result and the
result that would disprove it; which inputs and candidate it used; the baseline
and the numeric target; how it was measured and what was measured; whether what
must still pass did; and the note that decides the next attempt. Link full
evidence rather than repeating it. No fixed headings or report format.

Correct a mistaken claim with a new entry that supersedes it and keeps the
original evidence. A change to how you measure, or a re-baseline, is a decision to
record, not a silent replacement of earlier scores. A new session continues the
same project trail and marks which attempts are its own; it does not start a
second log.

## Verification loops

Use the same trail when improving coverage, tooling or test reliability. Record
the priority gap and why it matters, the frozen selected cases and their expected
outcomes, baseline/candidate and tool/configuration/environment identity, and the
numerical gate declared before the change. Keep detection and false passes, or
flake/runtime measures as applicable, alongside the preserved regressions and
valid alternatives. Link existing runner output and native receipts; no new
assessor or schema is required.

Count from the selected cases, never from whichever outputs appeared. Every
selected case needs one terminal outcome; missing or duplicate records make the
assessment incomplete. Report rates with their full selected denominator and
label completed-case latency or cost as conditional. Retain failed attempts and
retries in total spend; unknown cost stays unknown. Changed inputs or scoring
require a new baseline. Zero-case, nonfinite or unimplemented scores cannot
qualify an improvement; unknown cost cannot pass a cost gate.

Close each bounded comparison with adopt, reject or inconclusive, the evidence
supporting that decision, remaining limits and the next bounded loop's hypothesis
and gate. These are reusable assessment principles, not proof that a particular
product's measurement or quality has been qualified.

## Optional TSV format

Use `artifacts/<task>/decision.tsv` at the artifact route resolved through
[docs-workspace](../../docs-workspace/SKILL.md), or the project's existing results
record. The file stays out of code commits. One run has one writer; independent
parallel comparisons use separate files and the team lead combines their conclusions.

Copy [the template](../assets/decision-log-template.tsv) if a table helps. Its
nine columns are the helper's format, not a required schema:

- **id.** Stable attempt or decision id, including the originating run when
  needed to tell writers apart.
- **hypothesis.** The prediction tested; link the disproving result if it needs
  more than one line.
- **change.** Candidate settings, method, diff or revision, with a pointer to the
  evidence.
- **before.** Baseline numbers with units and out of how many cases, or a pointer.
- **after.** The candidate's numbers measured the same way, or a pointer.
- **delta.** The difference and its uncertainty where relevant. Use
  `not comparable` when changed conditions make a fair delta impossible.
- **tests.** What must still pass and checks of what the user actually gets:
  pass, fail or not run, with evidence.
- **verdict.** Adopt, reject or inconclusive; none of these means published.
- **note.** What was learned and the next target, or a pointer to them. An empty
  note cannot replace the learning.

Keep cells to one line. `scripts/log.sh <logfile> <id> <hypothesis> <change>
<before> <after> <delta> <tests> <verdict> <note>` appends a row and writes the
header on first use. It strips tabs and newlines and prefixes cells that start
with `=`, `+`, `-` or `@` so a spreadsheet does not run them as formulas. Plain
Markdown or another structured record works just as well; no helper is needed.

## Check the trail before handoff

Check each claim that matters against the kept inputs, the commands actually run,
the original outputs and what must still pass. Make sure pivots, rejected ideas,
changes to how you measure and limits on the conclusion are visible. Read this
run's transcript only when the artifacts leave a gap, under `~/.claude/projects`
or `~/.codex/sessions`; don't mine unrelated sessions or rerun unchanged work to
recover context. Report missing evidence as missing, and name the cheapest next
test that could settle it.
