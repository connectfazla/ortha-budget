import { expect, test } from "@playwright/test";
import { blockFxApi, fillEntry, openAddEntry, uid } from "./helpers";

test("BDT entry with a manual FX rate shows the converted base amount", async ({ page }) => {
  await blockFxApi(page);
  const name = uid("bdt");
  await page.goto("/transactions");
  const dialog = await openAddEntry(page);
  await dialog.getByRole("combobox", { name: "Currency", exact: true }).click();
  await page.getByRole("option", { name: "BDT", exact: true }).click();
  await dialog.getByLabel("1 BDT =").fill("0.0082"); // "1 BDT = [rate] USD"
  await dialog.getByLabel("Amount in BDT").fill("1000");
  // Secondary value line under the amount: 1000 x 0.0082 = 8.20
  await expect(dialog.getByText("≈ $8.20 USD")).toBeVisible();
  await fillEntry(page, dialog, { description: name, amount: "1000" });

  const row = page.getByRole("button", { name: `Edit ${name}`, exact: true });
  await expect(row).toContainText("8.20"); // base amount (USD)
  await expect(row).toContainText("1,000"); // original BDT amount line
});
