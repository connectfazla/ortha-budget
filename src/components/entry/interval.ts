import type { BillingInterval } from "../../lib/types.ts";

const MONTHS: Record<Exclude<BillingInterval, "weekly">, number> = { monthly: 1, quarterly: 3, yearly: 12 };

/**
 * Shift a YYYY-MM-DD date by `n` billing intervals. Months clamp to the month's last day (Jan 31 + 1 month = Feb 28),
 * the same as Postgres `date + interval`, so it matches what mark_recurring_paid does to next_due.
 */
export function addInterval(iso: string, interval: BillingInterval, n = 1) {
  const [y, m, d] = iso.split("-").map(Number);
  const at =
    interval === "weekly"
      ? new Date(Date.UTC(y, m - 1, d + 7 * n))
      : (() => {
          const months = m - 1 + MONTHS[interval] * n;
          const last = new Date(Date.UTC(y, months + 1, 0)).getUTCDate();
          return new Date(Date.UTC(y, months, Math.min(d, last)));
        })();
  return at.toISOString().slice(0, 10);
}

/** "Dec 13" (adds the year when it isn't this year). */
export function shortDay(iso: string, thisYear = new Date().getFullYear()) {
  const y = Number(iso.slice(0, 4));
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: y === thisYear ? undefined : "numeric",
    timeZone: "UTC",
  });
}
