# Storage and cookies

Cookies, local storage, session storage and whole-browser state.

## Saved state

```bash
playwright-cli state-save .playwright-cli/auth.json   # or omit the name for a timestamped file
playwright-cli open                                   # state-load needs an open session
playwright-cli state-load .playwright-cli/auth.json
playwright-cli goto https://example.com               # navigate, do not reopen
```

`open` replaces any running session, so open first, then load state or start
tracing, and move between pages with `goto`.

The file holds cookies (name, value, domain, path, expires, httpOnly, secure,
sameSite) and per-origin local storage. It may contain live tokens: keep it under
`.playwright-cli/`, never commit it, and delete it when the task ends. Prefer a
test identity over a personal account, and keep tokens out of reports.

## Cookies

```bash
playwright-cli cookie-list
playwright-cli cookie-list --domain=example.com
playwright-cli cookie-list --path=/api
playwright-cli cookie-get session_id
playwright-cli cookie-set session abc123
playwright-cli cookie-set session abc123 --domain=example.com --path=/ --httpOnly --secure --sameSite=Lax
playwright-cli cookie-set remember_me token123 --expires=1893456000
playwright-cli cookie-delete session_id
playwright-cli cookie-clear
```

Several cookies at once:

```bash
playwright-cli run-code "async page => {
  await page.context().addCookies([
    { name: 'session_id', value: 'sess_abc123', domain: 'example.com', path: '/', httpOnly: true },
    { name: 'preferences', value: JSON.stringify({ theme: 'dark' }), domain: 'example.com', path: '/' }
  ]);
}"
```

## Local and session storage

```bash
playwright-cli localstorage-list
playwright-cli localstorage-get token
playwright-cli localstorage-set theme dark
playwright-cli localstorage-set user_settings '{"theme":"dark","language":"en"}'
playwright-cli localstorage-delete token
playwright-cli localstorage-clear

playwright-cli sessionstorage-list
playwright-cli sessionstorage-get form_data
playwright-cli sessionstorage-set step 3
playwright-cli sessionstorage-delete step
playwright-cli sessionstorage-clear
```

Several values at once:

```bash
playwright-cli run-code "async page => {
  await page.evaluate(() => {
    localStorage.setItem('token', 'jwt_abc123');
    localStorage.setItem('user_id', '12345');
  });
}"
```

## IndexedDB

```bash
playwright-cli run-code "async page => page.evaluate(async () => await indexedDB.databases())"
playwright-cli run-code "async page => { await page.evaluate(() => { indexedDB.deleteDatabase('myDatabase'); }); }"
```

## Reusing a login

```bash
playwright-cli open https://app.example.com/login
playwright-cli snapshot
playwright-cli fill e1 "test-user@example.com"
playwright-cli fill e2 "local-test-password"
playwright-cli click e3
playwright-cli state-save .playwright-cli/auth.json

# later, in a new session
playwright-cli open
playwright-cli state-load .playwright-cli/auth.json
playwright-cli goto https://app.example.com/dashboard
```

`fill` prints the matching Playwright code, value included, so only a local
test account's password goes through it; reading it from an environment
variable does not hide it. For any other account, load a state file the
project's protected authentication setup saved. The in-memory profile is the
safer default for anything sensitive.
