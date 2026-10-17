# Project templates

A template is a complete, runnable, clean project. An agent copies one, installs
its locked dependencies, runs its checks, starts its dev server and drives its
demo journey in a browser before writing a line of product code. From the copy
onwards it is the project's own code: nothing flows back here, and later changes
here do not reach the copy. The templates ship no product code, brand, copy,
data, secrets or machine paths.

The owning outcome is the harness workspace goal
"Portable harness CLI, project templates and independently scalable application
modules"; these two templates are its first runnable increment and stand in for
the proposed `harness init` until a CLI exists. They are used from this checkout
by path and are not part of the deployed install.

## Create a project

```bash
node templates/new-project.mjs <template> <target-dir> --name <project-name> --workspace <workspace-root> --remote <owner/repo> --design <profile-id> --library <design-library-root>
```

Run it from the harness checkout root. The copier creates `<target-dir>` (it must not exist or must be empty), copies
the template without installed or generated folders, and replaces the
`__PROJECT_NAME__` placeholder in text files with the project name (default:
the target folder's basename). With `--workspace` it also seeds the project's
external workspace at that root from `harness-docs-starter` (AGENTS.md,
README.md, LICENSE, the recipes and the empty route folders), fills the
starter's placeholders, points the project's PROJECT.md at the root and prints
the `docs-workspace` registry entry to add; the usual root is the business
brain's `Workspaces/<repo>/`, and it must be outside the project. Without it,
PROJECT.md says the workspace is not seeded yet.

With `--design`, it applies a design library profile instead of the bundled
Kit: the project's `DESIGN.md` (the profile's, named for the project), and in
the template's design folder (`styles/design/` or `src/styles/design/`) the
profile's `tokens.css`, `type.css` (when it has one) and `role-bridge.css`
byte for byte, `fonts.css` with one `@import` per font package and
`SOURCE.json` with the profile, library commit and each file's sha256 at the
source and as written. It sets the design's font packages in `package.json` at the library's
locked versions, drops the replaced design's, prints each font's licence and
says to run `pnpm install` without `--frozen-lockfile`. The library root is
`--library`, else the docs-workspace registry's `design-library` shared root.
Only the library's in-repo profiles apply (the Kit today, starters once they
are profiles); a project's own profile, a font with no installable package, a
profile path outside the library, a `DESIGN.md` without closed front matter
and a role whose token the design's `tokens.css` does not declare are refused
before anything is written. Every run also prints the library
registration the project needs (a `profiles/<name>/profile.json` adapter and
the `sources.local.json` line); the copier never writes into the library. It
installs nothing and starts nothing. Then, in the new project:

```bash
pnpm install --frozen-lockfile
pnpm run check
pnpm run dev:up
pnpm run test:e2e
```

Run `pnpm install` without `--frozen-lockfile` when `--design` changed the
font packages. Read the project's own `README.md` and `AGENTS.md` next. Both
templates ship the design library's Kit, applied exactly as `--design kit`
applies it. To change an existing project's design, run
`node templates/new-project.mjs design <project-dir> --design <profile-id>`
from the checkout root: it finds the project's design folder by its
`SOURCE.json` (and refuses a folder without one, or a design file edited since
the last apply unless `--force` is passed), then writes the same files
and font packages as `--design`. Any in-repo library profile applies,
including the library's starters once they are profiles (the Kit is the only
one today); library components then arrive through the library's `port.mjs` (Next only for now, so
not yet into the website template).

## Templates

