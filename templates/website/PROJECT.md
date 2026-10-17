# __PROJECT_NAME__

A static content website built with Astro: pages, Markdown articles and one contact form whose
handler is mocked in the browser. It owns its pages, content, design tokens and checks; it has no
backend, database or deployment target yet.

This is the map of durable project facts and their owners. Read only the rows the task needs.

## Project map

| Subject                     | Authority or verified facts                                                                   | When to read                                      |
| --------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Architecture and boundaries | [ARCHITECTURE.md](ARCHITECTURE.md)                                                            | Adding a page, island, collection or route        |
| Coding standards            | [CODING_STANDARDS.md](CODING_STANDARDS.md)                                                    | Writing or reviewing code                         |
| Content                     | `src/lib/article-schema.ts` (front matter contract), `src/content/articles/`                  | Adding or changing articles                       |
| Site facts                  | `src/site.ts` (name, origin, description, locale)                                             | Metadata, canonical links, sitemap                |
| Design                      | [DESIGN.md](DESIGN.md) and `src/styles/design/` (the applied design library profile, the Kit by default), role bindings in `src/styles/global.css`, shadcn config in `components.json` | Anything a reader sees |
| Development and checks      | [AGENTS.md](AGENTS.md) section 02                                                             | Running, checking or building                     |
| Runtime verification        | [docs/VERIFICATION.md](docs/VERIFICATION.md)                                                  | Launching and driving the site, CI parity         |
| Operations and delivery     | `.github/workflows/check.yml`; no hosting chosen yet                                          | CI changes, the first deploy                      |
| Working documents           | Workspace: __WORKSPACE_ROOT__                                                                 | Goals, findings, plans, task records and evidence |

## Commands and project requirements

- Set `url` in `src/site.ts` to the real origin before the first deploy; canonical links, Open
  Graph URLs, `robots.txt` and the sitemap all read it.
- Redirects live in `astro.config.ts`. A static build writes them as meta-refresh pages; move
  them to the host's redirect rules once a host is chosen, so they return real 301s.
- The contact handler in `src/lib/contact.ts` is a mock. Connecting a real endpoint is a
  decision about where personal data goes, so record it here when it is made.

## Workspace routing

Goals, findings, plans, task records and evidence live outside this repository, in its
external workspace; durable project facts stay in this map. The workspace is registered through
the harness `docs-workspace` skill, which resolves it for every agent.

- Workspace root: __WORKSPACE_ROOT__
- Its instructions, read before writing there: `AGENTS.md` at that root
