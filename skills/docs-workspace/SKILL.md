---
name: docs-workspace
description: Find project document paths and write goals, findings, plans, state or evidence using the project's storage conventions.
metadata:
  group: records
  lead: true
---

# Docs workspace

Use the user or project's explicit path when known; no resolver command is
required. Otherwise resolve the project before choosing where to write:

```bash
node <shared-skills>/docs-workspace/scripts/resolve-workspace.mjs resolve
```

Read the workspace's `AGENTS.md` when present: an external workspace is outside
the checkout's automatic instruction chain. Follow project routes and
`project.trackedRoutes` for documents kept in Git. Every worktree shares the
project's registered workspace; keep task plans and findings there, outside code
commits. An explicitly registered, Git-ignored folder in the canonical checkout
can serve that shared root; it is not a per-worktree fallback. The one
repo-local folder is `.state/` at the root of the checkout a task runs in: the team lead's
`state.md` and the task's small scratch, ignored by its own `.gitignore` (see
[plan and state](references/plan-and-state.md)). Do not invent a second tree or
any other repo-local scratch folder.

Repository `PROJECT.md`, when present, maps durable project facts and subject
authorities. The external workspace's `README.md` maps goals, findings, tasks and
legacy evidence, pointing back to the repository for facts. Do not create a second
workspace project map. Existing workspace `project.md` files remain readable until
their useful navigation and consumers are reconciled during authorized adoption.
Read only relevant subjects; no whole document tree read is required.

Resolution is read-only. A resolved `missing` folder does not block an authorised
document: create only the folder it needs. If ownership or the destination is
actually ambiguous, ask which path to use. Report conflicts or unreadable paths
without silently substituting or moving storage.

Documents are plain Markdown edited directly. No database, schema or writer
command is required. Choose only the records useful for this task; no mandatory
PRD, spec, ADR or plan stack.

## Where a document goes

Route defaults are relative to the external workspace; project routing wins.
The two rows routed to the checkout are not workspace routes.
The resolver reports each route's real path, so a project that still uses a
dotted name such as `.goals` keeps it until its folders are renamed.

| You have | Route | File |
|---|---|---|
| a finished outcome | `goals` | `goals/<module>.md` |
| something learned or still open | `findings` | `findings/<scope>/<slug>.md` |
| the method for one task | `plans` | `plans/<task-id>/plan.md` |
| that task's current position, kept by the team lead | none: the checkout | `.state/state.md` at the root of the checkout the task runs in |
| a product problem and scope | `prds` | `prds/<slug>.md`, when useful |
| detailed behaviour or interfaces | `specs` | `specs/<slug>.md`, when useful |
| a consequential decision | `adrs` | `adrs/<nnnn-slug>.md`, when useful |
| how to reach and drive a user journey | `features` | `features/<journey>.md`, when useful |
| evidence and outputs with a current retention purpose | `artifacts` | `<feature-or-task>/` in the resolved artifacts folder |
| small working files and the reviewer's findings list | none: the checkout | `.state/` at the root of the checkout the task runs in |
| scratch with no checkout, or bulky data several worktrees share | `scratch` | `<task-id>/` in the resolved scratch folder |

A checkout's `.state/` is created by whoever first needs it, with a
`.state/.gitignore` holding the single line `*`, and it goes when the worktree
is retired. Copy anything in it worth keeping to `artifacts` first.

Artifacts and scratch are task storage. When the registry sets a host
`scratchRoot`, they live at `<scratchRoot>/<project id>/artifacts/` and
`task-scratch/`, outside the workspace. Otherwise they stay in the workspace,
dotted by default (`.artifacts/`, `.task-scratch/`). They never live in a brain (a business's
Obsidian vault, reported as `brain`), even when the workspace itself sits in one.
A drop for the brain (an idea, link, file, video or X bookmark) goes through
[inbox](../inbox/SKILL.md), which files it as a draft and runs the brain check.
A briefing for the person to hand to another chat is never a file under
artifacts or scratch: [handoff](../handoff/SKILL.md) returns it paste-ready or
files it as a handoff note in the brain's `Inbox/`. The task's own closeout
record (the `handoff.md` recipe) stays in `artifacts`.
Brain setup that lives in app state (plugins, Home views, templates, layout, a
rendered screenshot) uses the [Obsidian CLI](references/obsidian-cli.md) when
the app is present; notes are always written with file tools.

