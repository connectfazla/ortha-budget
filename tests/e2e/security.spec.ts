import { randomBytes, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("/api/export does not return CSV", async ({ request }) => {
    const res = await request.get("/api/export", { maxRedirects: 0 });
    expect(res.headers()["content-type"] ?? "").not.toContain("text/csv");
    expect(await res.text()).not.toContain("date,direction,kind");
    expect(res.status()).not.toBe(200);
  });

  test("an unknown calendar token gets an empty calendar", async ({ request }) => {
    const token = randomBytes(32).toString("base64url"); // 43 chars
    expect(token).toHaveLength(43);
    const res = await request.get(`/api/calendar/${token}.ics`);
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body).not.toContain("BEGIN:VEVENT");
  });
});

test("an unknown client id is not-found, not a crash", async ({ page }) => {
  await page.goto(`/clients/${randomUUID()}`);
  // Status can be 200 because (app)/loading.tsx streams before notFound() runs, so assert on the page. Default Next 404 copy.
  await expect(page.getByText("This page could not be found.")).toBeVisible();
  await expect(page.getByText("Something went wrong")).toHaveCount(0); // (app)/error.tsx
});
