# Workspace registry format

`scripts/resolve-workspace.mjs` holds the reusable method and contains no host
paths. This document describes the registry document that supplies them.

Resolution is **read-only**. Nothing is created, moved, renamed, migrated or
deleted. A route that does not exist yet is reported as missing.

## Where the registry is read from

First match wins:

| Order | Source | Required if set |
|---|---|---|
| 1 | `--registry <path>` | yes - a missing explicit path is an error |
| 2 | `CODEX_WORKSPACE_REGISTRY` | yes - a missing explicit path is an error |
| 3 | `<CODEX_HOME>/workspace-registry.json` (default `~/.codex/workspace-registry.json`) | no |
| 4 | `registry.json` beside `scripts/` - the copy shipped with this skill | no |
| 5 | `config/workspace-registry.json` three levels above `scripts/` - the factory source layout | no |

An explicitly named registry that is unreadable is an error, not a fallback.
That keeps a typo from silently resolving against a different host mapping.

The shipped copy (order 4) is the reviewed host mapping and travels with the
installer. Machine-specific overrides belong in order 2 or 3, so they never
have to be edited back into the skill.

## Document shape

```jsonc
{
  "schemaVersion": 1,
  "description": "free text",
  "plainNamesPreferred": true,
  "workspaceParent": "<absolute parent for project workspaces>",
  "workspaceLayout": "v1",
  "scratchRoot": "<absolute host folder for task storage>",
  "routes": { "goals": "goals", "findings": "findings", "prds": "prds" },
  "projects": [ /* see below */ ]
}
```

| Field | Required | Meaning |
|---|---|---|
| `schemaVersion` | yes | must be `1` |
| `workspaceParent` | no | parent directory; a project root derives as `<parent>/<project id>/<layout>` |
| `workspaceLayout` | no | leaf folder name under the parent; default `v1` |
| `routes` | no | registry-wide route names; merged under the built-in defaults |
| `plainNamesPreferred` | no | when true, a dotted knowledge route also reports that this registry prefers the plain spelling. Artifacts and scratch are exempt, since they are dotted by convention. The shipped mapping sets `true`; a configured name is reported as written and never renamed |
| `scratchRoot` | no | absolute host folder for every project's task storage. When set, `artifacts` resolves to `<scratchRoot>/<project id>/artifacts` and `scratch` to `<scratchRoot>/<project id>/task-scratch`, whatever the project's route value; a route set to `null` stays unused. When absent, both stay in the workspace. It must sit outside every brain |
| `projects` | yes | non-empty array |
| `sharedRoots` | no | host-wide roots any project may read, such as a cross-project design library: `{ "id", "path", "note" }` with an absolute path |

`%VAR%`, `$VAR` and `${VAR}` are expanded from the environment, and a leading
`~` expands to the home directory. Project roots, brain roots and the scratch
root must resolve to absolute paths; route values must stay relative to the
workspace root.

### Project entry

```jsonc
{
  "id": "example-project",
  "identity": {
    "remotes": ["example-org/example-project"],
    "root": "packages/example"        // optional: monorepo subdirectory
  },
  "workspaceRoot": "<absolute path>",  // optional if workspaceParent is set
  "workspaceLayout": "v1",             // optional per-project override
  "brainRoot": "<absolute path>",      // optional: the business brain (vault)
  "routes": { "private-hold": "private" },
  "trackedRoutes": [
    { "id": "goals", "path": "docs/00-Tracking/goals", "note": "why it is here" }
  ],
  "writer": null,                     // optional; reported, never invoked
  "dataRoots": [ /* optional roots */ ],
  "designRoots": [ /* optional roots */ ],
  "notes": ["free text carried into the output"]
}
```

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | stable project identity: 1-64 characters, `[a-z0-9._-]`, starting alphanumeric |
| `identity.remotes` | yes | one or more `owner/repo` slugs; https, ssh, scp-style and `.git` suffixes all normalise to this form |
| `identity.root` | no | repository-relative root for a monorepo package |
| `workspaceRoot` | conditionally | absolute path, or derived from `workspaceParent` + `id` + layout |
| `brainRoot` | no | absolute path of the business brain, the Obsidian vault this project's knowledge belongs to. The workspace may sit inside it (`<brain>/Workspaces/<repo>`) or outside it, or be it: a workspace that carries its own `AGENTS.md`, `log.md` and `Inbox/` inside a larger vault, as the harness's does, is its own small brain. `resolve` reports it as `brain`; `projects` and `check` list it. When the workspace sits inside the brain, the registry must set a `scratchRoot` outside it |
| `routes` | no | per-project route overrides and additions; merged over registry and built-in defaults |
| `trackedRoutes` | no | repo-relative routes that stay in Git instead of the workspace |
| `writer` | no | an existing project writer, or `null`; reported, never invoked |
| `dataRoots` / `designRoots` | no | optional additional roots |

