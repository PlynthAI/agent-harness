# __PROJECT_NAME__ architecture

## Pattern

__PROJECT_NAME__ follows the Next.js App Router project layout: routes are folders under `app/`,
a `page.tsx` renders a route, a `route.ts` is a Route Handler, and components are Server
Components unless a file starts with `"use client"`. Shared code lives in root folders reached
through the `@/` alias.

## Bindings

| Part of the pattern                   | Where it lives                                        |
| ------------------------------------- | ----------------------------------------------------- |
| Root layout, metadata and theme setup | `app/layout.tsx`                                      |
| Pages (Server Components)             | `app/page.tsx`, `app/notes/page.tsx`                  |
| Client components owned by one route  | beside the route, such as `app/notes/notes-board.tsx` |
| Route Handlers (the server boundary)  | `app/api/`                                            |
| Contracts (zod schemas and types)     | `lib/`                                                |
| Shared components                     | `components/`                                         |
| shadcn components                     | `components/ui/`, managed through `components.json`   |
| Global styles and token mapping       | `app/globals.css`, importing `styles/design/` and binding names to `--role-*` |
| Project scripts                       | `scripts/`                                            |
| Unit tests                            | beside the code as `*.test.ts` or `*.test.mjs`        |
| Browser tests                         | `tests/e2e/`                                          |

## Departures

- The pattern often validates input inside each handler; this repository keeps each contract in
  `lib/` because the page parses responses with the same schema, so one file owns the shape.

## Boundaries and choices

Route Handlers are same-origin and stateless; nothing is persisted on the server. A capability
such as a database, authentication or a background job is added as its own module with a
contract in `lib/` and is recorded here when it lands.

Written against the template, 8 October 2026.
