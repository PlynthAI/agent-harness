# Agent harness

A versioned set of user-level instructions, agent roles and method skills for
Codex and Claude Code. One source deploys to both runtimes, so every project on
a machine gets the same way of working: how to read a request, who does what,
how work is planned, built, reviewed and delivered, and when to stop and ask.

This is a public copy of a working harness. It is published as a snapshot: each
update arrives as one commit, and issues and pull requests are not reviewed.

## What is inside

| Path | What it is |
|---|---|
| `AGENTS.md` | The shared policy and router, loaded into every session |
| `AGENTS.private.example.md` | A template for your own section 01: who you are, your machine, your personal tools |
| `agents/` | Role definitions (team lead, workers, explorer, researcher, planner, tester, reviewers) |
| `skills/` | Method skills, grouped by stage; each entrypoint routes to nested methods so the first prompt stays small |
| `principles-and-patterns/` | The library reviews check work against, read through one generated index |
| `hooks/` | Session hooks, such as reloading skill and task state after a context compaction |
| `config/` | The install map, the deploy script and Open Code Review's house rules |
| `claude/` | The Claude Code adapter: role generation, the user-level `CLAUDE.md` and the sync script |
| `harness-docs/`, `harness-docs-starter/`, `templates/` | How the harness works, and starters for a project's own documents |
| `checks/` | The harness's own checks; `checks/run-all.ps1` runs them |

## Installing it

The scripts need PowerShell 7 and Node.js 24.

1. Copy `AGENTS.private.example.md` to `AGENTS.private.md` and write your own
   section 01. It replaces the generic section 01 when you deploy, and it is
   never part of this public copy.
2. Run `pwsh -NoProfile -File config/deploy.ps1` to see what would change in
   your Codex home (`~/.codex`), then add `-Apply` to copy it. Deploy keeps a
   backup of every file it replaces and reports, rather than overwrites, a file
   you edited in the Codex home.
3. For Claude Code, run `pwsh -NoProfile -File claude/sync-claude.ps1 -Apply`
   after each deploy. It generates the Claude roles from the same role files and
   links the shared skills.

Read [ARCHITECTURE.md](ARCHITECTURE.md) before changing how the harness behaves,
and [harness-docs/](harness-docs/index.md) for how its parts fit together.

## Credits

Many methods are adapted from other people's published work. Each source, its
revision and its licence are listed in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Licence

MIT, in [LICENSE](LICENSE). Adapted third-party material keeps its own licence,
listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
