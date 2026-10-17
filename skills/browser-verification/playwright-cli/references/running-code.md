# Running Playwright code

Use `run-code` for anything the CLI commands do not cover.

```bash
playwright-cli run-code "async page => {
  // Playwright code; page.context() reaches the browser context
}"
playwright-cli run-code --filename=./my-script.js
```

The code must be a single function expression. `import`, `export` and `require`
are not supported, and it runs in an isolated context, not full Node.js:
`process` and Node modules are unavailable. Timers, `fetch`, `URL`, `Buffer`,
`crypto`, `AbortController`, `TextEncoder` and `TextDecoder` are available.

## Permissions and geolocation

```bash
playwright-cli run-code "async page => {
  await page.context().grantPermissions(['geolocation']);
  await page.context().setGeolocation({ latitude: 51.5074, longitude: -0.1278 });
}"

# Grant for one origin
playwright-cli run-code "async page => {
  await page.context().grantPermissions(['clipboard-read'], { origin: 'http://127.0.0.1:8765' });
}"

# Clear overrides
playwright-cli run-code "async page => { await page.context().clearPermissions(); }"
```

## Media emulation

```bash
playwright-cli run-code "async page => { await page.emulateMedia({ colorScheme: 'dark' }); }"
playwright-cli run-code "async page => { await page.emulateMedia({ reducedMotion: 'reduce' }); }"
playwright-cli run-code "async page => { await page.emulateMedia({ media: 'print' }); }"
```

## Wait strategies

```bash
playwright-cli run-code "async page => { await page.waitForLoadState('networkidle'); }"
playwright-cli run-code "async page => { await page.locator('.loading').waitFor({ state: 'hidden' }); }"
playwright-cli run-code "async page => { await page.waitForFunction(() => window.appReady === true); }"
playwright-cli run-code "async page => { await page.locator('.result').waitFor({ timeout: 10000 }); }"
```

## Frames

```bash
playwright-cli run-code "async page => {
  const frame = page.locator('iframe#my-iframe').contentFrame();
  await frame.locator('button').click();
}"

playwright-cli run-code "async page => page.frames().map(f => f.url())"
```

## Downloads

```bash
playwright-cli run-code "async page => {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download' }).click();
  const download = await downloadPromise;
  await download.saveAs('.playwright-cli/downloaded-file.pdf');
  return download.suggestedFilename();
}"
```

## Page information

```bash
playwright-cli run-code "async page => page.url()"
playwright-cli run-code "async page => await page.title()"
playwright-cli run-code "async page => page.viewportSize()"
playwright-cli run-code "async page => {
  return await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    userAgent: navigator.userAgent
  }));
}"
```

Check `innerWidth` against the viewport you meant to test before reading a phone
capture.

## Error handling

```bash
playwright-cli run-code "async page => {
  try {
    await page.getByRole('button', { name: 'Submit' }).click({ timeout: 1000 });
    return 'clicked';
  } catch (e) {
    return 'element not found';
  }
}"
```

## Scraping several pages

```bash
playwright-cli run-code "async page => {
  const results = [];
  for (let i = 1; i <= 3; i++) {
    await page.goto('http://127.0.0.1:8765/page/' + i);
    results.push(...await page.locator('.item').allTextContents());
  }
  return results;
}"
```
