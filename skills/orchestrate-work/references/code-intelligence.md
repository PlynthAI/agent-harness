# Code tracing and impact evidence

Use this reference when a task needs symbol ownership, callers, dependencies,
execution paths or affected-check selection. The code graph is
codebase-memory-mcp, called through the harness wrapper below; a project needs
no setup of its own beyond an optional ignore file. One shared method serves
every role; no per-repository skill copies or mandatory graph query for every
edit.

## Choose the route for the question

Text search plus reads comes first in both clients. Each later route answers a
question the earlier one cannot; none is a second default for the same question.

| Need | Claude Code | Codex |
|---|---|---|
| Path, literal or narrow symbol | Grep and Read (rg-backed) | `rg` and bounded shell reads |
| Definition, references, one-hop callers | Grep for the word-bounded name, then Read each hit | `rg -n '\bname\b'`, then read each hit |
| Same-name symbols, re-exports, a type question | The LSP tool (`findReferences`, `goToDefinition`, `hover`) | Read the imports and definitions the text search found |
| One file's shape | A bounded Read; LSP `documentSymbol` for a long file | A bounded read; `ast-grep outline --items all --view signatures` |
| Syntactic pattern across files | `ast-grep run -p '<pattern>'`, or the project's rules with `ast-grep scan` | Same |
| Multi-hop callers across packages | codebase-memory through the harness wrapper (`cli trace_path`), checked against source | Same |
| Actual behavior or performance | Tests, logs, traces and measurements through validate-implementation/diagnosing-bugs | Same |

Measured on fixed questions in Create, Frontend and Website (9 October 2026),
text search plus reads was exactly correct on 4 of 4 Claude Code questions and
5 of 6 Codex questions (the sixth counted one prose mention as a reference), 3 to
13 times faster than Serena's symbol tools with fewer tokens; Serena was removed
from both clients. Count only code hits when a name also appears in prose.

The Claude Code language-server plugins (typescript-lsp; pyrefly-lsp where a
Python project enables it) stay for two jobs: diagnostics delivered after an
edit, and the lookups above where text is ambiguous. They read the current
working tree, so they need no reindex and see uncommitted edits. Their
diagnostics are a signal; the project's type check is the proof. codebase-memory
answers callers only, not references or file shape.

Planner and explorer use traces to locate contracts and compare implementation
options. Workers use them to find callers before edits. Reviewer and tester use
them to challenge coverage and select affected flows, including paths omitted
from the index. A graph or language server does not prove a test passed. Missing
edges, dynamic calls and excluded files prevent a negative search from proving
absence. Follow real callers and current source where the decision matters.

Do not install a new tool just to answer a question bounded search can settle.
Compare tools using the same repository and questions before claiming a speed
or accuracy improvement. Keep setup, cold indexing, incremental refresh and
warm query costs separate.

## Bind graph identity and freshness

1. Resolve the active checkout, HEAD, working-tree changes and the exact
   absolute worktree root. Name the project explicitly on every call; two
   worktrees of one repository are two projects.
2. Run the wrapper's `fresh <absolute-worktree-root>` for that checkout. It
   binds the root to the project whose `root_path` it is and answers `fresh`,
   `stale` (HEAD moved, or a tracked or untracked file written since
   `indexed_at`) or `missing`, exit 0 only when fresh. A `ready` status alone
   is not proof of a current index, and a HEAD match does not cover dirty or
   untracked changes made after indexing, so do not read `index_status` by
   hand for this question.
3. A graph may trim checks for fast local feedback only. The complete static
   selection always runs before merge, on the exact head. Selection stays
   deterministic: no model and no graph state decides what a gate runs, and a
   missing, stale or partial graph neither narrows a gate nor blocks one. The
   reviewer may flag missing tests; that finding is the safety net for what
   static selection misses.
4. Refresh with `fresh <root> -Refresh` when a concrete graph question depends
   on changed in-scope source, after switching or rebasing the checkout, or
   when ignore rules change; it re-indexes only a stale or missing root. Reuse
   a current index. Do not rebuild after every edit, at every agent start or
   merely to update a timestamp. `fresh` with no root lists every indexed
   project on the machine with its state, which is the freshness check across
   repositories; a repository with no index is not listed until its first
   `-Refresh`.

Local narrowing of a project's gate is not built. Build it only when a
measurement on the project's co-change history, with a whole-repository index,
shows all of: co-changed-test recall of at least 0.90; a change of endpoint or
at least 60 s median local saving over the static affected selection, measured
through the project's own validation engine; a deterministic index identity
(HEAD plus a dirty-file fingerprint) written into the receipt so a narrowed
run reproduces without any model; and the complete static selection still
running in hosted CI on the exact head. Until then the graph serves agents,
not gates.

After a refresh, check a known symbol's callers before relying on the result.
Serialize `index_repository` calls for one project. If the tool is unavailable,
continue with current source and record the gap.

## codebase-memory-mcp through the harness wrapper

