# <Task id or title> - checkpoint

Updated: <YYYY-MM-DD>

Task: <existing task folder name or parent-supplied label; omit when unnecessary>
Chat(s): <observed title and codex://threads/THREAD_ID link; omit if unavailable>
Checkout / branch: <actual worktree and branch>
Issue / PR: <links when present>
Related files: <plan, retained evidence, scratch or other existing paths>

Only the team lead writes this file and records useful links once; children use supplied
paths and return results, never keeping a state file of their own. Missing
metadata never blocks work. Omit irrelevant entries; a later chat resumes the
same task.

Optional: keep this file only when resuming or handing off benefits from a short
checkpoint. It lives at `.state/state.md` in the root of the checkout the task
runs in, and `.state/.gitignore` (the single line `*`) keeps it out of code
commits.
The plan checklist owns steps and their evidence. Update this checkpoint
whenever the next action changes, without copying that checklist or keeping a
history here.

## Status

<Current overall position.>

## Next action

- <One action and its owner; point to the relevant plan item when there is one.>

## Warnings

<Only a current blocker or resume trap the next reader needs. Link its details
instead of repeating them. Delete this section when there is nothing to flag.>
