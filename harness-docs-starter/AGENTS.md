# <project> workspace

Root: <workspace-root>, outside source checkouts and shared by this project's
worktrees. Repository AGENTS.md must point here and require reading this file;
external instructions are not auto-loaded. The repository owns code and checks.

## Find and write

Start at README.md's workspace navigation, then search relevant goals and findings by feature, question,
error or source. Read applicable evidence before repeating an investigation.
No whole-workspace read is required. Local starter templates are in `templates/`,
or in the brain's `Templates/` when this workspace sits in a brain (one copy per
brain); use the relevant recipe below when helpful and omit sections that add
nothing. The harness seeds these during adoption; preserve project adaptations
on refresh. A missing or inaccessible recipe never blocks writing.
Read README.md's adoption sections for adoption and refresh work, not every edit.

| Route | Destination | Purpose | Template |
|---|---|---|---|
| `goals` | goals/<feature>.md | Outcome, user stories and acceptance | goal.md |
| `findings` | findings/<feature>/<topic>.md | Conclusions, failed approaches and uncertainty | finding.md |
| `prds` | prds/<slug>.md, unless trackedRoutes keeps it in Git | Product problem, value and scope | prd.md |
| `specs` | specs/<slug>.md, unless trackedRoutes keeps it in Git | Detailed behaviour and interfaces | spec.md |
| `adrs` | adrs/<nnnn-slug>.md, unless trackedRoutes keeps it in Git | A consequential, durable decision | adr.md |
| `features` | features/<journey>.md, unless trackedRoutes keeps it in Git | How to reach and drive a user journey | feature.md, feature-map.md |
| `plans` | plans/<task-id>/plan.md | Optional approach and single execution checklist | plan.md |
| none: the checkout | .state/state.md at the root of the checkout the task runs in | Optional recovery checkpoint, written only by the team lead | state.md |
| none: the checkout | .state/ at that checkout root | The task's small working files and the reviewer's findings list | None |
| `artifacts` | .artifacts/<feature-or-task>/ | Retained evidence, originals and useful outputs | review.md, handoff.md when useful |
| `scratch` | .task-scratch/<task-id>/ | Scratch for work with no checkout, and bulky data several worktrees share | None |

When the registry sets a host `scratchRoot`, `artifacts` and `scratch` resolve
there, outside this workspace; a workspace in a brain always uses it, so task
storage never enters the vault. Use the path the resolver reports. Knowledge
routes have plain names so Obsidian shows them; dot-named folders stay hidden.
A task's own state and small scratch live in `.state/` at the root of the
checkout it runs in, not here: whoever first creates the folder writes
`.state/.gitignore` holding the single line `*`, and retiring the worktree
removes it, so copy anything worth keeping to `artifacts` first. In a canonical
checkout with no worktree, the team lead removes `.state/` at closeout.

The working folders in README.md's folder map are seeded during adoption.
Create task or feature subfolders only for actual content. A task may need a
checkpoint without a plan, or neither. `state.md` records next action, partial
work and warnings; it does not repeat the plan checklist. The project tracker owns issue status.
When saving task files, reuse the supplied task folder name. The team lead adds
useful chat and file links once in an existing record; small tasks need no registration
or extra document. Missing metadata never blocks work. Children write distinct
files at their assigned destination and return paths. There is one state file
per checkout and only the team lead writes it; subagents and the reviewer keep none and
return results. Do not create per-child IDs or records.
Project exceptions and active legacy tasks: <routes and owners, or none>.
Shared methods stay in installed harness skills. Repository PROJECT.md maps
durable project facts and their subject authorities; this workspace supplies
knowledge and task routes. Keep one editable home for each standard.

## Ownership and retention

- Put task-specific database staging, caches, transforms and temporary exports in
  the `scratch` route (`.task-scratch/<task>/`), not worktrees or authoritative
  source stores. Retain accepted outputs and required recovery in the `artifacts`
  route (`.artifacts/<task>/`). Reference shared
  original inputs instead of making per-agent copies. For large payloads, record
  their purpose, owner, size and release condition once in the task's existing
  README/checkpoint; follow shared docs-workspace's large-data guidance.
- Prefer configured paths to links. Canonical inputs and accepted intelligence
  datasets use the project's durable data store, including data awaiting ingestion.
  Disposable staging stays in this workspace; children reuse inputs by path.
- Keep one goal per feature and one authoring home per finding. Other repositories
  link to that owner. Re-read before editing; one writer integrates overlapping
  contributions. Preserve other writers' additions.
- Update findings as evidence changes. Distinguish observation, inference and
  uncertainty; retain contrary evidence and why conclusions were superseded.
  Ordinary authorized learning needs no separate approval or optimiser run.
- Plans survive interruption while active, and a checkout's `.state/` lasts
  until its worktree is retired. Refresh useful records at handoff. Keep task
  records and evidence out of code commits.
- Keep artifacts supporting a finding or useful after a task closes. Before
  clearing task-owned scratch, retain unique evidence and fix its links. A finding
  keeps its insight, input references and minimal reproducible evidence, not bulk
  logs or traces kept forever. Do not remove active work, originals, a curated
  dataset or another task's files as routine cleanup, and do not keep material
  "just in case"; name the consumer or its next review instead.
- A task whose output is large or spans several runs records its folder's purpose,
  its canonical task/goal/issue link, file or group purpose and release condition,
  the writer/service owner and how to stop or check it, and any retained exception
  or review trigger in one place - a small `AGENTS.md` in that task folder, or the
  existing task README. Small notes need neither. Cleanup reads that file
  deliberately because folder instructions are not auto-loaded, and treats it as
  evidence rather than permission. Seed it from `templates/task-storage.md`.
- Accepted documents with real repository consumers remain at their versioned
  owner (`trackedRoutes` or repository guidance). Link instead of mirroring.
- No database, table, schema or writer command is a prerequisite for task docs.
- Existing `objects/` and `index/` stores are legacy tool-owned surfaces, not
  new authoring routes. Active legacy tasks finish at their recorded paths;
  future tasks use the routes above. Retirement ends new writes, not retention
  of evidence still needed by a consumer or recovery. Merge may release temporary
  test output; it does not automatically release durable datasets or recovery.
- Use explicit paths or resolve-workspace.mjs for other projects and read their
  guidance. Do not rebuild cross-repository symlinks. Data caches and design
  assets retain separately configured owners.

## Knowledge format

README.md provides knowledge and task navigation and links repository PROJECT.md
for durable facts. New goals, findings, PRDs, specs, ADRs and feature pages are
OKF concepts. Their front matter carries `type` (lowercase), `title` and a
`description` that ends "Read when ..."; an agent writes `status: draft` and
only a person sets `stable`. Links are wikilinks, quoted in properties; tags are
never required. The recipes carry the optional fields. In a brain, its AGENTS.md
owns the full front-matter contract.
This workspace is mixed: AGENTS/README, plans/state, scratch and native artifacts
are not automatically concepts. Do not run a strict bundle reader over this whole
root or label it conformant. For exchange, select concept pages, navigation and
intended supporting assets into an export; check that boundary separately.
Keep native files in their format. Metadata does not grant permission or prove
facts. No exporter, database, plugin or format check is required to write notes.
