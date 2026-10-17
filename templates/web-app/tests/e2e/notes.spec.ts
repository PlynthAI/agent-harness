import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

test("the overview and the notes page have no serious accessibility violations", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectNoSeriousViolations(page);

  await page.goto("/notes");
  await expect(page.getByText("No notes yet")).toBeVisible();
  await expectNoSeriousViolations(page);

  await page.getByLabel("New note").fill("Book the boiler service");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByRole("list", { name: "Your notes" })).toContainText(
    "Book the boiler service",
  );
  await expectNoSeriousViolations(page);
});

test("a visitor adds, edits and removes a note", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Open the notes demo" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Notes" })).toBeVisible();
  await expect(page.getByText("No notes yet")).toBeVisible();

  const composer = page.getByLabel("New note");
  await composer.fill("Call the plumber about the kitchen tap");
  await page.getByRole("button", { name: "Add note" }).click();

  const list = page.getByRole("list", { name: "Your notes" });
  const item = list.getByRole("listitem");
  await expect(item).toHaveCount(1);
  await expect(item).toContainText("Call the plumber about the kitchen tap");
  await expect(composer).toHaveValue("");
  await expect(page.getByText("1 note", { exact: true })).toBeVisible();

  await item.getByRole("button", { name: "Edit" }).click();
  const editor = item.getByLabel("Edit note");
  await expect(editor).toBeFocused();
  await editor.fill("Call the plumber on Tuesday about the kitchen tap");
  await item.getByRole("button", { name: "Save" }).click();
  await expect(item).toContainText("Call the plumber on Tuesday about the kitchen tap");
  await expect(item.getByRole("button", { name: "Edit" })).toBeFocused();

  await item.getByRole("button", { name: "Remove" }).click();
  await expect(list).toHaveCount(0);
  await expect(page.getByText("No notes yet")).toBeVisible();
});

for (const theme of ["light", "dark"] as const) {
  test(`the server rejects a note that is too long and the page says why in ${theme}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: theme, forcedColors: "none" });
    await page.goto("/notes");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const composer = page.getByLabel("New note");
    await composer.fill("x".repeat(281));
    await page.getByRole("button", { name: "Add note" }).click();

    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
      "Not saved. Notes are limited to 280 characters.",
    );
    await expect(composer).toHaveAttribute("aria-invalid", "true");
    await expect(composer).toBeFocused();
    await expect(page.getByText("No notes yet")).toBeVisible();

    const colours = await page.evaluate(() => {
      const reference = document.createElement("span");
      document.body.append(reference);
      const resolve = (role: string) => {
        reference.style.color = `var(--role-${role})`;
        return getComputedStyle(reference).color;
      };
      const result = { ink: resolve("ink"), danger: resolve("danger") };
      reference.remove();
      return result;
    });
    await page.keyboard.press("Tab");
    await expect(composer).not.toBeFocused();
    await expect(composer).toHaveCSS("border-top-color", colours.danger);
    const fill = await composer.evaluate((element) => getComputedStyle(element).backgroundColor);
    await page.keyboard.press("Shift+Tab");
    await expect(composer).toBeFocused();
    await expect(composer).toHaveCSS("border-top-color", colours.ink);
    await expect(composer).toHaveCSS("background-color", fill);
    await expect(composer).toHaveCSS("outline-style", "none");

    await composer.fill("A shorter note the server accepts");
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
    await page.getByRole("button", { name: "Add note" }).click();
    await expect(page.getByRole("list", { name: "Your notes" })).toContainText(
      "A shorter note the server accepts",
    );
  });
}

test("the notes API answers with typed JSON", async ({ request }) => {
  const rejected = await request.post("/api/notes", { data: { text: "   " } });
  expect(rejected.status()).toBe(422);
  expect(await rejected.json()).toEqual({ error: { message: "Write something before saving." } });

  const saved = await request.post("/api/notes", { data: { text: "Pay the council tax" } });
  expect(saved.status()).toBe(201);
  expect(await saved.json()).toMatchObject({ note: { text: "Pay the council tax" } });
});
