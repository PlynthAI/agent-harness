---
name: database-workflow
description: Find a project's database read connection and route migrations, data writes and settings or security changes through its owning project's execution procedure.
metadata:
  group: build
---
# Database workflow

Find the project that owns the database and migrations, then use its instructions
for targets, connections and execution. A frontend task may need that owner's
database guidance without taking on the whole backend workflow. Project facts
belong in ordinary references or a distinct domain skill, not another copy of
this method. Use [discovery](references/discovery.md) when a route is unclear.
SQL quality is judged at review time, from the Postgres patterns entry in the
[principles and patterns index](../../principles-and-patterns/index.md); this
method covers access and execution. Authors use
[Supabase operations](references/supabase-operations.md) for Supabase auth in
SSR, a storage policy, Edge Function secrets or which MCP tool runs DDL, and
[database diagnosis](references/database-diagnosis.md) for a slow query, a
connection limit, a statement timeout or bloat.

## Reads and preparation

Every agent may inspect schema, catalogs and rows through the project's approved
read-only connection: CLI, MCP or plugin. Use the available route, record which
target supplied the evidence and keep credentials out of reports. A read-only
setting on one connection does not restrict another; CLI access needs its own
restricted credential. A SELECT prefix or tool annotation is not a privilege
boundary. Live results are evidence, not authority to overwrite deployed state.

Agents may draft SQL and migrations and rehearse on a disposable local target.
These are not production execution. Do not add approvals for ordinary reads or
preparation. Investigate a refused read through supported access recovery and
continue unaffected work; do not bypass an enforced denial.

Put task-specific database caches, staging files, transforms and temporary exports
in the shared project workspace, not the worktree or authoritative source cache.
A cache, staging copy or disposable local test target releases when its consumer
and recovery end; a packaged `proj.db` inside a reproducible environment is
dependency content rather than an application or staged database, and a stopped
container does not by itself make its volume disposable. Reuse original inputs
from their designated source store and share a download cache instead of copying
it per session; do not point separate live sessions at one mutable environment or
database unless the tool supports it. Use docs-workspace's
[large-data guidance](../docs-workspace/references/large-data.md) for shared task
paths, a task's own owner and release condition, useful recovery and retirement
once verification no longer needs the data.

## Protected execution

The team lead executes authorized changes to shared or production resources through the
owning project's designated route. This covers migration application, data
writes/upserts/deletions and changes to database settings, roles, permissions,
RLS, authentication or associated service/storage configuration. Management APIs
and dashboard actions have the same scope as equivalent SQL or CLI operations.
Children return prepared changes to the team lead; delegation carries the task's existing
authorization without transferring reserved production execution authority.

Resolve the exact target and operation, use the project's supported preflight
and recovery measures proportionate to that operation, and verify the result by
readback. Execute with the owner's tooling and working directory where its
procedure requires it. Reuse existing authorization; do not add a second approval
for the same scope. If a new destructive operation exceeds that scope, obtain
the missing decision after preparing the concrete result.

If a managed sandbox cannot open the project's credential store, first use the
owner's supported route for complete credentials already inherited by the task,
when available. A `.env` file's presence alone does not load it. Otherwise use
supported scoped escalation for the same authorized loader or executor. A
missing entry in that sandbox session does not prove the operator has not
provisioned it. Keep secrets out of output and task notes, preserve the project's
target checks, and do not ask the user to re-enter credentials that a supported
route can load. Respect a denied escalation as an enforced limit.

Do not substitute a direct command for a required execution route. A missing or
broken route is work for the team lead to resolve, not a reason to invent a wrapper, lease,
hook, database table or approval token. Report actual limits and continue work
that does not depend on them. Local rehearsal does not prove production success.

## Guidance and enforcement

The role boundary above is an instruction, not credential isolation. A command
hook cannot prove that a skill was followed or cover every database/API route.
Actual read-only privileges, credential access and the project's executor define
what can be enforced. If roles share privileged credentials, report that limit;
do not claim a team-lead-only hard boundary from role names or an approval string.

Keep targets, credential locations, tools and safeguards project-owned. Preserve
operator permissions and plugins. Do not add a custom SQL/shell classifier or
per-role allowlist to this method. Repair demonstrated access/workflow defects
within authorized scope instead of making the user manage routine recovery.
