import { round2 } from "./money.ts";
import type { Recurring } from "./types.ts";

/**
 * Expected money in/out over the next `days`, expanding each active recurring item through its billing interval.
 * Pure function so the dashboard can show 30/60/90 without three queries.
 */
export function forecast(recurring: Recurring[], today: string, days: number) {
  const end = new Date(`${today}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + days);
  const endISO = end.toISOString().slice(0, 10);
  const step: Record<Recurring["billing_interval"], (d: Date) => void> = {
    weekly: (d) => d.setUTCDate(d.getUTCDate() + 7),
    monthly: (d) => d.setUTCMonth(d.getUTCMonth() + 1),
    quarterly: (d) => d.setUTCMonth(d.getUTCMonth() + 3),
    yearly: (d) => d.setUTCFullYear(d.getUTCFullYear() + 1),
  };
  let inUsd = 0;
  let outUsd = 0;
  const items: { id: string; name: string; date: string; direction: Recurring["direction"]; amountUsd: number }[] = [];
  for (const r of recurring) {
    if (r.status !== "active") continue;
    const d = new Date(`${r.next_due}T00:00:00Z`);
    let overdueCounted = false;
    for (let n = 0; n < 400; n++) {
      const iso = d.toISOString().slice(0, 10);
      if (iso > endISO) break;
      step[r.billing_interval](d);
      // Overdue: count the unpaid charge once, as due today; skip older missed periods.
      if (iso < today && overdueCounted) continue;
      overdueCounted ||= iso < today;
      items.push({ id: r.id, name: r.name, date: iso < today ? today : iso, direction: r.direction, amountUsd: r.amount_usd });
      if (r.direction === "in") inUsd += r.amount_usd;
      else outUsd += r.amount_usd;
    }
  }
  items.sort((a, b) => a.date.localeCompare(b.date));
  return { inUsd: round2(inUsd), outUsd: round2(outUsd), netUsd: round2(inUsd - outUsd), items };
}
