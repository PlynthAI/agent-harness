# Authoring or changing a role

A role is a shared specialist that the team lead assigns bounded work to through
orchestrate-work's [assignment contract](../../../orchestrate-work/references/assignment.md).
The two split the load. The role carries the job and its boundaries, the same in
every project; the assignment carries the owned paths, context and checks for one
task. Project facts never enter a role: they reach it through the repository's
`AGENTS.md` and `PROJECT.md`, which the role reads like any agent.

Start a new role from [the role template](../assets/role-template.toml).

## When a new role is justified

A new role needs a job that no existing role's description covers, so the team
lead would otherwise have nobody to hand it to. Read the descriptions listed in
[the agents README](../../../../agents/README.md) first, and refine the closest role
before adding one.

| Proposal | Already covered by |
|---|---|
| A persona per project | The shared role, with that repository's `AGENTS.md` |
| A different model for an existing job | The operator's binding for that role |
| A project's docs agent | explorer or fast_worker, with `PROJECT.md` as the map |

## The file

One TOML file per role in `agents/`.

| Key | Content | Owner |
|---|---|---|
| `name` | Equals the file stem | Author |
| `description` | One sentence in the voice of an assignment: the job as the team lead would hand it over | Author |
| `model`, `model_provider`, `model_reasoning_effort` | Bindings; [MODELS.md](../../../../MODELS.md) is the dated snapshot | Operator |
| `developer_instructions` | The brief, in a `"""` block without backslash escapes, which the Claude sync does not decode | Author |

## The brief

It carries four things, in a few lines each:

- **The job**, and the stance it takes: builder, read-only tracer, judge.
- **What it reads first**: the user-level skill it works through, by name, and
  project guidance through the repository's `AGENTS.md`.
- **What it returns and where**: to the team lead, inline or at the evidence destination
  the assignment supplies.
- **Boundaries in three tiers.** A subagent cannot ask the user, so the middle
  tier goes to the team lead instead:
  - does: the work it carries through to done without checking in;
  - returns to the team lead for: scope, architecture or authority it cannot settle;
  - never: the few actions its job excludes.

Paths, commands, stacks, reading itineraries and model names stay out. They
belong to the assignment, the repository or the operator, and inside a role they
go stale in every project at once.

explorer shows the shape (excerpt):

```toml
name = "explorer"
description = "Trace bounded code paths and return file and symbol evidence; audit verdict checks on assignment."
developer_instructions = """
Map the assigned code path, the applicable project guidance and any prior findings.
Discover what the project actually uses rather than assuming a stack: read its AGENTS.md and
skills for the language toolchain ...
Return concise file and symbol evidence with paths, the limits of what you inspected, and the
seams that matter for the assigned question.
...
Do not edit source, write externally, commit or push.
"""
```

The job comes first, the stack is discovered rather than named, the return is
specific, and the one hard limit closes the brief.

## One source, rendered per runtime

The Codex TOML is the single source.
[sync-claude.ps1](../../../../claude/sync-claude.ps1) renders
`~/.claude/agents/<role>.md` from the installed copy and adds the Claude model and
effort from [claude-map.json](../../../../claude/claude-map.json), or, for a role
the map binds to the Codex runtime, renders a forwarder that runs the role on
the Codex side with its own model and effort; a role missing from the map is
not rendered. Any other runtime that wants a Markdown agent file
gets it rendered the same way, never written by hand beside the TOML.

## Repository-level agents

These are not shared roles and not the default: a repository's work normally
goes to a shared role reading that repository's `AGENTS.md`. When a repository
genuinely needs its own agent, because the job needs tools or a permission
profile no shared role has, it keeps one TOML under `.codex/agents/` as the
source and renders `.claude/agents/<name>.md` from it the same way. The sync has
no project mode yet; add one when that first case appears, not before.

## Wire it in

| Step | Where | When |
|---|---|---|
| Review | The brief read against the [review flags](../../../writing/references/agent-instructions.md#review-flags) | Every role |
| Role set | `expectedRoles` in [checks/agents.ps1](../../../../checks/agents.ps1) | Added, removed or renamed |
| README | A `- <role>: <job>` bullet in [the agents README](../../../../agents/README.md) | Added, removed or renamed |
| Snapshot | The role's row in [MODELS.md](../../../../MODELS.md) | Added, or a binding changed |
| Claude binding | The role's entry under `roles` in [claude-map.json](../../../../claude/claude-map.json) | Added, removed or renamed |
| Orchestration | orchestrate-work's references that list roles by name, such as [the programme reference](../../../orchestrate-work/references/programme.md) | When a listed role changes |
| Handbook | Section 05 of the user-level [AGENTS.md](../../../../AGENTS.md) | Only when the role set it names changes |
| Deploy and sync | `config/deploy.ps1 -Apply`, then `claude/sync-claude.ps1 -Apply` | After the change merges |
