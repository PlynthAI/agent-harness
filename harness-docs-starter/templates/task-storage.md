# <Task folder> - storage and release

One small note for a task folder whose output is large or spans several runs.
Keep it in the task folder as `AGENTS.md`, or fold the same lines into an existing
task README so there is only one copy. Small notes need neither. A child folder
shares the parent's record and does not restate it.

Purpose: <what this folder holds and which task, goal or issue owns it>
Canonical record: <link to the task record that owns this folder's retention
table, plan or checkpoint; required for a cleanup decision>
Team lead chat: <codex://threads/<id> link, or omit when unknown>

## Files and groups

| Path or group | Purpose (source or role) | Owner and writer | Release when |
|---|---|---|---|
| <subfolder or pattern> | <what it is and where it came from> | <task/owner and the writer or service> | <consumer, verification or recovery that ends, or the next review> |

## Writers and services

- <Writer or service, how to stop or check it, and the lock/port/env it holds.>

## Retained exception or review trigger

- <A specific path kept under an explicit project Keep, or the concrete event that
  brings the folder's retention back for review. Omit when nothing is retained.>

One record owns the release table above. If the canonical record carries it, this
file links there and does not repeat the table; if this file carries it, the
canonical record links back. Never maintain both.

Cleanup reads this file deliberately, because a folder's own instructions are not
auto-loaded, and treats it as evidence rather than permission. Missing values are
real answers and do not block creating the file; an owner, writer or release
condition that is genuinely unknown does block the cleanup decision for what it
covers, so record the gap and its next check instead of guessing or inventing IDs.
