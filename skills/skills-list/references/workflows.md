# How skills stack into workflows

Each skill is chosen by its description, never by its place in a drawing. A flow
here is the typical path a request takes through the library, not a sequence to
walk: enter at the stage the request has reached, skip what the request does not
need, and leave as soon as the requested outcome is met. A small, clear change
may touch only build and verify.

Read each tree top-down. `group ─ lead` names a stage and the skill that routes
inside it; `├─` and `└─` are the skills or steps it hands to, in the usual
order. Text to the right says when that branch is taken. The tree drawn by
`node scripts/list-skills.mjs --format tree` is the membership; this file adds
the order.

## End-to-end

From a fuzzy idea to a merged, deployed change, and back into the library.

```
coordinate ─ orchestrate-work           the team lead, across every stage
investigate ─ understand                on demand: evidence handed back for any stage
clarify ─ brainstorm                    the team lead, with the user: settle the ask into a brief
  └─ plan ─ planner                     planner: map, spec, tickets or plan from the brief
      └─ build ─ implement-spec         workers: make the change
          ├─ design ─ design            smart_worker, beside build for anything a user sees
          └─ verify ─ validate-implementation  tester and reviewers
              ├─ browser-verification   when a user sees or does something
              ├─ code-review            design/review joins as a lens
              └─ deliver ─ delivery     commit → pr → babysit → merge → deploy → cleanup
                  └─ harness ─ harness
                      ├─ retrospective  improve the working environment
                      ├─ hillclimb      improve a product or domain outcome
                      └─ automate-workflow  establish or operate repeated jobs; detached improvements
records ─ docs-workspace                beneath every stage: where documents, data and prose go
```

Coordinate spans every stage rather than being one: it is the team lead's
group. [orchestrate-work](../../orchestrate-work/SKILL.md) is reached whenever
work is delegated, with [coordinate](../../coordinate/SKILL.md) above it when one
chat runs several teams. Investigate and records are not stages; any role
calls them on demand: [understand](../../understand/SKILL.md) whenever a stage
needs evidence and [docs-workspace](../../docs-workspace/SKILL.md) whenever a
plan, finding, state or evidence must be written somewhere. The harness group
follows delivery and is also reached on demand: its
[library method](../../harness/library/METHOD.md) whenever the library itself
changes.

## Clarify

```
clarify ─ brainstorm                    one question at a time, closes with a brief
  └─ planner                            in a team, the brief goes to plan
```

[brainstorm](../../brainstorm/SKILL.md) is where the user's decisions are made,
including questions about terms and contracts. Small, clear work leaves it
straight for build.

When asked to deepen an existing task, Brainstorm reads the shared
[deepen reference](../../prompt-refine/references/deepen.md) directly and
continues shaping the task and brief. A rewritten prompt is a separate
requested output, owned by [prompt-refine](../../prompt-refine/SKILL.md).

## Plan

```
plan ─ planner                          from a settled brief; advice when stuck
  ├─ wayfinder                          large, ambiguous effort: a map of decision tickets
  │   └─ to-spec                        a durable PRD when the request alone is not enough
  │       └─ to-tickets                 actionable tickets with real dependencies
  ├─ domain-modeling                    when the work defines terms or needs an ADR
  ├─ api-design                         when the work defines an HTTP contract
  ├─ audit                              read-only: conventions lines, debt issues, strong candidates
  └─ sketch-first                       ground through how and why, at least two sketches
      ├─ design-red-flags               screen every sketch before choosing
      └─ writing-plans                  exact files, checks and order for the handoff
          └─ plan-review                a package or a risky plan, by a fresh planner
              └─ implement-spec         the plan becomes build's input
```

Planner owns the five plan skills; a decision it cannot settle from the brief
returns once as one batch of questions (once per frontier wave for wayfinder).

[planner](../../planner/SKILL.md) uses
[sketch-first](../../planner/references/sketch-first.md) when the shape of the
change is still open, screens against
[design red flags](../../planner/references/design-red-flags.md), and shapes the
handoff with [writing plans](../../planner/references/writing-plans.md). A
multi-ticket package, and a saved plan that carries real risk, gets one
[plan review](../../planner/references/plan-review.md) by a fresh planner
before implementation. The [codebase audit](../../planner/references/audit.md)
is a side branch: it compares recently changed areas with the target
conventions and feeds repository adoption, not a plan.

## Investigate

```
investigate ─ understand                answer from evidence, change nothing
  ├─ understand/how                    method: runtime flow, placement and ownership
  ├─ understand/why                    method: rationale, history and tradeoffs
  ├─ understand/teach                  method: runs how and why, then explains plainly
  ├─ recall                             where a piece of work stands, before resuming it
  ├─ research                           external documentation and sources
  └─ diagnosing-bugs                    exit: a confirmed defect needs a repair
```

[understand](../../understand/SKILL.md) hands the answer back and never edits.
[how](../../understand/how/METHOD.md), [why](../../understand/why/METHOD.md), [teach](../../understand/teach/METHOD.md)
are its nested methods. [Research](../../research/SKILL.md) answers external questions, and
[recall](../../recall/SKILL.md) rebuilds a thread's current state from the
workspace before any transcript; a repair leaves the group for
[diagnosing-bugs](../../diagnosing-bugs/SKILL.md).

