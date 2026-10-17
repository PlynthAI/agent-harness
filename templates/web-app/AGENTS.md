# __PROJECT_NAME__

## 01 Project context

A Next.js web application. The App Router renders pages under `app/`; same-origin Route
Handlers under `app/api/` are the only server boundary, and every request body crossing it is
validated with zod against a contract in `lib/`. The starting slice is a notes page whose list
lives in client state. `PROJECT.md` maps the rest.

Stack: Node 24, TypeScript 5.9, Next.js 16 (App Router, Turbopack) with React 19, Tailwind CSS 4,
shadcn components on Base UI, zod 4, Playwright for browser tests and `node --test` through tsx
for unit tests. Versions come from `pnpm-lock.yaml`. Node is declared with `.node-version` = `24`
and `engines.node` = `>=24`.

This Next.js has APIs and conventions newer than most training data. Read the matching guide in
`node_modules/next/dist/docs/` before writing framework code, and heed deprecation notices.

## 02 Commands

Run from the repository root. Package manager: pnpm 10.34.6 from `packageManager`.
Prerequisites: Node 24; `pnpm run browser:setup` (Playwright Chromium) once before the first E2E
run.

| Task        | Exact command                                                                 | Scope or prerequisite                                                   |
| ----------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Install     | `pnpm install --frozen-lockfile`                                              | Lockfile as committed                                                   |
| Dev         | `pnpm run dev:up`                                                             | Detached dev server for this checkout; prints its URL (section 03)      |
| Check       | `pnpm run check`                                                              | Lint, types, format, design lint, unit tests, knip; no build or E2E     |
| Test all    | `pnpm run test:unit`                                                          | `node --test` through tsx over `app/`, `lib/` and `scripts/` tests      |
| Test file   | `pnpm exec tsx --test lib/notes.test.ts`                                      | One unit test file                                                      |
| Test name   | `pnpm exec tsx --test --test-name-pattern="maximum length" lib/notes.test.ts` | Name filter before the file                                             |
| E2E         | `pnpm run test:e2e`                                                           | Chromium with axe; reuses a port-mode `dev:up` or starts `pnpm run dev` |
| Browser     | `pnpm run browser:setup`                                                      | Installs Playwright's Chromium; once per machine                        |
| Dead code   | `pnpm run knip`                                                               | knip 6.40.0 through `pnpm dlx`: unused files, exports and dependencies  |
| Lint        | `pnpm run lint`                                                               | ESLint 9 flat config, type-aware on TypeScript                          |
| Typecheck   | `pnpm run typecheck`                                                          | `tsc --noEmit`                                                          |
| Format      | `pnpm run format`                                                             | Prettier writes the tree; `pnpm run format:check` only checks           |
| Design lint | `pnpm run design:lint`                                                        | `DESIGN.md` against the Google DESIGN.md format                         |
| Build       | `pnpm run build`                                                              | Production build; `pnpm run start` serves it                            |

## 03 Repository tooling

### Development runtime

- Start: `pnpm run dev:up` reuses this checkout's healthy server or starts `next dev` in the
  background, waits for `/api/health` and prints the URL. With Portless installed the server runs
  under `portless run` at `http://<name>.localhost` (`<worktree>.<name>.localhost` in a linked
  worktree; the name is in `portless.json`). Without Portless it listens on
  `http://127.0.0.1:<port>`, the port being `PORT` or one derived from the folder name.
- Status: `pnpm run dev:status` prints the URL to use, pid, checkout and log; it exits 1 with the
  fix when the record is missing, the process is gone or replaced, or the URL does not answer.
- Record and log: `.cache/dev/launch.json` and `.cache/dev/server.log` (server and Portless
  output; PowerShell: `Get-Content .cache/dev/server.log -Tail 50`).
- Stop: `pnpm run dev:stop` ends the recorded process tree, only while its OS start time matches
  the record; Portless drops the route with it. The shared Portless proxy is never touched.
