# Plan and state

Use only the records that help this task. A small clear request needs neither a
saved plan nor a state file unless the project requires one. Existing records
remain readable; this guidance does not require migration. Read optional recipes
at the template path declared by the workspace AGENTS.md; their absence never
blocks direct Markdown.

## plan.md

The optional project recipe `plan.md` holds the outcome and scope,
approach, and one execution checklist with evidence beside completed items.
Use phases for meaningful dependencies. Keep risks, decisions and links only
when useful; link existing requirements rather than copying them. The project
tracker owns deliverables and their dependencies, while this checklist breaks
one task into executable steps.

Read the plan before continuing. Reconcile affected items at material transitions
through [tracking reconciliation](tracking-reconciliation.md).
Keep completion evidence beside the item it proves instead of maintaining
separate done, ready and resume lists. Recording a finding or deferral alone
does not complete an implementation step.

## state.md

The optional project recipe `state.md` carries the current
overall status, one next action and any immediate warning. Use it when resuming
or handing off would otherwise require reconstructing the task's position, and
for work likely to outlast one context window. It can point to the checklist
item and its evidence; do not copy the checklist or its history into the
checkpoint. Update it whenever the next action changes, not only at a pause or
handoff: a context compaction gives no warning, and the hook that follows one
sends the agent back to this file.

Keep `## Status` and `## Next action` when using the template: the read-only
task-state reader (`scripts/task-state.mjs read`) displays those sections from
`.state/state.md` in the checkout it runs in. Other prose is free form, and a
missing state file does not require creating one.

## Where the plan and the state live

The plan is shared. Follow the project's resolved plans route, normally
`plans/<task-id>/plan.md` in its external workspace, shared by all worktrees.
Read that workspace's `AGENTS.md` before writing. Source templates are reusable
guidance; editing them does not rewrite live task records.

The state belongs to one checkout. `state.md` lives at `.state/state.md` in the
root of the checkout the task runs in: its worktree, or the canonical checkout
when there is no worktree. `.state/` is the task's scratch in that checkout: it
also holds the reviewer's findings file and any small working files. Whoever
first creates the folder writes `.state/.gitignore` containing the single line
`*`, so it needs no setup in the repository, never shows in `git status` and
stays out of code commits. Retiring the worktree removes it. Copy anything in it
worth keeping (a finding's evidence, a review report) to the task's `artifacts`
before then; in a canonical checkout with no worktree, the team lead removes `.state/`
at closeout.

With no Git checkout, as for work inside a business brain where scratch never
lives, task state and scratch stay on the resolved `scratch` route under the host
scratch root, in `<task-id>/`. Bulky data that several worktrees share, or that
must outlive one worktree, also stays there ([large data](large-data.md)). Older
`plans/<task-id>/state.md` files and existing scratch folders stay where they are
and stay readable; nothing moves them.

For work that needs saved files, the team lead reuses the existing task folder name or
chooses a short label once. Helpful chat/checkout and related-file links go in an
existing checkpoint, plan or handoff. No ID registration or new record is needed
for small tasks; missing metadata never blocks work. Resume the same folder
across chats instead of renaming older evidence.

Children use supplied paths, with distinct filenames or assigned subfolders for
parallel output. They return results and paths. No per-child ID or chat record
is needed, and a concise inline result is enough when no file is useful.

There is one state file per checkout, and only the team lead, the agent
coordinating the task, writes it. Subagents keep no state file: they are tightly scoped and
return results. The reviewer keeps none either; it writes only its findings
list, each finding as soon as it is confirmed, to the file its assignment names
or else a new file in `.state/` at the root of the checkout it reviews. The team
lead writes the kept review record after sorting real findings from rejected ones
(code-review describes it).

All roles use the same plan when present. Planner establishes the approach;
workers return step outcomes and evidence to the plan's named writer. Reviewers
read the fixed candidate and accepted plan or request, and the team lead owns
integration and handoff. Update the existing plan for material changes.
