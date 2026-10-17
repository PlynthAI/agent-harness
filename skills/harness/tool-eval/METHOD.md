---
name: tool-eval
description: Evaluate how agents use tools from recent session logs. Finds failing, repeated, slow or token-heavy calls, missing tools and wrong-tool choices, then makes the cheapest fix so tools are low friction for agents.
---

# Tool eval

The harness is agent first: a tool earns its place when agents reach for it at
the right moment, it works the first time, and its output is the size the next
step needs. This method measures that from the logs and repairs the worst gap.

## 1. Bound the question

Name the scope: one tool or tool family ("the GitHub tools", "session-digest",
"our MCP servers"), or a sweep of recent sessions in one repository. Select
sessions through [session logs](../references/session-logs.md): a named tool
with `--tool <name>` (or `--tool 'mcp__server__*'` for a family), a sweep with
`--last` or `--since`, then `digest` and `aggregate` into scratch.

## 2. Read the signals

The aggregate's Tools used and Tool failures sections rank tools by spread and
count; the digests add searches, lookup errors, empty searches and hunt
snippets. Open the sessions at the worst rows and read what happened. Look for:

| Signal | What it usually means |
|---|---|
| A high failure share for one tool (Codex logs count shell failures only) | Wrong arguments the tool's description invites, a permission or network block, or a real bug |
| The same call repeated with small changes | Unclear parameters, errors that do not say what to change, or output too terse to act on |
| A shell command doing a dedicated tool's job, or the reverse | A routing gap in instructions or the tool's description |
| Huge outputs read in pieces, or truncated and re-run | No filter, limit or summary mode, or the agent not using one |
| Hunt snippets: "could not find", "let me search for" | A missing map line, tool or route to information |
| A permission or proxy denial, then a workaround | A boundary to report or an allowance to request, never to bypass |
| A tool loaded but never called, or called and ignored | A description that over-triggers, or an unneeded server costing context |
| The agent wrote a one-off script for a recurring job | A small helper worth adding to an existing skill's scripts |

A row is a lead. Read the call, its result and the next step before calling it
friction; a failing test run is the tool working.

## 3. Fix at the cheapest owner

Rank candidates by sessions affected times cost (wasted calls, tokens, wall
time). For each, the smallest repair that removes it, in this order:

1. A line in the instruction that routes the choice (AGENTS.md, the skill's
   router, the project map), or a sharper tool description we own.
2. A flag or summary mode on an existing helper, or a fix to its error text so
   the next call succeeds.
3. A small helper script in the skill that owns the job, with a test.
4. A configuration change: an MCP server scoped to the project or turned off,
   a permission allowance with its evidence (the retrospective's
   [approval edge cases](../retrospective/references/auto-approval.md)), or an
   environment route (cloud-env) for a missing tool.

Third-party tools we do not own get a usage note where agents read it, or a
wrapper only when the cost is shown. Report the before and after: calls,
failures or tokens for the same workload, from the same selection.
Shared changes go through [library](../library/METHOD.md); a project's
configuration stays in that project.
