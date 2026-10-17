---
name: library
description: Maintain the shared workflow library. Classify an artefact as owned prose, an upstream-managed package or a project-specific procedure, then prepare and apply an in-scope change to a skill, role, principle or pattern.
---

# Library

Maintain reusable workflows in the versioned harness source, then copy reviewed
changes to the user-level installation when authorized. Updating a repository
must not create another maintained copy of the same workflow.

## 1. Classify the artefact first

Every shared artefact is exactly one of three things. Decide which before
changing anything, because the class decides who maintains it and where a change
belongs.

| Class                     | What it is                                                                                 | Maintenance                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Owned prose               | Harness-authored guidance or a selective adaptation of upstream methods                    | Maintained locally; borrowed sources and required notices are retained in the root notice file and compared with upstream when updated |
| Upstream-managed package  | A whole pinned third-party package, carried as one unit, with deliberate local adaptations | Tracked against its upstream project only when that tracking is deliberate                                                             |
| Project-specific material | Requirements, commands, paths, contracts or a distinct procedure belonging to one project  | Ordinary project docs/tooling, not the shared library; a local skill only for a justified independent procedure                        |

Maintain each reusable method once in the harness. Project facts belong in
ordinary subject guides, not one adapter per skill. A local skill earns an
entrypoint only when a shared method plus project guidance cannot cover its
independently useful procedure; project names, commands or safeguards alone
are insufficient. Keep the shared verification method here and one project
guide at the authoritative route AGENTS.md names, per validation's
[setup route](../../validate-implementation/references/setup-and-maintenance.md).
References have no SKILL.md or invocation metadata.

Use [repository adoption](../../orchestrate-work/references/repository-adoption.md)
to consolidate content and consumers. Removing SKILL.md while retaining copied
workflow prose or old skill-shaped reference trees is insufficient. Preserve
useful project facts and tools at their owners; existing code, tests and
conventions are evidence, not requirements.

Upstream tracking is a deliberate status, not a consequence of having copied a
file. A selective method port remains locally maintained but is not permission
for unrecorded drift. Record whether the owner carries a complete package or
selected methods; never describe a selective port as a byte-faithful package.

## 2. Keep source and licence terms together

Before adapting a third-party method, inspect its official source and note the
revision used. [Third-party notices](../../../THIRD_PARTY_NOTICES.md) is the single
home for source anchors and required licence text. Keep it with installed skills
when they are copied. Do not add a `LICENSE` or `PROVENANCE.md` to each skill.

**Fit to the harness.** Check a port against these before it lands:

- Sources are named by the harness and the repository, never by the session's
  connectors: source control, then the project workspace through
  [docs-workspace](../../docs-workspace/SKILL.md), repository documents, the
  tracker the repository names, and an external store only where the
  repository names it as that evidence's owner. Personal connectors are never
  project evidence.
- Fan-out matches the sources the project has. A source it lacks is not
  applicable, not a gap.
- Roles and runtime terms are the harness's: shared roles through
  [orchestrate-work](../../orchestrate-work/SKILL.md), with no upstream host
  paths, subagent types, connector mapping tables or model names.
- Records go where docs-workspace routes them.
- House style holds: descriptions under 300 characters, no em dashes, plain
  language and a lean body.

A source pin records where a port began; it does not promise ongoing upstream
tracking. Decide whether a whole package is intentionally tracked, or whether
selected methods became locally owned prose. For a tracked package, keep a
coherent pin and enough comparison evidence to reapply deliberate mechanical
adaptations. A reapply script gets a throwaway-copy check. For a selective port,
review the actual method and cite material borrowed sources; ordinary editorial
changes do not need a rewrite script or prose-wording test.

When refreshing a borrowed method, compare the official source at the current
revision with the anchor and the local behavior. Preserve necessary project
routing, authorization and autonomy choices. Record material reasons and evidence
in the change's proposal or review packet; do not create another permanent
per-skill record or package inventory.

## 3. Prepare the change and keep it reviewable

This is a factory-source workflow, not an installed-copy workflow. The factory
source is the checkout where `checks/` and `config/` sit beside `skills/`
and `ARCHITECTURE.md`, because that is where the checks, copy map and harness
requirements live. When invoked from an installed copy, locate the maintained source
before editing.
An authorized harness-maintenance assignment can work there directly; no new
session or installer is required. If the source cannot be found or accessed,
report the gap and prepare a reviewable proposal in the task's resolved workspace.

Record the requested change and its review evidence. Keep the review packet under
`.local/proposals/<proposal-id>/`, one directory per proposal. The directory is
created when the first proposal needs it, and `.local` is git-ignored in this
repository, so a packet is a review artefact and never a change. A deferred or
rejected proposal leaves the live harness exactly as it was.

