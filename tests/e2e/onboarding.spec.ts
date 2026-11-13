import { expect, test } from "@playwright/test";
import { toast } from "./helpers";

// Runs in its own "onboarding" project, before mobile/desktop, because every other spec adds data.
test("first run shows on an empty account and sample data fills the dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  const firstRun = page.getByRole("heading", { name: "Know what you owe before it is due." });
  test.skip(!(await firstRun.isVisible()), "account already has data, first-run is only shown on an empty account");

  await expect(page.getByText("Add your first subscription")).toBeVisible();
  await expect(page.getByText("Add a payment")).toBeVisible();
  await expect(page.getByText("Set your tax percentage")).toBeVisible();

  await page.getByRole("button", { name: "Load sample data" }).click();
  await expect(toast(page, /sample/i)).toHaveCount(0); // no error toast
  await expect(firstRun).toBeHidden();
  // Dashboard cards are shadcn Cards titled by an h2 (src/app/(app)/page.tsx, forecast-card.tsx).
  await expect(page.getByRole("heading", { level: 2, name: /^Net in / })).toBeVisible(); // hero
  await expect(page.getByRole("heading", { level: 2, name: "Coming up" })).toBeVisible(); // forecast
  await expect(page.getByRole("heading", { level: 2, name: "Set aside for tax" })).toBeVisible(); // money health
  await expect(page.getByRole("heading", { level: 2, name: "Cash on hand" })).toBeVisible();
});
