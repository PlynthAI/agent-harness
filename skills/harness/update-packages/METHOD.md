---
name: update-packages
description: Update a project's packages, dependencies and tools. Reads the project's standard sources and open Dependabot or chore work, groups pending updates by risk into tickets, and hands them to a fresh team lead. Routes; never upgrades inline.
---

# Update packages

A router for dependency upkeep in one repository. It collects what is pending,
turns it into reviewable tickets and hands them on; implementation runs through
the normal build, verify and deliver stages.

## 1. Read the standard sources

The project's own files are the inventory; no separate package list exists or
is created.

- Manifests and lockfiles: `package.json` with its lockfile, `pyproject.toml`
  with `uv.lock` or `poetry.lock`, `Cargo.toml`, `go.mod`, and so on.
- Runtime and tool pins: `packageManager`, `engines`, `.node-version`,
  `.python-version`, `mise.toml` or `.tool-versions`, CI action versions.
- The Environment section of PROJECT.md, and the inventory from
  `node <shared-skills>/harness/scripts/env-scan.mjs <repository>`, which also
  reports whether Dependabot or Renovate is configured and for which
  ecosystems.
- The verification guide: the checks that prove an update safe.

## 2. Collect what is pending

Cover every ecosystem the sources list, whichever case applies to each:

- **Dependabot or Renovate configured**: list their open PRs
  (`gh api repos/<owner>/<repo>/pulls` filtered by author, or the GitHub tools)
  with each PR's CI state. They are the pending updates for the ecosystems they
  cover.
- **No bot for an ecosystem**: run its outdated check, for example
  `pnpm outdated --format json`, `npm outdated --json`, `uv tree --outdated`,
  `pip list --outdated`, `cargo outdated`, `go list -u -m all`.
- **Security**: `pnpm audit` / `npm audit`, `pip-audit`, or the repository's
  Dependabot alerts where the token can read them.
- **Open chores**: issues and PRs labelled as chores or dependencies, and stale
  update branches.

For each update record: name, from and to, direct or transitive, semver jump,
security advisory if any, and the source (bot PR, outdated check, issue).

## 3. Group by risk

- **Security fixes** first, each with its advisory.
- **Patch and minor** updates of one ecosystem together, unless one carries a
  known break.
- **Each major** upgrade on its own: read its changelog or migration guide from
  the official source, and note the breaking changes that touch this codebase
  (search for the APIs they name).
- **Runtime and tool** bumps (Node, Python, pnpm, CI images) on their own, since
  they move the environment: a cloud-env follow-up
  updates the containers.
- Superseded or failing bot PRs are closed by the ticket that replaces them.

## 4. Ticket and hand off

Turn the groups into tickets through [to-tickets](../../to-tickets/SKILL.md):
each with its updates, the changelog notes that matter, acceptance (install,
the project's checks green, the bot PRs it closes) and real dependencies
(runtime before the packages that need it). Then hand the package to a fresh
team lead through [coordinate](../../coordinate/SKILL.md), which runs
[orchestrate-work](../../orchestrate-work/SKILL.md) for that repository; a
single small ticket can go straight to [implement-spec](../../implement-spec/SKILL.md).

Report the inventory and the tickets: what is pending, how it was grouped, and
anything deliberately held back with its reason.
