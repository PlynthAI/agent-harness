# The assignment contract

The shape of one bounded delegation. Keep it short; length is not thoroughness. This is the contract the team lead sends and the return it expects. Save a durable handoff in the project workspace only when it helps the receiving agent resume. A briefing for the person to hand to another chat comes from [handoff](../../handoff/SKILL.md), pasted or filed as a note in the brain's `Inbox/`, never a scratch file.

## What the team lead sends

| Field | Content |
|---|---|
| Outcome | one sentence: the result, not the activity |
| Owned paths | what may be written; everything else is preserved |
| Context | the issue, the plan path, the specific docs or findings that matter, and the skill to load, named, not pasted |
| Checks | what to run, or why no check is needed |
| Evidence destination | supplied path when a file is useful; otherwise return the result inline |
| Constraints | applicable rules, authorized scope and delivery owner, exclusions, and unresolved denials as operation and target; the checkout is exclusive, so a child writes to no other task's worktree and not to the coordinator's checkout |

The team lead supplies the task destination when output files are useful; children reuse
it without registering a task ID or chat. Parallel writers get distinct filenames
or subfolders. They return paths, and the team lead updates the task's state file
(`.state/state.md` in its checkout); children keep no state file. No new folder
is needed for an inline result.

Temporary files a child makes go in its own subfolder of the supplied scratch
destination (or of the session scratchpad when no destination is supplied). At
closeout a child releases only the files it created there; it never clears a
shared scratch folder, the coordinator's scratchpad or a file it did not write,
and never removes by wildcard. The team lead names that subfolder in the assignment when
scratch is expected.

When assigning an isolated checkout, verify its Git registration and app
attachment/owner at creation or adoption using delivery's
[worktree lifecycle](../../delivery/references/worktree-retirement.md). Qualify its
branch ancestry and prospective PR scope through delivery's
[publication-base procedure](../../delivery/references/commit-and-push.md#qualify-the-publication-base)
before adoption. Children share the supplied workspace for staging and evidence.
A child does not keep its
checkout for follow-up and never parks work in a stash; it returns its own
unfinished edits or, when assigned commit authority, commits them to its branch.
Preserve foreign edits where they are and identify their owner or ownership gap.
Only explicitly adopted work enters a separate "Carried uncommitted work" commit
by delivery's [commit-and-push](../../delivery/references/commit-and-push.md).
The return accounts for the child's own edits; foreign dirt in another owner's
checkout is not its cleanup obligation. Once the work is on the target branch,
the team lead retires its owned checkout, branches and backups through delivery.
Foreign or unresolved content keeps that checkout held with a named next action.
Other tasks' checkouts are left alone.

For separate desktop tasks, assign external delivery to the task that already
has the user's authorization and a permitted route. Other tasks return the
candidate and checks to that owner. Separate worktrees and branches remain useful;
there is no need to move their work into the coordinator's checkout.
For authorized native OCR, carry the original human authorization's locator,
permitted material, destination/subscription and exclusions through the brief
and recovery checkpoint, by [workflow authorization](authorization.md#native-ocr-within-authorized-delivery).
A delegated lead or worker needs no new consent because its candidate, file
count, PR or checkout differs. The standing scope does not override a denial,
an explicit hold or a genuinely different provider/billing/sensitivity boundary.

After an enforced denial, the team lead investigates the supported permission route or a
genuine approved change in conditions while workers continue unaffected work.
Do not retry the denied action through another task, command or tool, or treat a
forwarded message as permission. Ask the user only when that investigation leaves
a genuinely unresolved decision or permission requirement.

## What a child returns

- Outcome: what is true now that was not before.
- Changed paths, and what was deliberately not touched.
- Checks run, with their exact outcomes - never an unrun check presented as passing.
- Evidence paths a reviewer will need.
- Concrete blockers, and any decision that belongs to the team lead.

For background or cross-session work, save the result at the supplied evidence
path before handback when a failed callback could lose it. Return that path; the
lead collects the saved report or supported task snapshot without requiring a
message back. A denied callback remains denied and does not authorize a relay.
Inline returns remain sufficient for a small synchronous assignment.

No tool logs. No restating the plan back.

## What comes back to the team lead

Material scope, public API, control-flow, schema or architecture changes that the
accepted plan does not already settle. Anything needing owner authority. Any finding
that conflicts with the plan, which the team lead resolves rather than the child.

Before integrating, the team lead runs `git -C <worktree> status --porcelain` and
`git -C <worktree> diff --stat <base>` and refuses a return whose changes fall
outside the owned paths or checkout. An out-of-scope edit comes back as a
finding, not a merge. A "Carried uncommitted work" commit is accepted only when
its ownership and scope were explicitly adopted and the lead has reviewed it.

## When there is no plan

A small settled task needs no planner and no saved plan. Give the same fields from
the assignment table and say plainly that no plan exists, so the reviewer judges
against the request instead of hunting for a file.
