---
type: "pattern"
title: "Postgres patterns"
description: "Apply when a plan or diff adds or changes SQL, migrations, schema files, indexes, RLS policies, database functions or the queries an application sends to Postgres."
applies_to: ["plan", "diff"]
source: "https://github.com/supabase/agent-skills/tree/544bfc56c89afe2b87b20017a59b2c6e9502a1fb/skills/supabase-postgres-best-practices"
reviewed: "2026-10-02"
---
# Postgres patterns

Rules for Postgres anywhere, Supabase or not. Plan review reads Schema and the
RLS model; diff review reads whatever the diff touches. Each finding cites its
heading. Most rules are defaults that pay off as a table grows: a small or
fixed table is not a finding. Server tuning (connection limits, timeouts,
vacuum, `EXPLAIN` and `pg_stat_statements` work) is diagnosis, not a property
of a diff, and is left out.

## Indexes

- **Filtered and joined columns are indexed.** A filter or join on an
  unindexed column of a growing table is a full scan that slows as it grows.
- **Foreign keys are indexed.** Postgres does not index the referencing
  column, so joins and `ON DELETE CASCADE` scan the child table. An existing
  index that leads with the column already covers it.
- **Composite order: equality first, range last.** One index on
  `(status, created_at)` serves `status = ? and created_at > ?`; it serves a
  filter on `created_at` alone poorly.
- **Partial index for a fixed predicate.** When queries always carry
  `deleted_at is null` or `status = 'pending'`, index only those rows.
- **Covering index on a hot read.** `include (...)` the selected columns that
  are not filtered on, so the query is answered from the index.
- **Right index type.** B-tree for equality and ranges; GIN for `jsonb`
  containment, arrays and full-text search; GiST for geometry, ranges and
  nearest-neighbour; BRIN for large time-series tables. A B-tree on a `jsonb`
  column does nothing for `@>`; a single `->>` key wants an expression index.
- **Word search uses full-text search.** A B-tree cannot serve
  `LIKE '%term%'`; for searching words, prefer a generated `tsvector` column
  with a GIN index.

## RLS performance

- **Wrap per-request functions in a subquery.** `using ((select auth.uid()) =
  user_id)` evaluates once per query; `auth.uid() = user_id` runs per row.
- **Index the columns policies filter on.**
- **A complex membership check can go in a helper.** A `security definer`
  function in a schema the API does not expose, with a pinned `search_path`
  and a check of the calling user in its body, called as
  `(select private.is_member(team_id))`, replaces a per-row join in the
  policy. Revoke `EXECUTE` from `PUBLIC` and from roles that should not call
  it; a role whose policy calls it needs `EXECUTE`, and `USAGE` on the schema.
- **For multi-tenant data, the database enforces isolation.**
  Application-side `where user_id = ?` alone exposes everything on one missed
  filter; enable RLS, and `force row level security` where the table owner
  queries it.

## Schema

- **Keys:** prefer `bigint generated always as identity` for a new table;
  `serial` works but identity is the recommended form. Random UUIDv4 primary
  keys scatter inserts across a large index; where IDs must be distributed or
  exposed, prefer a time-ordered UUIDv7 or ULID.
- **Types:** `text` unless a length limit is a real rule, `timestamptz` not
  `timestamp`, `numeric` for money, `boolean` for flags.
- **Lowercase snake_case identifiers.** A quoted mixed-case name must be quoted
  forever and trips tools and ORMs.
- **Partitioning suits** tables past about 100 million rows, time series
  queried by date, and data retired by dropping old partitions.

## Migrations

- **No `ADD CONSTRAINT IF NOT EXISTS`.** Postgres rejects the syntax; an
  idempotent migration checks `pg_constraint` in a `DO` block first.

## Query shape

- **No N+1.** A loop issuing one query per item becomes one query with
  `= any($1::bigint[])` or a join.
- **Keyset pagination for deep pages.** `OFFSET` reads every skipped row;
  `where (created_at, id) > ($1, $2) order by created_at, id` does not. The
  cursor includes every sort column.
- **Upsert, not check-then-insert.** Two concurrent requests both find nothing
  and one fails; use `insert ... on conflict ... do update` or `do nothing`.
- **Bulk loads are batched.** Multi-row `values` (up to about a thousand rows
  a statement) or `copy`, not one round trip per row.

## Locking and transactions

- **Keep external calls out of a transaction that holds row locks.** An HTTP
  or payment call made while holding them blocks other writes and locking
  reads on those rows. Call first, then update conditionally
  (`where id = $1 and status = 'pending'`).
- **Lock in a consistent order.** Transactions that lock the same rows in
  different orders deadlock; lock with `order by id for update`.
- **Queues with several workers claim with `for update skip locked`,** ideally
  claiming and updating the job in one statement, so workers do not wait on
  each other.
- **Advisory locks over lock rows.** `pg_advisory_xact_lock(hashtext('job'))`
  instead of a dummy table selected `for update`.

## Privileges and connections

- **Least privilege.** The application does not connect as a superuser. Grant
  it the tables and operations it uses rather than `all`, and revoke `public`
  defaults, except where RLS is the designed row-level control, as with
  Supabase's API roles.
- **Pool connections.** Serverless or many-client apps go through a pooler,
  usually in transaction mode.
- **Named prepared statements in transaction mode need pooler support.**
  Without it the next statement may land on another connection: turn off the
  driver's prepared statements or use session mode.

## What tools already check

A rule with a tool counterpart is review work only when that tool did not run;
the validation receipt says which ran.

- squawk lints migration files for key and column types
  (`prefer-bigint-over-int`, `prefer-text-field`, `prefer-timestamptz`,
  `prefer-identity`).
- Supabase's advisors inspect a database, so they count only when run against
  a disposable local database with the migration applied: unindexed foreign
  keys (`0001`), RLS initplan (`0003`), mutable function `search_path`
  (`0011`) and RLS disabled in `public` (`0013`).
