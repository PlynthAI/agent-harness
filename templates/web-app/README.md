# __PROJECT_NAME__

A Next.js application. It starts with one working slice, a notes page backed by a validated
Route Handler, so the project's checks, browser journey and design tokens run from the first
commit. Replace the slice with your product once you have seen it work.

## First steps

Requires Node 24 and pnpm 10 (`corepack enable` picks up the pinned version).

```sh
git init                        # first, so the install sets up the commit hook
pnpm install --frozen-lockfile
pnpm run browser:setup          # once per machine, for the browser tests
pnpm run check                  # lint, types, format, design lint, unit tests, knip
pnpm run dev:up                 # start the dev server and print its URL
pnpm run test:e2e               # the notes journey in Chromium, with axe
pnpm run dev:stop
```

`pnpm run dev` starts a plain `next dev` on port 3000 if you prefer to watch the output.
`AGENTS.md` lists every command; `docs/VERIFICATION.md` shows how a change is proved.

## What is here

| Path                       | What it is                                                      |
| -------------------------- | --------------------------------------------------------------- |
| `app/page.tsx`             | Overview page                                                   |
| `app/notes/`               | Notes page: add, edit and remove notes held in the page's state |
| `app/api/notes/route.ts`   | Validates a note with zod and returns typed JSON                |
| `app/api/health/route.ts`  | Readiness check used by the dev runner and Playwright           |
| `lib/notes.ts`             | The notes contract shared by the route and the page             |
| `components/ui/`           | shadcn button, input and card, retuned to the design tokens     |
| `DESIGN.md`, `styles/design/` | The applied design library profile (the Kit by default)      |
| `scripts/dev.mjs`          | Dev server runner (`dev:up`, `dev:status`, `dev:stop`)          |
| `tests/e2e/`               | Playwright journey                                              |

## How it was made

Created from the harness `web-app` template: Next.js 16 (App Router, Turbopack), React 19,
TypeScript 5, Tailwind CSS 4 through `@tailwindcss/postcss`, shadcn (base-nova style, Base UI
primitives), zod 4, ESLint 9 with type-aware typescript-eslint rules, Prettier 3, Playwright and
`node --test` through tsx. Versions are locked in `pnpm-lock.yaml`.

## Layout

`app/layout.tsx` renders the header and the page and wraps nothing else, so an application shell
can take the full viewport. The centred `page-column` utility is opt-in per page; the overview
and notes pages use it.

## Replacing the design

The design is a design library profile applied by the harness project copier: the Kit, a
monochrome default, unless the project was created with `--design <profile-id>`. `DESIGN.md`
is the profile's design file named for this project. `styles/design/` holds its `tokens.css`,
`type.css` and `role-bridge.css` unchanged, `fonts.css` with its font packages, and
`SOURCE.json` recording the profile, the library commit and each file's hash. Do not edit them by
hand.

`app/globals.css` binds the Tailwind and shadcn names to the library's twenty roles (`--role-*`,
defined by `role-bridge.css`), never to a design's own token names, so components follow any
library profile without edits. Shades no role covers use the design's token of the Kit's name
when it has one and otherwise derive from the roles; type sizes, spacing, radii, shadows and
motion default to the Kit's values beneath the design's own. The Kit names the type roles read (`--ink`, `--ink-2`, `--ink-3`, `--font-sans`, `--font-mono`,
`--font-pixel`) default to the roles too, so a design without its own `type.css` still gets muted
text and its own faces.
`tests/e2e/design-contract.spec.ts` checks that the colours, muted text, faces, radii and focus fill it reads on every page come from the roles alone, in both
themes, including text set only by a type role.

To change this project's design, run the copier's design command from the harness checkout:
`node templates/new-project.mjs design <project-dir> --design <profile-id>`. It finds
`styles/design/` by its `SOURCE.json`, rewrites `DESIGN.md` and the design files from the
library profile, swaps the `@fontsource` dependencies in `package.json` and prints each font's
licence. Any in-repo library profile applies, including the library's starters once they are
profiles (the Kit is the only one today). Then run `pnpm install` (not frozen when the fonts
changed), `pnpm run check` and `pnpm run test:e2e`, and look at both themes.

## Receiving library components

A design library component arrives through the library's port tool, run from this project's
root: `node <library>/scripts/port.mjs <entry-id> --project <profile> --framework next --out <dir>`,
where `<profile>` is this project's library profile (the copier printed its adapter), for an
approved, port-ready entry. Follow the pack's `PORT.md`. Its CSS Modules paint with `--role-*`,
which `styles/design/role-bridge.css` already defines. Its icons follow the library's
`scripts/port-icons.json`: this template ships no icon library, so a pack brings Phosphor unless
the project registers a Lucide policy there (`components.json` names lucide only for components
added with the shadcn CLI).
