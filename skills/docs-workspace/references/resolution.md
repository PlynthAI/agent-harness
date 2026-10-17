# Workspace resolution

Use an explicit user or project path directly. When a destination is unknown,
run the read-only resolver from the checkout (or pass `--cwd <checkout>`):

```bash
node <shared-skills>/docs-workspace/scripts/resolve-workspace.mjs resolve
```

It reports the stable project identity, exact shared workspace, document routes,
optional roots and any declared writer. Read the external workspace's `AGENTS.md`
when present before writing. No writer or database is required for Markdown.

## Commands

| Command | Purpose |
|---|---|
| `resolve` | current worktree's project, workspace, routes and optional roots |
| `projects` | registered projects and whether each workspace exists |
| `check` | validate registry structure and identity conflicts |
| `assets` | configured design asset routes, namespaced by project identity |

Options: `--registry <path>`, `--cwd <dir>`, `--workspace-root <path>`. `assets`
also takes `--task <relative>` and `--asset <relative>`. Commands print JSON;
successful resolution exits `0`, including expected missing or unused routes;
explicit failures exit `2`. Exit `0` does not mean every destination is writable:
use each route's state before writing. See [registry format](registry-format.md)
for the registry discovery order, host mappings and all error codes.

## Reading the result

- `project.id` comes from the registered Git remote, never the checkout name.
  Every worktree resolves to the same external `workspace.root`.
- `routes.<name>` carries `path`, `location`, `exists`, `state` and a `variant`
  when the alternate dotted/plain spelling exists. States are `populated`,
  `empty`, `missing`, `file`, `unreadable` and `not-used`. `location` is
  `scratch-root` when the host scratch root holds artifacts and scratch, and
  `workspace` otherwise.
- `brain` names the business brain (Obsidian vault) the project belongs to, and
  whether the workspace sits inside it; `scratchRoot` names the host task-storage
  folder. Either is `null` when the registry does not set it.
- `project.trackedRoutes` identifies documents that remain in Git.
- `optionalRoots` reports data/design roots, and `shared` holds the host-wide
  roots every project may read (`projects` lists them too). An unconfigured root has a null
  path and state `unconfigured`; an unresolved root is `unresolvable`.
- `writer` is optional registry metadata, reported but never invoked.
- `warnings` reports absent storage and unresolved conditions.

Missing storage is not ambiguity when its destination is established. Resolution
creates nothing; an authorised document may create just the folder it needs,
including at a resolved workspace that does not exist yet. Do not pre-create an
empty folder tree. If no destination or owner can be established, ask rather
than guess. Report actual conflicts, unreadable storage or variant splits;
do not rename or migrate them implicitly.

## Identity and containment

Read host paths from the registry; do not embed drive paths in reusable methods.
A conflicting `--workspace-root` or `CODEX_WORKSPACE_ROOT` is refused so an
override cannot create a second tree. Resolution also refuses workspace storage
inside a repository worktree and ambiguous registered identities.

For another project's documents, use its known path or resolve its checkout,
then read its instructions and tracked routes. Do not invent cross-repository
symlinks or substitute another workspace for a missing source document.

New owned design assets use the configured design root and stable project id:
`<design root>/<project id>/{source,working,export}`. `assets` creates nothing;
absolute or traversing task/asset components and links escaping the namespace
are refused. An unconfigured root is an absent capability, not an invitation
to invent one. See [routes](routes.md) and the optional project recipe
`asset-provenance.md` at the workspace AGENTS-declared template path.
