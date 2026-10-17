# Worktree lifecycle

A finished worktree is a cleanup candidate, not a deletion. Classifying it and
removing it are separate steps. A cleanup request can authorize removal of the
candidates it covers after these checks; do not add another confirmation for
each target when the request already covers it. A merge covers the merged task's own checkout, its local and remote branch
and its backups.

Complete [task closeout](#close-out-the-tasks-own-checkout) once the task's work
is on the target branch. Keep a checkout only for a named next task or a specific
preservation or recovery hold. Other tasks' worktrees remain with their owners;
backlog classification alone authorizes no removals.

Refresh the base revision through the project's supported worktree launcher;
clients may branch from the remote default or an explicitly selected local head.
A canonical checkout keeps its own owner. Update it only within that owner's
assigned scope, preserving dirty or diverged state; retirement alone does not
transfer canonical-checkout ownership.

## Close out the task's own checkout

1. Refresh the exact owner, checkout, merge proof and local/remote branch tips
   through the [fresh evidence checks](#cleanup-needs-authorisation-and-fresh-evidence).
   Resolve KEEP exclusions, retained/shared consumers and locks before retirement.
2. Stop each background command the task started through its owning runner,
   recording its stop command. Account for every tracked, untracked and ignored
   task-owned leftover. Deliver necessary source, including post-review edits,
   through the normal checks, review and delivery gates; then refresh merge proof.
   Reconcile ignored secret/configuration changes through the protected
   [secret preservation step](#preserve-ignored-secrets-and-configuration).
   Preserve useful nonsensitive ignored evidence outside the checkout, verify the
   copied bytes and update its references. Discard only exact, verified disposable task residue
   through the [safe unlink and removal routes](#unlink-links-first). Own edits
   already represented on the target branch or deliberately no longer needed for
   the delivered result can be reconciled within the existing closeout authority.
   Foreign edits, secrets, unique unresolved data and unknown ownership keep their
   named preservation owner; task-owned dirt alone is work to reconcile.
3. Select the [supported retirement route](#supported-retirement-routes) and
   complete safe supported cleanup available before archival. Leave the chat
   visible for manual archival unless the user explicitly requested automatic
   archival. If primary checkout removal must await archival, leave its exact
   owner, root, branch tips, preservation evidence and remaining action in the
   existing task record outside the checkout. Name the cleanup and verification
   owner; an explicitly requested final automatic archive needs an observer
   for the checks the closing task cannot perform. A KEEP, unreleased or shared
   chat remains open with its checkout retained.
4. Retire the checkout through that route and its exact task branches through
   [retire-worktree.mjs](../scripts/retire-worktree.mjs). When native cleanup leaves
   branches, use `--repo <repository> --branch <name>` only after proving the refs
   merged and no live consumer or registered checkout uses the branch. Read the
   plan before `--apply`; keep the helper's expected-tip deletion guards. The task
   may detach its own clean checkout at the reviewed task tip covered by the
   verified merge, preserving its exact HEAD and content before final primary
   archival, so branch disposal can finish while the caller is alive.
   Otherwise, the named cleanup owner disposes of the branch after checkout removal
   within the same retirement authority. A moved tip or refusal stays with its
   named recovery owner.
5. Claim worktree removal only after verifying directory and Git-registration
   absence; claim each local or remote branch removed only after verifying its
   ref is absent. A merge, archived flag or queued cleanup proves none of these.
   Record retained targets, the exact pending action and its supported recovery
   owner. Available native job or snapshot readback can explain a cleanup failure;
   missing private job, snapshot or restoration APIs do not block archive readiness
   when merged source and useful local data are independently preserved.

Archive readiness means required delivery, records and preservation are complete
and no remaining work requires this chat. Physical cleanup may still await the
user's manual archival or a recorded recovery action; report that separately.
Use delivery's [final summary](../SKILL.md#6-report-the-run-and-archive-readiness),
including "This chat can be archived." only when that readiness is established.

## Establish ownership when creating or adopting

Inspect current attachments and prefer reusing a suitable checkout. When creating
one, use the runtime's managed worktree capability and verify both Git registration
and its attachment to the owning chat. A chat's working directory and a worktree
attachment are different facts. Record useful checkout/chat/branch links once in
the existing task record; no new registry or mandatory per-agent record is needed.
Inspect an adopted checkout rather than recreating it to obtain an attachment.

| State | Evidence and next action |
|---|---|
| Active | Unfinished work, a live writer or another owner still needs the checkout: retain it. |
| Completed and reusable | Work is complete and a named next use needs the checkout: retain it, clearing only finished-run disposable output. |
| Safely retireable | Cleanup authorized, completion or abandonment evidenced, ownership released, content preserved and a supported route available: retire and verify. |
| Blocked | Missing/conflicting evidence, a protected/pinned/shared environment, unique content or a refused/unavailable route: retain it with the exact gap and next action. |

An idle chat is not necessarily finished. An unarchived historical subagent or
automated-review row is not necessarily running. Resolve its parent and current
execution status; neither age nor `archived=0` proves liveness. Keep completed
chats usable independently of their disposable checkouts.

### Release completed descendant owners

Before requesting managed archival, inspect the worktree's exact
attachment associations and each associated chat's current and parent execution
state. A completed parent may leave completed child chats carrying an inherited
attachment. Under cleanup authority that covers this worktree, retire each
verified completed, unpinned task-owned child through its supported native chat
lifecycle, normally `set_thread_archived` with `archived: true`. Retain live,
foreign, pinned or uncertain owners. This is bounded child-chat cleanup for the
worktree; it does not authorize archiving every descendant or changing the user
parent chat's manual archive preference.

Treat a `queued` `archive_worktree` response as unconfirmed: inspect the exact
attachments and any available native progress. When diagnostics are available,
an absent queue plus an active reattachment indicates retention; observable
native work indicates a pending job. Missing progress readback does not block
releasing independently verified completed owners. Resolve that owner condition
before using the owning chat's supported archive route again; never edit app
state to bypass its check. Claim retirement only after verifying both directory
and Git-registration absence.

## Check liveness per runtime before removal

A cleanup once removed the checkout a live session was working in: its folder
vanished mid-task and Git then reported "not a git repository". Before removing
any checkout, confirm through its runtime's own route that no live session uses
it as its working folder. Establish the runtime and owner from native
attachment/session records or creation provenance together with
`git worktree list --porcelain`; the folder's root alone proves neither.

| Runtime | Where its worktrees live | Liveness route | Retirement route |
|---|---|---|---|
| Codex app | The configured worktree root: a `.codex-worktrees` folder beside the repositories, or `worktrees` under the Codex home by default | Codex session records: the owning chat's attachment, its `archived` flag and its parent's execution status (the [inventory](../scripts/worktree-inventory.py) reads them), plus processes whose working directory is inside the folder | Secondary attachment: owning chat's `archive_worktree`. Completed current primary: manual chat archival, or final `set_thread_archived` when automatic archival was explicitly requested. See [supported routes](#supported-retirement-routes). |
| Claude desktop | Repository-local `.claude/worktrees/` by default, or the configured custom Worktree location | The app's session listing (`list_sessions`, `get_session`) reports each session's worktree and branch. A session that is working, has live background work, is pinned or is open on screen is held | Archive the finished owning session; by default the app stops its process and removes its worktree. The Git route only for residue whose session is archived or gone |
| Claude Code CLI | `.claude/worktrees/<name>` inside the repository, including subagent isolation worktrees | A running Claude process whose working directory is inside the folder; the owning session is the only one that can exit it | The owning session's `ExitWorktree` with `remove`; the Git route once that session has ended |
| Plain user worktree | Anywhere else `git worktree list` shows | No runtime record: processes whose working directory or open handles are inside the folder, and the owner named in the task record | The Git route below |

Claude Desktop supports a custom local **Worktree location** in Settings >
Claude Code, as [documented](https://code.claude.com/docs/en/desktop#work-in-parallel-with-sessions).
Inspect the effective setting and installed CLI `--help` before prescribing
placement. CLI `--worktree`/`-w` uses repository-local creation by default;
[its worktree options](https://code.claude.com/docs/en/worktrees) are distinct
from the Desktop setting. Preserve canonical-checkout ownership and existing
settings; no replacement path or junction is required by this method.

- A process scan by command line alone misses a shell or server whose working
  directory is inside the folder. Where working directories and open handles
  cannot be read, or another runtime's session tools are not available from
  this one, record that the check is incomplete and treat recent activity as
  live.
- Never directly remove a checkout while a live session uses it. A completed
  task's current primary uses manual or explicitly requested automatic whole-task
  archival below; other removal runs outside the candidate. Retain any checkout
  whose live users are unresolved.
- The desktop apps own their worktrees and cleanup markers. Do not edit app
  state, markers or databases to make a checkout look released.
- A Claude desktop session cannot remove the worktree it runs in. Archiving
  the finished session is the route, by hand or through the app's setting that
  archives a session when its pull request closes. Archiving removes the
  worktree and leaves the local branch, so retire that branch afterwards with
  `retire-worktree.mjs --branch <name>`.

## Cleanup needs authorisation and fresh evidence

- Removal needs authorisation covering that exact worktree and those exact
  branches: the task's own merge authorization, a cleanup request, or the
  project's standing authority. A classification-only request stops at the
  classification.
- Resolve the exact registered worktree and local/remote branch tips. Confirm
  no other active task, process, worktree or open pull request uses them; a clean
  directory alone does not establish that its owner has finished.
- Whether a finished task must be archived first, and any retention period
  before removal, is the project's own condition rather than a universal
  requirement of this method.
- This method adds no mandatory receipt, packet, inventory file or waiting period.
  Investigate conflicting legacy guidance against its purpose and the accepted
  project requirements. Do not discard a current safeguard or override an
  enforced control because an older diagnostic has a different classification.
- Verify merge evidence at cleanup time. Git ancestry proves an ordinary merge.
  For a squash merge, branch commits need not be ancestors: match the worktree
  head to the pull request's recorded merge-time head and confirm its merge
  commit is contained in the current target branch. Patch similarity alone is
  not proof that all work is represented.
- A merged pull request does not cover later commits. Compare the local and
  remote branch tips against the merged head and investigate anything newer.
- Check tracked, untracked and ignored local content before removal, without
  following data or cache links into their targets.

## Preserve what is not disposable

- Reconcile task-owned dirt through [closeout](#close-out-the-tasks-own-checkout).
  Preserve foreign edits, secrets, unique unresolved source or evidence and
  unknown ownership. Name the exact file, commit or owner and the next action
  instead of widening into a repository-wide audit or a second backup tree.

- Shared workspace roots, shared data roots and recovery refs stay in place;
  they are not the candidate's to remove.
- Rebuildable dependencies, caches and local configuration reproducible from its
  own source need no preservation copy. Never commit a secret to preserve it:
  leave it where it is and report it.
- App snapshots may omit ignored content. Preserve useful ignored evidence in
  the shared task workspace, verify its bytes and reconcile references before
  releasing the only copy. Do not copy whole environments into recovery archives.
- `.state/` at the checkout root is the task's ignored scratch: the team lead's
  `state.md`, the reviewer's findings list and small working files. It goes
  with the worktree, so copy anything worth keeping to the project's artifacts
  first. In a canonical checkout with no worktree, the team lead removes `.state/` at
  closeout, after checking it and its ancestors hold no link.
- Inspect purpose, not suffix: packaged `proj.db` in a reproducible environment
  is different from an application database or unique staged dataset. See
  [storage lifecycle](../../keep-codex-fast/references/storage-lifecycle.md).
- Keep canonical/active checkouts, protected branches and every operator/project
  exclusion. Managed archival of a completed checkout must preserve chat continuity.

### Preserve ignored secrets and configuration

Git does not save ignored `.env` files, and the app's worktree snapshot omits
ignored content. `.worktreeinclude` copies selected ignored files into a new
worktree; it does not save changes back. Before retirement, identify task-added
or changed environment variables, secret values and sensitive local configuration,
including changes to files copied from the source checkout.

Use the permanent canonical project checkout's ignored `.env` or established
private configuration for local persistence. Reconcile the task's local additions
and intentional changes there within its existing configuration authority;
no new secret-manager or notes-vault setup is required. Resolve that canonical
target and its intended environment, and confirm the file is ignored and not
Git-tracked before writing. Keep established project-specific env filenames.

Reconcile per key, preserving unrelated entries and concurrent canonical edits;
never overwrite the whole file blindly. If another writer changed the same key,
resolve the conflicting values privately before replacing either. Privately
verify the saved values and required variable names before removing the only
local copy. Do not copy production credentials into development, transfer them
across execution identities or expand authority over deployed settings. Ambiguous
environments, real conflicts or an unproved save protect the original checkout
until that specific preservation work is resolved.

Never commit secret values or copy them into review packets, logs, ordinary
artifacts or OCR inputs. Record only safe variable names, configuration identity,
save/readback outcome and owning destination. A clean Git status, an existing
canonical file or a snapshot ref alone does not prove newly changed secrets
were saved. Notes such as Obsidian may hold names, purpose, environment and
location; this route does not authorize storing secret values there.

## Unlink links first

- A junction or symbolic link can reach a shared root outside the checkout, and
  a recursive delete that follows it deletes the target. Unlinking comes before
  any removal command, every time.
- Inspect the candidate and its ancestors without traversing reparse points.
  Neither link type proves a removal command is safe: an implementation may
  follow a link, refuse it, or leave residue after reporting success. Qualify the
  actual route with disposable targets when its behavior is unknown.
- Distinguish the link entry from its target. The entry sits inside the
  candidate; its target may be a shared data or cache root, and clearing the
  candidate never authorises deleting that target.
- List every link inside the candidate with its type and target (in PowerShell,
  `Get-ChildItem -Recurse -Force -Attributes ReparsePoint`, which does not
  descend into links without `-FollowSymlink`). Unlink every entry, one verified
  entry at a time, reporting each. Its target remains untouched; an internal
  target goes with the checkout when the link-free checkout is removed.
- For a clean Git-tracked symbolic link, the helper reads its exact indexed
  mode-120000 blob and compares the actual target bytes, allowing only Windows
  separator conversion. Index flags cannot authorize discarding a hidden edit.
  Indexed paths convert only native filesystem separators; literal POSIX
  backslashes stay part of the filename. Before any unlink, it refuses tracked
  `.gitattributes` links in every case variant on all platforms and named filter
  drivers without executing them. Git hashes each exact blob through its built-in
  conversions, without writing an object; only an unchanged indexed hash admits
  the ordinary-file representation. A refusal leaves every original link intact.
  It binds the current directory to the verified parent while unlinking and
  writing by basename, then restores the caller's directory and rechecks parents.
  The actual entry is unlinked and its indexed bytes become an ordinary
  file. Per-command `core.symlinks=false` lets Git verify this representation is
  still clean and remove the worktree normally. Indexed blobs and modes and
  persistent Git configuration stay unchanged. Unknown indexed types or changed entry/path
  identities stop retirement before recursive removal.
- On Windows, for a verified directory junction or directory symlink within an
  already authorized retirement, the nonrecursive
  `[System.IO.Directory]::Delete($link, $false)` removes the entry without
  traversing its target, as [documented by Microsoft](https://learn.microsoft.com/en-us/dotnet/api/system.io.directory.delete).
  Verify the exact entry/type and target first and target preservation afterward;
  do not generalize this to unknown reparse types or substitute the target path.
  This is not a fallback for an app archive refusal or missing ownership.
- Normal Git removal can unregister a checkout while leaving a junction and its
  containing directory behind. Check both filesystem absence and registration;
  an exit code alone does not prove retirement.
- Do not detach unverified links in bulk, and do not treat an unknown link as
  disposable. Where no safe unlink route exists, keep the worktree and report
  the hazard instead of forcing removal, and do not reach the guard through
  another command, shell, runtime or agent.
- Follow the project's own guidance for how local links are recreated.
  Prefer configured data/workspace paths over creating new links in disposable
  checkouts; reconcile existing consumers before changing a required legacy link.

## Supported retirement routes

| Checkout | Route |
|---|---|
| Confirmed Codex-managed secondary attachment, outside its owning chat's current checkout | Verify the artifact and use app `archive_worktree` from its owning chat. Assess ignored files separately from the recovery snapshot. |
| Confirmed Codex-managed current primary checkout of the completed owning chat | Finish delivery, preservation and records, then leave it ready for manual chat archival. That action triggers native asynchronous cleanup. If automatic archival was explicitly requested, the owner calls `set_thread_archived` with `archived: true` as its final lifecycle action and an observer verifies physical cleanup. |
| Chat-associated or in a Codex worktree root, but no attachment | Determine creation/ownership provenance first: a chat working directory or folder name alone proves neither managed nor ordinary Git ownership. If it may be a former managed checkout, retain it and report the absent attachment or supported repair capability once. Do not ask for removal authorization again or retry archive in another task. |
| Positively established ordinary Git worktree outside app management | Use the project's supported Git retirement route with complete ownership/preservation evidence. A chat having used it does not make it app-managed. Never reclassify a formerly managed checkout merely because its attachment is missing, or fabricate owner/pin/completeness assertions. |
| Missing directory, stale registration or partial deletion | Inspect the exact registration and residuals. A stale record does not authorize broad pruning or recursive deletion. |

The current primary is the owning chat's working checkout, not Git's canonical
repository checkout. Whole-task archival closes that completed task before
managed cleanup. Manual archival is the default; an agent need not archive itself
to finish delivery. Normal archival clears that selected chat's own pin; it does
not release a KEEP chat, saved workspace, shared attachment or active consumer.
This is a lifecycle condition change, not an attachment-archive retry. Preserve
the exact pending cleanup outside the checkout for the named owner to verify
after archival.

Classify the route before calling a removal tool. Keep an actual refusal with
its named supported recovery owner; do not retry the same denied effect through
Git removal, another task, Handoff, ownership changes or raw app-state edits.
Independent qualified task caches can still be released within their own cleanup
authority; do not delete checkout contents to make a refused archive eligible.

App Handoff moves a chat **and its Git state**; use it only for an authorized
handoff. Creating another checkout or moving folders does not repair missing
ownership or attachment evidence. Inspect current supported tools before
reporting a capability unavailable. The
[Codex worktree documentation](https://learn.chatgpt.com/docs/environments/git-worktrees)
describes managed snapshots/restoration and the configurable worktree root; do not
assume all checkouts live under `~/.codex/worktrees`.

For backlog evidence, use [the read-only inventory](../scripts/worktree-inventory.py)
with explicit roots and exclusions, then review the missing completion, process,
content and route evidence. It is not a complete owner certificate for a janitor
or an execution manifest. Review classifications before broader removal.

For example, `python -B <shared-skills>/delivery/scripts/worktree-inventory.py
--root <absolute-worktree-root> --codex-home <absolute-codex-home>
--exclude <protected-subtree> --target <checkout>` emits JSON to stdout without
changing files. Repeat `--root`/`--exclude` as needed; omit `--target` for a backlog.
Use `--state-db` instead of `--codex-home` when the actual database is elsewhere.
This reads local app-state diagnostics, not a supported attachment-repair API.

## Remove, then verify

For a checkout on the Git route, `node` [retire-worktree.mjs](../scripts/retire-worktree.mjs)
`<worktree-path>` carries out this section and the unlinking above. It prints a
plan and changes nothing until `--apply`. It refuses the main checkout, the
folder the caller is in, a locked, dirty or unmerged checkout, one holding an
unreadable or changed link, one with a live process inside, and a runtime-owned path
unless `--released "<evidence>"` says how its session was shown finished. Where
process working directories cannot be read (Windows), a write inside the
checkout within the last 15 minutes counts as live until `--released` says
otherwise. Branches go only while they still point at the proven tip
(`git update-ref -d` locally, `--force-with-lease` for the remote); a tip that
moved is left in place. Never hand-write the removal it covers; a refusal is
its answer, and the rules below say why.

- Run direct removal from outside the candidate, through the supported route;
  final whole-task archival uses its owning caller as described above. Prefer a
  normal removal to a forced one. Recheck ownership, contents and tips immediately
  before acting; if they changed, reassess the affected target.
- Delete the candidate's task branch only within the authorised cleanup, and its
  remote branch only once its tip is covered and nothing else uses it. Git
  refuses `git branch -d` for a squash-merged branch, since its commits are not
  ancestors of the target. Delete such a branch only while its tip still equals
  the head the merged pull request recorded; a tip that moved holds later work.
- Never delete a registered worktree recursively, override a lock, or force
  removal of dirty or unknown state. A refusal is the correct result. A forced
  Git removal is right only for uncommitted content an audit has shown is on the
  target branch or deliberately dropped (next section).
- Leave no empty folder. After `git worktree remove`, check the path: once the
  registration is gone and no link remains inside, whatever is left is residue
  (ignored files Git skipped, an emptied tree). Delete it, and an outer folder
  left empty by a nested checkout. An unregistered empty folder is removed with
  its worktree, never left behind.
- On Windows a removal can fail part way: a process holds a file, or a folder
  denies access to the current account. Find the holder. The task's own
  background command is stopped with its stop command and the removal rerun;
  another session's process means the checkout is live, so stop and report it;
  access-denied content belongs to its owner to release, so report it and leave
  the partial folder rather than forcing it.
- If the folder is gone but the registration remains, run
  `git worktree prune --dry-run --verbose` and prune only when it lists nothing
  but this candidate; otherwise leave the stale records and report them, since
  each belongs to an owner who must be confirmed finished.
- Verify the directory, the registration and the targeted branches are gone.
  Report what was removed and every exception where the project keeps its task
  record.
- Read available app archive and snapshot metadata when needed to diagnose a
  failure or establish preservation. Missing private readback is not an archive
  readiness gate when source and useful local data are independently preserved.
  A saved ref proves preservation, not working restoration; claim restoration
  only after a supported restore verifies expected content. Record actual
  archive-confirmation failures or snapshot identity mismatches with their
  recovery owner and preserve their refs; never rewrite app state to finish cleanup.
- Measure drive free bytes before and after and note concurrent activity.
  Apparent file totals and moving data to an archive on the same drive do not
  establish space recovered.

## Audit first, then a scripted retirement

For wider cleanup involving uncommitted work, audit first, have the owner approve
the droppable list, then run one scripted
retirement that unlinks, removes and deletes branches, reporting each step for
each worktree.

- The audit shows, per worktree, that its head is an ancestor of the target
  branch with nothing ahead, and classifies every uncommitted file: already on
  the target branch (often in evolved form), deleted there, or unique. Unique
  content keeps the worktree; the rest is droppable once the owner approves.
- The script is [retire-worktree.mjs](../scripts/retire-worktree.mjs), given
  every approved path at once. Per worktree it unlinks the in-tree links, runs
  `git worktree remove` without force, deletes the merged branches (`git branch
  -d`, or the proven-tip rule above for a squash merge), removes the residue
  and any empty outer folder, and prints what it did or where it stopped. It
  never forces: a worktree whose audited uncommitted content the owner approved
  to drop is cleaned by discarding exactly those files first, then retired.
- A project's own retirement audit is evidence, not a veto. One such audit
  marked every entry keep or blocked because it treated any runtime state inside
  a checkout as owner-retained and required an attestation nothing issues. The
  decision recorded on 2026-09-30: validation receipts and caches of an
  already-merged head are derived state and are disposable with their worktree,
  and five worktrees with uncommitted work, each audited as above, were
  approved as droppable. Where a project audit blocks a candidate for a reason
  this method does not share, record the reason and the override with the owner's
  approval rather than silently ignoring the audit.

## One-time reset across repositories

When worktrees and branches have piled up across a set of repositories, reset
them once, accounting first. The goal is that only active worktrees and branches
remain.

1. Account for everything, per repository, starting from `node`
   [repo-inventory.mjs](../scripts/repo-inventory.mjs) `--repo <path>`: every
   registered worktree, local branch, remote branch,
   stash and backup ref or folder, plus unregistered folders under each
   runtime's worktree root. For each worktree record its runtime, branch,
   whether its head is on main (ancestry, or the merged pull request's recorded
   head for a squash merge), dirty and untracked content, and its liveness by
   the table above.
2. Split the accounting in two. **On main**: retire the worktree, the local
   branch, the remote branch and the backups. **Active**: keep, with the owning
   session or the reason named. Anything that fits neither (unmerged with no
   live owner, unique uncommitted content, a stash) is listed for the owner's
   decision with its unique commits or files.
3. Report the accounting before removing anything active-looking: recent
   activity, a live or unarchived session, dirty content or a process in the
   folder. The clearly on-main set can proceed; the rest waits for the report.
4. Retire the on-main set with the scripted retirement above, through each
   runtime's own route (desktop app worktrees through their app). Stashes whose
   content is on main are dropped; unique ones are committed to a pushed branch
   or reported.
5. Re-list each repository and measure free space before and after. The report
   names what was retired, what remains and each remaining item's owner.

## Respect a denial

A denial covers the operation and its target. Report it once and continue;
retrying it through another command, shell, runtime or agent is not a remedy.
