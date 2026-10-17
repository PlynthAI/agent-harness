---
name: keep-codex-fast
description: Diagnose local Codex storage growth or slowness and release completed task output using the owning tools and retention guidance.
metadata:
  short-description: Storage lifecycle and Codex maintenance
  group: harness
---

# Keep Codex fast

Start with the reported storage or performance problem. Read the host/project
storage map and relevant root AGENTS.md explicitly; don't scan every drive or
load session history for a cache question. Preserve named operator exclusions.

## Choose the relevant surface

- Caches, environments, validation output, workspaces and large files:
  [storage lifecycle](references/storage-lifecycle.md). Classify by purpose and
  consumer, use native maintenance, and measure actual free-space change.
- Completed checkout or branch:
  [delivery's worktree lifecycle](../delivery/references/worktree-retirement.md).
  Use supported ownership and retirement routes; a missing attachment or archive
  refusal is not permission to delete through another tool.
- Task artifacts or database staging:
  [workspace retention](../docs-workspace/references/retention.md) and
  [large data](../docs-workspace/references/large-data.md). Keep durable knowledge
  and needed recovery, release bulk output once its purpose ends.
- Session/history diagnosis: the bundled script's report mode is optional:
  `python <skill-root>/scripts/keep_codex_fast.py`. Its scan has narrower root
  coverage than a host inventory. Load [session maintenance](references/session-maintenance.md)
  only when that separate operation is requested. Supported app operations take
  precedence; never change a running app's SQLite or raw history.

Inspect the affected scope before changing it. Existing authorization covers
ordinary cleanup of released disposable material; no additional per-folder
confirmation or backup of reproducible caches is required. Check current writers,
links, real content and retention exceptions. An unresolved process or ownership
question holds that target, not every independent cleanup candidate.

Avoid indefinite archives and wholesale copies. Keep a compact result and useful
reproducer, update references when bulk evidence is retired, and record what was
removed, retained or blocked. Report inaccessible paths and partial coverage.
Closing Codex and backing up app state concern session-state maintenance; they
are not prerequisites for releasing an unrelated finished task's scratch.

If periodic maintenance is requested, use the app's supported automation with
explicit roots, exclusions and release conditions. It may clean already released,
verified disposable artifacts and qualified caches within its authorization.
Do not schedule session archival, database volume pruning, broad process killing
or removal of unknown worktrees as generic disk maintenance. Stay quiet when
there is no meaningful change or actionable blocker.

The upstream session skill was checked on 2026-09-27. This local routing deliberately
keeps its optional script separate from task storage and worktree retirement;
age-based relocation and archive-forever policy do not meet this harness's goals.
