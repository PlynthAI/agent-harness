# Session logs

The evidence behind a retrospective, skill-refine, tool-eval or verify-eval is
what agents actually did. Read it from the logs, bounded to the question.

## Where they are

- Codex keeps rollouts under `~/.codex/sessions/<yyyy>/<mm>/<dd>/rollout-*.jsonl`.
- Claude Code keeps transcripts under `~/.claude/projects/<project-slug>/*.jsonl`.
- A cloud session (Claude Code on the web, Codex cloud, a Vercel Sandbox) keeps
  its log inside the container, which is reclaimed after the session. Digest it
  from inside that session before closeout, or read it through the runtime's
  session-events tool when one is available; a workstation sweep never sees it.

Logs can run to hundreds of megabytes, so never load one whole. Read them
through [session-digest.mjs](../scripts/session-digest.mjs) (`--help` for
usage).

## Selecting sessions

A session is selected by the working directory its log records, never by a
text match. Bound every read: `--last <n>`, `--since <YYYY-MM-DD>`,
`--runtime codex|claude|all`, `--main-only`, and `--worktrees` for checkouts
kept outside the repository.

To follow one skill or tool, filter by what the session used:

```bash
node <shared-skills>/harness/scripts/session-digest.mjs list   --cwd <repo> --skill <name> --last 10
node <shared-skills>/harness/scripts/session-digest.mjs digest --cwd <repo> --tool 'mcp__github__*' --since <date> --out <scratch>
node <shared-skills>/harness/scripts/session-digest.mjs aggregate --out <scratch>/aggregate.md <scratch>
```

`--skill` matches a Skill call or a `SKILL.md` read, and a plugin skill by the
name after its colon. `--tool` matches a tool name exactly, or a prefix with a
trailing `*`. Both read each candidate log whole, newest first, and `--last`
then counts matching sessions only. A skill's nested methods load by file
read, so to follow one method also search the digests' Files read section for
its `METHOD.md`.

## What a digest holds

Per session: files read, search patterns and shell searches, skills loaded,
tools used and tool failures (from exit codes and error results; for Codex,
only shell calls report a failure, so a Codex MCP tool never shows one), subagent
count, lookup errors, empty searches, assistant "hunt" snippets (where an agent
said it could not find something), and the user's messages. The aggregate ranks
every row by how many sessions it appears in, then by total count.

A digest is a lead, not the evidence. Open the session at the moments the
digest points to (a failure, a repeated search, a user correction) and read
what happened there before calling anything a finding.

## Handling

Digests can carry private chat text even after token redaction. Write them under
the task's scratch route, never into a tracked tree (the script refuses unless
the folder is ignored), and delete them at closeout.
