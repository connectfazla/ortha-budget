// Run: node --experimental-strip-types src/lib/forecast.check.ts
import assert from "node:assert/strict";
import { forecast } from "./forecast.ts";
import type { Recurring } from "./types.ts";

const base = { vendor: null, currency: "USD", fx_rate: 1, category: "x", contractor_id: null, client_id: null, trial_ends: null, url: null, notes: null, created_at: "" } as const;
const r = (id: string, next_due: string, billing_interval: Recurring["billing_interval"], amount: number, extra: Partial<Recurring> = {}): Recurring =>
  ({ ...base, id, name: id, direction: "out", amount, amount_usd: amount, billing_interval, next_due, status: "active", ...extra }) as Recurring;

const today = "2026-11-13";
// Monthly due in 3 days → 1 charge in 30 days, 3 in 90.
assert.equal(forecast([r("a", "2026-11-16", "monthly", 10)], today, 30).outUsd, 10);
assert.equal(forecast([r("a", "2026-11-16", "monthly", 10)], today, 90).outUsd, 30);
// Overdue by 3 months → counted once today, then future dates only.
const od = forecast([r("b", "2026-08-01", "monthly", 5)], today, 30);
assert.equal(od.items[0].date, today);
assert.equal(od.items.length, 2); // today + Dec 1
// Paused ignored; income counted as in.
assert.equal(forecast([r("c", "2026-11-20", "weekly", 1, { status: "paused" })], today, 30).outUsd, 0);
assert.equal(forecast([r("d", "2026-11-20", "yearly", 100, { direction: "in" })], today, 90).inUsd, 100);
console.log("forecast ok");
