# Harness docs workspace

A maintained external workspace starter, a company brain skeleton, optional
document recipes and a repository `PROJECT.md` template. Adopted documents become the project's own
content; shared skills still own reusable workflows.

## Repository project map

Populate [templates/PROJECT.md](templates/PROJECT.md) at the repository root as
`PROJECT.md`. Assemble durable project facts and routes from existing documents
and useful local skill references. Group them by subject: product/domain,
architecture, contracts/data, design, development/checks, operations/delivery,
tracker and workspace. Keep only relevant subjects. Existing authority documents
retain ownership; link them instead of copying prose or inventing required docs.
Several shared skills can use one subject reference; do not create an adapter per
skill or clone shared workflow guides into the repository.

Use [templates/repository-agents.md](templates/repository-agents.md) for the
repository's concise AGENTS.md: verified commands near the top, consequential
local constraints and a PROJECT.md pointer. Nested instructions add only subtree
differences. Global preferences and shared methods stay at user level.
The user-level AGENTS.md supplies shared-skill routing; do not repeat it here.
Keep this recipe in workspace templates/; do not apply it to workspace AGENTS.md,
whose document-routing purpose is different.

Use one project map: repository `PROJECT.md`. The external workspace's README.md
owns knowledge and task navigation and links back to that map for durable facts.
Do not create another project.md in the workspace. Existing workspace project.md
files remain readable until their useful navigation and consumers are reconciled
into README.md during adoption; never place both case variants in one folder.

## Workspace navigation

Fill these links when adopting this README into an external workspace. Read only
the entries relevant to the task; do not duplicate project facts or tracker status.

| Entry | Owner or route |
|---|---|
| Project facts | <repository PROJECT.md or existing facts owner> |
| Goals and useful findings | <links by feature or question as records appear> |
| Active task records | <relevant plans/checkpoints and chat links> |
| Retained legacy references | <paths needed by active tasks or cited evidence and current authoring route, or none> |

The remaining sections guide adoption and refresh, not every document edit.

## Folder map

The starter holds two shapes: the workspace skeleton at its root (one per
repository) and a brain skeleton in `brain/` (one Obsidian vault per business).
In a brain, each repository's workspace sits at `Workspaces/<repo>/`.

~~~text
<workspace-root>/             # the starter root; Workspaces/<repo>/ in a brain
  AGENTS.md                   # routes below
  README.md
  LICENSE
  goals/                      # goals
  findings/                   # findings
  prds/                       # prds, unless trackedRoutes keeps them in Git
  specs/                      # specs, same Git rule
  adrs/                       # adrs, same Git rule
  features/                   # features, same Git rule
  plans/                      # plans: plan.md per task (state lives in the checkout's .state/)
  .artifacts/                 # artifacts; under scratchRoot when set, always in a brain
  .task-scratch/              # scratch; under scratchRoot when set, always in a brain
  templates/                  # local recipes; the brain's Templates/ when in a brain

brain/                        # <Brain>/ once adopted
  AGENTS.md                   # routes, front-matter contract, Extensions table
  Home.md                     # human start page
  Home/                       # Inbox.base, Needs review.base, Roadmap.base
  index.md                    # root index, okf_version "0.2"
  log.md                      # dated change log, newest first
  Inbox/
    .raw/                     # machine pulls until routed
  Sources/
  Company/
    Meetings/  Decisions/  SOPs/  Standards/  Access/
  Marketing/
  <work units>/               # declared in the brain's Extensions table
  Templates/                  # the one recipe set; excluded in Obsidian
  Attachments/
  Workspaces/
    <repo>/                   # the workspace root above
  .obsidian/                  # link format, template folder, excluded files, graph colours
~~~

[AGENTS.md](AGENTS.md) routes workspace agents and
[brain/AGENTS.md](brain/AGENTS.md) routes brain agents. This README provides
workspace navigation and explains adoption. The empty working folders are
included for convenience; .gitkeep files preserve this blank shape in the
harness's Git. Knowledge routes have plain names so Obsidian shows them;
`.artifacts/` and `.task-scratch/` are dot-named so it ignores them. Actual
workspace records stay outside code commits. Create task or feature subfolders
only when there is content.

## Document recipes

Use these as starting points, deleting irrelevant sections:

