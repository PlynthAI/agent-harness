# __PROJECT_NAME__ verification

## What this proves

The notes journey: a visitor opens the overview, goes to the notes page, adds, edits and removes
a note, and sees the server's reason when it rejects one. It also covers the empty, saving,
error and long-content states in light and dark at phone and desktop widths. This local route
cannot prove anything about a deployed environment.

## Run and identify the candidate

| Fact                   | Verified value or command                                                              |
| ---------------------- | -------------------------------------------------------------------------------------- |
| Checkout identity      | `git rev-parse HEAD` and `git status --short` in the repository root                   |
| Launch                 | `pnpm run dev:up` from the repository root after `pnpm install --frozen-lockfile`      |
| Readiness and identity | `pnpm run dev:status`: the URL to use, pid, OS start time, checkout and log            |
| URL with Portless      | `http://<name>.localhost`, `<worktree>.<name>.localhost` in a linked worktree; name from `portless.json` |
| URL without Portless   | `http://127.0.0.1:<port>`, port from `PORT` or derived from the folder name            |
| Health endpoint        | `GET /api/health` answers `{"status":"ok"}`                                            |
| Isolated resources     | One process tree under the recorded pid; record `.cache/dev/launch.json`, log `.cache/dev/server.log` |
| Test auth and seed     | None: the app has no accounts and starts with an empty list                            |

If `dev:status` names another checkout or fails, fix the route before claiming anything. If
Portless is installed but fails, `dev:up` exits 1; run `portless doctor`. `dev:up` also exits 1
for a Portless older than 0.15.4 or a route outside `.localhost`; update Portless or set
`PORTLESS=0`.

## Drive and observe

- Repeatable: `pnpm run test:e2e` runs `tests/e2e/` in Chromium on `127.0.0.1` at the derived
  port, including axe on the overview, the empty notes page and a saved note, failing on any
  serious or critical violation (Chromium once per machine: `pnpm run browser:setup`). It reuses a `dev:up` server there (the mode without Portless),
  or starts `pnpm run dev` itself. Each run prints its unique `.cache/playwright/<run>/`
  destination, with JSON and HTML reports and first-failure traces under `test-results/`.
  Local and CI runs have no automatic retries; diagnose the retained failure.
- Exploratory: open the printed URL in a browser. Check `/` and `/notes` at 375px and 1440px,
  in light and dark (the page follows `prefers-color-scheme`; set `data-theme` on `<html>` to
  force one). On `/notes`: the empty list, a note while saving, a saved note, a note over 280
  characters (rejected with "Not saved. Notes are limited to 280 characters."), a long note
  wrapping inside its card, and keyboard focus: an Ink border with unchanged fill on fields
  and outline buttons, a fill on unbordered controls, and a CanvasText outline in forced colours.
- Logs: `.cache/dev/server.log`; the browser console should stay free of errors.

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

`pnpm run dev:stop` stops only the recorded process tree, and only while its OS start time still
matches the record; otherwise it leaves the process alone and removes the stale record. With
Portless the route leaves `portless list` with the tree; the shared proxy keeps running.
`pnpm run dev:status` then exits 1 with the fix. Later runs preserve earlier output.
Copy useful evidence to the task's configured artifact route before retiring the checkout.
Reuse a completed check while its relevant content, fixtures, command/configuration,
dependencies, environment and scope match independently established current inputs.
Committing unchanged tested bytes or changing unrelated inputs does not expire it.
Rerun affected checks when those inputs change; unknown inputs remain unverified.

## CI parity

| CI job             | Trigger paths                    | Local command                                          | Hosted-only reason                                  |
| ------------------ | -------------------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| `check.yml: check` | all (push to main, pull request) | `pnpm install --frozen-lockfile` then `pnpm run check` | none                                                |
| `check.yml: check` | all                              | `pnpm run build`, `pnpm run test:e2e`                  | Build and browser steps; run as validation evidence |

## Initial qualification

8 October 2026, on Windows 11 with Node 24.20.0, pnpm 10.34.6 and Portless 0.15.7 (shared proxy
in HTTP mode). The candidate was the template as copied by the harness copier into a fresh
folder named `web-app-proof2`, with no git repository yet.

- `pnpm install --frozen-lockfile`, `pnpm run check` (lint, typecheck, format check, design lint
  with 0 errors and 9 warnings, 27 unit tests), `pnpm run build`, `pnpm run test:unit` (27
  passed) and `pnpm run test:e2e` (3 passed in Chromium) all exited 0.
