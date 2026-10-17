# Database diagnosis

Load when a Postgres or Supabase query is slow, connections run out, statements time out or tables bloat. Measure first, change one thing, measure again. Facts are dated below; PostgreSQL facts are from the version 18 docs.

Observation runs through the project's read-only route. Anything that executes a write does not: `EXPLAIN ANALYZE` of an INSERT, UPDATE or DELETE runs the statement, and PostgreSQL refuses that in a read-only transaction whatever follows it, so it runs against a disposable rehearsal copy or through the team lead's authorised executor. `ANALYZE` and `VACUUM` are maintenance: on a rehearsal copy any read-write connection runs them; on a shared or production database they are [protected execution](../SKILL.md#protected-execution), run by the team lead, as are changing settings, roles or extensions and `VACUUM FULL`. Index, query-shape, pooling and locking fixes are review rules in the Postgres patterns entry of the [principles and patterns index](../../../principles-and-patterns/index.md); cite that entry when a fix lands.

## Query plans

- `EXPLAIN` shows estimates only: cost, rows, width. `EXPLAIN ANALYZE` runs the statement and adds actual time, rows and loops.
- Because ANALYZE executes the statement, wrap an INSERT, UPDATE or DELETE in `BEGIN` and `ROLLBACK` on a read-write connection to a rehearsal copy, or hand it to the team lead's authorised executor; the read-only route refuses it.
- PostgreSQL 18 includes BUFFERS automatically whenever ANALYZE is used.
- Actual time and rows are per-loop averages; multiply by `loops` for a node's real total.
- Estimated rows far from actual rows point to stale statistics: run `ANALYZE` on the table (maintenance, as above) and plan again.
- Warning signs: a sequential scan on a large table with a high cost; a nested loop whose inner node shows a large `loops` count; `Sort Method: external merge Disk`, a sort that spilled past `work_mem`.

## pg_stat_statements

- Postgres needs it in `shared_preload_libraries`, `compute_query_id` enabled, then `CREATE EXTENSION pg_stat_statements`.
- On Supabase, enable it from the Dashboard's Extensions page; it lives in the `extensions` schema. Whether it is on by default is not stated in current docs.
- Key columns: `calls`, `total_exec_time`, `mean_exec_time`, `rows`, `shared_blks_hit`, `shared_blks_read`. Sort by total time for overall load and by mean time for the slowest single call.
- Figures accumulate from the last reset. `pg_stat_statements_reset()` clears them, so record when it ran before comparing a before and after.
- Supabase Studio's Query Performance report sits at `advisors/query-performance`; its Indexes tab runs `index_advisor`. Database Advisors (Security, Performance, Health) flag unindexed foreign keys and unused or duplicate indexes, also through MCP `get_advisors` or `supabase db advisors`.
- CLI: `supabase inspect db outliers`, `locks`, `blocking` and `long-running-queries`.

## Connection limits

- `max_connections` and pooler client limits by compute size: Nano and Micro 60/200, Small 90/400, Medium 120/600, Large 160/800, XL 240/1,000, 2XL 380/1,500, 4XL 480/3,000, 8XL 490/6,000, 12XL 500/9,000, 16XL 500/12,000.
- Ports: direct 5432; Supavisor session mode 5432; transaction mode 6543, without prepared statements; dedicated pooler 6543.
- Session mode holds a database connection for each client until it is released; transaction mode returns it after every transaction.
- "Max client connections reached" is the pooler's limit; "too many connections" is Postgres's `max_connections`. Look at `pg_stat_activity` or the Observability reports to see who holds them.
- Keep pool size to about 40% of `max_connections` when PostgREST carries heavy traffic, otherwise up to 80%. The default pool size per compute tier is not stated in current docs.

## Timeouts

- `statement_timeout`, `lock_timeout`, `idle_in_transaction_session_timeout` and `transaction_timeout` take milliseconds and default to 0, meaning off.
- Supabase role defaults for `statement_timeout`: `anon` 3 s, `authenticated` 8 s, `service_role` inherits `authenticator`'s 8 s, `postgres` capped at 2 minutes. Supabase role defaults for the other timeouts are not stated in current docs.
- Change one with `alter role <role> set statement_timeout = '<n>s'`, then `NOTIFY pgrst, 'reload config'` so the API picks it up. That is a role setting, so it is protected execution.
- API and Dashboard requests stop at 60 s whatever the role allows.
- A timeout is a symptom: read the plan or the blocking locks before raising the limit.

## Vacuum and bloat

- Autovacuum is on by default. Plain `VACUUM` runs alongside reads and writes and frees space for reuse inside the table.
- `VACUUM FULL` rewrites the table under an ACCESS EXCLUSIVE lock, blocking all access, and returns space to the operating system.
- `pg_stat_user_tables` shows `n_live_tup`, `n_dead_tup`, `last_vacuum`, `last_autovacuum`, `last_autoanalyze`, `seq_scan` and `idx_scan`. Many dead tuples with an old `last_autovacuum` mean autovacuum is falling behind; a high `seq_scan` against `idx_scan` hints at a missing index.
- CLI: `supabase inspect db bloat` and `vacuum-stats`.

## Sources

All accessed 2026-10-06.

- https://www.postgresql.org/docs/current/using-explain.html
- https://www.postgresql.org/docs/current/pgstatstatements.html
- https://www.postgresql.org/docs/current/runtime-config-client.html
- https://www.postgresql.org/docs/current/routine-vacuuming.html
- https://www.postgresql.org/docs/current/monitoring-stats.html
- https://supabase.com/docs/guides/database/query-optimization
- https://supabase.com/docs/guides/database/extensions/pg_stat_statements
- https://supabase.com/docs/guides/database/inspect
- https://supabase.com/docs/guides/database/extensions/index_advisor
- https://supabase.com/docs/guides/database/database-advisors
- https://supabase.com/docs/guides/platform/compute-and-disk
- https://supabase.com/docs/guides/database/connecting-to-postgres
- https://supabase.com/docs/guides/troubleshooting/supavisor-faq-YyP5tI
- https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits
- https://supabase.com/docs/guides/database/connection-management
- https://supabase.com/docs/guides/database/postgres/timeouts