A lasting explainer, a figures page and an article kept true to the files,
crosses groups. [teach](../../understand/teach/METHOD.md) owns it through
[building an explainer](../../understand/teach/references/explainer.md):

```
investigate ─ understand/teach         the reader, the questions, one per figure
  ├─ understand/how, understand/why     the facts, and the files each figure rests on
  ├─ design/drawing, design/colour      the figures page
  ├─ writing, writing/unslop            the article, in the explanation mode
  └─ browser-verification               both themes, phone width, then publish
```

## Build

```
build ─ implement-spec                  a settled request, ticket or spec
  ├─ tdd                                tests before code when new coverage is needed
  ├─ diagnosing-bugs                    the repair loop for a failure or regression
  ├─ database-workflow                  database reads, migrations and protected execution
  └─ validate-implementation            hand the candidate to verify
```

[implement-spec](../../implement-spec/SKILL.md) coordinates the change;
[tdd](../../tdd/SKILL.md) writes the tests first and
[diagnosing-bugs](../../diagnosing-bugs/SKILL.md) repairs.
[database-workflow](../../database-workflow/SKILL.md) owns the shared database
access and execution method, also used by investigate and delivery.

## Design

```
design ─ design                         the project's design authority first
  ├─ design/app-ui                      page and route hierarchy
  ├─ design/layout                      grouping, alignment, reading order, growth
  ├─ design/components                  reuse, compose, adapt
  ├─ design/sourcing                    choosing a library, block or effect
  ├─ design/shadcn                      shadcn projects and registries
  ├─ design/colour                      ramps, tokens, contrast
  ├─ design/motion                      transitions, gestures, feedback
  ├─ design/data-visualization          charts and data-shaped visuals
  ├─ design/map-gis-interface           map chrome and controls
  ├─ design/ai-chat-interface           turns, streaming, composer
  ├─ design/marketing                   pages that have to persuade
  ├─ design/mobile-native               web apps in a phone browser
  ├─ design/prototype                   a throwaway surface to answer a question
  ├─ design/drawing                     illustration and diagrams as the deliverable
  ├─ design/video                       videos and motion graphics as code
  ├─ design/impeccable                  new work, critique, polish, live iteration
  ├─ design/review                      independent visual review within the existing review
  ├─ design/ideate                      visual directions before a build
  ├─ design/audit                       a live flow audited screen by screen
  ├─ design/ux-research                 what users complain about
  └─ evidence                           browser-verification, in verify
```

[design](../../design/SKILL.md) develops a light brief and loads craft methods
as the active pass needs them. Its [staged workflow](../../design/references/workflow.md)
couples composition and typography, checks a representative before extending a
new pattern, then refines colour, detail and any needed motion. Running surfaces
use [browser-verification](../../browser-verification/SKILL.md); artifacts use
their medium's rendering workflow. [Design review](../../design/review/METHOD.md)
covers the visible result within the existing independent review.

## Verify

```
verify ─ validate-implementation        select and record the checks
  ├─ browser-verification               anything user-visible, in the running app
  ├─ code-review                        independent review of a fixed slice
  │   └─ design/review                  lens when the diff touches a visible surface
  └─ findings                           back to build; otherwise on to delivery
```

[validate-implementation](../../validate-implementation/SKILL.md) chooses the
checks, [browser-verification](../../browser-verification/SKILL.md) proves live
behaviour, and [code-review](../../code-review/SKILL.md) reviews the candidate.
Confirmed findings return to [implement-spec](../../implement-spec/SKILL.md); a clean
candidate moves to [delivery](../../delivery/SKILL.md).

## Deliver

```
deliver ─ delivery                      one authorized step, nothing past it
  ├─ ci                                 when the pipeline itself is the work
  └─ commit
      └─ pr
          └─ babysit
              └─ merge
                  └─ deploy
                      └─ cleanup        retire the merged branch and its worktree
```

[delivery](../../delivery/SKILL.md) runs only the step the request authorizes;
each later step needs its own authority. [ci](../../ci/SKILL.md) is reached when
the work is the pipeline, not a change passing through it.

## Harness

```
harness ─ harness                       the router: improve, maintain and package the harness
  ├─ retrospective                      the broad sweep: what to keep, and where it belongs
  │   ├─ skill-refine                   one skill, flagged by the user or the sweep
  │   ├─ tool-eval                      tool friction and wasted calls
  │   ├─ verify-eval                    review, validation and CI friction and effectiveness
  │   ├─ library                        a proposal for the shared library
  │   └─ project standards              an authorized in-project lesson
  ├─ library                            classify, then change the shared library
  │   └─ authoring-a-skill              group, sibling links, tree, checks
  │       └─ skills-list                overlap scan, then the drawn tree
  │           └─ checks → delivery → deploy and sync
  ├─ cloud-env                          inventory → provider config → secrets with the user → probe
  ├─ update-packages                    sources → pending updates → tickets → a fresh team lead
  ├─ doc-bench                          does the instruction page help a fresh model
  ├─ hillclimb                          any measured outcome, one tested change at a time
  │   └─ frame → baseline → change and measure → understand → decide, repeat
  ├─ automate-workflow                  establish, operate and improve repeated jobs
  │   ├─ domain runner                  checkpoints, recovery and outcome evidence
  │   └─ orchestrate-work               detached improvement; existing review and delivery
  └─ keep-codex-fast                    local storage growth and slowness
```

