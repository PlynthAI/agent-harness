# __PROJECT_NAME__ architecture

## Pattern

__PROJECT_NAME__ follows Astro's own project layout with static output and islands: every route
is a file under `src/pages/`, rendered to HTML at build time, and a component becomes interactive
in the browser only when a page gives it a `client:*` directive.

## Bindings

| Part of the pattern              | Where it lives                                                                                             |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Routes (file-based)              | `src/pages/` (`index.astro`, `articles/[id].astro`, `contact.astro`, `404.astro`, `robots.txt.ts`)         |
| Layouts                          | `src/layouts/` (`BaseLayout.astro` owns metadata; `ArticleLayout.astro` renders every article)             |
| Content collection               | `src/content.config.ts` with the schema in `src/lib/article-schema.ts`; entries in `src/content/articles/` |
| Astro components (server only)   | `src/components/*.astro`                                                                                   |
| Islands (React, hydrated)        | `src/components/*.tsx`; today only `ContactForm.tsx`                                                       |
| shadcn components (owned source) | `src/components/ui/`, configured by `components.json`                                                      |
| Plain logic (no framework)       | `src/lib/` (`contact.ts`, `articles.ts`, `utils.ts`)                                                       |
| Site facts                       | `src/site.ts`                                                                                              |
| Design tokens and global styles  | `src/styles/design/` (the applied library profile, with `DESIGN.md`); `src/styles/global.css` binds names to `--role-*` |
| Static files                     | `public/`                                                                                                  |
| Project tooling                  | `scripts/dev.mjs` (dev runner)                                                                             |
| Tests                            | `tests/unit/` (node:test), `tests/e2e/` (Playwright)                                                       |

## Departures

- Astro would put shadcn components wherever its guide's alias points; this project keeps them in
  `src/components/ui/` as shadcn's CLI writes them, and renders Card on the server (no
  directive) because the article list does not need to respond.

## Boundaries and choices

- Islands do not share React context. Controls that affect each other belong in one island, or
  they need an explicit shared store.
- Request-time features (form handling, search, personalisation) need a server adapter and a
  host; adding one changes this page.

Written against the template of 8 October 2026.
