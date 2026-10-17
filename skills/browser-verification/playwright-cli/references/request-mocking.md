# Request mocking

Intercept, stub, modify and block network requests.

## Route commands

```bash
playwright-cli route "**/*.jpg" --status=404
playwright-cli route "**/api/users" --body='[{"id":1,"name":"Alice"}]' --content-type=application/json
playwright-cli route "**/api/data" --body='{"ok":true}' --header="X-Custom: value"
playwright-cli route "**/*" --remove-header=cookie,authorization
playwright-cli route-list
playwright-cli unroute "**/*.jpg"
playwright-cli unroute
```

## URL patterns

```text
**/api/users           exact path
**/api/*/details       wildcard in the path
**/*.{png,jpg,jpeg}    file extensions
**/search?q=*          query parameters
```

## Conditional and modified responses

Use `run-code` when the answer depends on the request, or to change a real
response or add delay.

```bash
# Respond by request body
playwright-cli run-code "async page => {
  await page.route('**/api/login', route => {
    const body = route.request().postDataJSON();
    if (body.username === 'admin') {
      route.fulfill({ body: JSON.stringify({ token: 'mock-token' }) });
    } else {
      route.fulfill({ status: 401, body: JSON.stringify({ error: 'Invalid' }) });
    }
  });
}"

# Modify the real response
playwright-cli run-code "async page => {
  await page.route('**/api/user', async route => {
    const response = await route.fetch();
    const json = await response.json();
    json.isPremium = true;
    await route.fulfill({ response, json });
  });
}"

# Network failure: connectionrefused, timedout, connectionreset, internetdisconnected
playwright-cli run-code "async page => {
  await page.route('**/api/offline', route => route.abort('internetdisconnected'));
}"

# Delayed response
playwright-cli run-code "async page => {
  await page.route('**/api/slow', async route => {
    await new Promise(r => setTimeout(r, 3000));
    route.fulfill({ body: JSON.stringify({ data: 'loaded' }) });
  });
}"
```

Mocking proves how the interface behaves when the backend answers that way. It
does not prove the real backend does, so say which responses were stubbed.
