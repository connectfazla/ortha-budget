import { expect, test } from "@playwright/test";
import { createPlan, isoIn, toast, uid } from "./helpers";
import path from "node:path";

test("tax % and cash on hand drive set-aside and runway on the dashboard", async ({ page }) => {
  await createPlan(page, { name: uid("burn"), amount: "50", nextDue: isoIn(10) }); // runway needs a recurring cost
  await page.goto("/profile/money");
  await page.getByLabel(/Tax set-aside/).fill("20"); // label also wraps its hint text, so match by prefix
  await page.getByLabel(/Cash on hand/).fill("12000");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(toast(page, "Saved")).toBeVisible();

  await page.goto("/");
  // Dashboard cards are shadcn Cards titled by an h2 (src/app/(app)/page.tsx).
  const card = (title: string) => page.locator("[data-slot=card]").filter({ has: page.getByRole("heading", { name: title }) });
  await expect(card("Set aside for tax")).toContainText("20%");
  const cash = card("Cash on hand");
  await expect(cash).toContainText("months of runway");
});

test("calendar feed: on, contains the plan, reset kills the old link", async ({ page, request }) => {
  const plan = uid("cal");
  await createPlan(page, { name: plan, amount: "15", nextDue: isoIn(7) });
  await page.goto("/profile/calendar");

  const feedInput = page.getByLabel("Calendar feed link");
  if (!(await feedInput.isVisible())) {
    await page.getByRole("button", { name: "Turn on calendar reminders" }).click();
    await expect(toast(page, "Calendar link ready")).toBeVisible();
  }
  const oldUrl = await feedInput.inputValue();
  const feed = await request.get(oldUrl); // public route, no login needed
  expect(feed.status()).toBe(200);
  expect(feed.headers()["content-type"]).toContain("text/calendar");
  const body = await feed.text();
  expect(body).toContain("BEGIN:VCALENDAR");
  expect(body).toContain(plan);

  await page.getByRole("button", { name: "Reset link" }).click(); // opens the inline confirm
  await page.getByRole("button", { name: "Reset link" }).click(); // the destructive confirm button
  await expect(toast(page, "New link created")).toBeVisible();
  await expect(feedInput).not.toHaveValue(oldUrl);

  const stale = await (await request.get(oldUrl)).text();
  expect(stale).toContain("BEGIN:VCALENDAR");
  expect(stale).not.toContain("BEGIN:VEVENT");
  expect(stale).not.toContain(plan);

  await page.getByRole("button", { name: "Turn off" }).click();
  await expect(toast(page, "Calendar reminders off")).toBeVisible();
});

test("import a small CSV and see the rows", async ({ page }) => {
  await page.goto("/import");
  await page.getByLabel("CSV file").setInputFiles(path.join(__dirname, "fixtures", "import.csv")); // sr-only file input
  await expect(page.getByText("first 3 of 3 valid rows")).toBeVisible();
  await expect(page.getByText("e2e-import Coffee beans")).toBeVisible(); // preview
  await page.getByRole("button", { name: "Import 3 transactions" }).click();
  await expect(page.getByRole("heading", { name: "Imported 3 transactions" })).toBeVisible();

  await page.goto("/transactions?q=e2e-import");
  for (const d of ["Coffee beans", "Client payment", "Domain renewal"]) {
    await expect(page.getByRole("button", { name: `Edit e2e-import ${d}` }).first()).toBeVisible();
  }
});
