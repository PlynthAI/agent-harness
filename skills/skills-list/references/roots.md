# Where skills are found

A freshly launched CLI runtime reports what a new runtime with that home would
be offered; the filesystem scan is the fallback and the comparison. Neither is
the calling thread's own list. Both report the same fields - `surface`,
`identity`, `roots`, `skills`, `duplicates`, `aliases`, `on_disk_not_listed`,
`listed_not_on_disk`, `truncated` and `parse_errors`, as SKILL.md's "What it
reports" table describes - so the two can be diffed without translation. A runtime
row is labelled with the kind of the root it resolved to, so `duplicates` names
the two roots that collided rather than saying only that both were runtime rows.

## Root kinds

| Kind | What it is | Where it comes from |
|---|---|---|
| shared | the user-level skills every session on this machine inherits | a skills directory under the Codex home, and the agent-level skills directory |
| system | skills the runtime itself ships | a system directory beneath the shared one |
| plugin | skills unpacked inside a plugin cache, one cache entry per plugin | plugin cache directories named `skills`, found within a bounded depth; `plugin-backup-*` and `plugin-install-*` staging folders are skipped |
| project | skills the current repository supplies | every `.codex/skills` or `.agents/skills` from the working directory up to the repository boundary, deepest first |
| explicit | a root passed on the command line | `--root DIR`, used by checks and fixtures |

## Fallback order

1. **Runtime.** `codex debug prompt-input` renders the model-visible input of a
   new CLI runtime. Its skills block names every root and skill that runtime is
   offered, which can differ from a desktop task's in home, model, enabled
   plugins and sandbox. On Windows the npm `.cmd` shim is run through
   `cmd.exe /d /s /c`, because Node cannot spawn it directly.
2. **Filesystem.** The roots above are scanned for directories carrying a
   `SKILL.md`. A root that does not exist is reported with `exists: false` rather
   than skipped silently.
3. **Neither.** With `--source runtime` and no usable runtime, the command exits
   non-zero instead of returning an empty list, because an empty list and an
   unasked question are different answers.

## Reading rules

- **The project walk collects a set, not the nearest hit.** A directory carrying
  its own `.codex/skills` does not hide the repository's; both are listed, and a
  name in both becomes a duplicate rather than a silent shadow. The walk ends at
  the first ancestor holding a `.git` directory, because a skills directory above
  that belongs to the workspace rather than to the project, and it never crosses
  the home directory.

- Only the frontmatter block of a `SKILL.md` is read, so listing a large
  catalogue does not load a large amount of prose. A body is read only once a
  skill has been chosen.
- A directory without a `SKILL.md` is not a skill and is not listed. Dot
  directories are ignored: a backup or origin directory beside real skills is
  metadata, not a method.
- A child directory carrying a `METHOD.md` is a method nested in that skill, not
  a skill: the tree draws it below its lead as `lead/name` and the counts leave
  it out. Codex scans recursively, so a nested entry is never named `SKILL.md`.
- The name comes from the frontmatter `name` when present, and the directory name
  otherwise, so a mismatch stays visible as a `directory` that differs from
  `name`.
- Nothing is cached between runs. There is no catalogue file anywhere in this
  skill, and none should be added.
