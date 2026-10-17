# __PROJECT_NAME__

A Next.js web application started from the harness web-app template. This repository owns the
pages, the same-origin Route Handlers and their contracts. It has no database, authentication
or external service yet.

This is the map of durable project facts and their owners. Read only the rows the task needs.

## Project map

| Subject                     | Authority or verified facts                                        | When to read                                           |
| --------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------ |
| Architecture and boundaries | `ARCHITECTURE.md`                                                  | Adding a route, handler, contract or component         |
| Coding standards            | `CODING_STANDARDS.md`, `eslint.config.mjs`, `.prettierrc`          | Writing or reviewing code                              |
| Contracts and data          | `lib/notes.ts` (zod schemas shared by `app/api/notes/` and the UI) | Changing a request or response shape                   |
| Design                      | `DESIGN.md` and `styles/design/` (the applied design library profile, the Kit by default), `app/globals.css` (role bindings), `components.json` | Anything a user sees |
| Development and checks      | `AGENTS.md` sections 02 and 06, `package.json` scripts             | Running, testing or adding a check                     |
| Runtime verification        | `docs/VERIFICATION.md`                                             | Launching, driving and cleaning up a running candidate |
| CI                          | `.github/workflows/check.yml`                                      | Changing what runs on push or pull request             |
| Working documents           | Workspace: __WORKSPACE_ROOT__                                      | Goals, findings, plans, task records and evidence      |

## Workspace routing

Goals, findings, plans, task records and evidence live outside this repository, in its
external workspace; durable project facts stay in this map. The workspace is registered through
the harness `docs-workspace` skill, which resolves it for every agent.

- Workspace root: __WORKSPACE_ROOT__
- Its instructions, read before writing there: `AGENTS.md` at that root
