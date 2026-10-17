# Debugging Playwright tests

The repo's own runner owns running tests; see
[browser-verification](../../SKILL.md). Use `playwright-cli` to explore a failing
test's page live.

Run tests without opening the HTML report:

```bash
PLAYWRIGHT_HTML_OPEN=never npx playwright test
PLAYWRIGHT_HTML_OPEN=never npm run special-test-command
```

To debug a failing test, run it with `--debug=cli`. It pauses at the start and
prints debugging instructions with a session name. Run it in the background and
read its output until "Debugging Instructions" appears, and stop it when you are
done.

```bash
PLAYWRIGHT_HTML_OPEN=never npx playwright test --debug=cli
# ... debugging instructions for "tw-abcdef" session ...

playwright-cli attach tw-abcdef
```

Keep the test running while you explore. It is paused at the start, so step over
or pause where the problem most likely is. Every action you take with
`playwright-cli` prints the matching Playwright TypeScript, which can be copied
into the test. Usually a locator or an expectation needs updating, but the cause
can also be a bug in the app: use judgement. After the fix, stop the background
run and rerun to check that the test passes.

`attach` here joins the test runner's own paused session. It is not permission to
attach to the user's browser.