| Need | Recipe | Usual destination |
|---|---|---|
| Intended outcome and user stories | [goal](templates/goal.md) | goals/<feature>.md |
| Learning, failed approaches and uncertainty | [finding](templates/finding.md) | findings/<feature>/<topic>.md |
| Product problem, value and scope | [PRD](templates/prd.md) | prds/<slug>.md, unless trackedRoutes keeps it in Git |
| Detailed behaviour and interfaces | [SPEC](templates/spec.md) | specs/<slug>.md, same Git rule |
| A consequential, durable decision | [ADR](templates/adr.md) | adrs/<nnnn-slug>.md, same Git rule |
| How to reach and drive a user journey | [feature](templates/feature.md), [feature map](templates/feature-map.md) | features/<journey>.md, same Git rule |
| Optional execution method | [plan](templates/plan.md) | plans/<task>/plan.md |
| Optional recovery checkpoint and chat links, kept by the team lead | [state](templates/state.md) | .state/state.md at the root of the checkout the task runs in |
| Review or handoff evidence | [review](templates/review.md), [handoff](templates/handoff.md) | .artifacts/<task>/ |
| A large or multi-run task folder's own purpose, owner and release condition | [task storage](templates/task-storage.md) | AGENTS.md in the task folder, or the task README |
| Visual standards in the Google DESIGN.md format | [design](templates/design.md) | DESIGN.md at the repository root, checked with `npx designmd lint DESIGN.md` |
| The architecture pattern by name, its bindings and departures | [architecture](templates/architecture.md) | Existing architecture owner or repository ARCHITECTURE.md |
| Code conventions by name, their bindings and departures, and proven lessons | [coding standards](templates/coding-standards.md) | Existing standards owner or repository CODING_STANDARDS.md |
| Launch, exercise, inspect and clean up the app | [verification](templates/verification.md) | Existing testing guide or docs/VERIFICATION.md |
| Terms and avoided synonyms | [glossary](templates/glossary.md) | GLOSSARY.md at the repository root, when useful |
| Source and usage rights of an asset | [asset provenance](templates/asset-provenance.md) | Beside the retained asset |
| Brain records: inbox note, source, content draft, business decision, meeting, SOP | [inbox](brain/Templates/inbox.md), [source](brain/Templates/source.md), [content](brain/Templates/content.md), [decision](brain/Templates/decision.md), [meeting](brain/Templates/meeting.md), [sop](brain/Templates/sop.md) | The homes in [brain/AGENTS.md](brain/AGENTS.md) |

Concept recipes (goal, finding, PRD, spec, ADR, feature, feature map and the
brain records) carry front matter: `type`, `title` and `description` required,
`status: draft` when an agent writes the page, and the optional fields that
recipe needs. [brain/AGENTS.md](brain/AGENTS.md) holds the full contract.

Design and glossary are optional recipes, not empty root documents. A project
with a visual surface keeps one complete DESIGN.md at its repository root in
the Google format, and `designmd lint` checks it; an existing design document
moves there in a reviewed alignment change with its consumer updates. Existing
architecture, glossary, contracts and runbooks keep their authoritative homes
unless adoption includes a reviewed move and its consumer updates. Software
repositories require architecture and coding-standards pages, written from the
target conventions, not from the tree as it stands; their recipes say how, and
accidental departures go to debt issues instead. Link those homes, and the
design library profile, drawing theme and component index, from repository
PROJECT.md (or retain existing direct workspace links where no repository map
exists); do not maintain a second editable copy or invent facts to fill a
template.

Shared `docs-workspace` uses this workspace's `templates/`, declared in AGENTS.md.
Copy the complete template folder during adoption so agents can see and use the
available recipes without reaching the harness checkout. Templates are starting
documents, not duplicate workflow skills or required paperwork. The harness owns
the base recipes; local adaptations belong to the project. Refresh deliberately,
preserving adaptations and filled documents; no background synchronization is
required. Missing recipes do not block plain Markdown authoring.

## Adopt a fresh project

Adopt repository PROJECT.md separately as described above. For the external
workspace, copy AGENTS.md, README.md, LICENSE and the complete templates/ folder
into the chosen root. Seed the working folders in the folder map even when
empty. Fill project, root and ownership placeholders; point to local
templates/. Keep templates/PROJECT.md as a recipe, not another workspace root
map. When the project is a business, also follow Brain adoption below. For a
fork, record upstream and intentional departures in its repository map.
When adopting this README, keep the local recipe catalogue and verify its links.
For an existing workspace, add missing files and folders; reconcile useful local
guidance and adapted recipes rather than overwriting them with blank starters.

Route working documents through PROJECT.md from repository AGENTS.md. Keep the
workspace destination and its instructions at that map's existing owner, and
reconcile nested guidance without copying the route into each subtree.

If a registry/resolver is used, align its mapping with that pointer and verify it
from the active checkout. An explicit path needs no resolver or setup command.
No installer, database, symlink tree or task-ID service is needed.

## Adopt an existing project

Work on one project at a time. Reconcile at its established external root by
default; choose a different root deliberately and update its consumers.

- Read workspace/repository instructions and inventory goals, findings, plans,
  active task pointers and known evidence. Use metadata/search to find relevant
  work; do not require reading every artifact.
- Populate or reconcile repository PROJECT.md from existing subject authorities
  and useful project facts in skill references. Preserve their owners and current
  contracts; remove duplicate procedure entrypoints only after their callers and
  useful facts are reconciled. Link the repository map from workspace README.md.
  Reconcile useful navigation from an existing workspace project.md into README.md,
  update its consumers and retire that duplicate map within the adoption scope.
- Refresh useful goals against current intent and evidence. Keep findings that
  explain decisions, failures or uncertainty; correct stale conclusions with
  reasons and source links. Retain useful unfinished plans and update next actions.
  A format conversion neither proves a claim nor completes a task.
