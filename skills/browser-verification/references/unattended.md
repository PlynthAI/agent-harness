# Unattended browser verification

Keep automatic approval enabled. Three routes run without a person watching;
choose by the work, and never attach to the user's personal Chrome session just
to test a local app.

- **`playwright-cli`** for headless ad hoc checks: `codex exec` runs including the
  reviewer, `claude -p`, cloud sessions, scraping and parallel subagents. It
  launches its own headless browser with an in-memory profile, so it needs no
  consent to attach to anything. Follow [its method](../playwright-cli/METHOD.md).
  Never pass `--headed` unprompted.
- **The project's Playwright runner** for repeatable E2E. Launch its own
  disposable browser/context and collect assertions, console and network events,
  screenshots and traces there. Use installed dependencies; qualify a missing
  setup before leaving work unattended.
- **The built-in Browser pane**, where the session has one, for routine checks:
  start with the documented DOM/accessibility actions, read-only DOM evaluation,
  screenshots and console-log API. These establish interaction and rendering
  without requesting full Chrome DevTools Protocol access. Do not acquire raw CDP
  as boilerplate; ask for a stronger capability only when the required evidence
  needs it.

A runner-owned or `playwright-cli` browser does not need the Codex app's consent
to attach to the user's browser. It still runs under the active shell/sandbox
policy and the project's test-data and credential rules. Both work inside
Codex's workspace-write sandbox on Windows: a repo's Playwright runner as it
is, since Playwright already skips Chrome's own sandbox, and `playwright-cli`
through the settings its [method](../playwright-cli/METHOD.md) names.

Claude in Chrome and Codex computer use take over the user's own desktop or
browser. Use them only when the user asks, never for verification.

A pending consent prompt for optional full-CDP access need not stop independent
UI checks that another route already supports. An authorized test in a separate
disposable browser is a distinct execution environment, not consent to attach to
the protected browser. Never switch drivers to repeat an explicitly denied
action, borrow personal cookies or evade a target, data or network block.

Before an unattended run, smoke-test the actual chosen route: open the identified
test app, interact and assert a changed state, capture the evidence the task needs,
and close only task-owned resources. Check delegated execution when workers own
browser verification. Record human prompts separately from test failures. Use
[approval edge cases](../../harness/retrospective/references/auto-approval.md) for incident
qualification; a small fixture pass does not establish authenticated or production
coverage.
