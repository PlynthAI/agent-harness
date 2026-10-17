# Sessions

Run several isolated browsers at once with `-s=<name>`. Each session has its own
cookies, local and session storage, IndexedDB, cache, history and tabs. Without
`-s`, commands use the default session.

```bash
playwright-cli -s=auth open https://app.example.com/login
playwright-cli -s=public open https://example.com
playwright-cli -s=auth fill e1 "user@example.com"
playwright-cli -s=public snapshot
```

Set a default name for a shell with `PLAYWRIGHT_CLI_SESSION=mysession`.

## Listing and stopping

```bash
playwright-cli list                       # all sessions
playwright-cli close                      # default session
playwright-cli -s=mysession close         # a named session
playwright-cli close-all                  # every session
playwright-cli kill-all                   # stuck daemons only
playwright-cli -s=mysession delete-data   # delete a session's profile data
```

A headless session shuts down on its own after an hour without commands; the next
command then reports that the browser is not open, so run `open` again. Pass
`open --idle-timeout=<ms>` to change that, or `0` to disable it.

## Profiles

The profile is in memory by default, so nothing persists after `close`. That is
the right default.

```bash
playwright-cli -s=app open https://example.com --profile=.playwright-cli/profile
```

Use these only for a task that needs a login kept between runs, with a profile
directory inside `.playwright-cli/` or another task-owned folder. Never use a
personal browser profile, and never `attach` to the user's running browser.
Delete the profile with `delete-data` when the task is done.

## Patterns

Name sessions for their purpose (`docs-scrape`, `checkout-auth`), not `s1`.

```bash
# Concurrent scraping
playwright-cli -s=site1 open https://site1.example/ &
playwright-cli -s=site2 open https://site2.example/ &
wait
playwright-cli -s=site1 snapshot
playwright-cli -s=site2 snapshot
playwright-cli -s=site1 close
playwright-cli -s=site2 close
```

```bash
# Compare two variants
playwright-cli -s=variant-a open "https://app.example/?variant=a"
playwright-cli -s=variant-b open "https://app.example/?variant=b"
playwright-cli -s=variant-a screenshot
playwright-cli -s=variant-b screenshot
```

Always close sessions when done, and delete stale profile data.