Identity is the registered remote, never the checkout directory name, so a
renamed worktree still resolves to the same project.

### Writer entry (optional)

No writer is required. Goals, findings, plans and task state are plain Markdown
edited directly: a `goals`-style route holds records, a task folder carries
`plans/<task-id>/plan.md`, and the team lead keeps the task's state at `.state/state.md`
in the checkout the task runs in, which no route names. A writer
command, a record schema, an index or a database is not a prerequisite for that
work, and registering one here never makes it one.

The resolver **reports** a writer block and never invokes it. Where a project
genuinely keeps its own writer, the block is free-form and is carried into the
output unchanged:

```jsonc
{
  "tool": "<path to the project's own tool>",
  "invoke": "<how the project runs it>",
  "commands": ["<a command the project already has>"],
  "note": "free text"
}
```

`writer` may be `null`, and omitting it means the same thing. Every project
registered here today sets `null`.

### Optional roots

```jsonc
{ "id": "source-data", "path": "<absolute or workspace-relative>", "env": "EXAMPLE_DATA_ROOT", "scope": "shared", "note": "free text" }
```

An absolute `path` is used as written; a relative one resolves against the
workspace root.

An optional root with no configured path reports `state: "unconfigured"` and
`path: null`; one that is configured reports the same states as a route.

A configured `designRoots` entry is where a project's **new** owned design
assets go, namespaced by the stable project id:
`<design root>/<project id>/{source,working,export}`. `source` holds originals
and references, `working` holds derivatives and task output, and `export` holds
approved output that is not disposable. `assets` reports the three routes and
their state; it creates no directory and copies nothing. Two projects sharing
one design root resolve distinct destinations because the namespace is the
project id. An existing link that resolves outside the namespace is refused, and
so is an absolute or parent-directory `--task`/`--asset` component. Retained
originals keep their current location; nothing here relocates them.

A `sharedRoots` entry belongs to the host, not to a project: a resource every
project may read, such as the design library the `design` skill reaches. It is
reported as `optionalRoots.shared` by `resolve` (scope `shared`) and as
`sharedRoots` by `projects`, which needs no registered checkout, so an
unregistered repository can still find it. It is read-only here, is never a
destination for project assets, and a missing one is reported, never created.

## Route names

Built-in defaults, overridable. Knowledge routes are plain: `goals`, `findings`,
`prds`, `specs`, `adrs`, `features`, `plans`, `reviews`, `receipts`. Task storage
is dotted: `artifacts` (`.artifacts`) and `scratch` (`.task-scratch`). A dot means
Obsidian ignores the folder, so knowledge stays visible in a vault and task
storage stays hidden. `objects` and `index` are retired conventions: they keep
their names so a registry can still be explicit about them, and default to
`null` so nothing invites an agent to create them.

For every route the resolver reports the resolved path, its `location`
(`workspace`, or `scratch-root` when a `scratchRoot` holds it), existence, type
(`dir`, `file`, `link`, `missing`, `unreadable`), a state of `populated`,
`empty`, `missing`, `file` or `unreadable`, the immediate entry count, and - when the
opposite spelling (`prds` vs `.prds`) exists beside it - a `variant` record.
Mapping an existing dotted folder is reporting, not migration. When a scratch
root holds a route and the old in-workspace folder still exists, a warning names
it; nothing is moved.

