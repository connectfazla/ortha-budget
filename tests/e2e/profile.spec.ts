import { expect, test, type Page } from "@playwright/test";

// Profile tab (src/app/(app)/profile/page.tsx): grouped rows that drill in, plus the theme tiles.

/** A Profile row: a link (or anchor) whose name starts with the row title. */
const row = (page: Page, title: string) => page.getByRole("link", { name: new RegExp(`^${title}`) });

test("old /settings path lands on Profile", async ({ page }) => {
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole("heading", { level: 1, name: "Profile" })).toBeVisible();
});

test("rows drill in to their own page and back", async ({ page }) => {
  for (const [title, path, heading] of [
    ["Notifications", "/profile/notifications", "Notifications"],
    ["Base currency", "/profile/money", "Money"],
    ["Calendar feed", "/profile/calendar", "Calendar feed"],
  ]) {
    await page.goto("/profile");
    await row(page, title).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await page.getByRole("link", { name: /Profile/ }).first().click(); // "‹ Profile" back link
    await expect(page).toHaveURL(/\/profile$/);
  }
});

test("Export transactions downloads a CSV", async ({ page }) => {
  await page.goto("/profile");
  const [download] = await Promise.all([page.waitForEvent("download"), row(page, "Export transactions").click()]);
  expect(download.suggestedFilename()).toMatch(/^ortha-budget-\d{4}-\d{2}-\d{2}\.csv$/);
});

test("theme tiles apply at once and the Dark tile always previews dark", async ({ page }) => {
  await page.goto("/profile");
  const group = page.getByRole("group", { name: "Appearance" });
  const bg = (sel: string) => page.locator(sel).evaluate((el) => getComputedStyle(el).backgroundColor);
  // First mock in each tile is the full-size preview.
  const tileBg = (name: string) => group.getByRole("button", { name }).locator(".theme-scope").first().evaluate((el) => getComputedStyle(el).backgroundColor);

  await group.getByRole("button", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  const darkPage = await bg("body");
  expect(await tileBg("Dark")).toBe(darkPage);

  await group.getByRole("button", { name: "Light" }).click();
  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
  const lightPage = await bg("body");
  expect(lightPage).not.toBe(darkPage);
  expect(await tileBg("Light")).toBe(lightPage);
  expect(await tileBg("Dark")).toBe(darkPage); // still dark on a light page

  await group.getByRole("button", { name: "System" }).click();
  await expect(group.getByRole("button", { name: "System" })).toHaveAttribute("aria-pressed", "true");
});
