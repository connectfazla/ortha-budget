import { expect, test } from "@playwright/test";
import { createPlan, isoIn, moneyNumber, planAction, toast, uid } from "./helpers";

test("plan lifecycle: trial and cancel-by, mark paid, pause and resume, annual toggle", async ({ page }) => {
  const name = uid("plan");
  await createPlan(page, { name, amount: "9.99", nextDue: isoIn(3), trialEnds: isoIn(5), cancelBy: isoIn(4) });

  const row = page.getByRole("listitem").filter({ hasText: name });
  await expect(row).toContainText("Trial ends"); // trial tag, 5 days out is inside the 14 day window
  await expect(row).toContainText("Due");
  const dueBefore = (await row.getByText(/^Due /).first().textContent()) ?? "";

  // Mark paid: toast names the next due date and the row's date moves forward.
  await planAction(page, name, "Mark paid");
  await expect(toast(page, /Marked paid, next due/)).toBeVisible();
  await expect(async () => {
    const after = (await row.getByText(/^Due /).first().textContent()) ?? "";
    expect(after).not.toBe(dueBefore);
  }).toPass();

  // Pause and resume
  await planAction(page, name, "Pause");
  await expect(toast(page, "Paused")).toBeVisible();
  await expect(row).toContainText("Paused");
  await planAction(page, name, "Resume");
  await expect(toast(page, "Resumed")).toBeVisible();
  await expect(row).not.toContainText("Paused");

  // Monthly / Annual toggle: annual burn is 12x the monthly burn (cents hidden on annual, so allow 1 dollar).
  // The animated <Money> keeps its value in an .sr-only span (src/components/money.tsx).
  const burn = (label: string) => page.getByText(label, { exact: true }).locator("xpath=..").locator(".sr-only");
  const month = moneyNumber(await burn("Burn per month").textContent());
  expect(month).toBeGreaterThan(0);
  await page.getByRole("tab", { name: "Annual" }).click();
  await expect(page.getByText("Burn per year", { exact: true })).toBeVisible();
  const year = moneyNumber(await burn("Burn per year").textContent());
  expect(Math.abs(year - month * 12)).toBeLessThanOrEqual(1);
  await page.getByRole("tab", { name: "Monthly" }).click();
  await expect(page.getByText("Burn per month", { exact: true })).toBeVisible();

  // Tidy up: delete the plan (also covers its undo toast).
  await planAction(page, name, "Delete");
  await expect(toast(page, `Deleted ${name}`)).toBeVisible();
});