- If Portless is installed but fails, `dev:up` exits 1 with the log path; run `portless doctor`.
  It also refuses a Portless older than 0.15.4 or a route outside `.localhost` (LAN mode), since
  either would put the server on the network; update Portless or set `PORTLESS=0`.
- Runtime guide: `docs/VERIFICATION.md`.

### Code navigation

`rg` for text and names, then read the files it finds. `ast-grep` (global, no setup) for syntactic
patterns and file outlines. Code intelligence uses the shared harness route; this repository needs
no setup of its own.

### Agent runtimes

Claude Code reads this file directly; the repository keeps no `CLAUDE.md`.

### Design

`DESIGN.md` is the design authority: a design library profile applied by the harness copier
(the Kit by default), with its files in `styles/design/`. Read it and `app/globals.css` before
visual work. Use the semantic colour utilities, the role radii (`rounded-control`,
`rounded-panel`, `rounded-pill`) and the `t-*` type roles, never raw values or a design's own
token names: `app/globals.css` binds every name to the library's `--role-*` roles, so a starter
applies the same way once it is a library profile. A library component arrives through the
library's `port.mjs` (README, Receiving library components). The `page-column` utility is opt-in
per page; the root layout wraps nothing, so a full-viewport application shell needs no change
there.

## 04 Layout and coding conventions

`ARCHITECTURE.md` binds where things live; `CODING_STANDARDS.md` holds the conventions.

- A Route Handler parses its input with the shared zod schema and answers with
  `Response.json` typed by the contract; the page parses the response with the same contract.
- Client state stays in the component that owns it until a second consumer needs it.

```ts
const result = saveDraft(body);
if (!result.ok) return reply({ error: { message: result.message } }, 422);
return reply({ note: result.note }, 201);
```

## 05 Boundaries

Always, without asking:

- Run any command in section 02, and `pnpm run dev:up` / `dev:stop` for this checkout.

Never:

- Commit secrets, `.env` files or anything under `.cache/`.
- Edit `styles/design/` by hand: it is the applied library profile, replaced with `DESIGN.md`
  through the harness copier's design command (README, Replacing the design).
- Keep variables the shadcn CLI writes into `app/globals.css`: after `shadcn add`, revert them,
  because that stylesheet is the role contract.
- Edit `pnpm-lock.yaml` by hand: change dependencies with pnpm.

## 06 CI and quality gates

- CI definition: `.github/workflows/check.yml` on Ubuntu. The `check` job runs install, `check`,
  `build`, Playwright Chromium install and `test:e2e`.
- Commit hook: Husky runs lint-staged on the staged files (`lint-staged.config.mjs`): Prettier
  check, ESLint and `DESIGN.md` lint. It only checks and never writes; `pnpm install` installs it
  once the folder is a git repository. Do not bypass it with `--no-verify`.
- Local ladder: before a push run `pnpm run check`; build and E2E run in CI or as validation
  evidence (see the CI parity table in `docs/VERIFICATION.md`).
- Evidence: Playwright prints a unique `.cache/playwright/<run>/` destination with reports and first-failure traces; it never retries automatically.
  CI uploads them when the job fails.

## 07 Commits and pull requests

No commit convention or PR template yet. Follow the shared delivery route.

## 08 Documents and deeper guidance

Project map: `PROJECT.md`.

- Use `ARCHITECTURE.md` for where new routes, contracts and components go.
- Use `CODING_STANDARDS.md` for conventions and lessons.
- Use `DESIGN.md` for colour, type, spacing, radius, focus and component rules.
- Use `docs/VERIFICATION.md` to launch, drive and clean up a running candidate.

## 09 Done means

The requested behaviour is shown by the checks in section 06 and, for anything a user sees, by
the running app in a browser at the narrowest and widest supported widths in both themes.
`pnpm run check` passes before a push; build and E2E pass in CI before merge. Report unrelated
failures and anything not verified; a passing build alone is not completion.
