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
  kind?: "Subscription" | "One-time purchase" | "Lifetime deal" | "Contractor" | "Expense" | "Income";
  /** A category already in the picker (fixed or custom). */
  category?: string;
  /** Create this custom category from the picker and select it. */
  newCategory?: string;
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
  if (o.category) await pickCategory(page, dialog, o.category);
  if (o.newCategory) await addCustomCategory(page, dialog, o.newCategory);
  if (o.replaces) await dialog.getByLabel("Replaces a month").fill(o.replaces);
  if (o.client) await pickSelect(page, dialog, "Client", o.client);
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(toast(page, "Added")).toBeVisible();
  await expect(dialog).toBeHidden();
}

/**
 * Category picker (src/components/categories/category-picker.tsx): the trigger is named "Category, <value>" and opens
 * a nested "Category" sheet whose tiles are toggle buttons named after the category.
 */
export async function openCategories(page: Page, scope: Locator) {
  await scope.getByRole("button", { name: /^Category, / }).click();
  const sheet = page.getByRole("dialog", { name: "Category", exact: true });
  await expect(sheet).toBeVisible();
  return sheet;
}

export async function pickCategory(page: Page, scope: Locator, name: string) {
  const sheet = await openCategories(page, scope);
  await sheet.getByRole("button", { name, exact: true }).click();
  await expect(sheet).toBeHidden();
  await expect(scope.getByRole("button", { name: `Category, ${name}` })).toBeVisible();
}

export async function addCustomCategory(page: Page, scope: Locator, name: string) {
  const sheet = await openCategories(page, scope);
  await sheet.getByRole("button", { name: "Custom category" }).click();
  await sheet.getByLabel("New category name").fill(name);
  await sheet.getByRole("button", { name: "Add", exact: true }).click();
  await expect(sheet).toBeHidden();
  await expect(scope.getByRole("button", { name: `Category, ${name}` })).toBeVisible();
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
