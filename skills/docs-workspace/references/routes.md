# Routes

Every route name here is the resolver's vocabulary, not a host path. Resolve the
root; never write a path from memory. An explicit path the user or the project
gives you is already resolved, so the resolver is a navigation aid rather than a
prerequisite for opening or writing a document.

Every document below is a Markdown file an agent reads and writes directly. No
database, table, schema or writer command is a prerequisite for a goal, a
finding, a plan or a task's state. A project keeps the history it already has:
existing records stay readable, and they are not the shape a new document has to
copy.

## Required routes

| Route | Where the file goes | Holds |
|---|---|---|
| `goals` | `goals/<module>.md`, one flat file per module | the finished outcome, its user stories and the observable finish |
| `findings` | `findings/<scope>/<slug>.md` | what was learned, what failed and what is still open |
| `prds` | `prds/<slug>.md`, when the project keeps one | the product problem, value and scope |
| `specs` | `specs/<slug>.md`, when the project keeps one | detailed behaviour and interfaces |
| `adrs` | `adrs/<nnnn-slug>.md`, when the project keeps one | one consequential decision and its rationale |
| `features` | `features/<journey>.md`, when the project keeps one | how to reach and drive one user journey |
| `plans` | `plans/<task-id>/plan.md` | the method for one task, shared by its worktrees; where the task has got to is the team lead's `.state/state.md` in the checkout (see [plan and state](plan-and-state.md)) |
| `artifacts` | `<task-id>/` in the resolved artifacts folder (see task storage) | review reports, check receipts, screenshots, the task's closeout `handoff.md`; a briefing for the person to hand to another chat goes to the brain's `Inbox/` through inbox instead |

A project may keep a route in Git instead; `trackedRoutes` names it. Choose the
document that helps: nothing forces a PRD, a spec and an ADR onto one task, and a
goal does not need one.

## Task storage

Artifacts and scratch are task storage, not knowledge. When the registry sets a
host `scratchRoot`, they go to `<scratchRoot>/<project id>/artifacts/` and
`<scratchRoot>/<project id>/task-scratch/`, outside the workspace. Without one
they stay in the workspace as `.artifacts/` and `.task-scratch/`. The dot hides
their bulk from Obsidian. Task storage never lives in a brain; `check` refuses a
registry that would put it there. The route's `location` says which applies.

A task that runs in a Git checkout keeps its state and small scratch in that
checkout's `.state/` instead, which ignores itself and goes with the worktree
([plan and state](plan-and-state.md)). The `scratch` route is for work with no
checkout and for bulky data that several worktrees share or that must outlive
one worktree ([large data](large-data.md)). The resolver does not report
`.state/`; it is always at the checkout root.

## Other routes

| Route | Holds | Note |
|---|---|---|
| `reviews` | existing review assessments | readable history; new reports go under the `artifacts` route |
| `receipts` | existing command records | readable history; do not add a second store |
| `objects` | existing tool-managed payloads | not an authoring folder |
| `index` | existing derived navigation | not an authoring folder |
| `scratch` | `<task-id>/` in the resolved scratch folder: working space for a task with no checkout, and bulky data worktrees share | retain useful evidence in the `artifacts` route before cleanup; a checkout's own scratch is its `.state/` |

`objects`, `index` and `receipts` belong to the tools that already write them. Do
not add a document there by hand and do not choose them as a general output
folder. Expected `missing` and `not-used` routes need no finding or skip note.
Resolution creates nothing; an authorised document creates only the folder it
needs. Report a destination conflict or unreadable path when the task needs it.

## Route states

| State | Means |
|---|---|
| `populated` | exists and has entries |
| `empty` | exists and has none - a real directory, not a missing one |
| `missing` | configured folder does not exist; create only when an authorised document needs it |
| `file` | the configured path is a file, not a folder |
| `unreadable` | cannot be listed or reached as a directory: an unreadable directory, broken link, link to a file, or descendant of a non-directory ancestor |
| `not-used` | the project deliberately does not use this convention (`path: null`) |

`unresolvable` appears for a project root that cannot be resolved on this host,
and `unconfigured` for an optional data or design root with no path set.

## Reading another project's workspace

A task in one project often needs a document from another - a frontend change
that reads the backend's contract, for example. Resolve that project rather than
guessing its path:

    node <shared-skills>/docs-workspace/scripts/resolve-workspace.mjs resolve --cwd <its checkout>

Then read the resolved workspace's own `AGENTS.md` and its `trackedRoutes`, so the
reader knows what lives in the workspace and what still lives in Git. Never
recreate a cross-repository symlink tree, never invent a path for a project that
is not registered, and report a project whose workspace or snapshot is missing
instead of substituting one.

## Source inputs

Acquired source data is not a document route. It comes from the optional root the
resolver reports for the project, and the guidance path its own note names owns
acquisition, original bytes, provenance, retention and backup. Read that path: the
guidance may sit beside the data root rather than inside it, so never assume a
rules file at the root itself. Fetch or download the original before any upsert
into a store, and perform no database operation from this skill.

## Design asset routes

Design assets are not a document route. A project with a configured design root
owns new assets under it, namespaced by the resolver's stable `project.id`:

    <design root>/<project id>/{source,working,export}

`source` holds originals and references brought in, including the creative and
marketing inputs a task starts from; `working` holds derivatives and task working
output; `export` holds approved output meant for another consumer. Keeping the
three apart is what stops a derivative being mistaken for the original it came
from, and stops an approved export reading as disposable.

Resolve them with the resolver rather than writing a path from memory:

    node <shared-skills>/docs-workspace/scripts/resolve-workspace.mjs assets

`--task <relative>` and `--asset <relative>` resolve one path inside those routes.
Both are refused when they are absolute or carry a `..` segment, and an existing
link that points outside the namespace is refused rather than followed. A project
with no configured design root reports the capability as absent
(`unconfigured`); report it only when the task needs that capability. The
repository owns the design standards; this skill does not invent one.

Task evidence still lives in the `artifacts` route and links to the asset path
rather than copying the asset in. Provenance is optional and compact: see
the optional project recipe `asset-provenance.md` at the workspace
AGENTS-declared template path.

## Never

- Resolution is read-only and always creates nothing. That is a property of
  reading, not a prohibition on every write: a user-authorised initialisation or
  recovery of a workspace may create the routes it was asked for. What is never
  allowed is inferring the tree - inventing a path, a route name or a folder
  forest that no resolver reported and no owner asked for.
- Never rename or duplicate a live route to satisfy a convention. Creating the
  one folder an authorised document needs is not a violation; building a tree
  nobody asked for is.
- Never require a tool, a table or a database to write a document that Markdown
  can carry.
- Never treat a route as evidence about a project's domain rules.