| Template | Preset | Stack | Demo journey | Qualified |
| --- | --- | --- | --- | --- |
| [web-app](web-app/README.md) | Application (the "frontend" template) | Next.js 16 App Router, React 19, TypeScript 5, pnpm 10, Tailwind CSS 4, shadcn (Base UI), zod, Playwright with axe, ESLint 9 | Home plus a `/notes` slice: client state, a zod-validated Route Handler, a health route; empty, saving, saved, rejected and long-content states | 8 October 2026 in clean copies: frozen install, `check`, `build`, 3 E2E and 27 unit tests, runner start, reuse, refusal and stop with and without Portless, no console window on Windows; 44 captures at 375, 768 and 1440, light and dark. Rerun the same day after the design seam change: frozen install, `check` (35 unit tests), `build`, 4 E2E including the role contract; captures at 375 and 1440 in both themes pixel-identical to the previous template except one changed sentence; a scratch Paper Blue profile applied with `--design` re-themed it with no component edits. Rerun after the review repairs: `check` (35 unit tests), 5 E2E including the role contract in light and dark; captures unchanged against the same baseline; Paper Blue body copy now muted. Rerun 9 October after the tooling additions: frozen install (hook installed), `check` (39 unit tests, knip clean), `build`, 6 E2E (axe clean); the commit hook passed a first commit, a dependency change and a fresh-clone edit and refused Prettier drift (file untouched) and an ESLint error; the runner refused a stand-in Portless 0.15.3 and ran with 0.15.7 and with `PORTLESS=0` |
| [website](website/README.md) | Website (the "webdesign" template) | Astro 7 static, React 19 islands, TypeScript 6, pnpm 10, Tailwind CSS 4, shadcn (Base UI), content collections, sitemap, Playwright with axe, ESLint 10 | Home in four sections, two collection articles, a mocked contact form island, 404, per-page metadata, `robots.txt`, sitemap, a redirect; pages ship no JavaScript except the island | 8 October 2026 in clean copies: frozen install, `check`, `build`, 4 E2E (axe clean) and 25 unit tests, runner start, reuse, refusal and stop with and without Portless, no console window on Windows; 62 captures at 375, 768 and 1440, light and dark. Rerun the same day after the design seam change: frozen install, `check` (33 unit tests), `build`, 5 E2E (axe clean) including the role contract; captures at 375 and 1440 in both themes pixel-identical to the previous template except the changed footer line. Rerun after the review repairs: `check` (33 unit tests), 6 E2E (axe clean) including the role contract in light and dark; home, article, articles and contact unchanged except that footer line; the Paper Blue profile applied to a copy with the copier's design command passed `check` and 6 E2E. Rerun 9 October after the tooling additions: frozen install (hook installed), `check` (37 unit tests, knip clean), `build`, 6 E2E (axe clean); the same commit hook and runner scenarios as web-app, with `astro sync` in the hook so a fresh clone commits |

Version differences between the two are framework constraints, not choices:
Next's lint plugins hold web-app on ESLint 9 and TypeScript 5, while Astro's
lint plugin needs ESLint 10 and `astro check` accepts TypeScript 6. Each
template's `AGENTS.md` states its stack; `pnpm-lock.yaml` pins it.

## What every template carries

The shared contract both templates follow, so an agent moving between projects
finds the same shape:

- Node 24 (`.node-version`, `engines.node`), pnpm pinned by `packageManager`,
  `pnpm-lock.yaml` committed, `.npmrc` with `engine-strict`.
