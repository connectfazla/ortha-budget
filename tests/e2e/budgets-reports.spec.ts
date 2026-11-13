import { expect, test } from "@playwright/test";
import { addEntry, toast, uid } from "./helpers";

test("set a budget and see the bar", async ({ page }) => {
  const category = uid("cat");
  await page.goto("/transactions");
  await addEntry(page, { description: `${category}-spend`, amount: "40", category }); // makes the category selectable
  await page.goto("/budgets");
  await page.getByRole("button", { name: /^(Add )?budget$/i }).first().click();
  const dialog = page.getByRole("dialog", { name: "New budget" });
  await dialog.getByLabel("Category").selectOption(category); // native <select>
  await dialog.getByLabel(/^Limit per month/).fill("100");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(toast(page, "Budget saved")).toBeVisible();

  const row = page.getByRole("button", { name: new RegExp(category) });
  await expect(row).toContainText("$60 left");
  await expect(row).toContainText("$40 of $100");
  await expect(page.getByRole("progressbar", { name: "Spent of total budget" })).toBeVisible();
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
