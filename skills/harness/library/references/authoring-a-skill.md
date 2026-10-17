# Authoring or modifying a skill

The steps are pstack's `playbooks/authoring-a-skill.md`, kept as written. The
sections after them add what this harness needs so a new skill lands wired in,
not only written. Source pins are in [THIRD_PARTY_NOTICES.md](../../../../THIRD_PARTY_NOTICES.md).

**You own the skill's voice.**

1. Write the `SKILL.md` with Codex's built-in `$skill-creator` when the session
   has it. Otherwise start from [skill-template.md](../assets/skill-template.md)
   and follow the guidance in its placeholders.
2. Validate the skill: frontmatter has `name` and `description`, referenced files
   exist, cross-skill links resolve.
3. Test cases if structural. Skip if subjective.
4. Deliver through [delivery](../../../delivery/SKILL.md).

When in doubt, delete. Keep only prose that changes a decision. Tell it to do the
thing and skip the reason. Explain only when the rule is confusing without one.
Match tone to scope. Point at structural sources (types, READMEs, config) rather
than restating them. Delegate to other skills by path. Don't restate. A workflow
you keep hitting but isn't captured: propose a new skill.

## Before writing: scan for overlap

A second skill for a covered task competes with the first and has no owner.
Before a new entrypoint exists:

- Read the descriptions of every skill in the group the task belongs to, using
  the session's skill list or [skills-list](../../../skills-list/SKILL.md). Read
  bodies only for the two or three closest.
- If an existing skill covers the task, add a mode or a reference to it and
  link it where the mode becomes relevant. Section 3 of the
  [library method](../METHOD.md) owns this rule.
- A new entrypoint needs a task nobody would look for under an existing name.
  A different source, a different mode name or a preferred wording is not one.
- If two existing skills already overlap the task, resolve that first: one
  owner, the other links to it.

## Skills are routers

A skill's `SKILL.md` routes; it does not carry every procedure. It holds a
short table from the request to the nested method that answers it, plus the
few rules every route shares. Each method is `<skill>/<name>/METHOD.md`, with
its own `references/` for detail it reads only when needed. So a session loads
one description per skill, the router when the skill is picked, and one method
for the task: the first-prompt cost stays flat however many workflows the
library holds.

- Grow the tree by nesting: a new workflow in an existing group becomes a
  method under its lead (or the closest skill) before it becomes a skill.
- Three levels are enough: router, method, method references. A method that
  needs a fourth level is two methods.
- A method's frontmatter carries `name` and `description` only; it never
  carries `metadata`, an `agents/openai.yaml` or a `SKILL.md`, which would make
  Codex list it as a skill of its own.
- The router names every method beside it with the condition that sends work
  there. A method nobody routes to is unreachable.

`harness`, `design` and `understand` are the shape to copy.

## The description is the trigger

Name and description are the only things an agent sees before choosing a skill.
The description decides whether the skill is picked at the right moment and
left alone otherwise.

- Say what the skill does, then the requests that should reach it, in the words
  a person would use. Concrete verbs and phrasings beat categories.
- Add one boundary that keeps likely misroutes away, and name the sibling that
  owns the excluded case. Exclusions exist to prevent misrouting, not to list
  everything the skill is not.
- Avoid catch-alls and exhaustive capability lists. They attract unrelated
  requests, and a skill that triggers too broadly gets ignored.
- Put every "when to use" fact in the description. The body is loaded after the
  choice is made, so a trigger written there is never read in time.
- Front-load the trigger words. When many skills load, long descriptions are
  cut from the end, so the verbs and phrasings that should fire the skill come
  first and the boundary comes last.
- A skill meant to run only when named says so in its description, beside the
  invocation policy in [skill mechanics](../../../writing/references/skill-mechanics.md).
  writing's "article workshops need an explicit request" is the shape.

Keep a description under about 300 characters and never more than three
sentences. Every exposed description loads in the session. Keep nested method
detail in METHOD.md files reached through their parent, and hold new and changed
skill descriptions to the same bound.

A pair for a hypothetical migrations skill shows the difference:

```yaml
# Fires on every query, schema read and data fix, and competes with the owner of each
description: Helps with anything database related. Use whenever database work comes up, including schemas, queries, performance, migrations and data fixes.
```

```yaml
# Fires only on migration work and hands the rest to its sibling
description: Write, check and roll out a schema migration through the project's execution route. Use when adding, changing or reverting a migration; reads and one-off data fixes stay with database-workflow.
```

