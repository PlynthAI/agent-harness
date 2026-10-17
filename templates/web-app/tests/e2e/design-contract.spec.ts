import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

import { buttonVariants } from "../../components/ui/button";

// The design contract: the stylesheet, the type roles and the components paint with the design
// library's twenty --role-* names, never with a design's own token names. This test removes every
// rule the design's tokens.css and role-bridge.css contribute, defines the roles alone with values
// no design uses (and a second set for data-theme="dark"), and checks that the pages it visits
// take the colours, muted text, faces, radii and focus fill it reads from those roles, in light
// and in dark. An unlayered sentinel colour and face on <main> make an element that only inherits
// fail, so a heading passes only when its own type role sets it. Transitions are switched off so
// the swap is read at once.
const designDir = path.join(import.meta.dirname, "..", "..", "styles", "design");
const declared = (file: string) => [
  ...new Set(
    [...readFileSync(path.join(designDir, file), "utf8").matchAll(/(--[\w-]+)\s*:/g)].map(
      ([, name]) => name,
    ),
  ),
];
const designNames = [...declared("tokens.css"), ...declared("role-bridge.css")];

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
};

// The dark set changes only what the dark pass reads.
const darkRoles = {
  ink: "rgb(238, 232, 213)",
  "ink-muted": "rgb(131, 148, 150)",
  paper: "rgb(0, 43, 54)",
  surface: "rgb(7, 54, 66)",
};

async function applyRolesOnly(page: Page) {
  await page.evaluate(
    ({ names, values, dark }) => {
      const drop = new Set(names);
      const prune = (
        rules: CSSRuleList,
        owner: CSSStyleSheet | CSSGroupingRule,
        inBase: boolean,
      ) => {
        for (let i = rules.length - 1; i >= 0; i -= 1) {
          const rule = rules[i];
          if (rule instanceof CSSLayerBlockRule) {
            prune(rule.cssRules, rule, inBase || rule.name === "base");
          } else if (rule instanceof CSSGroupingRule) {
            prune(rule.cssRules, rule, inBase);
          } else if (
            inBase &&
            rule instanceof CSSStyleRule &&
            [...rule.style].some((p) => drop.has(p))
          ) {
            owner.deleteRule(i);
          }
        }
      };
      for (const sheet of document.styleSheets) prune(sheet.cssRules, sheet, false);
      const block = (set: Record<string, string>) =>
        Object.entries(set)
          .map(([role, value]) => `--role-${role}: ${value};`)
          .join(" ");
      const style = document.createElement("style");
      style.textContent = `:root { ${block(values)} }
      :root[data-theme="dark"] { ${block(dark)} }
      main { color: rgb(1, 2, 3); font-family: "Sentinel Face"; }
      *, ::before, ::after { transition: none !important; }`;
      document.head.append(style);
    },
    { names: designNames, values: roles, dark: darkRoles },
  );
}

const css = (locator: Locator, property: string) =>
  locator.evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property);

// The colour a declaration computes to in this page, for derived shades such as the caption ink.
const computedColour = (page: Page, value: string) =>
  page.evaluate((colour) => {
    const probe = document.createElement("div");
    probe.style.color = colour;
    document.body.append(probe);
    const result = getComputedStyle(probe).color;
    probe.remove();
    return result;
  }, value);

