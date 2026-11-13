import { expect, test } from "@playwright/test";
import { addEntry, openCategories, pickCategory, toast, uid } from "./helpers";

test("custom category: create it in the + sheet, budget it, then delete it", async ({ page }) => {
  const category = uid("cat");
  await page.goto("/transactions");
  await addEntry(page, { description: `${category}-spend`, amount: "40", newCategory: category });

  // The new category is selectable everywhere a category is picked, e.g. the budget drawer.
  await page.goto("/budgets");
  await page.getByRole("button", { name: /^(Add )?budget$/i }).first().click();
  const dialog = page.getByRole("dialog", { name: "New budget" });
  await pickCategory(page, dialog, category);
  await dialog.getByLabel(/^Limit per month/).fill("100");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(toast(page, "Budget saved")).toBeVisible();

  const row = page.getByRole("button", { name: new RegExp(category) });
  await expect(row).toContainText("$60 left");
  await expect(row).toContainText("$40 of $100");
  await expect(page.getByRole("progressbar", { name: "Spent of total budget" })).toBeVisible();

  // Tidy up: delete it from the picker's tile menu (entries keep the name, so the budget row stays).
  await page.getByRole("button", { name: /^(Add )?budget$/i }).first().click();
  const sheet = await openCategories(page, page.getByRole("dialog", { name: "New budget" }));
  await sheet.getByRole("button", { name: `Options for ${category}` }).click();
  await page.getByRole("menuitem", { name: "Delete category" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete", exact: true }).click();
  await expect(toast(page, `Removed ${category}`)).toBeVisible();
  await expect(sheet.getByRole("button", { name: category, exact: true })).toBeHidden();
  await page.keyboard.press("Escape"); // close the picker, then the drawer; while open they hide the page from a11y
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(row).toBeVisible();
});

test("reports range switch", async ({ page }) => {
  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "Where it goes, last 6m" })).toBeVisible(); // default range
  const range = page.getByRole("navigation", { name: "Range" });
  await range.getByRole("link", { name: "3m" }).click();
  await expect(page).toHaveURL(/range=3m/);
  await expect(page.getByRole("heading", { name: "Where it goes, last 3m" })).toBeVisible();
  await range.getByRole("link", { name: "12m" }).click();
  await expect(page.getByRole("heading", { name: "Where it goes, last 12m" })).toBeVisible();
});

test("annual report renders and the year CSV downloads", async ({ page }) => {
  const year = new Date().getFullYear();
  // /reports/annual and /api/report/<year> are being built by another agent; adjust here if the contract differs.
  const res = await page.goto("/reports/annual");
  expect(res?.status()).toBeLessThan(400);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("main")).toContainText(String(year));

  // page.request shares the signed-in cookies, and the goto above just refreshed the session cookie.
  const csv = await page.request.get(`/api/report/${year}`);
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
});
