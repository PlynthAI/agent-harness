---
name: skills-list
description: Discover which skills this session can load - shared, plugin and project-local - with triggers, groups and sources, without loading bodies. Use for what skills are available, which one helps with a task, how skills stack into a workflow, where one comes from, why two share a name or one is missing.
metadata:
  group: harness
---

# Skills list

A skills catalogue is a query, not a document, and the answer depends on which
surface you ask. Every result names its surface and the identity behind it.

## The cheapest answer is already in front of you

Every session receives its own skills block: the roots, and each skill with a
name, a description and a source path. That block is the thread surface, and it
is the only authority for what this thread can load. Read it first; it costs
nothing.

Three surfaces answer differently, so never treat one as another:

| Surface | What it is | What it proves |
|---|---|---|
| thread | your own context in this task | what this thread was offered |
| `cli-runtime` | a fresh `codex debug prompt-input` the script launches | what a new CLI runtime with that home, model, plugins and sandbox would be offered |
| `filesystem` | the installed roots on disk | what is installed, including cached, inactive and multiple-version packages; nothing about enabled state |

On 2026-10-05 one machine gave 4 system skills from a sandboxed CLI, 140 entries
in a desktop thread and 375 in the installed cache. All three were correct for
their own surface.

Reach for the tool when you need the roots, when a name appears twice, when a
skill seems missing, or when you want to know what a runtime shortened or left
out.

```bash
node scripts/list-skills.mjs --source runtime      # launch a fresh CLI runtime
node scripts/list-skills.mjs --source filesystem   # scan the installed roots
node scripts/list-skills.mjs --format text         # human-readable
node scripts/list-skills.mjs --format tree         # groups, leads and leaves
```

The script does not ask your session. It launches a new CLI runtime, whose home,
model, enabled plugins and sandbox can differ from a desktop task, and compares
its list with the files on disk. `--source auto` is the default: runtime first,
filesystem on failure, and `surface` says which one spoke.

## What it reports

| Field | Means |
|---|---|
| `surface` | `cli-runtime` - a freshly launched CLI answered - or `filesystem` - the roots were scanned |
| `identity` | user and home, Codex home, runtime launcher and version, model, working directory, repository and `skills.max_context_tokens` when set. Model and budget come from the project's `.codex/config.toml` before the user's `config.toml`; `config` names both files and `sources` the layer behind each value, or `unknown`. The project file is read whether or not Codex trusts the project, and a `profile` selection is not resolved, so the reported model can differ from the one a session uses in those two cases |
| `roots` | every discovery root with its kind: shared, system, plugin, project or explicit |
| `skills` | name, description (the trigger), group, lead flag, path, root and kind. No body is read |
| `duplicates` | one name in more than one directory, with both paths, both roots and their kinds |
| `aliases` | one directory reached through more than one root |
| `on_disk_not_listed` | present in a scanned root but missing from the runtime list: omitted, unreachable or disabled |
| `truncated` | runtime only: each skill whose rendered description is shorter than its source, with both lengths |
| `parse_errors` | a `SKILL.md` whose frontmatter could not be read, with the reason and the kind of the root it sits in |
| `listed_not_on_disk` | offered by the runtime but no longer on disk: a stale install |

## Which skill helps here

Skills are grouped by the stage of the work they serve, and each group has one
lead that routes inside it. The group comes from `metadata.group` in each
skill's frontmatter and the lead from `lead: true`, so the tree is drawn from
the files on disk, never from a stored list:

```bash
node scripts/list-skills.mjs --format tree
```

Read the tree top-down. Name the stage the request is at - clarify, plan,
design, build, verify, deliver, harness - and start with that group's lead;
its description says what the group covers and its body names the leaves it
hands to. Choose a leaf directly only when its description matches the request
more closely than the lead's. Coordinate is the team lead's group across every
stage, reached when work is delegated or an agent is given a goal.
Investigate and records sit beside the stages, on demand for any role: they are
reached when a question needs evidence or when a record or prose must be
written (writing nests in records). Harness follows delivery and is also
reached on demand when the library itself changes.

When one request runs through several stages, the flows in
[workflows.md](references/workflows.md) show how the skills stack: each
group's internal flow, and the end-to-end path from a fuzzy idea to a merged,
deployed change.

## Repository skills in Claude Code

A repository keeps its own skills in `.codex/skills` only. Claude Code looks
only in `.claude/skills`, and committed links break in clones, CI and
worktrees, so each repository skill gets a small generated stub there instead:
the source frontmatter plus a pointer back to the source. The stubs are
committed and never edited by hand.

```bash
node scripts/claude-skill-stubs.mjs --root <repo>           # preview, changes nothing
node scripts/claude-skill-stubs.mjs --root <repo> --write   # create, update, remove stubs
node scripts/claude-skill-stubs.mjs --root <repo> --check   # fail on any drift
```

A `.claude/skills` folder without the generated marker is a Claude-only skill
the repository wrote itself; the script leaves it alone.

## Rules

- **Never merge two skills with the same name.** Report both and say which root
  each came from. A duplicate is information about the machine, not an error to
  hide.
- **Never write a catalogue file.** The list is generated per run; a stored
  inventory is wrong the moment a skill is added, and this method exists because
  hand-maintained lists drift.
- **Reading a skill means reading its frontmatter.** Load a body only once you
  have chosen that skill for the work.
- **A missing runtime is a fallback, not a failure.** Say which surface answered,
  and never present a CLI or filesystem answer as what your own thread loads.
- **Absent, unreachable and disabled are three different things.** A skill on disk
  but not in the runtime list was not offered to the session; report that rather
  than guessing why.
- **Project instructions select the intended local procedure.** This is a
  routing decision, not a promise that Codex merges or automatically shadows
  same-named skills. Report both source paths and follow the project's named
  owner; do not infer a composite workflow from a duplicate name.

## References

- [references/roots.md](references/roots.md) - where skills are found, what each
  root kind means, and the fallback order.
- [references/workflows.md](references/workflows.md) - the group flows and the
  end-to-end flow, drawn as trees.
- [scripts/list-skills.mjs](scripts/list-skills.mjs) - the discovery tool.
- [tests/list-skills.test.mjs](tests/list-skills.test.mjs) - the fixture coverage.
- [scripts/claude-skill-stubs.mjs](scripts/claude-skill-stubs.mjs) - writes and
  checks the Claude stubs for repository skills, with
  [fixture coverage](tests/claude-skill-stubs.test.mjs).