The starter pack in this skill's `scripts/codebase-memory/` pins release
0.11.0. Install it once per machine:

```powershell
pwsh -NoProfile -File "$HOME/.codex/skills/orchestrate-work/scripts/codebase-memory/install.ps1"
```

`install.ps1` verifies the release zip against the SHA-256 in `assets.json`
(a local copy is accepted with `-Mirror <zip>`), places the binary and its
licence files under `%LOCALAPPDATA%\Programs\codebase-memory-mcp\<version>\`,
creates the owner-only cache `%LOCALAPPDATA%\codebase-memory-mcp\cache` and
switches off the file watcher, auto-watch and the HTTP UI there. A second run
reports "Nothing to do" and repairs drift in those settings. Never run the
tool's own `install`, `update` or MCP server mode: they write agent
configuration, and a resident or user-global MCP server is not wanted.

Every call goes through the wrapper, which sets `CBM_CACHE_DIR` for its own
process only and adds `--quiet` so stdout carries only the result:

```powershell
$cbm = "$HOME/.codex/skills/orchestrate-work/scripts/codebase-memory/cbm.ps1"
pwsh -NoProfile -File $cbm cli <tool> --flag value --format json
```

Claude Code reaches the same file through `~/.claude/skills`. Ask for
`--format json` when parsing; the default tree output is for reading.

| Question | Wrapper call |
|---|---|
| Project name for a root | `project <absolute-root>` (drive letter and segments joined by `-`; `list_projects` is the authority) |
| Indexed projects, roots and branches | `cli list_projects --format json` |
| Is the index present and current? | `fresh <absolute-worktree-root>`: one line, exit 0 fresh, 1 stale or missing; `fresh` alone lists every indexed project |
| Build or refresh an index | `fresh <absolute-worktree-root> -Refresh` (re-indexes only when stale or missing) |
| Who calls this, or what does it call? | `cli trace_path --project <name> --function-name <symbol> --direction inbound` (or `outbound`) `--depth 1 --format json` |
| Find a symbol or concept | `cli search_graph --project <name> --name-pattern <regex>` or `--query <text>` |
| Structural question | `cli query_graph --project <name> --query "<cypher>"` |
| Symbols in one file | `cli get_file_outline --project <name> --file-path <repo-relative-path>` |
| Which callers would a diff reach? | `cli detect_changes --project <name> --base-branch <base>` |
| Is a path covered by the index? | `cli check_index_coverage --project <name> --paths <path>` |
| Release indexes of retired worktrees | `prune` lists them; `prune -Apply` deletes them |

Each call starts a temporary daemon and stops it on exit: about 8 to 10 s per
call, and nothing stays running. Accept that cost; batch questions into fewer,
broader calls instead. Do not run `daemon start`: in 0.11.0 the explicit daemon
is permanent until `daemon stop`, listens on localhost port 9749 for its UI and
rewrites `ui_enabled` to true; the wrapper has no route to it. If one was
started, stop it with the binary's `daemon stop` and rerun `install.ps1`.

Index the whole repository, which is the default: callers in scripts and tests
are part of the impact. The indexer honours `.gitignore` and does not follow
symlinks. A repository adds a `.cbmignore` (gitignore syntax) only for bulky
non-code trees. The index records the working tree as it was at `indexed_at`.
A cold index of a large Python repository took about 100 s; a re-index with no
changes took about 17 s. `detect_changes` maps a diff onto the index; it does
not refresh it or cover new files, so review the actual diff alongside it.
Disambiguate common names by file or qualified name, bound depth and limits,
and follow only relevant paths.

The binary embeds its embedding model and makes no network requests of its own,
so indexing and semantic search keep source on the machine. In a sandboxed
runtime, the owner-only cache can refuse both writes and reads from a sandbox
identity. In Full access, call the wrapper normally with no escalation argument.
Only an interactive sandbox that permits requests uses its supported host route;
with approvals disabled, report the remaining access failure and continue using
available evidence. Do not loosen the cache DACL or bypass a denial.

After retiring a worktree, run `prune` and then `prune -Apply` to release its
index.

## Project adoption facts

A project guide records only what differs from this route: a `.cbmignore` for
bulky trees, known dynamic-dispatch blind spots, and any project that must not
be indexed. Prove a representative caller lookup when adopting. Keep that
compact result in the existing workspace; no second index ledger. Missing tool
capability is a stated limitation, not a reason to clone a skill.

References checked 2026-10-04:
[v0.11.0 release](https://github.com/DeusData/codebase-memory-mcp/releases/tag/v0.11.0),
[v0.11.0 README](https://github.com/DeusData/codebase-memory-mcp/blob/v0.11.0/README.md),
[v0.11.0 licence](https://github.com/DeusData/codebase-memory-mcp/blob/v0.11.0/LICENSE) (MIT).
Command flags above were checked against the 0.11.0 CLI help, and the daemon,
UI and cost behaviour against the installed binary.
