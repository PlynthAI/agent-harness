# Storage lifecycle

Keep useful work recoverable while releasing disposable bytes when their job ends.
Use one shared method and one host storage map for common paths and retention.
The docs-workspace host registry's description points to that map when configured;
read it for storage work, not before every edit. Projects supply only their own
workspace, producer commands and genuine exceptions in PROJECT.md or a subject
guide. Update shared policy once in the harness, not in every repository.
Prefer direct paths. A link or junction is
justified when a consumer requires it; it is not the default. Removing a link
entry never authorizes removing its target. Do not add a per-repository cleaner,
mandatory ledger or approval stage. Worktree decisions use
[delivery's lifecycle](../../delivery/references/worktree-retirement.md).

## Map by purpose before cleanup

For the requested storage scope, discover configured roots and their owners:
Codex home, managed and legacy worktrees, project workspaces, source data, package
and model caches, build environments, validation outputs, runtime logs, review
sessions, app snapshots and manual backups. Include links and stale registrations.
Do not assume the drive containing Codex is also the worktree or cache drive.
Keep host-specific paths in local project guidance/evidence, not this shared skill.

| Material | Home and retention |
|---|---|
| Source code and task branches | Git checkout while active; retire completed disposable work through delivery after merge/abandonment and preservation checks. Reuse a free checkout when useful. |
| Canonical inputs and accepted curated datasets | Project source store; retain under its acquisition/backup contract. This covers originals and the curated datasets kept for production, intelligence or later ingestion, not only the already-ingested copy. Never clear them as a cache or worktree dependency. |
| Task-specific database caches, staging, transforms and temporary exports | Shared workspace `task-scratch/<task>/`, outside worktrees and source stores; retain only while computation, verification or recovery needs them. |
| Accepted outputs, minimal validation/review evidence and required recovery | Shared workspace `artifacts/<task>/`; preserve what supports a finding, consumer or rollback. Give large recovery payloads an explicit release condition. |
| Findings | Retain the insight, the input references and the minimum reproducible evidence. A useful log or trace is a sample or excerpt, not an unbounded copy kept forever. |
| Environments and build/package/model caches | Existing tool-owned roots; avoid per-chat duplicates. Rebuildable is established from contents and source/lockfiles, not the directory name. Respect consumers and tool locks. |
| Local test databases | Named disposable target with confirmed stopped consumers; never infer disposability from a `.db` suffix or a stopped container. Packaged PROJ data inside an environment is dependency content, not an application database; a unique application or staged database needs its own release and recovery evidence. |
| Runtime and validation output | Bound at the producer where available. Keep the useful final result/failure excerpt and remove redundant intermediate runs once no task/review needs them. |
| Chat sessions and managed snapshots | App-owned history/recovery. Archiving a chat is not deleting its transcript. Use supported app retention/deletion, with explicit scope for history loss. |
| Manual backup/recovery copies | Keep the needed rollback copy, not every complete tree forever. Release superseded copies after the replacement and its recovery are verified under the user's retention scope. |

## Task-sized cleanup, not a disk-full emergency

At setup, reuse shared inputs and caches, share download caches rather than
copying them per chat, and take a suitable checkout. Do not point separate live
sessions at one mutable environment, database or resource unless the tool
supports concurrent use. At task completion, update the owning task record's
owner and release condition, retain useful results, stop task-owned writers,
remove known disposable scratch within existing authorization, and resolve the
checkout/branch through delivery. No separate approval is needed for an artifact
already covered and confirmed disposable. Children use the parent's workspace and
return their output paths; the team lead owns final cleanup. Unrelated work and running
consumers stay intact.

Do not turn every small file into a bookkeeping task. For material storage growth,
record the exact location, purpose, owner/task, approximate size and release
condition in the existing plan/state/artifact README. Check space before a large
download, extraction or export; account for peak temporary space as well as final
size. Reuse inputs by path instead of copying them into each worktree/child. Prefer
streaming or bounded batches when a full intermediate copy has no purpose.

An unknown owner or a live writer narrows what is safe to touch; it does not
suspend cleanup across the rest of the scope. Leave that exact item, name the
missing fact and its next check, and release the material that is already
confirmed disposable.

Database staging and large data handling use
[the workspace guidance](../../docs-workspace/references/large-data.md).
Do not migrate a live writer for tidiness. Point new outputs to the correct root;
reconcile old outputs when that run has finished and references can be updated.

## Measure and maintain

Start read-only. Measure drive free bytes and apparent per-root totals without
following any reparse points or excluded subtrees. Report inaccessible entries and
incomplete coverage; do not add overlapping roots twice. Hardlinks, compression
and concurrent activity mean apparent bytes are not predicted reclaimed bytes.
Record actual before/after free space for cleanup, including zero or negative gains.

Prefer existing native cache pruning and producer rotation over handwritten
recursive deletion. Resolve the exact target, consumers and link boundaries first.
For validation workspaces, inspect their registered worktrees, process/lease state,
and retained receipts before invoking the existing cleanup route. A folder called
`tmp`, `cache` or `artifacts` does not establish its contents are disposable.

For sessions, do not solve growth by moving everything into another archive or
copying full histories into repeated backups. Keep valuable summaries/results in
the project workspace and retire unwanted history through supported app operations
within the user's explicit retention scope. No direct edits to a running app's
SQLite, raw transcript deletion, or unlinking live history. If the runtime exposes
no suitable deletion/retention capability, report that gap rather than promising
that archive frees disk. Worktree archive and chat archive are different actions.

Use periodic maintenance only when requested, and keep it bounded: it targets the
material whose release condition is met rather than the whole disk. Prefer
built-in lifecycle limits and normal task closeout to another cleaner daemon. A
report should identify the few largest growing roots, known disposable candidates,
exclusions and concrete blockers. Report unchanged state quietly. Age may help
prioritize inspection, but never establishes that work, history or data can be
discarded. Never run a broad prune of volumes or shared caches.

## Adoption

Each project storage guide needs only its workspace/source/cache roots, actual
producer commands, special retained outputs and explicit exclusions. Link to this
method and delivery instead of copying them. Existing path consumers keep working
until reconciled; adopting the guidance does not relocate their files. Maintain a
local host map when several projects share a drive, with dated measurements and
one owner for each shared root. It is an operational reference, not a new registry
agents must register with before working. A task whose output is large or spans
several runs records its own folder purpose, owner and release condition in the
existing task record, or a small task-folder `AGENTS.md` when one is warranted;
that stays task-owned local guidance, not another shared registry. Explicit Keep
paths and managed-archive refusals stay protected; do not bypass a refusal through
another command, shell, runtime or agent.
