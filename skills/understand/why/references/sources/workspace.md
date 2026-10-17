# Project Workspace and Repository Documents

## What this source contains

- **Goals.** The finished outcome a piece of work aimed at, with its user stories. The requirement behind the code.
- **Findings.** What was learned or is still open, including failed approaches and the conditions they failed under. Often the recorded why.
- **Plans and state.** The method for one task, the alternatives weighed and the decisions taken along the way.
- **Artifacts.** Evidence behind findings and plans: measurements, captures, review packets.
- **Repository documents.** PROJECT.md and the subject guides it links, decision records, GLOSSARY.md where it exists, and constraints in nested AGENTS.md files.

Rationale written before or during the work lands here, not in the code. Source control shows what changed; this source often says why it was chosen.

## How to find it

1. **Resolve the workspace** through [docs-workspace](../../../../docs-workspace/SKILL.md): the root the team lead passed in the code anchor, or the resolver it names. Read the workspace's AGENTS.md and README.md first. The README maps goals, findings and tasks. Follow [discovery](../../../../docs-workspace/references/discovery.md) for how records are found.
2. **Search, don't browse.** Run `rg -l -i` over the workspace with the anchor's terms: feature names, key symbols, error strings, PR and ticket numbers, branch names. Cover the goals, findings, plans and artifacts routes, and the decision, spec and PRD routes where the project has them.
3. **Read matched records in full.** Note each record's status, date and applicability. Check whether a later finding corrects or supersedes it.
4. **Read the repository's documents.** Start at the repository's AGENTS.md and PROJECT.md and follow the subject guides for the target's area. Search the checkout for decision records and GLOSSARY.md. The resolver's `trackedRoutes` names workspace documents the project keeps in Git.
5. **Tie plans to source control.** A plan or state file often names its branch or PR. Record the link so the synthesizer can join it to the source control evidence.

## What good evidence looks like here

- A finding that states the question, the conclusion and the evidence behind it
- A plan's approach that names the alternatives rejected and why
- A decision record that names the forcing constraint
- A goal whose user stories explain the requirement the code serves
- A failed approach recorded with the condition that ruled it out

## Common pitfalls

- **Superseded records.** A later finding or state file may reverse an earlier conclusion. Check dates and links before citing.
- **Plans are intent, not outcome.** Confirm against source control what actually landed.
- **A missing workspace is a gap, not a detour.** Report the resolved path and its state. Do not substitute a personal drive, notes app or other connector.
- **Private context.** Workspaces are machine-local and can hold private notes. Quote only what bears on the question.

## What to return

Every record that bears on the question, with:
- The exact text (quoted)
- Its path relative to the workspace root or the repository root (for example `findings/ci/trust-approval.md` or `PROJECT.md`), with the heading where it matters
- Its date or status, when it has one
- Whether it's direct (explicitly addresses the question) or circumstantial
