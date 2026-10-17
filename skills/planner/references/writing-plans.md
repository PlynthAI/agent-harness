# Writing a plan

Use this reference when settled requirements need an actionable plan, or when a
handoff must let another worker implement without the originating conversation.
A small clear task needs neither a plan document nor this method: keep the
approach in the response. Requirements that are still unsettled go back to
planner's advice path or to the user first.

Write for a worker who has not seen the codebase or the requirements. They can
write idiomatic code once they know the exact interface and the exact check, and
they will choose sensibly wherever the plan leaves a choice open. What they
cannot know is what you decided: which files, which names and signatures, which
values the requirements fix, and which check proves each step. Record those.

## Before the tasks

- **Scope:** if the requirements cover independent subsystems, prefer one plan
  per subsystem, each delivering something working and checkable on its own.
  Do not stretch one checklist across unrelated deliverables.
- **Requirements:** link the requirement, spec or ticket rather than restating
  it, and copy the binding values it fixes - version floors, names, limits,
  copy - exactly, noting which of them comes from the requirements.
- **File structure:** name the files created or modified and what each owns
  before defining tasks. Prefer focused files with one responsibility; in an
  existing codebase follow its established patterns instead of restructuring on
  the way past.
- **Uncovered behavior:** name the inputs or failure modes the requirements
  imply but no task's check exercises, most likely first, and add each one's
  check to the task that owns the code. Silence in the requirements is not
  permission for an input to break the program. A short list is right; there is
  no quota, and an empty list means you looked.

## Design sketch, when the shape was open

A plan that comes out of [sketch first](sketch-first.md) carries its design
package ahead of the tasks: the type sketch and, alongside it, one page of
rationale under these headings, in this order. Sentence-case headings, no
boilerplate. A plan whose shape the codebase already dictated skips this
section.

- **Problem:** one paragraph. What we're trying to do, and what about the
  existing system or constraints makes the shape non-obvious. If grounding
  surfaced constraints the design must honor (existing types to interop with,
  callers we can't break, invariants that crossed our boundary), name them here
  so the reader sees the same constraints you saw.
- **Usage (caller's view):** write this first, before the type sketch. Show the
  README or quickstart the consumer reads, plus two or three realistic call
  sites in their own code. What they import, what they call, what comes back.
  The type sketch in Shape is derived from this. The two must agree. When they
  diverge, reconcile the sketch to the usage, not the reverse. The caller's
  experience is the spec. The types serve it.
- **Shape:** the recommended architecture. Data structures first. Then how data
  flows through the signatures. Name the load-bearing decisions. State which
  invariants are encoded in types, where validation lives, and what the system
  deliberately does not do. Judge interface depth explicitly. State what
  complexity the public surface hides, what remains exposed to callers, and why
  the interface is no larger than needed. Name the reason behind each decision;
  don't restate it.
- **Synthesis decision:** which candidate became the base and why, what was
  adapted from each of the others, and what was rejected and why.
- **Tradeoffs accepted:** one bullet per tradeoff the chosen shape makes. Form:
  "we accept X in exchange for Y." Name anything a future reader might mistake
  for an oversight, including things that look like premature optimization or
  premature simplification.
- **Alternatives considered:** required. Name at least one concrete alternative
  shape, with one line on why it lost. Judge each alternative on interface
  depth, not implementation simplicity alone. Name the complexity it exposes to
  callers and the complexity it hides. Two or three alternatives belong here
  when the design space had real contenders. One is fine when the constraints
  forced the answer, with the conclusion phrased as "this was the only viable
  shape because..." Avoid listing flavors of the same shape. This section covers
  design alternatives the chosen shape considered and rejected, not the other
  candidates from Phase B.
- **Open questions and risks:** things you noticed during the sketch that the
  human needs to weigh in on, and risks worth flagging before implementation
  starts. Phrase as questions, not assertions, so the human's answer is the
  resolution rather than a comment.
- **Next implementation step:** the first thing to build against the sketch.
  One sentence. What you'd start writing immediately after the choice (or after
  sign-off, if a checkpoint was opted into).

In a saved plan these sit under the Approach section of the local plan recipe
as subsections; the tasks that follow implement against the sketch and cite its
names.

## Task right-sizing

A task is the smallest unit that carries its own check and is worth reviewing on
its own. Fold setup, configuration, scaffolding and documentation into the task
whose deliverable needs them. Split where a reviewer could accept one task and
reject its neighbour. Each task ends with an independently checkable result.

## What a step contains

Every step is one action with a checkable result, and no step decides more than
that. Done means a worker can write exactly one reasonable thing from it:

- **A test step:** the test's name and its assertions as code, with the values
  the requirements fix in them.
- **A code step:** the exact signature - name, parameters, return type - the
  file it lives in, and the values the requirements pin. The worker writes the
  body; show one only for an algorithm the signature and checks do not
  determine, or for exact copy the requirements fix.
- **A verification step:** the command to run and the output that means it
  passed.
- **A reference to another task:** that task's interface line says what to use,
  and the plan does not repeat its code.

A plan longer than the code it describes has written the code instead. Lines
that decide nothing - "handle edge cases", "add appropriate validation", a
function no task defines - are the opposite failure. The self-check catches both.

## Task shape

Record for each task:

- **Files:** the create, modify and test paths, exact, with the existing line
  range when it helps.
- **Interfaces:** what it consumes from earlier tasks and what later tasks rely
  on - function names, parameters and return types. A worker sees only their own
  task, so this line is how they learn the names their neighbour uses.
- **Steps:** the ordered actions above.

## Self-check before handoff

Read the finished plan against the requirements with fresh eyes. This is your own
check; it needs no second agent and no extra approval.

1. **Requirements coverage:** can each requirement, or each section of the spec,
   be pointed at a task? Add the task for anything uncovered.
2. **Step scan:** does every step leave exactly one reasonable action, with no
   line that decides nothing and no body the signature and checks already fix?
3. **Name and type consistency:** do later tasks use the names, signatures and
   fields defined earlier?
4. **Uncovered behavior:** does each listed input or failure mode have a check
   in the task that owns it?
5. **Proportion:** compare the plan's length with the requirements it implements.
   If code blocks are most of the document, replace bodies with signatures and
   assertions.

Fix what you find in place; this is not a separate review round.

## Handoff

Save the plan at the project's resolved plan route and shape it with the local
`templates/plan.md` recipe ([plan and state](../../docs-workspace/references/plan-and-state.md)).
Do not introduce a competing plan root. Read the resolved workspace's AGENTS.md before
writing, and keep task records out of code commits.

Return the plan path and the decisions still open. When the plan carries real
risk, the team lead has a fresh planner review it once through [plan review](plan-review.md)
before implementation; that review is the plan's independent check, beside your
own self-check. A worker
may adapt ordinary implementation details to the code; update the plan for
meaningful deviations, not every local choice. An assignment that asked for a
plan only stays a plan only: preparing it does not authorise implementation,
commits or external writes. Where implementation is in scope it runs under the authorization the
request already carries, through the harness's own methods
([orchestrate-work](../../orchestrate-work/SKILL.md),
[code-review](../../code-review/SKILL.md)); the plan format adds no sub-skill,
per-task reviewer or approval of its own.
