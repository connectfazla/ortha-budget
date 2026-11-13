import { expect, test } from "@playwright/test";
import { createPlan, isoIn, moneyNumber, openAddEntry, pickCategory, planAction, toast, uid } from "./helpers";

test("plan lifecycle: trial and cancel-by, mark paid, pause and resume, annual toggle", async ({ page }) => {
  const name = uid("plan");
  await createPlan(page, { name, amount: "9.99", nextDue: isoIn(3), trialEnds: isoIn(5), cancelBy: isoIn(4) });

  const row = page.locator("main").getByRole("listitem").filter({ hasText: name });
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

test("a subscription from the + sheet becomes a plan, and Paid today logs the charge", async ({ page }) => {
  const name = uid("sub");
  await page.goto("/subscriptions");
  const dialog = await openAddEntry(page);
  await dialog.getByRole("button", { name: "Subscription", exact: true }).click(); // type chip
  await expect(dialog.getByLabel("Repeats")).toHaveValue("monthly");
  await expect(dialog.getByLabel("Next charge")).toHaveValue(/^\d{4}-\d{2}-\d{2}$/); // defaults to a month out
  await expect(dialog.getByRole("switch", { name: "Paid today" })).toBeChecked();
  await dialog.getByLabel(/^Amount in /).fill("12");
  await dialog.getByLabel("Description").fill(name);
  await pickCategory(page, dialog, "Design tools");
  await dialog.getByRole("button", { name: "Save subscription" }).click();
  await expect(toast(page, `Added ${name} and logged today’s charge. Next charge`)).toBeVisible();
  await expect(dialog).toBeHidden();

  // A real plan on /subscriptions...
  const row = page.locator("main").getByRole("listitem").filter({ hasText: name });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Due");

  // ...and today's payment in /transactions. Editing it stays a single-transaction edit (no Repeats row).
  await page.goto("/transactions");
  const txn = page.getByRole("button", { name: `Edit ${name}`, exact: true });
  await expect(txn).toBeVisible();
  await txn.click();
  const edit = page.getByRole("dialog", { name: "Edit entry" });
  await expect(edit.getByLabel("Date")).toBeVisible();
  await expect(edit.getByLabel("Repeats")).toHaveCount(0);
  await edit.getByRole("button", { name: "Close" }).click();

  // Tidy up: the plan (its logged payment stays, like any paid charge).
  await page.goto("/subscriptions");
  await planAction(page, name, "Delete");
  await expect(toast(page, `Deleted ${name}`)).toBeVisible();
});

test("a subscription without Paid today adds the plan only", async ({ page }) => {
  const name = uid("sub-unpaid");
  await page.goto("/subscriptions");
  const dialog = await openAddEntry(page);
  await dialog.getByRole("button", { name: "Subscription", exact: true }).click();
  await dialog.getByLabel("Repeats").selectOption("yearly");
  await dialog.getByLabel(/^Amount in /).fill("120");
  await dialog.getByLabel("Description").fill(name);
  await dialog.getByRole("switch", { name: "Paid today" }).click();
  await dialog.getByRole("button", { name: "Save subscription" }).click();
  await expect(toast(page, new RegExp(`^Added ${name}\\. Next charge`))).toBeVisible();
  await expect(page.locator("main").getByRole("listitem").filter({ hasText: name })).toBeVisible();
  await page.goto("/transactions");
  await expect(page.getByRole("button", { name: `Edit ${name}`, exact: true })).toHaveCount(0);
  await page.goto("/subscriptions");
  await planAction(page, name, "Delete");
  await expect(toast(page, `Deleted ${name}`)).toBeVisible();
});
