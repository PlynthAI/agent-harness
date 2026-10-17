# __PROJECT_NAME__

A content website built with Astro: a home page, Markdown articles at `/articles/<slug>/`, a
contact page whose form is a small React island, a custom 404, per-page metadata, `robots.txt`
and a sitemap. Pages are static HTML; only the contact form loads JavaScript.

## First steps

```sh
git init                                # first, so the install sets up the commit hook
pnpm install --frozen-lockfile
pnpm run browser:setup                  # once per machine, for the browser tests
pnpm run check                          # lint, types, format, DESIGN.md lint, unit tests, knip
pnpm run dev:up                         # start or reuse the dev server and print its URL
pnpm run test:e2e                       # build, serve and run the browser journey
pnpm run dev:stop
```

Then make it yours:

1. Set `name`, `url`, `description` and `locale` in `src/site.ts`.
2. Replace the two demo articles in `src/content/articles/` and the home page copy in
   `src/pages/index.astro`.
3. Decide where contact messages go and replace the mocked handler in `src/lib/contact.ts`.

[AGENTS.md](AGENTS.md) lists every command; [docs/VERIFICATION.md](docs/VERIFICATION.md) says how
to prove a change in the browser.

## How it was made

Created from the harness `website` template, which follows the official routes: Astro with
`@astrojs/react`, Tailwind CSS 4 through `@tailwindcss/vite`, and shadcn initialised with its
Astro template (`shadcn init -t astro`), keeping Button and Card. The template adds the content
collection, the pages, the dev runner in `scripts/dev.mjs`, Playwright and axe tests, ESLint,
Prettier and the CI workflow. It is this project's own code from the first commit.

## Replacing the design

The design is a design library profile applied by the harness project copier: the Kit, a
monochrome default, unless the project was created with `--design <profile-id>`. `DESIGN.md`
is the profile's design file named for this project. `src/styles/design/` holds its
`tokens.css`, `type.css` and `role-bridge.css` unchanged, `fonts.css` with its font packages,
and `SOURCE.json` recording the profile, the library commit and each file's hash. Do not edit
them by hand. The design switches dark on `data-theme="dark"`, which `BaseLayout` sets from the
operating system with a few inline lines before first paint.

`src/styles/global.css` binds the Tailwind and shadcn names to the library's twenty roles
(`--role-*`, defined by `role-bridge.css`), never to a design's own token names, so the pages
follow any library profile without edits. Shades no role covers use the design's token of the
Kit's name when it has one and otherwise derive from the roles; type sizes, spacing, radii,
shadows and motion default to the Kit's values beneath the design's own. The Kit names the type roles read (`--ink`, `--ink-2`, `--ink-3`, `--font-sans`, `--font-mono`,
`--font-pixel`) default to the roles too, so a design without its own `type.css` still gets muted
text and its own faces.
`tests/e2e/design-contract.spec.ts` checks that the colours, muted text, faces, radii and focus fill it reads on every page come from the roles alone, in both
themes, including text set only by a type role.

To change this project's design, run the copier's design command from the harness checkout:
`node templates/new-project.mjs design <project-dir> --design <profile-id>`. It finds
`src/styles/design/` by its `SOURCE.json`, rewrites `DESIGN.md` and the design files from the
library profile, swaps the `@fontsource` dependencies in `package.json` and prints each font's
licence. Any in-repo library profile applies, including the library's starters once they are
profiles (the Kit is the only one today). Then run `pnpm install` (not frozen when the fonts
changed), `pnpm run check` and `pnpm run test:e2e`. Check both themes and the 375, 768 and 1440
widths before calling it done.

## Receiving library components

The design library's port tool
(`node <library>/scripts/port.mjs <entry-id> --project <profile> --framework next --out <dir>`)
emits packs for Next only, so this Astro site cannot receive library components until the
library adds an Astro target. When it does, a pack's CSS Modules paint with `--role-*`, which
`src/styles/design/role-bridge.css` already defines, and its icons follow the library's
`scripts/port-icons.json`: this template ships no icon library, so a pack brings Phosphor unless
the project registers a Lucide policy there (`components.json` names lucide only for components
added with the shadcn CLI).
