import { expect, test } from "@playwright/test";

// Desktop only (the "mobile" project ignores this file in playwright.config.ts).
// Retry the key press until the client has hydrated and attached its keydown listener.
test("Cmd/Ctrl+K opens the palette and navigates", async ({ page }) => {
  await page.goto("/");
  const palette = page.getByRole("dialog", { name: "Command palette" });
  await expect(async () => {
    await page.keyboard.press("ControlOrMeta+K");
    await expect(palette).toBeVisible({ timeout: 1500 });
  }).toPass();
  await palette.getByPlaceholder("Search pages, actions, transactions").fill("Subscriptions");
  await palette.getByRole("option", { name: /Subscriptions/ }).click();
  await expect(page).toHaveURL(/\/subscriptions$/);
});

test("? shows the keyboard shortcuts", async ({ page }) => {
  await page.goto("/transactions");
  const help = page.getByRole("dialog", { name: "Keyboard shortcuts" });
  await expect(async () => {
    await page.locator("body").click({ position: { x: 5, y: 5 } }); // make sure focus is not in a field
    await page.keyboard.press("?");
    await expect(help).toBeVisible({ timeout: 1500 });
  }).toPass();
  await expect(help.getByText("New transaction")).toBeVisible();
});
