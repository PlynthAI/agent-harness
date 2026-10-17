# Plan review

A multi-ticket package is reviewed once before dispatch, and a saved plan that
carries real risk once before implementation. Small work gets no review. A
saved plan or package is one written at the project's resolved route; a step
list in chat is not a plan and gets no review.

## Who runs it

The team lead assigns the review through
[orchestrate-work](../../orchestrate-work/SKILL.md) to a fresh `planner` that
did not write the draft. Independence comes from that fresh context; the same
model may review. The library below is never loaded into the agent that writes
the code.

The assignment carries three things and nothing else:

- the draft's paths;
- the accepted request or brief the draft implements, by link;
- the path of the [principles and patterns index](../../../principles-and-patterns/index.md).

It does not carry the author's reasoning, conversation or discarded drafts.
The decisions the user made are in the brief, and the draft is judged against
them.

## Approach first

Before any tidying, ask whether this is the right approach at all and what is
missing: an unstated requirement, a dependency or caller the draft ignores, a
simpler route the requirement allows, a ticket that cannot be verified on its
own. A reviewer that only polishes inherits the draft's framing; this step is
there to break it.

## Choosing the principles

1. Read the draft and the brief.
2. Read the index. Choose at most five entries whose `applies_to` includes
   `plan` and whose description fits this draft. Fewer is fine.
3. Choose a pattern with a dependency only when the draft touches that package.
4. Open only the chosen entries.
5. When the draft defines domain terms, apply
   [domain-modeling](../../domain-modeling/SKILL.md) as a lens; when it defines an
   HTTP contract, apply [api-design](../../api-design/SKILL.md).

Name each entry opened, with one line on why it fits.

## Refine in place

Edit the draft in place to fix what the review finds. Leave wording, format and
anything a later check owns: tool rules, the diff review and correctness review.
Do not forbid an alternative the requirement allows.

A change that would reverse or reopen a decision the user made is not an edit.
Return it as a question with its consequence and a recommendation, and leave the
draft as decided until the team lead has the answer.

## What comes back

- **The refined draft**, at the same paths.
- **The change list.** For each change: where it sits, its concrete consequence
  if left as written (a caller that has to change, a state the types allow but
  the domain forbids, an edit repeated across modules), the principle behind it
  marked `(trial)` when the index marks the entry as a trial, and the change made.
- **Questions for the user**, only those the draft cannot settle without them.

"No changes" is a valid and complete result. A concern with no principle or no
concrete consequence is not a change.

## One round

The team lead reads the change list, asks the user only the returned questions and folds
the answers in. The draft's author or the team lead may revert a change with a reason.
The refined draft is not reviewed again. The draft keeps a short record of the
review: each change's principle, its trial mark, and any change reverted and why.

## Package review

A spec-and-ticket package from [to-spec](../../to-spec/SKILL.md) and
[to-tickets](../../to-tickets/SKILL.md) gets this review once before dispatch.
Beyond the steps above, planner checks the spec, the ticket graph's real
dependencies and each ticket's Done, and says for each question whether it
blocks dispatch. Blocking questions are settled before any ticket is
dispatched. A plan reviewed inside a package receives no separate review.
