import { defineConfig, devices } from "@playwright/test";
import { randomUUID } from "node:crypto";
import path from "node:path";

import { resolvePort } from "./scripts/dev.mjs";

// Same port as `pnpm run dev:up`, so a running dev server is reused instead of a second one.
const port = resolvePort();
const baseURL = `http://127.0.0.1:${port}`;
const evidenceRoot = (process.env.PLAYWRIGHT_EVIDENCE_ROOT ??= path.resolve(
  ".cache/playwright",
  randomUUID(),
));
console.info(`[Playwright evidence] ${evidenceRoot}`);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  outputDir: path.join(evidenceRoot, "test-results"),
  metadata: { evidenceRoot, checkout: process.cwd(), node: process.version },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: path.join(evidenceRoot, "html") }],
    ["json", { outputFile: path.join(evidenceRoot, "results.json") }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Same loopback host as dev:up; Next serves dev assets only to the host it started on.
    command: "pnpm run dev --hostname 127.0.0.1",
    env: { PORT: String(port) },
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