- `proposal.md` states the problem, the proposed change, the class it belongs to,
  the likely effect and how the change would be undone.
- The evidence the change needs sits beside it: a `patch`, a `branch` reference,
  or the output of the checks that were run against it.

An evidence-driven job can stage that packet for you: the harness
[retrospective](../retrospective/METHOD.md) reads
bounded session/run evidence or an optional recorded learning event, holds a
durable bar, and returns a grounded improvement, project finding or no-lesson
result. Follow its authority boundary: a retrospective does not grant permission
to change another project's policy or the installed shared library.

Keep candidate edits reviewable against the source bytes. Use the current owned
checkout, an isolated worktree when needed, or a staged proposal; preserve
unrelated changes and recheck source identity before applying a staged candidate.
Prefer refining an existing method over adding a new
one: an incident-specific duplicate is a maintenance cost with no owner, and it
quietly competes with the method it was cloned from.

When an upstream skill overlaps a workflow already covered here, combine the
useful guidance under one entrypoint and disclose distinct modes through
references. Different sources or mode names do not justify duplicate skills;
remove superseded entrypoints and update their callers and copy guidance.

## 4. Who may apply what

The user decides scope. A request to prepare a proposal does not authorize live
deployment; a request to update the source authorizes in-scope source edits,
checks and review. An explicit request to apply or copy the reviewed change
authorizes the agent to do so within that scope. Do not ask again for authority
already given, and do not treat green checks alone as deployment authorization.

Ordinary product work does not silently change the shared library or another
repository. Route a reusable finding to its source owner and continue unaffected
work. Respect enforced tool and permission boundaries; a different command or
agent is not a way around a denial.

## 5. Evidence for a changed executable package

Prose gets a focused review and relevant link/discovery checks. Changed scripts
also need proportional executable checks and a practical recovery route. Reuse
existing checks; do not add tests that merely require preferred prose wording.

Manual copy and reconciliation is the normal deployment path. Before an
authorized apply, compare current target bytes, preserve useful local additions,
back up replaced or retired files outside discoverable skill roots, copy the
reviewed files and verify the result. Record enough to restore changed files;
no database, manifest schema or installer command is required.

The optional source helper `checks/install.ps1` supports `-Plan`,
`-Apply -ApprovedBy` and `-Rollback -BackupId` using `manifest.json` when that
helper is deliberately chosen. These are the helper's inputs, not prerequisites
for maintaining or deploying the folder. Its presence grants no permission.

## 6. Add or change a skill or a role

A new skill is the usual way a new workflow enters the harness, and the usual
way overlap, missing links and stale routing enter with it. Read
[authoring a skill](references/authoring-a-skill.md) before writing one: it
carries the writing steps, the overlap scan, how the description triggers, the
wiring checklist and the group each skill declares. Start a new entrypoint from
[the template](assets/skill-template.md) when Codex's `$skill-creator` is not
available.

A shared role follows [authoring a role](references/authoring-a-role.md): when
one is justified, what its brief carries and the wiring it needs. Start it from
[the role template](assets/role-template.toml).

A principle or a language or package pattern goes in the principles and
patterns library beside `skills/`, not in a skill. Read
[the library reference](references/principles-and-patterns.md) before adding or
changing an entry: its front matter, the generated index and its check, rules
adapted from upstream, and why consumers link the index only.

The harness group's other skills sit beside this one. What a session can
actually load, drawn as the group tree with its sources and duplicates, is
[skills-list](../../skills-list/SKILL.md); check it after adding, renaming or
retiring a skill. Local Codex storage growth or slowness is
[keep-codex-fast](../../keep-codex-fast/SKILL.md).

A change the visual guide shows (a role binding, a hook, a skill added or
retired, a check added) also refreshes it, through [the harness guide](references/harness-guide.md).

A repository's `AGENTS.md` belongs to adoption, not this skill: its recipe is
`harness-docs-starter/templates/repository-agents.md`, reached through
orchestrate-work's [repository adoption](../../orchestrate-work/references/repository-adoption.md).

## 7. What this method refuses

- **It does not self-authorize deployment.** A source review proves only the
  candidate; live changes follow the user's authorized scope and target.
- **It does not restart the catalogue.** The package list is derived from the
  files on disk; a maintained inventory of packages or skills would restore the
  drift this harness already removed.
- **It does not carry project identity.** A project's design authority - its
  `DESIGN.md`, its `COMPONENTS.md` and its component-source choices - stays
  external to any ported package. An upstream update changes the package; it
  never changes what a project has decided its interface should be.
- **It does not silently mix revisions.** A whole package keeps a coherent pin;
  a selective method port names the exact source of each imported method and
  preserves one shared workflow owner instead of duplicating entrypoints.
