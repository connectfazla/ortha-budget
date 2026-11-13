import { todayISO } from "@/lib/money";
import { getTransactions } from "@/lib/data";
import { currentUserId } from "@/lib/supabase/server";

const COLS = ["date", "direction", "kind", "description", "category", "vendor", "amount", "currency", "fx_rate", "amount_base", "notes"] as const;

function cell(v: unknown) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // neutralise spreadsheet formula injection
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  if (!(await currentUserId())) return new Response("Unauthorized", { status: 401 });
  const rows = await getTransactions({ limit: 100000 });
  const csv = [COLS.join(","), ...rows.map((t) => COLS.map((c) => cell(t[c])).join(","))].join("\r\n");
  return new Response(csv + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ortha-budget-${todayISO()}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
