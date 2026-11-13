import { expect, test, type Locator, type Page } from "@playwright/test";
import { addEntry, isoIn, toast, uid } from "./helpers";

const rowButton = (page: Page, desc: string) => page.getByRole("button", { name: `Edit ${desc}`, exact: true });

/**
 * Delete from the row menu. The trigger is sr-only below lg (swipe is the touch route), so focus it and press Enter,
 * which works on both layouts. Targets the DropdownMenuTrigger in src/components/transactions/transaction-list.tsx.
 */
async function deleteRow(page: Page, desc: string) {
  const trigger = page.getByRole("button", { name: `Actions for ${desc}`, exact: true });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("menuitem", { name: "Delete" }).click();
}

test("add, edit, delete with undo, then delete for real", async ({ page }) => {
  const name = uid("txn");
  await page.goto("/transactions");

  await addEntry(page, { description: name, amount: "12.34" });
  await expect(rowButton(page, name)).toBeVisible();

  // Edit
  await rowButton(page, name).click();
  const edit = page.getByRole("dialog", { name: "Edit entry" });
  await expect(edit).toBeVisible();
  await edit.getByLabel("Description").fill(`${name}-edited`);
  await edit.getByRole("button", { name: "Save changes" }).click();
  await expect(toast(page, "Saved")).toBeVisible();
  await expect(rowButton(page, `${name}-edited`)).toBeVisible();
  const edited = `${name}-edited`;

  // Delete, Undo restores
  await deleteRow(page, edited);
  await expect(rowButton(page, edited)).toBeHidden();
  const undo = toast(page, `Deleted ${edited}`);
  await expect(undo).toBeVisible();
  await undo.getByRole("button", { name: "Undo" }).click();
  await expect(rowButton(page, edited)).toBeVisible();

  // Delete for real, from inside the edit drawer (confirm dialog, no undo)
  await rowButton(page, edited).click();
  await page.getByRole("button", { name: "Delete entry" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete", exact: true }).click();
  await expect(toast(page, "Deleted")).toBeVisible();
  await page.reload();
  await expect(rowButton(page, edited)).toHaveCount(0);
});

test("search, kind, client and date filters change the list", async ({ page }) => {
  const tag = uid("flt");
  const client = `${tag}-client`;
  const expense = `${tag}-expense`;
  const income = `${tag}-income`;

  await page.goto("/clients");
  await page.getByRole("button", { name: "Add client" }).first().click();
  const cd = page.getByRole("dialog", { name: "New client" });
  await cd.getByLabel("Name").fill(client);
  await cd.getByRole("button", { name: "Add client" }).click();
  await expect(toast(page, "Client added")).toBeVisible();

  await page.goto("/transactions");
  await addEntry(page, { description: expense, amount: "10" });
  await addEntry(page, { description: income, amount: "50", kind: "Income", client });
  await page.goto(`/transactions?q=${tag}`); // start from a known list: only our two rows
  await expect(rowButton(page, expense)).toBeVisible();
  await expect(rowButton(page, income)).toBeVisible();

  // Search box (debounced, writes ?q=)
  await page.getByRole("searchbox", { name: "Search transactions" }).fill(`${tag}-inc`);
  await expect(rowButton(page, income)).toBeVisible();
  await expect(rowButton(page, expense)).toHaveCount(0);
  await page.getByRole("searchbox", { name: "Search transactions" }).fill(tag);
  await expect(rowButton(page, expense)).toBeVisible();

  // Filters drawer. Pills are Base UI ToggleGroups with aria-label = section name (transaction-filters.tsx).
  const filters = async (fn: (d: Locator) => Promise<void>) => {
    await page.getByRole("button", { name: /^Filters/ }).click(); // "Filters" or "Filters, 2 on"
    const d = page.getByRole("dialog", { name: "Filters" });
    await fn(d);
    await d.getByRole("button", { name: "Show results" }).click();
    await expect(d).toBeHidden();
  };

  await filters((d) => d.getByRole("group", { name: "Type" }).getByRole("button", { name: "Income", exact: true }).click());
  await expect(rowButton(page, income)).toBeVisible();
  await expect(rowButton(page, expense)).toHaveCount(0);
  await page.getByRole("button", { name: "Remove filter Income" }).click();
  await expect(rowButton(page, expense)).toBeVisible();

  await filters((d) => d.getByRole("group", { name: "Client" }).getByRole("button", { name: client, exact: true }).click());
  await expect(rowButton(page, income)).toBeVisible();
  await expect(rowButton(page, expense)).toHaveCount(0);
  await page.getByRole("button", { name: `Remove filter ${client}` }).click();
  await expect(rowButton(page, expense)).toBeVisible(); // URL updated before the drawer re-reads it

  // Date: from tomorrow matches nothing, up to today matches both.
  await filters((d) => d.getByLabel("From").fill(isoIn(2)));
  await expect(page.getByText("Nothing matches these filters")).toBeVisible();
  await page.getByRole("button", { name: /^Remove filter From/ }).click();
  await expect(page.getByText("Nothing matches these filters")).toBeHidden();
  await filters((d) => d.getByLabel("To").fill(isoIn(2)));
  await expect(rowButton(page, expense)).toBeVisible();
  await expect(rowButton(page, income)).toBeVisible();
});
