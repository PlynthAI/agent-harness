---
type: "pattern"
title: "Supabase security checklist"
description: "Apply when a plan or diff touches Supabase auth, RLS policies, grants, views, database functions, storage policies, client creation or the environment variables that hold Supabase keys."
applies_to: ["plan", "diff"]
dependency: ["@supabase/supabase-js", "@supabase/ssr", "supabase"]
source: "https://github.com/supabase/agent-skills/tree/544bfc56c89afe2b87b20017a59b2c6e9502a1fb/skills/supabase"
reviewed: "2026-10-02"
---
# Supabase security checklist

Supabase-specific traps that open a hole without an error. Check the items that
match what the plan or diff changes; each finding cites its heading.

## Exposure and RLS

- **RLS on every exposed table.** Tables in an exposed schema (`public` by
  default) are reachable through the Data API once `anon` or `authenticated`
  holds a grant, and without RLS such a table is fully open to that role. A
  deliberately public table still gets RLS, with an explicit read policy.
  Write policies for the table's real access model, not one copied
  `auth.uid()` pattern.
- **`TO authenticated` is not authorisation.** It checks the role, not the
  row: any signed-in user reads every row the `USING` clause allows. For
  per-user data, pair it with an ownership predicate.

  ```sql
  create policy "own rows" on items for select to authenticated
  using ((select auth.uid()) = user_id);
  ```
- **UPDATE needs a SELECT policy.** Postgres reads the row before updating it;
  with no SELECT policy the update matches nothing and reports 0 rows, no error.
- **No `auth.role()`.** It is deprecated; use the policy's `TO` clause. Where
  anonymous sign-ins are enabled they also carry the `authenticated` role, so
  neither check keeps them out; where that matters, check the JWT's
  `is_anonymous` claim.
- **No `user_metadata` in authorisation.** Users can edit
  `raw_user_meta_data`, and it appears in `auth.jwt()`. Authorise on
  `app_metadata` instead.

## Views and functions

- **Views bypass RLS by default.** On Postgres 15 or later create them
  `with (security_invoker = true)`; on older versions revoke them from `anon`
  and `authenticated` or keep them in a schema the API does not expose.
- **`SECURITY DEFINER` bypasses RLS.** It runs as its owner, usually a role
  with `bypassrls`. Adding it to clear a permission error removes access
  control instead of fixing the cause; prefer `SECURITY INVOKER`.
- **A definer function in `public` is a public endpoint.** New functions are
  executable by `PUBLIC`, which `anon` and `authenticated` inherit. When one is
  truly needed, keep it in a schema the API does not expose and, where it acts
  for the calling user, check `auth.uid()` in its body.

## Storage

- **Upsert needs INSERT, SELECT and UPDATE.** With INSERT alone new uploads
  work and replacing a file silently fails.

## Keys and clients

- **No service or secret key in a public client.** Browser code uses the
  publishable key (the legacy `anon` key only for compatibility). In Next.js
  every `NEXT_PUBLIC_` variable ships to the browser, so a service key there is
  exposed.
- **Scoped tokens for the Management API, CLI and MCP server.** Where scripts,
  CI or agents call them, prefer a personal access token scoped to the
  organisations, projects and permissions the task needs; a classic token
  carries the whole account.

## Sessions

- **Deleting a user leaves their access tokens valid** until they expire.
  Revoke sessions first and keep JWT expiry short for sensitive apps; for a
  strict guarantee, check `session_id` against `auth.sessions` on sensitive
  operations.
- **JWT claims are stale until refresh.** A change to `app_metadata` reaches
  a check that reads `auth.jwt()` only when the user's token refreshes.

## What tools already check

Supabase's advisors (`supabase db advisors`) cover these when they ran against
a disposable local database with the change applied; the validation receipt
says whether they did: security-definer views (`0010`), RLS disabled in
`public` (`0013`), `user_metadata` in policies (`0015`), always-true write
policies (`0024`; it skips SELECT policies, so a read policy with
`TO authenticated` alone stays review work), public bucket listing
(`0025`) and definer functions executable by `anon` or `authenticated`
(`0028`, `0029`). An item with no advisor is review work. Pinned versions and
committed lockfiles belong to the repository's dependency checks.
