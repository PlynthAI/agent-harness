import { readFileSync } from "node:fs"
import path from "node:path"

import { expect, test, type Locator, type Page } from "@playwright/test"

// The design contract: the stylesheet, the type roles and the components paint with the design
// library's twenty --role-* names, never with a design's own token names. This test removes every
// rule the design's tokens.css and role-bridge.css contribute, defines the roles alone with values
// no design uses (and a second set for data-theme="dark"), and checks that the pages it visits
// take the colours, muted text, faces, radii and focus fill it reads from those roles, in light
// and in dark. An unlayered sentinel colour and face on <main> make an element that only inherits
// fail, so a heading passes only when its own type role sets it. Transitions are switched off so
// the swap is read at once.
const designDir = path.join(import.meta.dirname, "..", "..", "src", "styles", "design")
const declared = (file: string) => [
  ...new Set(
    [...readFileSync(path.join(designDir, file), "utf8").matchAll(/(--[\w-]+)\s*:/g)].map(
      ([, name]) => name
    )
  ),
]
const designNames = [...declared("tokens.css"), ...declared("role-bridge.css")]

const roles = {
  ink: "rgb(7, 54, 66)",
  "ink-muted": "rgb(88, 110, 117)",
  paper: "rgb(253, 246, 227)",
  surface: "rgb(255, 251, 240)",
  "surface-soft": "rgb(238, 232, 213)",
  line: "rgb(147, 161, 161)",
  accent: "rgb(38, 139, 210)",
  "accent-ink": "rgb(31, 111, 168)",
  "on-accent": "rgb(255, 255, 255)",
  focus: "rgb(211, 54, 130)",
  "on-danger": "rgb(255, 255, 255)",
  success: "rgb(133, 153, 0)",
  warning: "rgb(181, 137, 0)",
  "font-body": "Georgia, serif",
  "font-display": "Verdana, sans-serif",
  "font-mono": '"Courier New", monospace',
  "radius-control": "3px",
  "radius-panel": "21px",
  "radius-pill": "999px",
}

// The dark set changes only what the dark pass reads.
const darkRoles = {
  ink: "rgb(238, 232, 213)",
  "ink-muted": "rgb(131, 148, 150)",
  paper: "rgb(0, 43, 54)",
}

async function applyRolesOnly(page: Page) {
  await page.evaluate(
    ({ names, values, dark }) => {
      const drop = new Set(names)
      const prune = (
        rules: CSSRuleList,
        owner: CSSStyleSheet | CSSGroupingRule,
        inBase: boolean
      ) => {
        for (let i = rules.length - 1; i >= 0; i -= 1) {
          const rule = rules[i]
          if (rule instanceof CSSLayerBlockRule) {
            prune(rule.cssRules, rule, inBase || rule.name === "base")
          } else if (rule instanceof CSSGroupingRule) {
            prune(rule.cssRules, rule, inBase)
          } else if (
            inBase &&
            rule instanceof CSSStyleRule &&
            [...rule.style].some((p) => drop.has(p))
          ) {
            owner.deleteRule(i)
          }
        }
      }
      for (const sheet of document.styleSheets) prune(sheet.cssRules, sheet, false)
      const block = (set: Record<string, string>) =>
        Object.entries(set)
          .map(([role, value]) => `--role-${role}: ${value};`)
          .join(" ")
      const style = document.createElement("style")
      style.textContent = `:root { ${block(values)} }
      :root[data-theme="dark"] { ${block(dark)} }
      main { color: rgb(1, 2, 3); font-family: "Sentinel Face"; }
      *, ::before, ::after { transition: none !important; }`
      document.head.append(style)
    },
    { names: designNames, values: roles, dark: darkRoles }
  )
}

const css = (locator: Locator, property: string) =>
  locator.evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property)

// The colour a declaration computes to in this page, for derived shades such as the caption ink.
const computedColour = (page: Page, value: string) =>
  page.evaluate((colour) => {
    const probe = document.createElement("div")
    probe.style.color = colour
    document.body.append(probe)
    const result = getComputedStyle(probe).color
    probe.remove()
    return result
  }, value)

// Moves keyboard focus with Tab until the control has it, so :focus-visible applies as for a user.
async function tabTo(page: Page, control: Locator) {
  for (let i = 0; i < 40; i += 1) {
    await page.keyboard.press("Tab")
    if (await control.evaluate((element) => element === document.activeElement)) return
  }
  throw new Error("Tab never reached the control")
}

// A type role no page uses yet, read from a probe element carrying the role class.
const roleFace = (page: Page, className: string) =>
  page.evaluate((name) => {
    const probe = document.createElement("p")
    probe.className = name
    probe.textContent = "0123"
    document.body.append(probe)
    const result = getComputedStyle(probe).fontFamily
    probe.remove()
    return result
  }, className)

async function openWithRolesOnly(page: Page, url: string) {
  await page.goto(url)
  await applyRolesOnly(page)
  // Every page title is a display role, so it takes the display face.
  const heading = page.getByRole("heading", { level: 1 })
  expect(await css(page.locator("html"), "background-color")).toBe(roles.paper)
  expect(await css(heading, "color")).toBe(roles.ink)
  expect(await css(heading, "font-family")).toBe(roles["font-display"])
  expect(await css(page.locator("body"), "font-family")).toBe(roles["font-body"])
  expect(await css(page.getByRole("banner"), "border-bottom-color")).toBe(roles.line)
  const nav = page.getByRole("navigation", { name: "Main" }).getByRole("link").first()
  expect(await css(nav, "border-top-left-radius")).toBe(roles["radius-control"])
  // The footer note is set only by the caption role.
  const caption = page.locator("footer p.t-caption")
  expect(await css(caption, "color")).toBe(
    await computedColour(page, `color-mix(in oklab, ${roles["ink-muted"]} 80%, ${roles.paper})`)
  )
}

