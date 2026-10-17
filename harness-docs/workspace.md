---
type: Reference
title: Workspace
description: The workspace starter, and where a project's working documents live.
---
# Workspace

One external workspace serves each project and all of its worktrees. Goals,
findings and plans are ordinary Markdown there, outside code commits; no
database, schema or writer command is required. A task's state and its small
scratch live in `.state/` at the root of the checkout it runs in, which ignores
itself and goes with the worktree.

| Thing | Owner |
|---|---|
| Resolution, routes and the host registry | [docs-workspace](../skills/docs-workspace/SKILL.md) |
| Starter files and document recipes | [harness-docs-starter/](../harness-docs-starter/README.md) |
| Adoption sequence and preservation rules | harness-setup-guide.md |
| Durable project facts and subject authorities | the repository's PROJECT.md |

The starter is the minimal workspace: AGENTS.md, README.md, LICENSE, seven seeded
working folders (goals, findings, prds, specs, adrs, features, plans) and twenty
recipes in `templates/`, including the `PROJECT.md` recipe populated at a
repository root, plus the `brain/` skeleton a business vault starts from. Copy
and reconcile it during adoption;
keep `PROJECT.md` at its repository owner rather than inside the workspace, and
do not create a second workspace project map.

This repository's own working documents use the root registered for this
harness's project in [registry.json](../skills/docs-workspace/registry.json): the
git-ignored `workspace/` folder in this vault, as
PROJECT.md states. Resolve it rather than
writing a path from memory, because that registry owns the host-specific mapping
and every worktree shares the one root. A fresh copy of the harness has no
`workspace/` folder. To start one, create it, copy the contents of
workspace-seed/ into it (its `AGENTS.md` and the
two board views), start a `README.md` and a `log.md`, and register the folder as
this harness's workspace and brain root in the host registry. Edit the
seed's `AGENTS.md`, not the copy, which must match it.

The fuller OKF material is the upstream template clone at
`<reference-repos>\llm-wiki-okf` (commit 6bd8eee, the revision inbox's
`check_okf.py` is pinned to), beside the LLM-wikid clone at
`<reference-repos>\llm-wikid`. Both are read-only references: a menu for fresh
documentation collections, not a required workspace format, and never copied
into a project. The staged harness copy of the OKF template was retired on
2026-09-30 after its useful parts were folded into the starter and the inbox
skill; it remains in this repository's history.