One from this harness:

```yaml
description: Prove that live interface behaviour works in the correct running app before claiming it does. Use for frontend, website or any change whose acceptance depends on what a user sees or does, and when a browser or end-to-end runner must supply the evidence.
```

## Keep the body lean

The model reading the body is already capable. A line earns its place only when
it changes a decision the model would otherwise make differently.

- Match specificity to risk. Leave room where several approaches work; fix the
  steps only where deviating causes a concrete problem.
- Keep `SKILL.md` to what every run needs. Schemas, long examples, mode detail
  and reference material go in `references/`, each linked with the condition
  for reading it.
- The description and `SKILL.md` are the summary. A skill carries no README,
  changelog or second quick reference; history lives in git and the review packet.

[Agent-instruction writing](../../../writing/references/agent-instructions.md)
owns the levers underneath: the information hierarchy, pruning and negation.

## Wire it in

| Step | Where | When |
|---|---|---|
| Review | The finished skill read against the [review flags](../../../writing/references/agent-instructions.md#review-flags) | Every skill, before the rows below |
| Group | `metadata.group` in the frontmatter, one of the groups below; the group's lead also carries `lead: true` | Every skill |
| Sibling links | Each skill that hands to this one or receives from it links it by relative path | Every skill |
| Lead routing | The group's lead, in its SKILL.md or a reference beside it, names the skill with the condition that sends work to it; the harness library check fails on a leaf its lead never names | Every skill that is not a lead |
| Codex metadata | `agents/openai.yaml` holds only `interface.display_name` and a verb-first `interface.short_description` of 25 to 64 characters, for Codex's skill picker; the check refuses anything else | Every skill |
| Group tree | `AGENTS.md` names groups and their lead skill only; leaves are never listed there. `skills-list --format tree` draws the full tree from the frontmatter | Only when a group or its lead changes |
| Workflow reference | [skills-list's workflows](../../../skills-list/references/workflows.md) draws each group's flow and the end-to-end flow; add the skill where it takes part | When the skill takes part in a multi-skill flow |
| Checks | Executable content gets a test file and a `checks/run-all.ps1` entry; prose gets structural assertions only, never wording | Executable or contract-bearing content |
| Notices | A row in `THIRD_PARTY_NOTICES.md` with the source and revision | Borrowed material |
| Deploy and sync | `config/deploy.ps1 -Apply`, then `claude/sync-claude.ps1 -Apply`, every time (idempotent) | After the change merges |

## Groups

A group is a part of the work, usually a stage, led by one skill that routes inside it. The
lead is what `AGENTS.md` names and the one skill in the group whose frontmatter
carries `lead: true`; the leaves are found through the lead, through the
session's skill list and through `skills-list --format tree`.

| Group | Lead | What belongs |
|---|---|---|
| coordinate | orchestrate-work | The team lead's group across every stage: assigning bounded work to roles and integrating it; goal-setter gives a dispatched agent a goal to run until Done; coordinate sits above it, running several team chats from one chief-of-staff chat |
| clarify | brainstorm | Settling what is being asked, in conversation with the user, into a brief |
| plan | planner | Turning a settled brief into structured outputs, and advice on approach and architecture: wayfinder, to-spec, to-tickets, domain-modeling, api-design |
| design | design | Anything a user sees; its methods nest in its own folder as `<name>/METHOD.md` |
| build | implement-spec | Making the change: tdd, diagnosing-bugs as the repair loop, database-workflow for database access and execution |
| verify | validate-implementation | Proving the change: browser-verification, code-review |
| deliver | delivery | Commit, PR, babysit, merge, deploy, worktree retirement, ci |
| investigate | understand | Answering questions from evidence without changing anything, on demand: recall, research, forensics of a symptom or a trace; its how, why and teach methods nest in its own folder as `<name>/METHOD.md` |
| records | docs-workspace | Where documents, data and prose go: inbox, handoff, writing (with its nested academic, citations and unslop methods), seo-programme |
| harness | harness | Improving, maintaining and packaging the working environment through its nested methods (retrospective, skill-refine, tool-eval, verify-eval, library, cloud-env, update-packages, doc-bench), plus hillclimb, automate-workflow, skills-list and keep-codex-fast |

A skill that fits two groups takes the one whose lead would route to it first.
A new group needs a stage of the work no existing lead covers, and it changes
`AGENTS.md`.