test("every page takes colours, muted text, faces, radii and focus from the injected roles", async ({
  page,
}) => {
  await openWithRolesOnly(page, "/")
  // A keyboard-focused link takes the focus role's fill over the surface.
  const articlesLink = page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Articles" })
  await tabTo(page, articlesLink)
  expect(await css(articlesLink, "background-color")).toBe(
    await computedColour(page, `color-mix(in oklab, ${roles.focus} 14%, ${roles.surface})`)
  )
  const action = page.getByRole("link", { name: "Read the articles" })
  expect(await css(action, "background-color")).toBe(roles.accent)
  expect(await css(action, "color")).toBe(roles["on-accent"])
  expect(await css(action, "border-top-left-radius")).toBe(roles["radius-control"])
  // The lead paragraph is muted by its type role alone.
  expect(await css(page.locator("#hero-title + p"), "color")).toBe(roles["ink-muted"])
  expect(await roleFace(page, "t-mono-md")).toBe(roles["font-mono"])
  expect(await roleFace(page, "t-pixel")).toBe(roles["font-mono"])

  await openWithRolesOnly(page, "/articles/")
  const card = page.locator("[data-slot=card]").first()
  expect(await css(card, "border-top-left-radius")).toBe(roles["radius-panel"])
  expect(await css(card, "background-color")).toBe(roles.surface)
  const cardTitle = page.locator("[data-slot=card-title]").first()
  expect(await css(cardTitle, "font-family")).toBe(roles["font-display"])
  await tabTo(page, card.getByRole("link"))
  expect(await css(card, "background-color")).toBe(roles.surface)
  expect(await css(card, "box-shadow")).toContain(roles.ink)

  await openWithRolesOnly(page, "/articles/adding-an-article/")
  const code = page.locator(".article-body code").first()
  expect(await css(code, "font-family")).toBe(roles["font-mono"])
  expect(await css(code, "background-color")).toBe(roles["surface-soft"])

  await openWithRolesOnly(page, "/contact/")
  const field = page.getByRole("textbox", { name: "Email", exact: true })
  expect(await css(field, "border-top-left-radius")).toBe(roles["radius-control"])
  expect(await css(field, "background-color")).toBe(roles.surface)
  await tabTo(page, field)
  expect(await css(field, "background-color")).toBe(roles.surface)
  expect(await css(field, "border-top-color")).toBe(roles.ink)

  await openWithRolesOnly(page, "/no-such-page/")
  expect(await css(page.getByText("Error 404"), "color")).toBe(
    await computedColour(page, `color-mix(in oklab, ${roles["ink-muted"]} 80%, ${roles.paper})`)
  )
})

for (const mode of ["light", "dark", "forced-colours"] as const) {
  test(`Kit keyboard focus keeps bordered fills unchanged in ${mode}`, async ({ page }) => {
    await page.emulateMedia({
      colorScheme: mode === "dark" ? "dark" : "light",
      forcedColors: mode === "forced-colours" ? "active" : "none",
    })
    await page.goto("/")
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      mode === "dark" ? "dark" : "light"
    )
    await page.addStyleTag({ content: "* { transition: none !important; }" })
    const outline = page.getByRole("link", { name: "Send a message" })
    const fill = await css(outline, "background-color")
    await tabTo(page, outline)
    if (mode === "forced-colours") {
      await expect(outline).toHaveCSS("outline-style", "solid")
      await expect(outline).toHaveCSS("outline-width", "2px")
      await expect(outline).toHaveCSS("outline-color", await computedColour(page, "CanvasText"))
    } else {
      await expect(outline).toHaveCSS("background-color", fill)
      await expect(outline).toHaveCSS(
        "border-top-color",
        await computedColour(page, "var(--role-ink)")
      )
      await expect(outline).toHaveCSS("outline-style", "none")
    }

    await page.goto("/contact/")
    await expect(page.locator("form")).toHaveAttribute("data-hydrated", "true")
    await page.addStyleTag({ content: "* { transition: none !important; }" })
    for (const control of [
      page.getByLabel("Email", { exact: true }),
      page.getByLabel("Message", { exact: true }),
    ]) {
      const fill = await css(control, "background-color")
      await tabTo(page, control)
      if (mode === "forced-colours") {
        await expect(control).toHaveCSS("outline-style", "solid")
        await expect(control).toHaveCSS("outline-width", "2px")
        await expect(control).toHaveCSS("outline-color", await computedColour(page, "CanvasText"))
      } else {
        await expect(control).toHaveCSS("background-color", fill)
        await expect(control).toHaveCSS(
          "border-top-color",
          await computedColour(page, "var(--role-ink)")
        )
        await expect(control).toHaveCSS("outline-style", "none")
      }
    }
  })
}

test("dark mode takes paper, ink and muted ink from the dark roles", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" })
  await page.goto("/")
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
  await applyRolesOnly(page)
  expect(await css(page.locator("html"), "background-color")).toBe(darkRoles.paper)
  expect(await css(page.getByRole("heading", { level: 1 }), "color")).toBe(darkRoles.ink)
  expect(await css(page.locator("#hero-title + p"), "color")).toBe(darkRoles["ink-muted"])
})
