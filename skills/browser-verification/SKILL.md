---
name: browser-verification
description: Prove that live interface behaviour works in the correct running app before claiming it does. Use for frontend, website or any change whose acceptance depends on what a user sees or does, and when a browser or end-to-end runner must supply the evidence.
metadata:
  group: verify
---

# Verify live interface behaviour

A method for proving that an interface works, not another code review. The project
owns its launch commands, its ports and its end-to-end tooling; this skill owns
server identity, which driver supplies the evidence, what to exercise, and honest
evidence.

If a project lacks a runnable launch and feature route, use
[verification setup](../validate-implementation/references/setup-and-maintenance.md)
to establish its ordinary project guide. For an individual UI change, use the
method below directly.

## 1. Bind the server identity before trusting anything

Read the project's own launch commands from its guidance. Never invent a port, a
path or a URL from memory. Record, before the first observation:

- the checkout the server was started from, and its commit;
- whether that tree is dirty, and which files carry the change under test;
- the exact URL the browser actually loaded, and the environment behind it -
  local, preview or shared.
- the test account, profile and data/seed identity when those affect the result.

For Portless, existing-server reuse, app logs and process ownership, follow
[development runtime](../validate-implementation/references/development-runtime.md).
Use its app-log route together with browser console/network evidence when a flow
fails; a named proxy URL alone does not identify the served checkout.

If any of those disagrees with the change under test, stop and resolve it. A
stale, wrong or shared server proves nothing about this candidate: reject it
rather than working around it. Use a local or test deployment unless the user has
authorized verification against the named production target.

## 2. Choose the evidence the claim needs

Two kinds of evidence, for two kinds of claim:

- **Exploratory** - a browser driven the way a person would, for
  "does this behave correctly" questions. Record what was done, and capture the
  state that was actually observed.
- **Repeatable** - the project's own end-to-end runner, for a flow that must keep
  working. Let the runner own selection, assertions and reporting.

A screenshot on its own is not interaction proof: it shows one rendering of one
state at one moment. Pair it with the interaction that produced it, or with a
runner that asserts the behaviour.

### Select one driver per flow

Choose the driver once for a flow, and name the concrete reason before changing
it:

- the visible built-in pane (Claude Code) or browser plugin (Codex) first. It is
  the default for checks the user watches, interactive exploration and visual
  checks;
- `playwright-cli` for headless ad hoc work: `codex exec` runs including the
  reviewer, `claude -p`, cloud sessions, scraping and parallel subagents. Follow
  [its method](playwright-cli/METHOD.md); it is headless by default, and
  `--headed` is for when the user asks to watch;
- the repo's own Playwright runner for a flow that must keep working, which is a
  separate evidence purpose rather than another fallback;
- Claude in Chrome and Codex computer use only when the user asks for them, never
  as verification evidence.

A local HTML file opened by path (`file://`) cannot be driven by the built-in
browser's page tools: they see a static snapshot with no scripts running. Serve
the file from a local static server and verify that URL instead.

**Published artifacts.** The browser pane cannot sign in to view a published
artifact, and an agent must not complete that sign-in. Verify the identical
source file served locally instead, with a one-line static server bound to
127.0.0.1 (for example `python -m http.server 8765 --bind 127.0.0.1` in its
folder). Use the pane's mobile preset for phone width, force each theme by
setting `data-theme` on the root element. A bare headless Chrome capture with
`--window-size` below about 500px wide is not phone evidence: Chrome renders at
its minimum window width and crops, which looks like an overflow bug that is
not there. A Playwright or pane viewport that sets the CSS viewport explicitly
(a device preset or `setViewportSize`) is fine; confirm the rendered
`innerWidth` matches before reading the capture.

Reuse evidence that is still valid
on the candidate instead of reproducing it. The active session's own runtime
documentation owns the browser tool API, so do not hardcode a bootstrap for a tool
name a release may have replaced, and let each delegated worker confirm the
capability in its own session. A permission or security denial is not a reason to
switch drivers: keep the denial, report it, and continue permitted work.

For unattended work, use [the unattended browser route](references/unattended.md):
`playwright-cli`, the project's Playwright runner in its own disposable browser,
or ordinary built-in Browser actions where the pane is available. Smoke-test the
actual route before dispatch; preserve explicit action and target denials.

### Establish the intended session

For public checks, start an isolated anonymous context. An existing signed-in
browser can redirect a public page into private content; that redirect does not
expand the check's scope. For authenticated checks, use the project's supported
test identities and authentication setup, including session renewal. Prefer the
runner's standard fixtures and auth libraries over a separate session framework.
Do not borrow personal sessions or ask for interactive sign-in before checking
the project's unattended route and protected credential loader.

Keep browser availability, identity provisioning, secret access, authentication
and execution authorization distinct in diagnostics. Missing cookies do not prove
a permissions failure, and changing browser drivers cannot cure a denied action.
Bind test credentials to the intended target; keep tokens out of reports, traces
and screenshots. Use the project's test-data retention or cleanup procedure and
report any quota that limits repeated runs. Production or shared-data tests need
explicit existing authorization for their target and effects; a local app URL
alone does not make its backend disposable.

## 3. Exercise the states this change can break

Select rather than sweep:

- the states the change touches, plus the empty, loading, error and
  permission-denied state wherever the change can reach them;
- the viewports the project supports, at least the narrowest and the widest;
- keyboard and focus order, and the accessible name of any control the change
  adds;
- console and network errors during the flow, not only the final rendering.

Name what was not covered instead of implying full coverage.

## 4. Report what is true

Build, lint and type checks belong to the validation profiles, not here; do not
re-run them as interface evidence. Report per flow: the server identity and URL,
the interaction performed, the outcome observed, where the evidence is, and any
limitation. A flow that could not be reached is a stated limitation. If the
project has no browser or runner available, look for one in its own guidance, its
package scripts and its configured tooling first, and name where you looked. When
it really is absent, say so plainly: a missing capability is reported, never
simulated.

Do not write to production or shared services without authorization covering the
test data and operations; use their owning execution route when required. Stop the
task-owned app and test resources when done, or explicitly hand over a retained
preview; preserve reused services and shared proxies with other consumers.
