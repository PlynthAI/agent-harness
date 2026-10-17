---
okf_version: "0.2"
---
# Harness home

The one page that reaches everything in this harness: the explainers, the
skills, the roles and the documents that own each answer. The authorities keep
their own homes and this page links to them instead of restating their prose.

## Explainers

Start here to understand the harness as a whole.

- How the Harness Works:
  the visual guide, thirteen figures checked against the source. It opens in the
  browser and is published as the Kitchen site's How it works page.
- Repository tooling coverage: a dated, interactive
  map of Create, Frontend and Website across Claude Code and Codex, including SQL,
  Serena comparisons and portable-install decisions.
- [How skills stack into workflows](../skills/skills-list/references/workflows.md):
  the order skills are usually taken in, stage by stage.
- The Kitchen site: the published site built from this repository, with the work-tracking and templates explainers.

[the harness library's harness-guide reference](../skills/harness/library/references/harness-guide.md)
owns the guide's refresh.

## Skills by stage

Each stage has one lead skill that routes to the others in its group. Open the
lead, then follow its links to a leaf or a reference. Every skill is a folder
under `skills/` holding `SKILL.md` and, beside it, the references it loads only
when a task needs them.

| Group | Lead | Who runs it in a team, and what for |
|---|---|---|
| coordinate | [orchestrate-work](../skills/orchestrate-work/SKILL.md) | The team lead, across every stage: assign, integrate, give an agent a goal through [goal-setter](../skills/goal-setter/SKILL.md); [coordinate](../skills/coordinate/SKILL.md) sits above it |
| clarify | [brainstorm](../skills/brainstorm/SKILL.md) | The team lead, with the owner: settle the ask into a brief |
| plan | [planner](../skills/planner/SKILL.md) | Planner: map, spec, tickets or plan from the brief; advice when stuck |
| design | [design](../skills/design/SKILL.md) | smart_worker: anything a user sees |
| build | [implement-spec](../skills/implement-spec/SKILL.md) | Workers: make the change |
| verify | [validate-implementation](../skills/validate-implementation/SKILL.md) | Tester and reviewers: prove the change |
| deliver | [delivery](../skills/delivery/SKILL.md) | The team lead: commit, PR, merge, deploy, cleanup |
| harness | [harness](../skills/harness/SKILL.md) | The team lead: retrospectives, evals, the library, cloud environments, packages |

Coordinate spans every stage rather than being one; the other seven rows are the stages. Two more groups are not stages, and any role reaches for them on demand:

| Group | Lead | What it is for |
|---|---|---|
| investigate | [understand](../skills/understand/SKILL.md) | Answer from evidence, change nothing |
| records | [docs-workspace](../skills/docs-workspace/SKILL.md) | Where documents go; [writing](../skills/writing/SKILL.md) nests here for how prose reads |

An edit to a skill here changes the source. Agents pick it up after a deploy
and a Claude sync; [operations](operations.md) has the commands.

## Principles and patterns

The [principles and patterns index](../principles-and-patterns/index.md) lists
the principles and language or package patterns that reviewing skills apply,
one line each, generated from the entries. It installs beside `skills/`.
[the harness library's library reference](../skills/harness/library/references/principles-and-patterns.md)
owns adding or changing an entry.

## Authorities

- [AGENTS.md](../AGENTS.md): the shared policy every session loads.
- [ARCHITECTURE.md](../ARCHITECTURE.md): intent, boundaries and tradeoffs.
- PROJECT.md: the project map agents read, subject by subject.
- [MODELS.md](../MODELS.md) and [agents/README.md](../agents/README.md): the
  roles and the models they run.
- [CODING_STANDARDS.md](../CODING_STANDARDS.md): implementation and review
  judgments.
- [README.md](../README.md): what ships and how it is copied in.
- [claude/README.md](../claude/README.md): how Claude Code consumes the install.

## Read by task

- Changing harness behaviour: [architecture](architecture.md), then [operations](operations.md).
- Finding or adding a shared method: [workflows](workflows.md).
- Seeding or reconciling project documents: [workspace](workspace.md).
- Copying reviewed files into an install or rolling one back: [operations](operations.md).
- Adopting the harness in a project: harness-setup-guide.md
  and [repository adoption](../skills/orchestrate-work/references/repository-adoption.md).
- Starting a new project from a runnable template: [templates](../templates/README.md).

## Knowledge pages

- [Architecture](architecture.md): what the harness is and why its surfaces are split.
- [Workflows](workflows.md): shared methods, roles and library maintenance.
- [Workspace](workspace.md): the workspace starter and where working documents live.
- [Operations](operations.md): source, install, checks and pending material.
- [Verification toolkit](verification-toolkit.md): the checks a project can draw on.

## Working records

Goals, findings and plans for the harness live in this vault's
[workspace folder](../workspace/README.md), resolved through `docs-workspace`.
The folder is the owner's and is never versioned or deployed;
PROJECT.md says why.

## Live tracking

The owner's live tracking surface for all harness work is the plan named
under Task entry points in the [workspace README](../workspace/README.md),
which embeds it. It names completed, under-way, planned and blocked work, next-step owners
and staging. Owning goals, plans and findings retain detailed evidence.
The earlier workspace/board.md is historical navigation.

## Inbox

Handoffs for harness work, one note per task, waiting for a chat to take them.
Open notes have an empty outcome; done notes carry what the taking chat
finished and are cleared once checked. The notes live in the workspace's
`Inbox/` folder, so a copy of the harness starts with an empty board.

![[workspace/Harness inbox.base]]

## Scope

This is a knowledge map, not a second copy of the authorities, and it grants no
permission. Method bodies stay in `skills/`; the north star stays in
ARCHITECTURE.md; machine-specific host mappings stay in the registry. Only pages
under this directory are concepts of this small collection, and no format check
is required to read or write harness work.
