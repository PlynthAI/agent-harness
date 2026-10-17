# Docs audit

A pass that keeps one repository's documents true, run when the owner asks or
from a schedule in Codex or Claude Code. It covers a repository that has adopted
the harness, never the user-level `AGENTS.md`.

## What it checks

The repository's own `AGENTS.md`, `PROJECT.md`, `ARCHITECTURE.md`,
`CODING_STANDARDS.md` and `DESIGN.md`, its verification guide, feature maps and
`README.md` where they exist, and its workspace records.

| Area | What the pass checks |
|---|---|
| Claims against reality | Every path, command, tool and version a document names still exists and matches the manifests, lockfiles and config |
| One home per fact | No fact stated twice and no two documents disagreeing; no repository `AGENTS.md` line repeating the shared harness. The copy becomes a link to its owner |
| Staleness | A page whose area of the code changed a lot since its last commit or its "Written against" stamp is re-read against that area |
| Dead entries | A Known trap whose issue is closed, a departure whose reason no longer holds, a lesson a tool now enforces: each removed, citing the issue, change or tool config |
| Workspace hygiene | Goals still at `horizon: now` that are finished (the owner reorders them), plans and checkpoints for merged work, superseded findings, handoff notes with a filled `outcome`: handled by [retention](retention.md), [tracking reconciliation](tracking-reconciliation.md) and [handoff](../../handoff/SKILL.md)'s cleanup |
| Coverage gaps | A package the repository now uses with no library page: re-run the adoption stack scan in [repository adoption](../../orchestrate-work/references/repository-adoption.md#quality-kit-and-existing-debt) and report the gap to the harness owner |

## Three rules

1. **Decide which side is wrong before changing either.** Never bring a
   document into line by describing the code as it stands. Code that drifted
   from a stated convention is debt: one issue per rule and area, as in
   planner's [audit](../../planner/references/audit.md). A document that fell
   behind is updated. A case the evidence cannot settle goes to the owner in one
   batch of questions, in product terms, each with a recommended answer. A
   change to `ARCHITECTURE.md` or `CODING_STANDARDS.md` names its source, as
   push review's [Project standards](../../code-review/references/push-review.md#project-standards)
   requires.
2. **The library's own sources are not this pass's job.** The library check's
   staleness advisory covers them once, at the harness, for every repository.
3. **Mechanical drift belongs to tools.** A missing bound path is the quality
   kit's [binding paths check](../../validate-implementation/references/quality-kit.md#both-languages-the-binding-paths-check)
   in CI, front matter and links in a brain are the
   [brain check](../../inbox/references/check.md), and `DESIGN.md` is
   `designmd lint`. The pass does the judgement and re-implements none of them.
   A class of drift a tool could catch is named in the finding, not added as a
   rule.

## How a run goes

1. Take the range from the last run's finding, or the range given. Read the
   commits in it, the documents they touch, the pages bound to paths they touch,
   anything a changed document links and the workspace records for work that
   merged or closed in it. Nothing else.
2. Fix what the evidence settles in one pull request under the task's existing
   authorization, and merge it through delivery's merge gate. Workspace
   records change in place under retention's rules. Debt issues go through
   [to-tickets](../../to-tickets/SKILL.md) when the assignment carries tracker
   authority; otherwise they are drafted in the finding.
3. Keep one finding at `findings/docs/audit.md` through the `findings` route and
   rewrite it each run: the range inspected, what was checked, fixes with their
   pull request, debt filed and the open questions, carried forward until
   answered.
4. When nothing meaningful changed, advance the range and stay quiet.

On a schedule, follow [gardening](../../orchestrate-work/references/gardening.md)'s
rules: inspect existing automations for overlap, reuse one schedule if
authorized, and never infer production or paid-provider permission. The pass
reads and edits documents, so it needs no live launch.

## Prompt to adapt

> Run the docs audit on <repository>, from the range in its workspace's docs
> audit finding or <range>. Check the repository's own documents and workspace
> records against its code, manifests and config; never edit the user-level
> AGENTS.md. Decide whether the document or the code is wrong before changing
> either. Fix what the evidence settles in one pull request and merge it
> through delivery's merge gate; file code drift as debt; batch intent questions for
> the owner, each with a recommended answer. Rewrite the finding with the range,
> checks, fixes and open questions. Stay quiet when nothing meaningful changed;
> notify on a pull request to review or a question for the owner.

Fill the repository and range from real facts. The prompt is a recipe, not an
enabled automation or a new approval requirement.