[harness](../../harness/SKILL.md) routes each request to one nested method. Its
[retrospective](../../harness/retrospective/METHOD.md) reads
[session evidence](../../harness/retrospective/references/session-evidence.md)
and returns a proposal for the [library method](../../harness/library/METHOD.md)
or a project standard, handing one skill, the tools or the review loop to
skill-refine, tool-eval or verify-eval. [hillclimb](../../hillclimb/SKILL.md)
is also reached directly to improve any outcome with a number, in any domain.
Each hillclimb attempt starts from a prediction plus the result that would
disprove it; the skill owns the method.

[automate-workflow](../../automate-workflow/SKILL.md) can start before or during a
batch, or inspect it retrospectively. It keeps the domain runner and completion
rules with their project, uses hillclimb for experiments, and adopts verified,
delivered improvements on the next run without changing an active batch.

The [library method](../../harness/library/METHOD.md) follows
[authoring a skill](../../harness/library/references/authoring-a-skill.md) when a
skill is added or changed, and uses this skill to scan for overlap before and to
draw the tree after; a shared role follows
[authoring a role](../../harness/library/references/authoring-a-role.md).
[keep-codex-fast](../../keep-codex-fast/SKILL.md) is a separate branch of the same group.

## Coordinate

```
coordinate                              above: one chief-of-staff chat, a team chat per ticket group
coordinate ─ orchestrate-work           each chat's team lead: assign, integrate, own delivery
  ├─ fast_worker                        clear, bounded implementation
  ├─ smart_worker                       harder implementation and repairs
  ├─ explorer                           trace a code path
  ├─ researcher                         an external evidence question
  ├─ tester                             run selected checks
  ├─ reviewer                           independent review of a fixed candidate
  ├─ planner                            the map, spec, tickets or plan; an uncertain approach
  ├─ fast_review                        independent review of a bounded slice or candidate
  ├─ goal-setter                        a goal to a dispatched agent, kept running until Done
  ├─ team                               one lead, up to six more, owned to closure
  ├─ autonomy                           decide before asking the user
  ├─ long-runs                          run, pause or pick up
  └─ programme                          a programme that outlives sessions
```

The first eight are agent roles, not skills.
[coordinate](../../coordinate/SKILL.md) sits above orchestrate-work: one
chief-of-staff chat opens a chat per ticket group, and each chat's team lead runs
orchestrate-work. [team](../../orchestrate-work/references/team.md) is how each
team it admits runs. [orchestrate-work](../../orchestrate-work/SKILL.md) holds the
[assignment](../../orchestrate-work/references/assignment.md) contract and the
[authorization](../../orchestrate-work/references/authorization.md) reference
they carry. Its [autonomy](../../orchestrate-work/references/autonomy.md),
[long-runs](../../orchestrate-work/references/long-runs.md) and
[programme](../../orchestrate-work/references/programme.md) references cover
deciding without asking, long runs and standing programmes.

## Records

```
records ─ docs-workspace                the project's registered workspace
  ├─ inbox                              a drop filed into the business brain, then its check
  ├─ handoff                            the brief for the next chat, pasted or filed; inbox cleanup
  ├─ prompt-refine                      draft or refine a prompt; optional deepen pass
  └─ writing                            instructions, docs and prose
      ├─ seo-programme                  optional, business sites: search pages and the weekly run
      └─ writing/unslop                 method: edit or finish a deliverable, never chat
```

[docs-workspace](../../docs-workspace/SKILL.md) resolves where a document goes;
[inbox](../../inbox/SKILL.md) turns a drop into a linked draft in the project's
brain and runs the brain check; [handoff](../../handoff/SKILL.md) writes the
brief that hands work to the next chat and later releases the finished ones;
[writing](../../writing/SKILL.md) shapes the prose itself,
[seo-programme](../../seo-programme/SKILL.md) adds the search and evidence layer
to a site's pages and runs its weekly SEO/AEO programme, and
[unslop](../../writing/unslop/METHOD.md) is the last pass before a deliverable ships.

[prompt-refine](../../prompt-refine/SKILL.md) is directly invokable and owns
prompt drafting and refinement. Its shared
[deepen reference](../../prompt-refine/references/deepen.md) is optional:
Writing reads it directly when asked to deepen the current assignment, then
continues its draft or revision. Brainstorm and Writing retain their own outputs;
only a separate request for a rewritten prompt enters prompt-refine.

Native browser tool instructions own browser control;
[browser-verification](../../browser-verification/SKILL.md) owns acceptance checks.
