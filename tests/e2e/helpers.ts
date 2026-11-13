import { expect, type Locator, type Page } from "@playwright/test";

/** Unique, sortable name for rows a spec creates. */
export const uid = (tag: string) => `e2e-${Date.now().toString(36)}-${tag}`;

/** YYYY-MM-DD, `days` from now (local clock; specs keep a 1 day margin for the app timezone). */
export const isoIn = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
};

/** Sonner toast. Targets the <li data-sonner-toast> rendered by src/components/ui/sonner.tsx. */
export const toast = (page: Page, text: string | RegExp) => page.locator("[data-sonner-toast]").filter({ hasText: text }).first();

/**
 * Base UI Select (src/components/ui/select.tsx): the trigger has role=combobox and the aria-label we pass,
 * options render in a portal with role=option.
 */
export async function pickSelect(page: Page, scope: Locator, label: string, option: string) {
  await scope.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

export type EntryOpts = {
  description: string;
  amount: string;
  kind?: "Subscription" | "One-time" | "Lifetime deal" | "Contractor" | "Expense" | "Income";
  category?: string;
  currency?: string;
  fx?: string;
  client?: string;
  replaces?: string;
};

/**
 * Open the Add entry drawer from the shell: the bottom-bar plus button on mobile, the sidebar button on desktop.
 * Both are named "Add transaction"; the one for the other breakpoint is display:none so only one matches.
 */
export async function openAddEntry(page: Page) {
  await page.getByRole("button", { name: "Add transaction" }).click();
  const dialog = page.getByRole("dialog", { name: "Add entry" });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Fill the Add entry drawer (src/components/entry/add-entry-drawer.tsx) and save. Expects the "Added" toast. */
export async function fillEntry(page: Page, dialog: Locator, o: EntryOpts) {
  if (o.kind) await dialog.getByRole("button", { name: o.kind, exact: true }).click(); // type chip (ToggleGroup item)
  if (o.currency) {
    await pickSelect(page, dialog, "Currency", o.currency);
    if (o.fx) await dialog.getByLabel(`1 ${o.currency} =`).fill(o.fx); // "1 EUR = [rate] USD" row
  }
  await dialog.getByLabel(/^Amount in /).fill(o.amount); // sr-only "Amount in USD" label on the big amount input
  await dialog.getByLabel("Description").fill(o.description);
  if (o.category) await dialog.getByLabel("Category", { exact: true }).fill(o.category);
  if (o.replaces) await dialog.getByLabel("Replaces a month").fill(o.replaces);
  if (o.client) await pickSelect(page, dialog, "Client", o.client);
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(toast(page, "Added")).toBeVisible();
  await expect(dialog).toBeHidden();
}

/** Add an entry from wherever you are. */
export async function addEntry(page: Page, o: EntryOpts) {
  await fillEntry(page, await openAddEntry(page), o);
}

/** Stop the live FX lookup (open.er-api.com) so a typed rate is never raced by a prefill. */
export const blockFxApi = (page: Page) => page.route("https://open.er-api.com/**", (r) => r.abort());

/** Create a recurring plan on /subscriptions. Dates are YYYY-MM-DD. */
export async function createPlan(page: Page, o: { name: string; amount: string; nextDue: string; trialEnds?: string; cancelBy?: string }) {
  await page.goto("/subscriptions");
  await page.getByRole("button", { name: "Add recurring item" }).click(); // icon button in the page header
  const dialog = page.getByRole("dialog", { name: "New recurring" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Name", { exact: true }).fill(o.name);
  await dialog.getByLabel("Amount", { exact: true }).fill(o.amount);
  await dialog.getByLabel("Next due").fill(o.nextDue); // <input type=date> takes YYYY-MM-DD
  if (o.trialEnds) await dialog.getByLabel("Trial ends").fill(o.trialEnds);
  if (o.cancelBy) await dialog.getByLabel(/cancel by/i).fill(o.cancelBy); // field not in the drawer yet, see README note
  await dialog.getByRole("button", { name: "Add recurring" }).click();
  await expect(toast(page, "Added")).toBeVisible();
  await expect(dialog).toBeHidden();
}

/** Open the three-dot menu on a subscription row and pick an item. */
export async function planAction(page: Page, name: string, item: string) {
  await page.getByRole("button", { name: `Actions for ${name}` }).click();
  await page.getByRole("menuitem", { name: item, exact: true }).click();
}

/** Parse the sr-only text of an animated <Money> (e.g. "−$1,234.50") into a number. */
export const moneyNumber = (text: string | null) => Number((text ?? "").replace(/[^\d.]/g, ""));
