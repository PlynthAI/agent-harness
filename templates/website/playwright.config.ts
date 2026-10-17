import path from "node:path"
import { randomUUID } from "node:crypto"

import { defineConfig, devices } from "@playwright/test"

import { derivePort } from "./scripts/dev.mjs"

// The journey runs against the production build served by `astro preview`, because the 404 page,
// redirects, robots.txt and the sitemap exist only in the build. The port sits 1000 above this
// checkout's dev port, so a running dev server and sibling worktrees do not collide.
const port = derivePort(path.basename(import.meta.dirname)) + 1000
const baseURL = `http://127.0.0.1:${port}`
const evidenceRoot = (process.env.PLAYWRIGHT_EVIDENCE_ROOT ??= path.resolve(
  ".cache/playwright",
  randomUUID()
))
console.info(`[Playwright evidence] ${evidenceRoot}`)

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  outputDir: path.join(evidenceRoot, "test-results"),
  metadata: { evidenceRoot, checkout: process.cwd(), node: process.version },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: path.join(evidenceRoot, "html") }],
    ["json", { outputFile: path.join(evidenceRoot, "results.json") }],
  ],
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm run build && pnpm run start --host 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
