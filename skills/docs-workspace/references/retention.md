# Workspace retention

What a task workspace keeps, and when the rest can go. This is the workspace-side
half of [storage lifecycle](../../keep-codex-fast/references/storage-lifecycle.md);
[large data](large-data.md) covers placement and the task's own owner record, and
delivery covers checkout and branch retirement.

## What is durable

Durable data is the canonical input and the accepted, valuable curated dataset:
the original acquired bytes, the acquisition provenance, and the curated set kept
for production, intelligence or later ingestion. It is not only the originals or
only what has already been loaded into a database. A staged dataset needed by
another goal stays available until that consumer finishes or uses its durable
copy. A duplicate workspace copy can go after verifying the retained copy and
updating its consumers; input status is not a reason to keep every copy. Projects name these roots in their
workspace or host guidance; a directory's name or its location under a cache path
does not settle it.

## What is task-owned and releasable

Task staging, transforms, caches and temporary exports live under `<task>/` in
the `scratch` route and release when the computation, verification or recovery
that needed them ends. Retained output and the minimum recovery a task needs live
under `<task>/` in the `artifacts` route. A finding keeps its insight, the input references and
the smallest reproducible evidence - a sample or excerpt, not an unbounded copy of
every log or trace. Both routes are optional subfolders of existing surfaces; they
add no top-level tree and no ledger.

A checkout's `.state/` folder (the team lead's state file, the reviewer's findings list
and small working files) is task-owned too. It goes when its worktree is retired,
so copy anything in it worth keeping to `artifacts` first; in a canonical
checkout with no worktree, the team lead removes it at closeout.

Retain material only while a consumer, a goal, a review or a recovery still needs
it. When that need ends, release it under the authority that already covers the
task. Do not keep a payload "just in case": name the concrete consumer, or the
event that brings the folder back to review, and do not open with an indefinite
blanket keep. A project-designated Keep path is protected and stays retained; its
existence is not a reason to hold unrelated material beside it.

## Completion

At task completion, update the owning task record's owner and release condition,
remove disposable scratch already inside the existing authorization, and leave
whatever a named consumer, review or recovery still needs. Write the folder's own
purpose, writer/service ownership and release condition into a small `AGENTS.md`
in a large or multi-run task folder, or the existing task README. A cleanup step
reads that file deliberately, because a folder's own instructions are not
auto-loaded, and treats it as evidence rather than permission. One record owns the
release table: link the canonical task record from the folder note, or keep the
table in the folder note itself, never both.

## Database and shared-cache specifics

A packaged `proj.db` shipped inside a reproducible environment is dependency
content, not an application database. A unique application or staged database is
not automatically disposable, and a stopped container or an unstarted service does not by itself
make its volume disposable - in particular, never run a broad prune of volumes or
shared caches. Reuse a shared download cache instead of copying it per session,
and do not point independent live sessions at one mutable environment or database
unless the tool supports concurrent use.

Prefer a tool's own pruning over handwritten recursive deletion, and check the
tool's current behaviour rather than assuming it is safe. Newer `uv` supports
centralized environments in its cache, and its cache prune may remove them - the
default project environment is still `.venv`, but a task that opted into a
centralized environment can lose it to a prune another task runs. Confirm the
active path and consumers before pruning, and keep the operation scoped to a
verified cache rather than treating native prune as unconditionally safe.

## Bounded cleanup

Periodic cleanup happens only when a request asks for it and only over the scope
that request names. It targets material whose release condition is already met,
not the whole disk and not every cache. An actual unresolved process, lock or
ownership question limits only the target it touches; the rest of the release
continues under existing authorization, with the held target recorded and its next
check named better than an open-ended keep.
