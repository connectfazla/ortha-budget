import { expect, test, type Page } from "@playwright/test";

// Device side of Web Push (src/app/(app)/settings/notifications.tsx, public/sw.js). Real delivery is not tested.

// Headless Chromium always reports notifications as "denied", even when granted. Pretend nobody has been asked yet
// so the "can enable" state renders; nothing is requested or subscribed.
test.beforeEach(({ page }) => page.addInitScript(() => Object.defineProperty(Notification, "permission", { get: () => "default" })));

/** Server actions POST back to the page; wait for the save to finish before the next step. */
const saved = (page: Page) => page.waitForResponse((r) => r.request().method() === "POST" && new URL(r.url()).pathname === "/settings");

test("notifications section renders and preferences persist after a reload", async ({ page }) => {
  await page.goto("/settings");
  const card = page.locator("[data-slot=card]").filter({ has: page.getByRole("heading", { name: "Notifications" }) });
  await expect(card).toBeVisible();
  // Desktop Chromium supports Web Push, so the device part offers the button. Nothing subscribes here.
  await expect(card.getByRole("button", { name: "Turn on notifications" })).toBeVisible();

  const trials = card.getByRole("switch", { name: "Trials and cancel-by" });
  const wasOn = (await trials.getAttribute("aria-checked")) === "true";
  const digest = card.getByLabel("Morning summary");
  const oldHour = await digest.inputValue();
  const newHour = oldHour === "7" ? "8" : "7";
  const timezone = card.getByLabel("Timezone");
  const oldZone = await timezone.inputValue();
  const newZone = oldZone === "Asia/Tokyo" ? "Europe/Berlin" : "Asia/Tokyo";

  await Promise.all([saved(page), trials.click()]);
  await Promise.all([saved(page), digest.selectOption(newHour)]);
  await Promise.all([saved(page), timezone.selectOption(newZone)]);

  await page.reload();
  await expect(trials).toHaveAttribute("aria-checked", String(!wasOn));
  await expect(digest).toHaveValue(newHour);
  await expect(timezone).toHaveValue(newZone);
  await expect(card.getByText("9:00", { exact: true }).first()).toBeAttached(); // hours read as 9:00, not 9 AM

  // Put the shared account back.
  await Promise.all([saved(page), trials.click()]);
  await Promise.all([saved(page), digest.selectOption(oldHour)]);
  await Promise.all([saved(page), timezone.selectOption(oldZone)]);
});

test("the service worker is served as JavaScript and never cached", async ({ request }) => {
  const res = await request.get("/sw.js");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("javascript");
  expect(res.headers()["cache-control"]).toContain("no-cache");
  expect(await res.text()).toContain("showNotification");
});

test("the push cron route hides itself without the right bearer", async ({ playwright, baseURL }) => {
  const anon = await playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  expect((await anon.post("/api/cron/push")).status()).toBe(404);
  expect((await anon.post("/api/cron/push", { headers: { Authorization: `Bearer ${"x".repeat(64)}` } })).status()).toBe(404);
  await anon.dispose();
});

test("?add=1 opens the Add entry drawer and drops the param", async ({ page }) => {
  await page.goto("/transactions?add=1");
  await expect(page.getByRole("dialog", { name: "Add entry" })).toBeVisible();
  await expect(page).toHaveURL(/\/transactions$/);
});
