# __PROJECT_NAME__

## 01 Project context

A static content website: Astro pages and Markdown articles rendered to HTML at build time,
with one React island (the contact form) that posts to a mocked handler in the browser. There
is no server, database or secret. [PROJECT.md](PROJECT.md) maps the project and its owners.

Stack: Node 24 (`.node-version`, `engines.node` `>=24`), pnpm 10.34.6, Astro 7.3 with static
output, TypeScript 6 strict (`astro check`), React 19.3 through `@astrojs/react`, Tailwind CSS
4.3 through `@tailwindcss/vite`, shadcn (`base-nova`, Base UI) for Button and Card,
`@astrojs/sitemap`, Playwright 1.64 with `@axe-core/playwright`, ESLint 10, Prettier 3 and
`@google/design.md`. Versions come from `pnpm-lock.yaml`; CI reads the same `.node-version`.

## 02 Commands

Run from the checkout root. pnpm is pinned by `packageManager`; `pnpm run` passes every argument
after the script name to the script. Browser tests need Playwright Chromium
(`pnpm run browser:setup`). Nothing needs credentials.

| Task        | Exact command                                                                           | Scope or prerequisite                                                |
| ----------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Install     | `pnpm install --frozen-lockfile`                                                        | Locked dependencies                                                  |
| Dev server  | `pnpm run dev:up`                                                                       | Starts or reuses this checkout's server, waits, prints its URL       |
| Status      | `pnpm run dev:status`                                                                   | URL, pid, checkout, log; non-zero with the fix command when unusable |
| Stop        | `pnpm run dev:stop`                                                                     | Ends only the recorded tree, if its start time still matches         |
| Push checks | `pnpm run check`                                                                        | Lint, types, format, `DESIGN.md` lint, unit tests, knip; no build    |
| Unit tests  | `pnpm run test:unit`                                                                    | `tests/unit/` through `node --test` and `tsx`                        |
| Test file   | `node --import tsx --test tests/unit/contact.test.ts`                                   | One file                                                             |
| Test name   | `node --import tsx --test --test-name-pattern="contact form" "tests/unit/**/*.test.ts"` | `node --test` name filter                                            |
| E2E         | `pnpm run test:e2e`                                                                     | Builds, serves with `astro preview`, runs `tests/e2e/` in Chromium   |
| Browser     | `pnpm run browser:setup`                                                                | Installs Playwright's Chromium; once per machine                     |
| Dead code   | `pnpm run knip`                                                                         | knip 6.40.0 through `pnpm dlx`: unused files, exports, dependencies  |
| Lint        | `pnpm run lint`                                                                         | Whole repository, type-aware for TypeScript                          |
| Typecheck   | `pnpm run typecheck`                                                                    | `astro check`: `.astro`, `.ts` and `.tsx`                            |
| Format      | `pnpm run format:check`, `pnpm run format`                                              | Prettier with the Astro and Tailwind plugins                         |
| Design      | `pnpm run design:lint`                                                                  | `DESIGN.md` must have no errors                                      |
| Build       | `pnpm run build`                                                                        | Static site in `dist/`                                               |

## 03 Repository tooling

### Development runtime

`pnpm run dev:up` reuses a healthy server for this checkout or starts `astro dev` in the
background and prints its URL. With Portless installed the server runs under `portless run` at
`http://<name>.localhost` (`<worktree>.<name>.localhost` in a linked worktree; the name is in
`portless.json`). Without Portless it listens on `http://127.0.0.1:<port>`, the port being `PORT`
or one derived from the folder name (3000 to 3999). `pnpm run dev:status` prints the URL to use;
`pnpm run dev:stop` ends the recorded process tree and Portless drops the route with it, leaving
the shared proxy alone. The record is `.cache/dev/launch.json` and the log, server and Portless
output, `.cache/dev/server.log`. If Portless is installed but fails, `dev:up` exits 1; run
`portless doctor`. It also refuses a Portless older than 0.15.4 or a route outside `.localhost`
(LAN mode), since either would put the server on the network; update Portless or set
`PORTLESS=0`. `pnpm run dev` stays the plain Astro command for people; agents use the
runner.

### Code navigation

`rg` for text and names, then read the files it finds. `ast-grep` (global, no setup) for syntactic
patterns and file outlines. Code intelligence uses the shared harness route; this repository needs
no setup of its own.

### Design authority

[DESIGN.md](DESIGN.md) owns colour, type, spacing, radius, focus and motion. It is a design
library profile applied by the harness copier (the Kit by default), with its values in
`src/styles/design/`; `src/styles/global.css` binds every Tailwind and shadcn name to the
library's `--role-*` roles, so a starter applies the same way once it is a library profile.
Load the shared design skill before changing anything a reader sees. Library components cannot
be ported here until the library's `port.mjs` gains an Astro target (README, Receiving library
components).

## 04 Layout and coding conventions

[ARCHITECTURE.md](ARCHITECTURE.md) says where things live and
[CODING_STANDARDS.md](CODING_STANDARDS.md) how code is written.

- Pages render to HTML. A part becomes an island only when it must respond in place.
- Paint with the semantic tokens (`bg-surface`, `text-ink-2`) and role radii (`rounded-control`,
  `rounded-panel`); the theme defines no others.
- Every page goes through `BaseLayout`, which owns title, description, canonical and Open Graph.

## 05 Boundaries

Always, without asking: run the commands in section 02, add or edit articles, regenerate
`.astro/` types with `pnpm run typecheck`.

Never:

- Commit secrets or `.env` files; the site reads no environment variables.
- Edit `dist/`, `.astro/` or `node_modules/`; their owning tools regenerate them.
- Edit `src/styles/design/` by hand: it is the applied library profile, replaced with
  `DESIGN.md` through the harness copier's design command (README, Replacing the design).
- Keep variables the shadcn CLI writes into `src/styles/global.css`: after `shadcn add`, revert
  them, because that stylesheet is the role contract.
- Send form data to a network endpoint from the mocked handler without replacing it on purpose
  in `src/lib/contact.ts`.

## 06 CI and quality gates

- CI: `.github/workflows/check.yml` runs install, `pnpm run check`, `pnpm run build`, Playwright
  Chromium install and `pnpm run test:e2e` on Ubuntu for pushes to `main` and pull requests.
- Commit hook: Husky runs lint-staged on the staged files (`lint-staged.config.mjs`): Prettier
  check, ESLint (after `astro sync`, as `lint` does) and `DESIGN.md` lint. It only checks and
  never writes tracked files, so format while implementing (`pnpm run format`); `pnpm install`
  installs it once the folder is a git repository. Do not bypass it with `--no-verify`.
- Local ladder: before a push run `pnpm run check`; build and browser runs reuse validation's
  evidence or run in CI. [docs/VERIFICATION.md](docs/VERIFICATION.md) holds the parity table.
- Evidence: Playwright prints a unique `.cache/playwright/<run>/` destination with reports and first-failure traces; it never retries automatically. CI uploads
  the report when a run fails.

## 07 Commits and pull requests

No commit convention or PR template yet. Follow the shared delivery route.

## 08 Documents and deeper guidance

Project map: [PROJECT.md](PROJECT.md).

- [docs/VERIFICATION.md](docs/VERIFICATION.md) to launch, drive and check the site.
- [DESIGN.md](DESIGN.md) before any visual change.

## 09 Done means

The change is demonstrated by the checks in section 06 that apply, including a browser run for
anything a reader sees. Report unverified checks plainly; a passing build alone is not done.