// Moves keyboard focus with Tab until the control has it, so :focus-visible applies as for a user.
async function tabTo(page: Page, control: Locator) {
  for (let i = 0; i < 40; i += 1) {
    await page.keyboard.press("Tab");
    if (await control.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error("Tab never reached the control");
}

// A type role no page uses yet, read from a probe element carrying the role class.
const roleFace = (page: Page, className: string) =>
  page.evaluate((name) => {
    const probe = document.createElement("p");
    probe.className = name;
    probe.textContent = "0123";
    document.body.append(probe);
    const result = getComputedStyle(probe).fontFamily;
    probe.remove();
    return result;
  }, className);

async function expectPagePainted(page: Page, headingFace: string) {
  const html = page.locator("html");
  const heading = page.getByRole("heading", { level: 1 });
  expect(await css(html, "background-color")).toBe(roles.paper);
  expect(await css(heading, "color")).toBe(roles.ink);
  expect(await css(heading, "font-family")).toBe(headingFace);
  expect(await css(page.locator("body"), "font-family")).toBe(roles["font-body"]);
  expect(await css(page.getByRole("banner"), "border-bottom-color")).toBe(roles.line);
}

test("home and notes take colours, muted text, faces, radii and focus from the injected roles", async ({
  page,
}) => {
  await page.goto("/");
  await applyRolesOnly(page);
  // The page title is a display role, so it takes the display face.
  await expectPagePainted(page, roles["font-display"]);
  const action = page.getByRole("link", { name: "Open the notes demo" });
  expect(await css(action, "background-color")).toBe(roles.accent);
  expect(await css(action, "color")).toBe(roles["on-accent"]);
  expect(await css(action, "border-top-left-radius")).toBe(roles["radius-control"]);
  // Muted text set only by a type role: the label and the lead paragraph.
  expect(await css(page.getByText("Web app template"), "color")).toBe(roles["ink-muted"]);
  expect(await css(page.locator("main > p.t-body-lg"), "color")).toBe(roles["ink-muted"]);
  expect(await roleFace(page, "t-mono-md")).toBe(roles["font-mono"]);
  expect(await roleFace(page, "t-pixel")).toBe(roles["font-mono"]);

  await page.goto("/notes");
  await expect(page.getByText("No notes yet")).toBeVisible();
  await applyRolesOnly(page);
  await expectPagePainted(page, roles["font-body"]);
  const intro = page.locator("main > p.t-body-md");
  expect(await css(intro, "color")).toBe(roles["ink-muted"]);
  const caption = page.locator("p.t-caption").first();
  expect(await css(caption, "color")).toBe(
    await computedColour(page, `color-mix(in oklab, ${roles["ink-muted"]} 80%, ${roles.paper})`),
  );
  const field = page.getByLabel("New note");
  expect(await css(field, "border-top-left-radius")).toBe(roles["radius-control"]);
  expect(await css(field, "background-color")).toBe(roles.surface);
  const empty = page.getByText("No notes yet").locator("..");
  expect(await css(empty, "border-top-left-radius")).toBe(roles["radius-panel"]);
  expect(await css(empty, "background-color")).toBe(roles["surface-soft"]);
  const current = page.getByRole("link", { name: "Notes", exact: true });
  expect(await css(current, "background-color")).toBe(roles["surface-soft"]);
  await tabTo(page, field);
  expect(await css(field, "background-color")).toBe(roles.surface);
  expect(await css(field, "border-top-color")).toBe(roles.ink);
});

for (const mode of ["light", "dark", "forced-colours"] as const) {
  test(`Kit keyboard focus keeps bordered fills unchanged in ${mode}`, async ({ page }) => {
    await page.emulateMedia({
      colorScheme: mode === "dark" ? "dark" : "light",
      forcedColors: mode === "forced-colours" ? "active" : "none",
    });
    await page.goto("/notes");
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      mode === "dark" ? "dark" : "light",
    );
    const field = page.getByLabel("New note");
    await field.fill("Focus contract");
    await page.getByRole("button", { name: "Add note", exact: true }).click();
    await expect(page.getByText("Focus contract", { exact: true })).toBeVisible();
    await page.getByRole("heading", { level: 1 }).click();
    // The demo has no outline action; exercise the public variant in the same stylesheet.
    await page.evaluate(
      (className) => {
        const button = document.createElement("button");
        button.className = className;
        button.textContent = "Outline focus fixture";
        document.body.append(button);
        const style = document.createElement("style");
        style.textContent = "* { transition: none !important; }";
        document.head.append(style);
      },
      buttonVariants({ variant: "outline" }),
    );
    const outline = page.getByRole("button", { name: "Outline focus fixture" });
    for (const control of [field, outline]) {
      const fill = await css(control, "background-color");
      await tabTo(page, control);
      if (mode === "forced-colours") {
        await expect(control).toHaveCSS("outline-style", "solid");
        await expect(control).toHaveCSS("outline-width", "2px");
        await expect(control).toHaveCSS("outline-color", await computedColour(page, "CanvasText"));
      } else {
        await expect(control).toHaveCSS("background-color", fill);
        await expect(control).toHaveCSS(
          "border-top-color",
          await computedColour(page, "var(--role-ink)"),
        );
        await expect(control).toHaveCSS("outline-style", "none");
      }
    }
  });
}

test("dark mode takes paper, ink, muted ink and surface from the dark roles", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/notes");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await applyRolesOnly(page);
  expect(await css(page.locator("html"), "background-color")).toBe(darkRoles.paper);
  expect(await css(page.getByRole("heading", { level: 1 }), "color")).toBe(darkRoles.ink);
  expect(await css(page.locator("main > p.t-body-md"), "color")).toBe(darkRoles["ink-muted"]);
  expect(await css(page.getByLabel("New note"), "background-color")).toBe(darkRoles.surface);
});