The other records skills sit beside this one: a brief that hands work to the
next chat, pasted or filed in the brain's `Inbox/`, and the later cleanup of
finished handoff notes, is [handoff](../handoff/SKILL.md); capture and sorting
in the brain is [inbox](../inbox/SKILL.md). A database read route, migration or
data change is build's [database-workflow](../database-workflow/SKILL.md).

This skill decides where a document goes and its format;
[writing](../writing/SKILL.md), a sibling in records, owns how it reads. When a
records skill produces prose for a reader, load the matching writing reference
at that moment (technical docs, agent instructions, marketing or email) and
finish with writing's [unslop method](../writing/unslop/METHOD.md). A page or
weekly programme for search and AI answers is
[seo-programme](../seo-programme/SKILL.md). Drafting or refining a prompt is
[prompt-refine](../prompt-refine/SKILL.md); it returns the prompt without executing
the described task.

Consult relevant goals and prior findings before investigating; search by feature,
question, source or failure. Update one canonical finding as evidence changes,
preserving failed approaches, conditions and uncertainty. See discovery below.

When useful, the plan holds one execution checklist; optional state holds recovery
context and next action, not another checklist. All roles share the plan. There
is one state file per checkout and only the team lead writes it; subagents and the
reviewer keep none and return results. At verified delivery, handover,
supersession, a material status change or a durable discovery, the lead or named
record writer reconciles affected existing records through
[tracking reconciliation](references/tracking-reconciliation.md). Intermediate
calls, unchanged or already-recorded outcomes, and self-contained tasks with no
relevant record or durable finding need no write, skill read or skip note for
upkeep. Retain evidence needed by findings before clearing task-owned scratch;
active work and originals are not disposable.
Keep legacy records readable; `objects`, `index` and `receipts` remain owned by
their existing tools. Source data and design assets keep their separately
configured roots and acquisition guidance; the repository owns design standards.

## Load only what the task needs

- [Large task data](references/large-data.md): database staging/caches, temporary
  exports, duplicate avoidance and retirement in the shared workspace.
- [Workspace retention](references/retention.md): what is durable, what is
  task-owned and releasable, and the completion update that owns the release table.
- [Resolution](references/resolution.md): unknown paths, other projects,
  worktrees, optional data/design roots and resolver commands.
- [Registry format](references/registry-format.md): host mappings and validation.
- [Routes](references/routes.md): route states, source inputs and design assets.
- [Plan and state](references/plan-and-state.md): the shared plan, and the
  checkout's `.state/` for the team lead's state file and task scratch.
- [Discovery](references/discovery.md): finding the existing documents.
- [Adoption](references/adoption.md): new projects, existing roots and legacy paths.
- [Workspace instructions and starter source](references/workspace-agents.md):
  adopting one external project root.
- [Obsidian CLI](references/obsidian-cli.md): brain setup and checks through
  the app (plugins, bases, templates, link health, screenshot); not the write path.
- [Tracking reconciliation](references/tracking-reconciliation.md): record
  upkeep at material transitions, current pointers and readable history.
- [Docs audit](references/docs-audit.md): keep an adopted repository's
  documents true, on request or on a schedule.
- [Learning events](../delivery/references/learning-events.md): optional bounded
  learning after a verified transition.

## Optional templates

Read recipes in the workspace's local `templates/`, seeded from harness-docs-starter
during adoption and declared in workspace AGENTS.md. Existing projects may name
another location until adopted. The names below are workspace-relative examples.
Use only helpful recipes; there is no compulsory document stack. Missing or inaccessible
templates never block direct Markdown authoring, and the installed skill needs
no harness checkout or machine-specific source path.

- `templates/goal.md`
- `templates/finding.md`
- `templates/plan.md`
- `templates/state.md`
- `templates/handoff.md`
- `templates/review.md`
- `templates/prd.md`
- `templates/spec.md`
- `templates/adr.md`
- `templates/asset-provenance.md`
- `templates/task-storage.md`
- `templates/design.md`
- `templates/architecture.md`
- `templates/coding-standards.md`
- `templates/verification.md`
- `templates/feature-map.md`
- `templates/feature.md`
- `templates/glossary.md`

For repository adoption only, the harness starter also offers
`templates/PROJECT.md` and `templates/repository-agents.md`, also seeded as local
recipes. Populate these at the repository root as PROJECT.md and AGENTS.md,
never as competing instructions or a second project map in the external workspace.
