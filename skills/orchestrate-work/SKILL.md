---
name: orchestrate-work
description: Assign and integrate bounded parallel work, planning or independent review using shared agent roles.
metadata:
  group: coordinate
  lead: true
---
# Orchestrate work

The team lead, this chat's own agent, orchestrates the work it was handed. When a
[`coordinate`](../coordinate/SKILL.md) chat opened this one, that coordinator
chat sits above it and takes its permission and product decisions to the user.
Delegate when it saves time or improves quality, not because a pipeline says
so. There is no fixed team.

For code tracing, impact-aware planning or affected-check selection across roles,
use [code intelligence](references/code-intelligence.md). It covers the
codebase-memory-mcp starter pack and wrapper in `scripts/codebase-memory/`,
lighter search routes, exact worktree selection and index upkeep; project guides
record only their exceptions.

Use fast_worker for clear, bounded implementation and straightforward repairs; use
smart_worker for anything a user sees, harder implementation, investigation or a difficult concrete
diagnosis. Either can be selected directly; no failed attempt is required. Workers
resolve routine errors themselves and return genuine blockers. Shared role files
own model choices. Older worker and worker_fallback names map to fast_worker and
smart_worker respectively.

You own every subagent's work. Review the diff and write your own summary, don't
pass through what it said. Interrupt-chained resumes silently drop directives, so
fire a fresh subagent with consolidated scope rather than trusting a "done"
summary. A second opinion is the same prompt against a different model. Agreement
is high-signal. Run subagents in the background, pass file pointers rather than
inlined context, and let the shared role files choose the model.

Choose the method whose result is needed next. Brainstorm settles intent with
the user into a brief; planner turns the brief into a decision map, spec,
tickets or build plan when the work needs one, and gives advice when stuck.
Implementation feeds proportional validation and independent code-review;
delivery carries out the authorized publication steps. Research, design and
browser verification support those methods where relevant. Use a relevant skill
proactively when it changes the next decision and say in one line why it is being
used; no sequence is mandatory and no skill requires loading its whole reference
set.

When a skill lists steps, open a todo list whose first items are those steps,
copied in verbatim, before any task-specific items. A step you choose not to do
stays in the list with a one-line `skip: <reason>`. A todo list lives in one
session. Record upkeep's silent no-update cases in AGENTS.md need no todo item or
skip reason. For work likely to outlast one context window, also keep the task's
[state.md](../docs-workspace/references/plan-and-state.md) (`.state/state.md`
at the root of its checkout) current as steps complete.

Involve planner when the approach is genuinely uncertain, requirements conflict,
a material architecture or contract decision is open, or a failure has resisted a
direct repair and needs strategy rather than another attempt. The request carries
the requirement, the established facts, the attempts and their results, the
binding constraints and the exact decision needed. Planner gives advice; it is not
a route to permission and does not review every error.

A leaf's handoff returns control to the team lead. Continue the broader authorized request
without turning each transition into another approval or replaying a fixed order.
Preserve a request limited to advice, research, review or a named handoff; it does
not authorize a build or publication. No method is a mandatory entry stage for
every task.

Scale the shape to the task:

| Task | Shape |
|---|---|
| a small settled edit | the team lead does it, or hands it to one worker; the code-review pass still applies before the candidate is accepted |
| a substantial or uncertain change | planner resolves the material question or prepares a useful plan; the worker and reviewer receive that context |
| independent parallel work | one owner per write path; the team lead integrates |

Resolve material design uncertainty with planner. A worker chooses the
implementation details inside the accepted contract and returns what the plan does
not already settle.

Every assignment carries six fields: the outcome, the owned paths, the relevant
issue or plan, the checks expected, an evidence destination or inline result, and the
constraints that apply. Use [the assignment contract](references/assignment.md). A
child that has to ask what "done" means was under-briefed.

Use disjoint write ownership for parallel work. A read-only assignment limits
actions, not credentials, tool availability or authorised database reads. Respect
project guards and enforced restrictions, and return concrete blockers.

A team is one persistent team lead plus up to six descendants: seven is a ceiling,
not a roster. By default admit at most three concurrent implementation workers,
each with one partner slot the lead fills with a reviewer, explorer, researcher,
tester or planner when that worker needs one; stage reviews on fixed
candidates. Use the actual runtime limit if smaller, and
release finished assignments before expanding the frontier.
[The team reference](references/team.md) carries the lead's ownership to closure,
ticket-specific Done and closeout cleanup. For a multi-ticket package to run as
one or more teams from one conversation, use [`coordinate`](../coordinate/SKILL.md).
Separate worktrees are useful for isolation, not required for each small task;
disjoint file ownership can share a checkout. Serialize overlapping edits and
mutable app/test resources.

The team lead integrates results and owns delivery. For work across separate desktop tasks,
name the delivery owner in the assignment. Preserve repository-task ownership
when that task has the user's authorization and a permitted execution route.
Native subagents inherit the parent's permission mode; a forwarded peer-task
message alone does not transfer permissions or become direct user input.

The team lead resolves routine blockers, coordinates any planner escalation, integrates the
advice and continues the authorized work. Continue unaffected work and do not relay
requests to repeat an approval the team lead can already resolve. Escalate only a new
material decision or an enforced restriction. Planner owns advice; code-review owns
review.

Return concise outcomes and artifact paths rather than dumping tool logs.

For external processing or repeated approval ambiguity, use
[workflow authorization](references/authorization.md): establish actual effects
and carry existing scope into requests and handoffs without inventing approval.

To keep a dispatched agent working until a checkable Done, give it a goal
through [goal-setter](../goal-setter/SKILL.md).

Three references carry longer-running coordination. Read
[autonomy](references/autonomy.md) before asking the user anything. Use
[long runs](references/long-runs.md) for "run until done", for pausing, or for
picking up another session's work. Use [programme](references/programme.md) for
a standing programme that outlives one session; work one agent could finish
inside the session's budget is not a programme.

## Adopting a repository

For requested recurring maintenance, use [bounded gardening](references/gardening.md).
It reuses project verification and retrospective methods, without a new team.

For repeated operational jobs, use [automate-workflow](../automate-workflow/SKILL.md)
alongside this method to establish executable paths, supervise checkpoints and
recover runs. It dispatches bounded improvements through the same assignment
contract; the current team lead retains the batch outcome.

Preparing one repository to work this way is its own bounded task, not a step
inside every assignment. Use
[the repository adoption reference](references/repository-adoption.md) when a
project is being brought under the shared harness: it carries the small router
shape, the document responsibilities and the loop that closes one self-contained
slice.