- With Portless: `dev:status` failed with the fix before launch; `dev:up` printed
  `http://web-app-proof2.localhost`, `dev:status` agreed, a second `dev:up` reused it, and in the
  browser pane `/notes` added a note through the route. After `dev:up` had exited no window
  titled next, astro or node existed and the server still answered. `dev:stop` ended the whole
  tree and the route left `portless list`.
- Without Portless on PATH: `dev:up` started `next dev` on the derived `http://127.0.0.1:3315`,
  `dev:status` agreed, a second `dev:up` reused it and the page answered in the browser pane.
  With the record's start time altered, `dev:stop` left the server running and removed the
  stale record; with the true record it ended the tree and `dev:status` exited 1 with the fix.
- With a stand-in Portless whose `run` fails, `dev:up` exited 1 with the message and
  `Fix: portless doctor`, wrote no record and left nothing running.
- The earlier qualification the same day (`web-app-proof`) captured `/` and `/notes` at 375, 768
  and 1440 pixels in light and dark, every notes state and keyboard focus; the pages have not
  changed since, apart from a Tailwind source exclusion for `.cache/`.

Requalified on 8 October 2026 after the design seam change (the design became a library profile
in `styles/design/`, with Tailwind and shadcn names bound to the library's `--role-*` roles and
the Kit's three font packages in `styles/design/fonts.css`), same machine and versions, in a
fresh copy named `web-app-seam`:

- `pnpm install --frozen-lockfile`, `pnpm run check` (design lint 0 errors and 9 warnings, 35
  unit tests), `pnpm run build` and `pnpm run test:e2e` (4 passed, including
  `design-contract.spec.ts`, which removes the design's own tokens and checks every page paints
  from the roles alone) all exited 0.
- `/` and `/notes` captured at 375 and 1440 in light and dark matched a copy of the previous
  template pixel for pixel, except the overview's "Design tokens" sentence, whose copy changed.
- A fresh copy with a scratch Paper Blue profile applied through `--design` passed `check` and
  `test:e2e` and rendered Paper Blue's colours and Geist with no component edits.

Requalified on 9 October 2026 after the tooling additions (the check-only commit hook, knip in
`check`, axe in the E2E journey, `browser:setup`, the Portless floor in `dev:up`, a CI audit
job), on Node 24.20.0, pnpm 10.34.6 and Portless 0.15.7, in a fresh copy named `q4-web-app`
made by the copier, then `git init`. No page changed, so no captures were retaken.

- `pnpm install --frozen-lockfile` set `core.hooksPath` to `.husky/_`; `pnpm run check` (design
  lint 0 errors and 9 warnings, 39 unit tests, knip with no findings), `pnpm run build` and
  `pnpm run test:e2e` (6 passed, axe clean) all exited 0.
- Commit hook: the first commit of the whole tree passed; a staged file with Prettier drift was
  refused and left byte for byte as staged; a floating promise in `lib/notes.ts` was refused by
  ESLint; a dependency change staging `package.json` and `pnpm-lock.yaml` passed (the same
  lockfile fails Prettier once `.prettierignore` is bypassed); in a fresh clone with only an
  install, a source edit committed.
- Runner: with Portless 0.15.7, `dev:up` served `http://q4-web-app.localhost`, `dev:status`
  agreed and `dev:stop` ended it. With a stand-in Portless reporting 0.15.3 first on PATH,
  `dev:up` exited 1 naming the 0.15.4 floor and `PORTLESS=0`, wrote no record and started
  nothing; with `PORTLESS=0` it served `http://127.0.0.1:3044` and `dev:stop` ended it.
  With a healthy server already recorded, `dev:up` through the same stand-in also exited 1 with
  the floor message and did not reuse it; with Portless 0.15.7 a second `dev:up` reused it.
- `pnpm audit --audit-level=high` exited 1 on the template lockfile: braces GHSA-vfj7-8cjw-p6xm
  (high, no patched release), reached through `eslint-config-next`. The `audit` job was
  removed on 10 October 2026: no advisory gate before production.

Not covered: macOS and Linux runs (CI runs Ubuntu), Portless over HTTPS, a linked worktree's
route, screen reader output, and the production build driven in a browser.
