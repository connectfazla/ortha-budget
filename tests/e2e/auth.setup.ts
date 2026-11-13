import { expect, test as setup } from "@playwright/test";

// Signs up a fresh throwaway account through the real form (Supabase email + password) so every run starts empty.
// Set E2E_EMAIL / E2E_PASSWORD to reuse an existing account instead.
setup("sign in", async ({ page }) => {
  const email = process.env.E2E_EMAIL ?? `e2e+${Date.now()}@example.com`;
  const password = process.env.E2E_PASSWORD ?? `E2e-${crypto.randomUUID()}`;
  const existing = Boolean(process.env.E2E_EMAIL);

  await page.goto(existing ? "/sign-in" : "/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: existing ? "Sign in" : "Create account" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-") && u.pathname !== "/welcome");
  await expect(page.locator("main")).toBeVisible();
  await page.context().storageState({ path: "tests/e2e/.auth/user.json" });
});
