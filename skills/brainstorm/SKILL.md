---
name: brainstorm
description: Clarify a fuzzy idea, requirement or non-software question before a plan exists - read the project's evidence, ask one question at a time with a recommended answer, and close with a short brief of decisions and open questions. Use when direction is unclear; it plans nothing and implements nothing.
metadata:
  group: clarify
  lead: true
---

# Brainstorm

Discovery that clarifies direction before any plan exists: what is really being
asked, what the evidence already settles, what is still uncertain, and what is
out of scope. It closes with a short brief; the team lead uses that result within the assigned request.

This is not a plan, not a review and not an implementation. It works the same
way for a software change and for a question with no code in it at all - planning
an event, choosing a supplier, shaping a document. What changes is only where the
evidence lives and how much the answer needs to say.

## Depth follows the question

Match the depth to the question and stop as soon as the direction is clear.

- A small idea, or one with an obvious answer, gets a short reply: restate the
  problem, name what is already settled, ask at most one or two questions, then
  give the brief in a few lines.
- A complicated idea - several owners, real tradeoffs, an unfamiliar domain -
  gets the whole method below, one branch at a time.

Never pad a small question to look thorough, and never rush a large one to look
decisive. When in doubt, ask which depth the person wants.

## Optional deepen pass

When the user asks to deepen an existing task and enough direction is settled,
read the shared [deepen pass](../prompt-refine/references/deepen.md) directly.
Use its Brainstorm integration and continue this discussion; a rewritten prompt
is a separate requested output, owned by [prompt-refine](../prompt-refine/SKILL.md).

## Read before you ask

Method is portable; evidence is local. Read what the project already says before
putting a question to anyone:

1. the nearest `AGENTS.md`, or whatever router the checkout carries;
2. `GLOSSARY.md`, and any decision records the project keeps;
3. the code, tests and contracts the question actually touches;
4. the tracker, issue or goal state that owns the work.

When a branch turns on how the project's own code works or why it is shaped
that way, [understand](../understand/SKILL.md) answers it from the code and
its history; a fact outside the project goes to
[research](../research/SKILL.md). Either returns evidence to this discussion,
not a decision.

If the evidence answers a question, answer it yourself and say where the answer
came from. Ask the person only for what evidence cannot settle: priorities,
judgement, tradeoffs, appetite and domain knowledge.

Where the person states something the evidence contradicts, show the
contradiction and ask which one should drive the next step. Name what is accepted
and what is only observed: current code shows what was built, not what was agreed.

## One question at a time

Work the highest-risk unresolved branch first, and drive it to clarity before
moving on. For each branch:

1. state the open question in one line;
2. say what the evidence already settles, and where that came from;
3. ask exactly one question, with your recommended answer and why;
4. push once if the answer is vague, then record whatever it actually is;
5. move to the next branch, or stop when the important ones are resolved.

Never ask a multi-part question when one precise question will do, and do not
manufacture questions to fill a template. Typical high-risk branches: the problem
being solved, who it is for, ownership and placement, contracts and data shape,
failure and rollback, ordering and dependencies, scale, and what is deliberately
excluded.

## Keep the running structure

Keep a short structure in the conversation, and update it after each branch:

- **Resolved** - what is decided, and by whom.
- **Open** - what is still unanswered, and which branch it blocks.
- **Blocked** - what cannot move until something outside this discussion lands.

Keep it to a few lines. It is a working aid for this conversation, not a file to
maintain.

## The brief it closes with

Close with a short brief, in this order:

| Part | What it carries |
|---|---|
| Outcome | What the discussion established, in the person's own terms |
| Decisions | What the person actually decided, and what it rules out |
| Unresolved questions | What is still open, why, and what would settle it |
| Non-goals | What this deliberately does not cover |

Scale the brief to the discussion: a few lines for a small question, a short page
at most for a complicated one. Anything the evidence settled rather than the
person is reported as evidence, not as a decision.

## When the answer needs more than a brief

The brief is enough for most questions. When it is not, settle every decision
the next step needs here, with the person, and record it in the brief. In a
team, the team lead then hands the brief to [planner](../planner/SKILL.md), which owns
the plan skills below and returns drafts plus any open question in one batch;
used directly, any agent can run them. None widens the agreed scope.

| The discussion shows | Route |
|---|---|
| an effort too large and tangled to ticket, whose decisions block each other | [wayfinder](../wayfinder/SKILL.md) maps the decision tickets and resolves one frontier at a time |
| settled requirements to split into tickets, or an incoming issue or PR to assess | [to-tickets](../to-tickets/SKILL.md) |
| settled requirements the request or issue cannot carry on its own | [to-spec](../to-spec/SKILL.md) writes the PRD or specification |
| a new endpoint or a changed public API shape | [api-design](../api-design/SKILL.md), in the repository that owns the contract |
| terminology to sharpen, a GLOSSARY.md to write, or a decision record | [domain-modeling](../domain-modeling/SKILL.md) |

## A decision record only when it is durable

Offer a decision record only when the decision is durable: hard to reverse,
surprising without context, and made over real alternatives. Point at the
[docs-workspace](../docs-workspace/SKILL.md) route, which locates that home and
the optional project recipe `adr.md`. One decision per record.

Everything else stays in the brief. No ADR, no plan and no follow-on sequence is
required. A brainstorm-only request ends with the brief and a useful next-step
recommendation when warranted. Within a broader authorized task, return the brief
to the team lead so work can continue; this skill does not expand the agreed scope.

## Human decisions stay human

The brief records what the person decided and nothing more. Never simulate
agreement: do not write that a decision was agreed when it was not, do not answer
your own question, and do not treat silence as consent. Everything the person has
not decided stays under Unresolved questions, and the brief is never labelled
accepted or approved - a recommendation is advice, not a ratified decision.

Where the question is not the person's to settle, say who owns it and leave it
open rather than deciding it for them.

## Earlier names route here

Three earlier skills did parts of this work, and a session that invokes
`p-brainstorm`, `grill-me` or `grill-with-docs` lands here:

| Older name | What it contributed |
|---|---|
| `p-brainstorm` | evidence-grounded framing and a planner-ready brief |
| `grill-me` | the one-question-at-a-time interview and the running decision tree |
| `grill-with-docs` | challenging terms and claims against project evidence, and minimal decision capture |

The methods are kept; the project paths, domain rules and mandatory handoffs are
not.

## References

- [interview.md](references/interview.md) - the interview method in detail, with
  a worked non-software example.
- [brief.md](references/brief.md) - the brief's shape, with a worked example for
  each depth.