- Fold duplicate records into one authoring home. Treat old plans as history
  unless their outcome is still wanted. Keep retired material out of the active
  project map; preserve unique knowledge, original bytes and cited evidence.
- Copy missing scaffolding and reconcile existing files; do not overwrite a live
  AGENTS.md, README.md or template blindly. Preserve active writers. Use simple
  comparison/copy operations; no migration engine or full rewrite.
- Update the root pointer, relevant nested instructions, template paths and any
  registry notes together. For tracked documents with code/test consumers,
  reconcile consumers as part of an owned move or retain the current home.
- Start future tasks on the new routes. Existing tasks may finish at their
  recorded locations. Before moving or deleting a legacy folder, handle current
  writers, references and needed recovery. Age or a merged PR alone does not make
  its files disposable. Exact duplicates and task-owned disposable files can be
  removed within the adoption's cleanup scope.

Check the route from the canonical checkout and a relevant worktree, read a
retained evidence link, and verify one small new task record at its assigned path.
Review the actual routing/content changes and reuse applicable checks; copying
prose alone needs no application build.

The team lead chooses or reuses a short task folder name only when files help. Children
use supplied destinations and distinct filenames, or return results inline.
Keep useful chat links once in an existing plan, checkpoint or handoff. No
per-child registration, forced plan/checkpoint pair or new status ledger.

## Brain adoption

A project that is a business gets a brain: one Obsidian vault for the business,
with every repository's workspace inside it. Secrets, task scratch and retained
artifacts never enter a brain.

- Copy `brain/` to the chosen vault root, outside source checkouts. Fill the
  placeholders in AGENTS.md, Home.md, index.md and log.md, and declare the
  business's own folders, work units, types and fields in the AGENTS.md
  Extensions table. Add extra templates to `Templates/`.
- Copy the complete templates/ recipe set into the brain's `Templates/`, beside
  the brain recipes, so the brain keeps one copy for all its workspaces.
- Copy each repository's workspace from the starter root into
  `Workspaces/<repo>/`, without templates/, `.artifacts/` or `.task-scratch/`.
  Its artifacts and scratch resolve to the host scratch root (the registry's
  `scratchRoot`) outside the vault. An existing workspace moves in through
  Adopt an existing project above.
- Give each project's registry entry `workspaceRoot` (the brain's
  `Workspaces/<repo>/`) and `brainRoot` (the vault root), and check the
  resolver reports both. docs-workspace owns those keys.
- Open the vault in Obsidian and turn on the core Templates plugin once:
  `obsidian vault=<name> plugin:enable id=templates` through the Obsidian CLI
  (docs-workspace's `obsidian-cli.md` reference), or by hand in Settings when
  the app has no CLI. The shipped `.obsidian/` already sets the Templates
  folder, wikilinks, the attachment folder, the excluded `Templates/` folder
  and graph colours. Add nothing machine-specific to `.obsidian/`, and no
  plugin that stores keys in the vault.
- Prove the adoption with the same CLI: `plugins:enabled filter=core` lists
  `templates`, `base:query` on each Home view returns the seeded pages,
  `unresolved` is empty, and `dev:screenshot` of Home lands in the project's
  artifacts route.

A project without a brain, such as a tool repository, keeps a standalone
workspace from the starter root.

Every vault has one home page that reaches everything a reader reviews:
explainers, areas or skills, and authorities. A brain's is `Home.md`; a
repository opened as a vault uses its knowledge collection's index. Bookmark
it, and link an explainer from it rather than filing the explainer in another
vault.

## Repository-agent handoff

Adapt this brief with real paths and scope:

> Adopt <project> using <harness-source>/harness-docs-starter at <workspace-root>.
> Populate repository PROJECT.md from existing subject authorities and useful
> project facts in skill references; retain one shared entrypoint per reusable
> workflow. Keep meaningful local instructions in repository AGENTS.md and link
> the project map. Reconcile workspace navigation into README.md and retire any
> duplicate workspace project.md after updating its consumers. Reconcile
> the external workspace separately, then refresh useful goals,
> findings and unfinished plans against current evidence. Establish one authoring
> home per record; preserve active tasks, unique knowledge and needed evidence.
> Retire obsolete routes and safely remove disposable duplicates within scope.
> Keep repository consumers and project safeguards working. Verify routing from
> a checkout/worktree and a representative old and new record; get independent
> review of changed material. Return what changed, retained legacy paths,
> genuine unresolved choices and evidence. Follow the task's commit/PR/merge
> authority; adoption grants no new publication or production authority.

## Format and fuller reference

New concept pages use the front-matter contract in
[brain/AGENTS.md](brain/AGENTS.md), a minimal OKF profile. Project navigation, task
records, instructions and native evidence keep their formats; the whole mixed
workspace is not automatically a strict OKF bundle. No format check is required
for ordinary notes.

The upstream OKF template clone (a read-only reference repository; the
harness's workspace document records where it lives) remains the fuller
source/reference template for fresh documentation collections. Select useful
pages when needed; it is not copied into every project and is not bundled with
an install. This OKF-derived starter retains Apache-2.0 in LICENSE.