Setting a route to `null` marks it deliberately unused by that project. The
route is still reported, with `state: "not-used"` and `path: null`, so a reader
can tell "this project does not use that convention" apart from "it should exist
and does not". The eight required routes (`goals`, `findings`, `prds`, `specs`,
`adrs`, `features`, `plans`, `artifacts`) cannot be disabled. Where the two spellings of one
convention both exist on disk, the configured one is reported as the route and
the other as its `variant`; resolution reports the split and renames nothing.

## Adding a project

1. Add a project entry with `id`, `identity.remotes` and either `workspaceRoot`
   or a registry `workspaceParent`.
2. Run `node scripts/resolve-workspace.mjs check`. It validates structure,
   duplicate identities, duplicate roots and monorepo disambiguation, and never
   requires a path to exist.
3. Run `resolve` from the new checkout and confirm the reported routes match the
   project's real storage - not an aspiration.
4. Only then register the root in that project's own docs.

Two projects may share one remote only when every one of them sets
`identity.root` and the roots differ.

## Output and exit codes

Every command prints JSON.

| Command | Purpose |
|---|---|
| `resolve` | resolve the current worktree's project, root, routes, brain, scratch root, writer and optional roots |
| `projects` | list every registered project, its remotes, its root, its brain root and whether the root exists, plus the host scratch root |
| `check` | structural validation of the registry |
| `assets` | report where new owned design assets go, namespaced by project id, and report a missing design root as an absent capability |

`projects` reports each root's `state` as `populated`, `empty`, `missing`,
`file`, `unreadable` or `unresolvable`, where `unreadable` means the path exists
but could not be inspected, and `unresolvable` means the configured path cannot
be resolved to a real location on this host; that entry also carries an
`unresolvable` message field. Route entries whose project marks them not used
are reported as `null`.

Exit `0` means resolved, or `check` found no problems. Exit `2` means an explicit
failure; the payload carries `error.code`, one of `not-a-git-worktree`,
`unregistered-identity`, `outside-project-root`, `ambiguous-identity`,
`workspace-inside-worktree`, `conflicting-override`, `registry-not-found`,
`registry-invalid`, `registry-invalid-json`, `registry-unreadable` or
`workspace-unresolvable`, plus `asset-component-invalid` and
`asset-namespace-escape` from `assets`.

`asset-component-invalid` means the `--task` or `--asset` value was empty,
absolute, or carried a `.`, `..` or `:` segment; nothing is resolved from a
component that could leave the namespace. `asset-namespace-escape` means an
existing path under the project namespace resolved physically outside it - a
link that leaves the directory that owns the asset - so it was refused rather
than followed. A project with no configured design root is not an error: it
reports `designRoot: null`, `state: "unconfigured"` on each asset route and a
warning naming the absent capability.

`unregistered-identity` means no configured project claims this repository's
remote. `outside-project-root` means the remote did match, but the working
directory sits outside every configured `identity.root`; `details.candidates`
names the project roots that were excluded.

`workspace-unresolvable` also reports an unavailable Git ignore query for a root
inside the canonical checkout; inspect the cause before treating it as unignored.

`workspace-unresolvable` otherwise means the configured root cannot be resolved to a real
location on this host - for example a drive letter that does not exist. The path
can be perfectly absolute and still fail here, which is what separates it from a
folder that is merely missing. That is a configuration fault, so it fails rather
than silently substituting another root.

A missing workspace is **not** an error: it is reported as
`workspace.exists: false` with a warning, so an agent can tell "not set up yet"
apart from "wrong place".

`resolve` also reports `brain` (`null`, or `root`, `exists`, `state` and
`workspaceInside`) and `scratchRoot` (`null`, or `path`, the project's
`projectPath` beneath it, `exists` and `state`). A missing brain or scratch root
is reported with a warning and never created.

`workspace.placement` reports `outside-worktrees` or
`ignored-in-canonical-checkout`. An explicitly registered root may sit strictly
inside the canonical checkout (the first Git worktree) when Git reports it
ignored, including before the directory exists. This preserves a single
machine-local workspace used from sibling worktrees. A root equal to or
containing a checkout, inside a secondary worktree, or unignored inside the
canonical checkout still fails with `workspace-inside-worktree`. Resolution
never creates or moves the registered root.

## What this deliberately does not do

- It does not create, initialise, repair or migrate a workspace or a route.
- It does not replace any project's writer or lifecycle store.
- It does not write the live Codex configuration.
