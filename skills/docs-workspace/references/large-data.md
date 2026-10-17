# Large task data

Task-specific database caches, staging payloads, transformed data, replay inputs
derived for one task, and temporary exports belong in the project's resolved task
storage: `<task>/data/` in the `scratch` route when disposable, or `<task>/` in the
`artifacts` route when needed as accepted output, unique evidence or recovery.
Those routes sit under the host scratch root when the registry sets one. These are optional subfolders inside
existing routes, not new top-level surfaces. Do not put them in worktrees
(including a checkout's `.state/`, which holds only small working files) or an
authoritative source cache, and do not create a second copy per child agent.

Canonical source bytes, provenance and accepted valuable curated datasets keep
the project's durable data-store home, including data awaiting ingestion. Purpose
decides placement: a maintained intelligence dataset is durable; a trial transform
or export for one run is working data to release. Being derived does not make
data temporary, and being an original download does not make every copy necessary.
Follow the store's subject/provider layout, not arbitrary task-named folders.

Before creating a large copy, find the existing input and check available space,
including extraction/batch intermediates. Prefer referencing it, streaming or
bounded batches. Equal names or sizes do not prove duplication. When removing a
duplicate, verify content identity and that the remaining copy is usable with its
provenance, manifests and consumers; never deduplicate away authoritative originals.

For a large payload or run directory, add one compact line/table to the existing
task README or checkpoint: path, purpose/source, owner and size, consumer/writer,
and release condition. For example, staging can go after the accepted publication
and readback plus any required rollback window; a failed run may need its diagnostic
sample until the defect is understood. No database, new manifest schema or separate
ledger is required. Children share the parent's task root and distinct output names.

A task with a large or multi-run output cohort gets one small `AGENTS.md` in that
task folder, or the same content in its existing README: what the folder is for,
a link to the canonical task, goal or issue and to the team lead's chat when known, each
file or group's purpose and release condition, who writes it and how to stop or
check them, and any retained exception or the trigger that brings it back to
review. Small notes do not need this; a child folder shares its parent's record
and does not restate it. Cleanup reads this metadata deliberately, because a
folder's own instructions are not auto-loaded, and treats it as evidence rather
than permission. Seed it from `templates/task-storage.md`.

Keep only the evidence needed to explain the accepted result, reproducible input
references and the recovery the operation actually needs: findings keep the
insight, the input references and the minimal reproducible evidence. Clean task-owned rebuildable
intermediates when their release condition is met under existing authority. Stop
writers first, recheck paths/links, preserve useful results and update current
references. Doing this at task completion reclaims the space; a routine sweep is
not required. Do not keep a payload "just in case": name the concrete consumer,
goal, review or recovery that still needs it, or its next review, rather than an
indefinite blanket keep. Do not relocate or remove an active legacy run merely to
match the new layout. Unknown ownership, sole copies or required recovery stay
retained with the missing fact named. An explicit project Keep path stays
protected. Shared authoritative data is never a cleanup target through a
worktree's link.

Use [storage lifecycle](../../keep-codex-fast/references/storage-lifecycle.md)
for caches, histories and disk accounting, and delivery for worktree/branch retirement.