- The same script names: `dev`, `dev:up`, `dev:status`, `dev:stop`, `build`,
  `start`, `lint`, `typecheck`, `format`, `format:check`, `test:unit`,
  `test:e2e`, `browser:setup` (Playwright's Chromium), `design:lint`, `knip`
  (knip 6.40.0 through `pnpm dlx`, configured by `knip.json`), and `check`
  (lint, types, format, design lint, unit tests and knip: the push check, no
  build and no browser).
- A check-only commit hook per the shared check ladder: Husky runs
  `lint-staged --no-stash --fail-on-changes --max-arg-length 7000` from
  `.husky/pre-commit` (the chunk size keeps a large commit under cmd.exe's
  8191-character limit on Windows), and `lint-staged.config.mjs` runs
  `prettier --check --ignore-unknown`, ESLint and `designmd lint` on staged
  files (the website runs `astro sync` first, as its `lint` script does, so a
  fresh clone has Astro's types). Nothing in it writes a tracked file;
  `pnpm-lock.yaml` stays in `.prettierignore` so a dependency change commits.
  `prepare: husky` installs it, so `git init` comes before `pnpm install`.
- `.gitignore` covers task state and local agent files (`.state/`,
  `.claude/settings.local.json`, `.claude/worktrees/`). The template carries no
  agent-runtime layer itself (no `.claude/`, `.codex/`, `.mcp.json`, hooks
  beyond the commit hook, or repository skills): that is `harness adopt`'s
  layer, so a generated project works without a personal harness installation.
- `scripts/dev.mjs`: the project-owned runner the harness's development-runtime
  reference asks for. `up` reuses a healthy instance or starts one hidden and
  prints the URL; `status` reports URL, process identity and checkout and exits
  non-zero with the fix command; `stop` ends only a process whose recorded
  start time matches. When Portless is installed the server runs through it
  and the URL is the named `.localhost` route from `portless.json`
  (`<project>.localhost`; Portless names a linked worktree's route
  `<worktree>.<project>.localhost`, not yet exercised here); otherwise it
  listens on a port derived from the folder name. CI and Playwright always use
  the derived port (web-app's dev server; the website's `astro preview` of the
  build on that port plus 1000). No extra dependency either way. `PORTLESS=0`,
  `false` or `skip` (Portless's own opt-outs) force the port. Proven on
  Windows with Portless in HTTP mode; the POSIX process handling and Portless
  over HTTPS are not yet exercised. `up` refuses a Portless older than 0.15.4
  (the first release whose proxy listens only on loopback) and a route outside
  `.localhost` (LAN mode), naming the update and `PORTLESS=0`.
- One design, applied from a design library profile (the Kit by default):
  `DESIGN.md` in the Google DESIGN.md format, linted by `designmd lint`, and a
  design folder holding the same files in both templates (`tokens.css`,
  `type.css`, `role-bridge.css`, `fonts.css`, `SOURCE.json`). The stylesheet
  binds every Tailwind and shadcn name to the library's twenty `--role-*`
  roles, never to a design's own token names; shades no role covers prefer the
  design's token of the Kit's name and otherwise derive from the roles; scale
  tokens default to the Kit's values beneath the design's. Dark mode switches
  on `data-theme="dark"`, set before first paint. A `design-contract` E2E test
  checks that the colours, faces, radii and focus fill it reads on every page come from the roles alone.
- Filled project documents from the harness docs starter recipes: `README.md`,
  `AGENTS.md`, `PROJECT.md`, `ARCHITECTURE.md`, `CODING_STANDARDS.md` and
  `docs/VERIFICATION.md` with its CI parity table and a dated qualification run.
- One GitHub Actions workflow, `check.yml`, running the push check, the build
  and the Playwright journey on Ubuntu, with a job timeout.
- Node scripts only, so Windows and POSIX run the same commands; Chromium-only
  Playwright with `webServer`, and axe (`@axe-core/playwright`) failing the
  journey on serious or critical violations.

## Checks

`node --test checks/templates.test.mjs` (registered in `checks/run-all.ps1`)
checks the structure: required files, the fixed scripts, the placeholder, the
Node pin, the check-only commit hook, knip in `check`, axe in the E2E specs,
the agent-state ignores, CI timeout, no agent-runtime layer, no machine or
profile paths and no product name, that the copier
produces a clean copy, and the copier's `--design` path against a fixture
library. When the design library resolves (`DESIGN_LIBRARY_ROOT`, else the
registry's shared root) it also checks that each template's design files are
the library's Kit byte for byte and that copying without `--design` equals
`--design kit`; elsewhere those two tests skip. After the library's Kit
changes, rerun the copier with `--design kit` into a scratch folder and copy
the design files, `DESIGN.md` (keeping `name: __PROJECT_NAME__`) and the font
dependencies back. It installs and starts nothing. Whether a template
installs, builds and drives in a browser is proved by the dated qualification
run in its `docs/VERIFICATION.md`; rerun it after changing a template's
dependencies or journey.

## Changing a template

Edit the template in place, rerun its qualification in a fresh copy, update its
`docs/VERIFICATION.md` run and the table above, then run the harness checks.
Keep the shared contract above the same across templates; a new convention goes
into both or into neither. A new template follows the same contract and adds a
row here and its name to the check.
