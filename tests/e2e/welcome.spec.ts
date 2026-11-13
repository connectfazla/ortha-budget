import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } }); // signed out

test("welcome shows the headline and Create account in the first viewport", async ({ page }) => {
  await page.goto("/welcome");
  await expect(page.getByRole("heading", { level: 1, name: "A pocket ledger for your agency." })).toBeInViewport();
  await expect(page.getByRole("link", { name: "Create account" }).first()).toBeInViewport(); // hero; the closing band repeats it
});

test("Create account goes to /sign-up", async ({ page }) => {
  await page.goto("/welcome");
  await page.getByRole("link", { name: "Create account" }).first().click();
  await expect(page).toHaveURL(/\/sign-up/);
});

test("signed-out visit to / lands on the welcome page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/welcome$/);
});
