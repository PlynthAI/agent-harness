import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

import { site } from "../../src/site.ts"

async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical")
  expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([])
}

test("a reader moves from the home page to an article", async ({ page }) => {
  const scripts: string[] = []
  page.on("request", (request) => {
    if (request.resourceType() === "script") scripts.push(request.url())
  })

  await page.goto("/")
  await expect(page).toHaveTitle(site.name)
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  await expectNoSeriousViolations(page)

  const latest = page.getByRole("region", { name: "Latest articles" })
  const firstArticle = latest.getByRole("listitem").first().getByRole("link")
  const title = (await firstArticle.textContent())?.trim() ?? ""
  await firstArticle.click()

  await expect(page).toHaveURL(/\/articles\/[a-z0-9-]+\/$/)
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title)
  await expect(page).toHaveTitle(`${title} · ${site.name}`)
  const canonical = new URL(new URL(page.url()).pathname, site.url).href
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonical)
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", canonical)
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "article")
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.{50,}/)
  await expectNoSeriousViolations(page)

  expect(scripts, "home and article pages load no JavaScript").toEqual([])
})

for (const theme of ["light", "dark"] as const) {
  test(`the contact form shows validation errors, then success in ${theme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme, forcedColors: "none" })
    await page.goto("/contact/")
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme)
    const form = page.locator("form[data-hydrated='true']")
    await expect(form, "the island hydrates").toBeVisible()

    await page.getByRole("textbox", { name: "Email", exact: true }).fill("not-an-email")
    await page.getByRole("button", { name: "Send message" }).click()
    await expect(page.getByText("Check the 3 highlighted fields.")).toBeVisible()
    const name = page.getByRole("textbox", { name: "Name", exact: true })
    await expect(name).toHaveAttribute("aria-invalid", "true")
    await expect(name).toBeFocused()
    await expect(page.getByText("Enter an email address like name@example.com.")).toBeVisible()

    const colours = await page.evaluate(() => {
      const reference = document.createElement("span")
      document.body.append(reference)
      const resolve = (role: string) => {
        reference.style.color = `var(--role-${role})`
        return getComputedStyle(reference).color
      }
      const result = { ink: resolve("ink"), danger: resolve("danger") }
      reference.remove()
      return result
    })
    await page.keyboard.press("Tab")
    for (const [index, label] of ["Name", "Email", "Message"].entries()) {
      const control = page.getByRole("textbox", { name: label, exact: true })
      await expect(control).toHaveAttribute("aria-invalid", "true")
      await expect(control).not.toBeFocused()
      await expect(control).toHaveCSS("border-top-color", colours.danger)
      const fill = await control.evaluate((element) => getComputedStyle(element).backgroundColor)
      await page.keyboard.press(index === 0 ? "Shift+Tab" : "Tab")
      await expect(control).toBeFocused()
      await expect(control).toHaveCSS("border-top-color", colours.ink)
      await expect(control).toHaveCSS("background-color", fill)
      await expect(control).toHaveCSS("outline-style", "none")
    }

    await name.fill("Ada")
    await page.getByRole("textbox", { name: "Email", exact: true }).fill("ada@example.com")
    await page
      .getByRole("textbox", { name: "Message", exact: true })
      .fill("Could the articles page show reading times?")
    await page.getByRole("button", { name: "Send message" }).click()
    await expect(page.getByRole("status")).toContainText("Message received")
    await expect(page.getByRole("status")).toContainText("Thanks, Ada.")
  })
}

test("a missing page returns the custom 404", async ({ page }) => {
  const response = await page.goto("/no-such-page/")
  expect(response?.status()).toBe(404)
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found")
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex")
})

test("public files, redirects and internal links resolve", async ({ page, request }) => {
  const robots = await request.get("/robots.txt")
  expect(await robots.text()).toContain(`Sitemap: ${new URL("sitemap-index.xml", site.url).href}`)
  expect((await request.get("/sitemap-index.xml")).ok()).toBe(true)
  const sitemap = await (await request.get("/sitemap-0.xml")).text()
  expect(sitemap).toContain(`${site.url}/articles/`)
  expect(sitemap).not.toContain("404")

  await page.goto("/blog/")
  await expect(page).toHaveURL(/\/articles\/$/)

  await page.goto("/")
  const hrefs = await page
    .locator("a[href^='/']")
    .evaluateAll((links) => [...new Set(links.map((link) => link.getAttribute("href") ?? ""))])
  for (const href of hrefs) {
    expect((await request.get(href)).status(), href).toBe(200)
  }
})
