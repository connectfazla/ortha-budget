import { currentUserId } from "@/lib/supabase/server";
import { getAnnual, parseYear } from "@/components/annual/annual-data";
import { todayISO } from "@/lib/money";

function cell(v: unknown) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // neutralise spreadsheet formula injection
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(_req: Request, ctx: { params: Promise<{ year: string }> }) {
  if (!(await currentUserId())) return new Response("Unauthorized", { status: 401 });
  const year = parseYear((await ctx.params).year, Number(todayISO().slice(0, 4)));
  if (year === null) return new Response("Invalid year", { status: 400 });

  const a = await getAnnual(year);
  const rows: [string, string, number][] = [
    ["Summary", "Income", a.income],
    ["Summary", "Costs", a.costs],
    ["Summary", "Net", a.net],
    ["Summary", `Tax set-aside at ${a.taxRate}%`, a.taxSetAside],
    ...a.categories.map((c): [string, string, number] => ["Costs by category", c.category, c.total]),
    ...a.clients.flatMap((c): [string, string, number][] => [
      ["Income by client", c.client.name, c.inUsd],
      ["Costs by client", c.client.name, c.outUsd],
    ]),
    ...a.contractors.map((c): [string, string, number] => ["Contractor payouts", c.name, c.total]),
    ...a.lifetime.map((t): [string, string, number] => ["Lifetime deals", `${t.date} ${t.description}`, t.amount_base]),
  ];
  const csv = ["section,label,amount,currency", ...rows.map(([s, l, n]) => [cell(s), cell(l), n.toFixed(2), a.currency].join(","))].join("\r\n");
  return new Response(csv + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ortha-budget-annual-${year}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
