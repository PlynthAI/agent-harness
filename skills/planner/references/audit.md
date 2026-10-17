# Codebase audit

A read-only pass that compares recently changed areas of a repository with its
target conventions. It returns lines for the repository's architecture and
coding-standards pages, debt issues, and deepening candidates, and it changes no
code and no page. Use it when a repository is adopted, when one of those pages is
written or refreshed, or when the owner asks what debt an area carries.

Write every finding in the vocabulary of
[architecture decisions](architecture.md), which also holds the candidate card
and its strength rating. The cleanup that follows, and where debt is tracked,
belong to [repository adoption](../../orchestrate-work/references/repository-adoption.md#quality-kit-and-existing-debt).

## 1. Scope to what is changing

An audit covers the areas that are changing now, so it neither waits on nor
holds up work elsewhere.

- A named area, module or pain point is the scope; skip the rest of this step.
- Otherwise read about 90 days of commit history, leaving out bulk commits
  (formatting, tree-wide moves) that would make everything look hot. List the
  open pull requests, drafts included, and the active plans, with the paths each
  touches. Areas that keep coming up in either are hot. A quiet folder with a
  large open draft is hot; an area with no commits and no open work is cold.
- If the changes are scattered with no clear hot spot, widen the window rather
  than scanning the whole tree.
- Record hot or cold for each area audited; the cleanup order uses it.

A cold area is audited only when it is named, for example before its cleanup
pull request.

## 2. Read the target before the code

Read the repository's `ARCHITECTURE.md` and `CODING_STANDARDS.md` when they
exist, its domain glossary and the decision records for the area, and the
quality kit's tool config and baselines. Then read the
[principles and patterns index](../../../principles-and-patterns/index.md) and
open only the entries whose description fits what the area does, plus the stack
entry for each dependency the area uses.

The target is the named pattern and those principles, never the tree as it
stands. Code written before the conventions existed is evidence of what was
done, not of what is intended.

## 3. Walk the area

For a large area, hand the walk to an `explorer` through
[orchestrate-work](../../orchestrate-work/SKILL.md), one area per assignment.
Note friction with the questions in [architecture decisions](architecture.md),
apply the deletion test to anything that looks shallow, and, for each part of
the target pattern, find where the tree matches it and where it does not. Record
each mismatch with its paths and the rule it meets or breaks.

## 4. Sort every mismatch

Each mismatch gets one verdict, and each verdict cites the principle or
convention it rests on and the evidence: paths, history, a decision record, a
contract or a stated reason.

| Verdict | When | Output |
|---|---|---|
| Binding | The tree matches the target | A binding line for the page, and the check that will fail on a new violation |
| Departure | The tree departs on purpose, for a reason found in a decision record, a contract, the code or the owner's answer | A departure line: "The pattern would put X here; this repository keeps it in Y because Z" |
| Debt | The tree departs by accident | No page line. One issue per rule and area with a `debt` label, under a baseline that only shrinks |
| Known trap | Debt that will catch the next change | The debt issue, plus one warning line on the page pointing at it |
| Unsettled | Nothing settles it | Listed as unsettled in the audit's finding; never dropped and never written as a convention |
| Intent question | Only the owner's intent can settle it, such as whether a feature is still wanted | A question for the owner, below |

A departure needs its reason. When no reason can be found, the verdict is debt
or unsettled; never supply a reason the evidence does not give. Page lines take
the shape of the architecture and coding-standards recipes in the workspace's
`templates/`.

## 5. Triage without the owner as developer

The owner decides intent, not code structure, so verdicts come from agents.

- The auditor gives every verdict with its principle and evidence.
- A fresh `explorer` that did not give the verdicts checks every verdict that
  adds a line to a conventions page (binding, departure, known trap) and
  samples the debt verdicts. A wrong page line is the expensive mistake; a
  wrong debt issue is cheap to close. A disagreement the evidence cannot settle
  becomes unsettled.
- Questions of intent go to the owner in one batch, in product terms, each with
  a recommended answer: "Is the legacy report view still wanted? Recommended:
  no, nothing has linked to it since June", not a question about modules.

## 6. Tickets

- **Debt:** one issue per rule and area, each naming its rule, its area and
  whether the area is hot or cold.
- **Deepening candidates:** use the candidate card in
  [architecture decisions](architecture.md). Only candidates rated `Strong`
  become tickets; the rest stay in the finding.

File tickets through [to-tickets](../../to-tickets/SKILL.md) when the assignment
carries tracker authority. Otherwise they stay drafted in the finding for the
team lead to file.

## Output

One finding through [docs-workspace](../../docs-workspace/SKILL.md): the scope
and the heat of each area, the verdicts, the reviewed page lines, the debt and
candidate tickets, the candidates that did not become tickets, the unsettled
cases and the batch of intent questions.

The audit writes no report page, runs no interview and edits no glossary,
decision record or conventions page. The pages change in the adoption or
feature work that takes up its reviewed lines, and docs-workspace's
[docs audit](../../docs-workspace/references/docs-audit.md) keeps them true
after that.
