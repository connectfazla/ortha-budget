import { expect, test } from "@playwright/test";
import { addEntry, fillEntry, toast, uid } from "./helpers";

test("lifetime deal with replaces $/mo shows payback", async ({ page }) => {
  const name = uid("ltd");
  await page.goto("/lifetime");
  await page.getByRole("button", { name: "Add lifetime deal" }).first().click(); // header icon button (+ empty state twin)
  const dialog = page.getByRole("dialog", { name: "Add entry" });
  await expect(dialog).toBeVisible();
  // The drawer opens on the "Lifetime deal" kind, so "Replaces $/mo" is already there.
  await fillEntry(page, dialog, { description: name, amount: "120", replaces: "20" });
  // 120 / 20 = 6 months
  await expect(page.getByRole("listitem").filter({ hasText: name })).toContainText("Pays off in 6 months");
});

test("contractor: create and record a payout", async ({ page }) => {
  const name = uid("contractor");
  await page.goto("/contractors");
  await page.getByRole("button", { name: "Add contractor" }).first().click();
  const dialog = page.getByRole("dialog", { name: "New contractor" });
  await dialog.getByLabel("Name", { exact: true }).fill(name);
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(toast(page, "Contractor added")).toBeVisible();

  await page.getByRole("link", { name }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await page.getByRole("button", { name: "Record payout" }).click();
  const payout = page.getByRole("dialog", { name: "Add entry" });
  await expect(payout.getByLabel("Description")).toHaveValue(`Payout, ${name}`); // prefilled from the contractor
  await payout.getByLabel(/^Amount in /).fill("500");
  await payout.getByRole("button", { name: "Save", exact: true }).click();
  await expect(toast(page, "Added")).toBeVisible();

  await expect(page.getByRole("button", { name: `Payout, ${name}` })).toBeVisible(); // payout history row
  await expect(page.getByText("Paid this year").locator("xpath=..")).toContainText("$500");
});

test("client: tag an entry and see profit on the client page", async ({ page }) => {
  const client = uid("client");
  const year = new Date().getFullYear();
  await page.goto("/clients");
  await page.getByRole("button", { name: "Add client" }).first().click();
  const dialog = page.getByRole("dialog", { name: "New client" });
  await dialog.getByLabel("Name").fill(client);
  await dialog.getByRole("button", { name: "Add client" }).click(); // the submit button, inside the drawer
  await expect(toast(page, "Client added")).toBeVisible();

  await addEntry(page, { description: `${client}-payment`, amount: "1000", kind: "Income", client });
  await page.getByRole("link", { name: new RegExp(client) }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  const margin = page.locator("[data-slot=card]").filter({ has: page.getByRole("heading", { name: `Margin in ${year}` }) });
  await expect(margin).toContainText("1,000"); // margin = in - out = 1000 for a fresh client
  await expect(page.getByRole("button", { name: `Edit ${client}-payment` })).toBeVisible();
});
