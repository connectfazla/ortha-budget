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

test("welcome opens in dark mode and the footer switch changes the theme", async ({ page }) => {
  await page.goto("/welcome");
  const html = page.locator("html");
  await expect(html).toHaveClass(/\bdark\b/); // defaultTheme="dark"
  const appearance = page.getByRole("group", { name: "Appearance" });
  await appearance.getByRole("button", { name: "Light" }).click();
  await expect(html).toHaveClass(/\blight\b/);
  await expect(html).not.toHaveClass(/\bdark\b/);
  await expect(appearance.getByRole("button", { name: "Light" })).toHaveAttribute("aria-pressed", "true");
  await appearance.getByRole("button", { name: "Dark" }).click();
  await expect(html).toHaveClass(/\bdark\b/);
});

test("open source and studio credits link out", async ({ page }) => {
  await page.goto("/welcome");
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: "Ortha Studio" })).toHaveAttribute("href", "https://ortha.studio");
  await expect(footer.getByRole("link", { name: "fazla.dev" })).toHaveAttribute("href", "https://fazla.dev");
  const star = page.getByRole("link", { name: "Star on GitHub" });
  await expect(star).toHaveAttribute("href", "https://github.com/connectfazla/ortha-budget");
  await expect(star).toHaveAttribute("rel", /noopener/);
});
