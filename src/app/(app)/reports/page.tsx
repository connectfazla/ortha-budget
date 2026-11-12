import Link from "next/link";
import { CashflowChart, DonutChart } from "@/components/reports/charts";
import { ReportsNav } from "@/components/reports/section-nav";
import { PageHeader } from "@/components/shell/page-header";
import { getMonthlySeries, getTransactions, requireUser } from "@/lib/data";
import { formatMoney, monthRange, round2 } from "@/lib/money";
import { cn } from "@/lib/utils";

const RANGES = { "3m": 3, "6m": 6, "12m": 12 } as const;
const LABEL = "text-muted-foreground text-[11px] font-medium tracking-[0.08em] uppercase";
const RAMP = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const mon = (k: string) => new Date(`${k}-01T00:00:00`).toLocaleDateString("en-US", { month: "short" }).toUpperCase();

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireUser();
  const { range: r } = await searchParams;
  const range = r && Object.hasOwn(RANGES, r) ? (r as keyof typeof RANGES) : "6m";
  const series = await getMonthlySeries(RANGES[range]);
  const out = await getTransactions({
    direction: "out",
    from: monthRange(series[0].month).from,
    to: monthRange(series[series.length - 1].month).to,
    limit: 100_000,
  });

  const totalIn = round2(series.reduce((s, m) => s + m.inUsd, 0));
  const totalOut = round2(series.reduce((s, m) => s + m.outUsd, 0));
  const net = round2(totalIn - totalOut);

  const cats = new Map<string, number>();
  for (const t of out) cats.set(t.category, (cats.get(t.category) ?? 0) + t.amount_usd);
  const ranked = [...cats].sort((a, b) => b[1] - a[1]);
  const rows = ranked.slice(0, 5).map(([name, value], i) => ({ name, value, fill: RAMP[i] }));
  const other = ranked.slice(5).reduce((s, [, v]) => s + v, 0);
  if (other > 0) rows.push({ name: "OTHER", value: other, fill: "var(--border)" });
  const catTotal = rows.reduce((s, x) => s + x.value, 0);

  const totals = [
    ["TOTAL IN", formatMoney(totalIn), "text-money-in"],
    ["TOTAL OUT", formatMoney(totalOut), ""],
    ["NET", formatMoney(net), net < 0 ? "text-money-out" : ""],
    ["AVG / MONTH", formatMoney(round2(net / series.length)), net < 0 ? "text-money-out" : ""],
  ];

  return (
    <>
      <ReportsNav />
      <PageHeader
        title="Reports"
        actions={
          <nav aria-label="Range" className="bg-muted flex gap-1 rounded-md border p-1">
            {Object.keys(RANGES).map((k) => (
              <Link
                key={k}
                href={`/reports?range=${k}`}
                aria-current={k === range ? "page" : undefined}
                className={cn(
                  "flex h-8 min-w-11 items-center justify-center rounded-sm text-[11px] tracking-[0.08em] uppercase",
                  k === range ? "bg-card text-foreground border" : "text-muted-foreground",
                )}
              >
                {k}
              </Link>
            ))}
          </nav>
        }
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="bg-card rounded-lg border p-4">
          <h2 className={`${LABEL} pb-3`}>CASH FLOW / IN VS OUT</h2>
          <CashflowChart data={series.map((s) => ({ ...s, label: mon(s.month) }))} />
          <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border">
            {totals.map(([k, v, c]) => (
              <div key={k} className="bg-card p-3">
                <dt className={LABEL}>{k}</dt>
                <dd className={cn("mt-1 text-lg font-semibold tracking-tight tabular-nums", c)}>{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="bg-card rounded-lg border p-4">
          <h2 className={`${LABEL} pb-3`}>WHERE IT GOES / {range.toUpperCase()}</h2>
          {rows.length === 0 ? (
            <p className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">No spending in this range.</p>
          ) : (
            <>
              <DonutChart slices={rows} />
              <ul className="mt-3 divide-y">
                {rows.map((x) => (
                  <li key={x.name} className="flex items-center gap-2 py-2 text-sm">
                    <span className="size-2 shrink-0 rounded-[2px] border" style={{ background: x.fill }} aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{x.name}</span>
                    <span className="text-muted-foreground w-12 text-right text-xs tabular-nums">{Math.round((x.value / catTotal) * 100)}%</span>
                    <span className="w-24 text-right tabular-nums">{formatMoney(x.value)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <section className="bg-card mt-4 rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className={`${LABEL} border-b text-right text-[10px]`}>
              <th className="p-3 text-left font-medium">MONTH</th>
              <th className="p-3 font-medium">IN</th>
              <th className="p-3 font-medium">OUT</th>
              <th className="p-3 font-medium">NET</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {[...series].reverse().map((m) => {
              const n = round2(m.inUsd - m.outUsd);
              return (
                <tr key={m.month} className="text-right tabular-nums">
                  <td className="p-3 text-left">{mon(m.month)} {m.month.slice(2, 4)}</td>
                  <td className="p-3">{formatMoney(m.inUsd, "USD", { compact: true })}</td>
                  <td className="p-3">{formatMoney(m.outUsd, "USD", { compact: true })}</td>
                  <td className={cn("p-3", n < 0 && "text-money-out")}>{n < 0 ? "−" : ""}{formatMoney(Math.abs(n), "USD", { compact: true })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
