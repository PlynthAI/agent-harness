---
type: Reference
title: Operations
description: Source, install, checks and pending material for this harness.
---
# Operations

## Source verification

Commands, evidence and check improvement live in
[docs/VERIFICATION.md](../docs/VERIFICATION.md); shared validation selects.

## Source and installation

The maintained source is this repository. The live installation is the owner's
Codex home. Copying reviewed files into an install happens only when the owner
explicitly asks for it; [harness's library method](../skills/harness/library/METHOD.md) owns
the preparation, review and apply procedure.

| Material | Location | Status |
|---|---|---|
| Maintained source | this repository | reviewed on a branch |
| Live installation | the operator's Codex home | owner's copy of the copied files |
| Review packets under the ignored `.local/` area | `.local/proposals/<proposal-id>/` | review artefacts, never a change to the live harness |
| Active task state and small scratch | `.state/` at the root of the checkout the task runs in | ignored by its own `.gitignore`; goes with the worktree, so copy anything worth keeping to artifacts first |
| Plans and supporting evidence | the project's declared workspace and its artifacts route | retained while the work and any citation need it |
| Staging for unadopted material | wip-harness-inbox/ | staging, not deployed |
| Visual guide source | guide/harness-guide.html | versioned, published by the Kitchen site as How it works, `/explore/how-it-works/`; the harness library's [harness-guide reference](../skills/harness/library/references/harness-guide.md) owns its refresh |

Release task scratch and bulky artifacts when their documented purpose ends,
after retaining the small result, reproducible input references and required
recovery. A citation alone need not keep every raw trace or intermediate copy
forever; update current links to the retained explanation. Active work, durable
datasets and named operator exclusions stay protected. Unknown legacy material
needs a concrete owner or missing-fact decision, not a blanket keep or deletion.

`.local` is not required by installed skills. In this source checkout it holds
review packets, temporary tests and the retired in-checkout workspace (its
artifacts and task scratch, and the nightly review's review root); the working
documents now live in the ignored `workspace/` folder
(workspace routing). Build a
fixture from the required tracked inputs, excluding `.local`, `workspace/`,
environments and unrelated repository copies. Clean disposable fixtures when the test finishes
(including failure paths), retaining the small result and reproducer when useful.
For an interrupted run, reconcile its retained outputs at task closeout. Real
worktrees under `.local/worktrees` still use delivery's lifecycle; moving an old
tree into another archive does not finish cleanup or free its disk space.

For storage growth and ongoing maintenance, use the shared
[storage lifecycle](../skills/keep-codex-fast/references/storage-lifecycle.md).
[Delivery](../skills/delivery/references/worktree-retirement.md) owns checkout and
branch retirement; [docs-workspace](../skills/docs-workspace/references/large-data.md)
owns large task-data placement. Keep host measurements/exclusions in the existing
workspace evidence; no new storage service or per-repository procedure is required.

## The public copy

A public repository carries a cleaned snapshot of this source.
`node config/publish-public.mjs --out <new folder>` builds it from one commit
(`--ref`, default HEAD): the tracked files minus what
`config/public-mirror.json` leaves out, with its
replacement files (the public README, its MIT LICENSE, an example workspace registry) swapped in.
The build is refused when any file carries a denied string: the owner's
personal strings in `config/public-deny.mjs`, which
the Kitchen site's build also enforces, and the mirror's project terms. A
report beside the folder lists what was left out and each Markdown link to a
left-out path, which the copy keeps as plain text. `--push <owner/name>` adds the snapshot to the public
repository's main branch as one new commit under the mirror's author; this repository's
history never leaves. The owner's section 01 stays in `AGENTS.private.md`,
which is never published; the public copy carries `AGENTS.private.example.md`
in its place. `checks/public-copy.test.mjs` runs the same scan over the working
tree on every run-all, so a leak is caught when it is written, not at publish.

## Checks

`checks/run-all.ps1` runs the declared source checks, including the PowerShell
checks and the executable Node suites. Install-related helpers are optional
maintenance tooling: `checks/install.ps1` with
[config/install-map.json](../config/install-map.json) provides a planned apply,
a timestamped backup, a manifest and a rollback. Nothing here installs itself,
and green checks are not deployment authorization.

## Reading and checking this collection

Reading a page needs no tooling, and no gate depends on this collection's format.
The optional OKF checker that ships with the staged reference template can be
pointed at this directory when a maintainer wants a structural check of these
pages; it is a local aid, not certification.
