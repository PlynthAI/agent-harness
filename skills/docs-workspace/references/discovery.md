# Discovery

## Where records live

Project knowledge has two possible homes, and a reader must be able to tell
which one answers without reading everything. Task storage has a third.

| Home | Holds | How you know |
|---|---|---|
| the repository | documents a real consumer still reads: instruction routers, command references, and anything code, build, CI or tests load | `trackedRoutes` in the resolver output, and the project's AGENTS.md routers |
| the machine-local workspace | goals, findings, PRDs, specs, ADRs, feature recipes, plans and task state, all as Markdown | the `workspace` and `routes` blocks in the resolver output |
| task storage | artifacts and task scratch | routes whose `location` is `scratch-root` sit under the host `scratchRoot`; `workspace` means they are still in the workspace |

A workspace may sit inside a brain, the business's Obsidian vault. The resolver
reports it as `brain`, with `workspaceInside` saying whether the workspace is in
it. Knowledge routes use plain names there because Obsidian ignores dot-named
folders. Artifacts and scratch never live in a brain: they go to the host
scratch root, and `check` refuses a registry that would put them in a brain.

The repo is not automatically the home of every accepted document, and the
workspace is not a place to hide something a real consumer reads. The resolver
reports which is which; report a mismatch rather than moving anything.

A goal is the outcome, its user stories and the finished state - not the current
position. Where a project keeps its goals in Git, `trackedRoutes` names that path
and the workspace route stays empty until an owned migration moves it.

## How a fresh session finds them

1. User-level AGENTS.md gives the shared routing and names this skill.
2. The project's own AGENTS.md files own domain rules, commands and checks.
3. This skill plus the workspace resolver give the document routes.
4. The workspace AGENTS.md, when one exists in the workspace root, gives the
   project's short pointers to the same routes.

Step 4 is explicit, not automatic: a workspace sits outside the checkout, so the
checkout's instruction chain does not load its `AGENTS.md`. Resolve the workspace
root and read that file when present before writing there.

Then open the file itself. Goals, findings, plans and state are Markdown an agent
reads and writes directly; there is no lookup step, no command to run first and
nothing to install.

## Reading another project

A frontend task that needs a backend document resolves the backend as its own
registered project or checkout, reads that workspace root's `AGENTS.md`, and
checks `trackedRoutes` for whatever the backend still keeps in Git. It never
guesses a path, never rebuilds a cross-repository symlink tree, and reports a
missing workspace or snapshot instead of substituting one.

## What to report instead of fixing

- a route that is `missing` when the project has not adopted the convention
- a `variant` split (`prds` beside `.prds`), or a dotted knowledge route the
  registry asks to be plain
- an in-workspace artifacts or scratch folder left behind after a scratch root
  was set
- a document that only exists in the endpoint the reader is not using
- a workspace root that does not exist yet

Each of those is a one-line finding with the resolved path. Resolution alone authorises no migration. An authorised document may create
the folder it needs at an established path; ask only when ownership or the
destination remains ambiguous.


## Retrieve and improve knowledge

Start with the workspace README.md (or its declared legacy map until adopted),
then search relevant
goals and findings with file listing and rg (or available text search). Use
feature names, source names, errors and nearby terms. Read matched records and
their applicability/evidence, not every folder. Check for corrected or superseded
conclusions before reusing an old result. No semantic service is required; add
one only for demonstrated retrieval gaps. A catch-up on where a piece of work
stands starts here and goes on to transcripts and live state through
[recall](../../recall/SKILL.md).

Native PDF, CSV, image or spreadsheet evidence stays at its owner. Give a finding
a useful description and link so text search can locate that evidence; open it
with an appropriate tool and state the inspected coverage. A filename hit does
not prove the content was read.

Update an existing finding for the same question; cross-link broader applications
rather than copying conclusions into each repository. Record what changed and
why, retaining contrary evidence and failed conditions. Re-read before writing
and assign one integrator for overlapping edits. Ordinary learning does not need
a merged PR or the harness retrospective; shared workflow changes still use the harness library.
