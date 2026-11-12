import "server-only";
import { getTransactions } from "@/lib/data";
import { round2, todayISO } from "@/lib/money";

export type ContractorStat = { paidYtdUsd: number; lastPaid: string | null };

/** Paid-YTD (USD) and last-paid date per contractor, from this year's contractor transactions. */
export async function getContractorStats(): Promise<Map<string, ContractorStat>> {
  const txns = await getTransactions({ kind: "contractor", from: `${todayISO().slice(0, 4)}-01-01`, limit: 100_000 });
  const out = new Map<string, ContractorStat>();
  for (const t of txns) {
    if (!t.contractor_id) continue;
    const s = out.get(t.contractor_id) ?? { paidYtdUsd: 0, lastPaid: null };
    s.paidYtdUsd = round2(s.paidYtdUsd + t.amount_usd);
    if (!s.lastPaid || t.date > s.lastPaid) s.lastPaid = t.date;
    out.set(t.contractor_id, s);
  }
  return out;
}
