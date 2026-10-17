---
name: skill-refine
description: Improve one skill or nested method from how agents actually used it. Use when the user flags friction with a skill, or a retrospective hands one over; infer the problem from session logs, confirm it, then fix the owner.
---

# Skill refine

One skill (or one nested method) at a time. The evidence is what agents did
with it, not what its prose says.

## 1. Find where it was used

The skill arrives one of two ways:

- **The user flags it** ("planner keeps doing X", "/delivery is painful"). Take
  the named skill and whatever the user said happened. When they name a session,
  start there.
- **A retrospective hands it over** with the sessions and moments that pointed
  at it. Start from those; do not re-sweep.

Select the sessions that loaded it, newest first, through
[session logs](../references/session-logs.md):
`session-digest.mjs list --cwd <repo> --skill <name> --last 10`. For a nested
method, also find its `METHOD.md` among the digests' files read. Widen to
several repositories (repeat `--cwd`) only when the skill is shared and the
complaint is not about one project.

## 2. Read what happened

In each session, read the moments around the skill: the request that fired it,
what the agent did next, where it hesitated, searched, retried, ignored a step,
or was corrected by the user. Then read the skill's current entrypoint, the
method it routed to and the references that run read. Typical causes:

| Seen in the log | Usual cause in the skill |
|---|---|
| It fired for the wrong request, or failed to fire | The description: trigger phrases, or a missing boundary that names the sibling |
| The agent read several references before acting | The router does not say which one this case needs |
| A step skipped or done out of order | The step is buried, ambiguous, or does not say why it matters |
| The same rule re-derived or re-explained | A missing line, or the line sits in a file this route never reads |
| A command failed the same way twice | A stale command, path or flag in the skill |
| The user corrected the same behaviour | An instruction that contradicts the user's standing preference |
| Long, careful compliance with no effect on the result | A line that changes no decision; delete it |

## 3. Confirm, then fix

When the user flagged the skill, state the inferred problem in two or three
lines with the session evidence (which session, what the agent did, which line
of the skill drove it) and the fix you propose, and confirm it is the friction
they meant before editing. When a retrospective handed it over, the ranked
candidate with its evidence is the report; fix it when the request already
authorizes changes.

The fix is the smallest change to the owner: usually a description, a router
row, a reordered step or a deleted line. Prefer removing or sharpening a line
over adding one. Hold the [durable bar](../retrospective/references/job.md): a
reproduced failure in the logs grounds the change; one impression does not.
Shared-skill edits go through [library](../library/METHOD.md) in the factory
source, with its checks; a project's own procedure or standard stays in that
project.

## 4. Check it worked

Say what a future session should now do differently, and how to see it: the
same request routed to the right method, the step done, the command passing.
Where the skill has a check in `checks/`, run it. When the change is a
candidate instruction for a shared skill worth measuring against reviewed tasks
before it lands, use the retrospective's
[nightly review pilot](../retrospective/references/nightly-review.md).
