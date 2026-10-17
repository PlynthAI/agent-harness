# __PROJECT_NAME__ verification

## What this proves

That a reader can use the public site: the home page, articles at `/articles/<slug>/`, the
contact form's validation and success states, the custom 404, per-page metadata, `robots.txt`,
the sitemap, the `/blog/` redirect and internal links, in light and dark, at 375, 768 and 1440
pixels, with visible keyboard focus. [DESIGN.md](../DESIGN.md) is the design authority.

This local route cannot prove page performance on real networks and devices (no field data or
lab budget is wired in), the host's redirect status codes (a static build writes meta-refresh
pages) or delivery of contact messages (the handler is a mock).

## Run and identify the candidate

| Fact                  | Verified value or command                                                        |
| --------------------- | -------------------------------------------------------------------------------- |
| Checkout and identity | `git rev-parse HEAD` plus `git status --short`; the runner prints the checkout   |
| Launch                | `pnpm run dev:up` from the checkout root after `pnpm install --frozen-lockfile`  |
| Readiness             | `pnpm run dev:status`: the URL to use, pid, checkout and log; non-zero when unusable |
| URL with Portless     | `http://<name>.localhost`, `<worktree>.<name>.localhost` in a linked worktree; name from `portless.json` |
| URL without Portless  | `http://127.0.0.1:<port>`, port from `PORT` or derived from the folder name      |
| Record and log        | `.cache/dev/launch.json`; `.cache/dev/server.log` (Astro and Portless output)    |
| Production-equivalent | `pnpm run build`, then `pnpm run start` (`astro preview`, default port 4321)     |
| Test auth and seed    | None: public pages, content from `src/content/articles/`, no data store          |

If `dev:status` names another checkout, stop and start this one; a reachable port alone is not
this candidate. If Portless is installed but fails, `dev:up` exits 1; run `portless doctor`.
`dev:up` also exits 1 for a Portless older than 0.15.4 or a route outside `.localhost`; update
Portless or set `PORTLESS=0`.

## Drive and observe

- Repeatable: `pnpm run test:e2e`. Playwright builds the site, serves it with `astro preview` on
  the dev port plus 1000 and runs `tests/e2e/site.spec.ts` in Chromium: home to article with
  title, canonical and Open Graph checks; zero script requests on home and article; contact form
  invalid then valid; 404 status and page; `robots.txt`, sitemap, redirect and internal links;
  axe on home and an article with no serious or critical violations. Each run prints its
  unique `.cache/playwright/<run>/` destination with JSON and HTML reports and first-failure
  traces under `test-results/`. Local and CI runs have no automatic retries; diagnose the
  retained failure. Chromium is installed once per machine with `pnpm run browser:setup`.
