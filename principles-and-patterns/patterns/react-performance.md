---
type: "pattern"
title: "React performance"
description: "Apply when a diff changes React or Next.js code: data fetching, server components, server actions, route handlers, imports, client state, effects or rendering."
applies_to: ["diff"]
dependency: ["next", "react"]
source: "https://github.com/vercel-labs/agent-skills/tree/063bee94c3f4df8453406c830b0a7df0f2860278/skills/react-best-practices"
reviewed: "2026-10-02"
---
# React performance

The rules a linter, the type checker or the React Compiler does not catch,
sections in order of impact. Each finding cites its heading. Most are
trade-offs upstream, so each rule keeps its exceptions. Components defined
inside components and state set in effects are left to tools only where the
repository lints with `eslint-plugin-react-hooks` 7 or later; under an older
version, review them. Manual memoisation is left to the React Compiler where
the repository enables it. What react-doctor reports in a repository that runs
it is not review work. JavaScript micro-optimisations are findings only on a
path measured as hot.

## Waterfalls

- **Independent awaits run together.** Three unrelated `await`s in a row are
  three round trips; use `Promise.all`.
- **Start early, await late.** In route handlers and actions, start the
  independent promises every path needs before the first `await`. For a
  partial dependency, chain it on its own promise
  (`userP.then((u) => getProfile(u.id))`) instead of waiting for the whole
  first batch; the finding is the waterfall, not a missing helper library.
- **Await where the value is used.** Move an `await` into the branch that
  needs it, and test a cheap synchronous condition before awaiting a flag or
  remote value, unless that condition is expensive, depends on the value, or
  side effects must run in a fixed order.
- **Chain nested fetches per item.** `ids.map((id) => getChat(id).then(...))`
  inside one `Promise.all`, so one slow item does not hold back the rest.
- **Sibling server components fetch in parallel.** A parent that awaits before
  rendering a fetching child serialises them; give each fetch its own async
  component.
- **Consider Suspense around slow data.** The shell renders first while the
  data-dependent part streams. Skip it for data that decides layout, must be
  in the first HTML for search, or is small and fast, and where layout shift
  matters more than a faster first paint.

## Bundle size

- **Avoid barrel imports from large libraries.** Importing icons or
  components from a package root can load thousands of modules. Not a finding
  where Next.js already optimises that package, by default or through
  `optimizePackageImports` in the repository's config; otherwise use direct
  imports where the subpaths ship types.
- **Load heavy and optional code on demand.** Large components not needed on
  first render, and features behind a toggle, load with `next/dynamic` or
  `import()`; analytics and logging load after hydration.
- **Keep import and file paths analysable.** `import(map[key])` or
  `path.join(cwd, variable)` makes the bundler and Next.js file tracing include
  everything that might match; use a map of `() => import('./x')` or literal
  paths.

## Server

- **Every server action authorises itself.** Actions are public endpoints:
  check authentication and authorisation inside each action and validate its
  input. Do not rely solely on middleware, layout or page guards.
- **No request data in module state.** Concurrent server renders share module
  scope, so a module-level variable holding the user leaks one request's data
  into another's response.
- **Send the client only what it renders.** Everything passed to a client
  component is serialised into the page. Pass the fields it uses. Passing an
  array beside a sorted or filtered copy of it sends it twice. Send one: the
  original, transformed on the client, or only the derived copy where the
  transformation is expensive or the client does not need the original.
- **Deduplicate per request with `React.cache`.** Database and auth lookups
  called from several server components run once per request. Arguments must
  be primitives or the same reference; an inline object misses every time.
  Next.js already memoises identical `fetch` calls within a request.
- **Hoist static I/O.** Fonts, templates and config read per request belong at
  module level, but not per-user, changing, large or sensitive data.

## Client

- **Shared, deduplicated client fetching.** A `fetch` in `useEffect` repeated
  in every instance of a component is the finding. Upstream names SWR; where
  the repository uses another cache, such as TanStack Query, it is the fix.
- **Guard `localStorage`.** Reads and writes sit in `try`/`catch` (they can
  throw when storage is blocked or full), keys carry a version, and only the fields the
  UI needs are stored, which keeps tokens and personal data out.
- **One global listener, passive where possible.** A hook that adds a
  `window` listener per instance should share one; touch and wheel listeners
  are `{ passive: true }` unless they call `preventDefault`.

## Re-renders and rendering

- **Interactions run in event handlers,** not as state an effect watches,
  which re-runs on unrelated changes and can repeat the action.
- **Subscribe to what renders.** Do not subscribe to `useSearchParams` or
  storage only to read it in a click handler; subscribe to a derived boolean
  (a media query) rather than a continuous value such as window width.
- **No `&&` on a number.** `{count && <Badge />}` renders `0`; use a ternary.
- **Client-only values without flicker.** A theme read from storage in an
  effect flashes the default first; set it with an inline script before
  hydration.
- **Keep input responsive.** Expensive initial state uses `useState(() => ...)`;
  an expensive render driven by typing uses `useDeferredValue`, with the
  expensive work memoised on the deferred value, or a transition.
