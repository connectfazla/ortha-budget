import "server-only";
import { getClientProfit, getContractors, getSettings, getTransactions } from "@/lib/data";
import { round2 } from "@/lib/money";

/** Parses a year param; null when it is not a 4-digit year between 2000 and next year. */
export function parseYear(raw: string | undefined, currentYear: number): number | null {
  if (!raw || !/^\d{4}$/.test(raw)) return null;
  const y = Number(raw);
  return y >= 2000 && y <= currentYear + 1 ? y : null;
}

export async function getAnnual(year: number) {
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const [txns, clients, contractors, settings] = await Promise.all([
    getTransactions({ from, to, limit: 100_000 }),
    getClientProfit(from, to),
    getContractors(),
    getSettings(),
  ]);

  let income = 0;
  let costs = 0;
  const cats = new Map<string, number>();
  const payouts = new Map<string, { total: number; count: number }>();
  for (const t of txns) {
    if (t.direction === "in") {
      income += t.amount_base;
      continue;
    }
    costs += t.amount_base;
    cats.set(t.category, (cats.get(t.category) ?? 0) + t.amount_base);
    if (t.kind === "contractor" && t.contractor_id) {
      const p = payouts.get(t.contractor_id) ?? { total: 0, count: 0 };
      p.total += t.amount_base;
      p.count += 1;
      payouts.set(t.contractor_id, p);
    }
  }
  const names = new Map(contractors.map((c) => [c.id, c.name]));
  income = round2(income);
  costs = round2(costs);

  return {
    year,
    currency: settings.base_currency,
    taxRate: settings.tax_rate,
    empty: txns.length === 0,
    income,
    costs,
    net: round2(income - costs),
    taxSetAside: round2((income * settings.tax_rate) / 100),
    categories: [...cats].map(([category, total]) => ({ category, total: round2(total) })).sort((a, b) => b.total - a.total),
    clients: clients.filter((c) => c.inUsd > 0 || c.outUsd > 0),
    contractors: [...payouts]
      .map(([id, p]) => ({ id, name: names.get(id) ?? "Removed contractor", total: round2(p.total), count: p.count }))
      .sort((a, b) => b.total - a.total),
    lifetime: txns.filter((t) => t.kind === "lifetime" && t.direction === "out").sort((a, b) => a.date.localeCompare(b.date)),
  };
}