- Exploratory: open the `dev:status` URL in the browser and check the states the change touches
  at 375 and 1440 wide in both themes (set `data-theme="dark"` or `"light"` on `<html>`, or the
  browser's colour-scheme emulation), plus Tab order and focus: an Ink edge with unchanged
  fill on fields, outline buttons and linked cards; a fill on unbordered controls; and a
  CanvasText outline in forced colours.

## Behavior evidence mapping

Use the shared `validate-implementation` behavior-evidence contract when the
harness is available. Keep the versioned scenario and generated run output linked:

| Contract field | Project source |
|---|---|
| Behavior, scenario and repeatable setup | Selected named case in `tests/e2e/`, its fixture/setup and the requirement it proves |
| Expected and observed result | Executable assertions and their matching case result in `results.json` or the HTML report |
| Reproduction command | The exact repository-root `pnpm run test:e2e` invocation, including any selection or environment options |
| Candidate and environment | Checkout identity and readiness facts above, relevant lockfile/configuration, plus Playwright's checkout/Node metadata, browser and target URL |
| Attachments and limits | Relevant traces in the printed run destination; rendered evidence when needed for a visual claim; actual skips and missing proof |

Playwright's metadata does not capture the full Git working-tree identity. Retain
the identity commands' output with the existing run evidence; do not infer it from
the folder name. Preserve useful failure output before cleanup. A test report
proves its assertions, not every visual state. Do not add a second report format,
screenshots of every passing test or raw payload dumps merely to fill this table.

## Cleanup and reuse

`pnpm run dev:stop` ends only the recorded process tree, and only when its start time still
matches the record; otherwise it leaves the process alone and removes the stale record. With
Portless the route leaves `portless list` with the tree; the shared proxy keeps running.
Playwright stops the preview server it started. Later runs preserve earlier output.
Copy useful evidence to the task's configured artifact route before retiring the checkout.
Reuse a completed check while its relevant content, fixtures, command/configuration,
dependencies, environment and scope match independently established current inputs.
Committing unchanged tested bytes or changing unrelated inputs does not expire it.
Rerun affected checks when those inputs change; unknown inputs remain unverified.

## CI parity

| CI job                                    | Trigger paths                    | Local command                                   | Hosted-only reason                 |
| ----------------------------------------- | -------------------------------- | ----------------------------------------------- | ---------------------------------- |
| `check.yml`: check, `pnpm run check` step | all, on pushes to `main` and PRs | `pnpm run check`                                |                                    |
| `check.yml`: check, build step            | all                              | none at push                                    | Build job; validation runs it      |
| `check.yml`: check, Playwright steps      | all                              | none at push                                    | Browser job; validation runs it    |

## Initial qualification

8 October 2026, on Windows 11 with Node 24.20.0, pnpm 10.34.6 and Portless 0.15.7 (shared proxy
in HTTP mode), in a clean copy made by the harness copier from the `website` template (name
`website-proof2`, no git history yet).

- `pnpm install --frozen-lockfile`, `pnpm run check`, `pnpm run build`, `pnpm run test:e2e`
  (4 passed) and `pnpm run test:unit` (25 passed) all exited 0. `designmd lint` reported 0
  errors and 9 warnings: 5 orphaned Kit tokens the demo does not use (for example `warning`) and
  4 `fontVariantNumeric` "not a recognized typography property" warnings.
- With Portless: `dev:status` failed with the fix before launch; `dev:up` printed
  `http://website-proof2.localhost`, `dev:status` agreed, a second `dev:up` reused it, and in
  the browser pane the contact form at that route showed "Check the 3 highlighted fields." for
  an empty submit. After `dev:up` had exited no window titled next, astro or node existed and
  the server still answered. `dev:stop` ended the tree and the route left `portless list`.
- Without Portless on PATH: `dev:up` started `astro dev` on the derived
  `http://127.0.0.1:3912`, `dev:status` agreed, a second `dev:up` reused it and the home page
  answered in the browser pane. With the record's start time changed, `dev:stop` left the server
  running and removed the stale record; with the true record it ended the tree and `dev:status`
  then failed with the fix command.
- The earlier qualification the same day (`website-proof`) captured every page and form state
  at 375, 768 and 1440 wide in light and dark with keyboard focus; the pages have not changed.

Requalified on 8 October 2026 after the design seam change (the design became a library profile
in `src/styles/design/` replacing the inline `light-dark()` token block, Tailwind and shadcn names
bound to the library's `--role-*` roles, and an inline before-paint script that sets
`data-theme`), same machine and versions, in a fresh copy named `website-seam`:

- `pnpm install --frozen-lockfile`, `pnpm run check` (design lint 0 errors and 9 warnings, 33
  unit tests), `pnpm run build` and `pnpm run test:e2e` (5 passed, axe clean, including
  `design-contract.spec.ts`, which removes the design's own tokens and checks every page paints
  from the roles alone) all exited 0. Home and article pages still request no script file.
- The home page and an article captured at 375 and 1440 in light and dark matched a copy of the
  previous template pixel for pixel, except the footer's last line, whose copy changed.

Requalified on 9 October 2026 after the tooling additions (the check-only commit hook, knip in
`check` with the unused `Article` type removed, `browser:setup`, the Portless floor in `dev:up`,
a CI job timeout, a CI audit job), on Node 24.20.0, pnpm 10.34.6 and Portless 0.15.7, in a
fresh copy named `q5-website` made by the copier, then `git init`. No page changed, so no
captures were retaken.

- `pnpm install --frozen-lockfile` set `core.hooksPath` to `.husky/_`; `pnpm run check` (design
  lint 0 errors and 9 warnings, 37 unit tests, knip with no findings), `pnpm run build` and
  `pnpm run test:e2e` (6 passed, axe clean) all exited 0.
- Commit hook: the first commit of the whole tree passed; a staged file with Prettier drift was
  refused and left byte for byte as staged; a floating promise in `src/lib/articles.ts` was
  refused by ESLint; a dependency change staging `package.json` and `pnpm-lock.yaml` passed
  (the same lockfile fails Prettier once `.prettierignore` is bypassed); in a fresh clone with
  only an install, a source edit committed, because the hook runs `astro sync` before ESLint
  (without it, the same commit failed on unresolved `astro:content` types).
- Runner: with Portless 0.15.7, `dev:up` served `http://q4-website.localhost`, `dev:status`
  agreed and `dev:stop` ended it. With a stand-in Portless reporting 0.15.3 first on PATH,
  `dev:up` exited 1 naming the 0.15.4 floor and `PORTLESS=0`, wrote no record and started
  nothing; with `PORTLESS=0` it served `http://127.0.0.1:3042` and `dev:stop` ended it. The
  runner was proved in the previous copy, `q4-website`, whose `scripts/dev.mjs` is the same.
  With a healthy server already recorded, `dev:up` through the same stand-in also exited 1 with
  the floor message and did not reuse it.
- `pnpm audit --audit-level=high` exited 1 on the template lockfile: braces GHSA-vfj7-8cjw-p6xm
  (high, no patched release), reached through `shadcn`. The `audit` job was
  removed on 10 October 2026: no advisory gate before production.

Not proven locally: page performance on real devices and networks, host redirect status codes,
message delivery (see "What this proves"), Portless over HTTPS and a linked worktree's route.
