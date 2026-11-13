import Link from "next/link";
import { ClientAvatar } from "@/components/clients/client-row";
import { CashflowChart, DonutChart } from "@/components/reports/charts";
import { ReportsNav } from "@/components/reports/section-nav";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { getClientProfit, getMonthlySeries, getSettings, getTransactions, requireUser } from "@/lib/data";
import { formatMoney, monthRange, round2 } from "@/lib/money";
import { cn } from "@/lib/utils";

const RANGES = { "3m": 3, "6m": 6, "12m": 12 } as const;
const RAMP = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const mon = (k: string) => new Date(`${k}-01T00:00:00`).toLocaleDateString("en-US", { month: "short" });

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireUser();
  const { range: r } = await searchParams;
  const range = r && Object.hasOwn(RANGES, r) ? (r as keyof typeof RANGES) : "6m";
  const [series, settings] = await Promise.all([getMonthlySeries(RANGES[range]), getSettings()]);
  const base = settings.base_currency;
  const clientRows = await getClientProfit(monthRange(series[0].month).from, monthRange(series[series.length - 1].month).to);
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
  for (const t of out) cats.set(t.category, (cats.get(t.category) ?? 0) + t.amount_base);
  const ranked = [...cats].sort((a, b) => b[1] - a[1]);
  const rows = ranked.slice(0, 5).map(([name, value], i) => ({ name, value, fill: RAMP[i] }));
  const other = ranked.slice(5).reduce((s, [, v]) => s + v, 0);
  if (other > 0) rows.push({ name: "Other", value: other, fill: "var(--border)" });
  const catTotal = rows.reduce((s, x) => s + x.value, 0);

  const fm = (n: number, compact?: boolean) => formatMoney(n, base, { compact });
  const totals = [
    ["Total in", fm(totalIn), "text-money-in"],
    ["Total out", fm(totalOut), ""],
    ["Net", fm(net), net < 0 ? "text-money-out" : ""],
    ["Average per month", fm(round2(net / series.length)), net < 0 ? "text-money-out" : ""],
  ];
  const title = (t: string) => (
    <CardHeader>
      <CardTitle>
        <h2 className="label">{t}</h2>
      </CardTitle>
    </CardHeader>
  );

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
                  "press focus-visible:ring-ring/60 flex h-9 min-w-11 items-center justify-center rounded-sm text-xs outline-none focus-visible:ring-2",
                  k === range ? "bg-card text-foreground border" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {k}
              </Link>
            ))}
          </nav>
        }
      />
      <Button variant="link" className="text-muted-foreground hover:text-foreground mb-4 h-auto px-0" nativeButton={false} render={<Link href="/reports/annual" />}>
        Year-end tax summary
      </Button>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          {title("Cash flow, in and out")}
          <CardContent>
            <CashflowChart data={series.map((s) => ({ ...s, label: mon(s.month) }))} currency={base} />
            <Separator className="mt-4" />
            <dl className="grid grid-cols-2 gap-y-3 divide-x pt-3">
              {totals.map(([k, v, c]) => (
                <div key={k} className="px-3">
                  <dt className="label">{k}</dt>
                  <dd className={cn("mt-1 text-lg font-semibold tracking-tight tabular-nums", c)}>{v}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          {title(`Where it goes, last ${range}`)}
          <CardContent>
            {rows.length === 0 ? (
              <Empty className="p-6">
                <EmptyDescription>No spending in this range.</EmptyDescription>
              </Empty>
            ) : (
              <>
                <DonutChart slices={rows} />
                <ItemGroup className="mt-3 gap-0 divide-y">
                  {rows.map((x) => (
                    <Item key={x.name} role="listitem" size="xs" className="rounded-none px-0 py-2">
                      <ItemMedia>
                        <span className="size-2 rounded-[2px] border" style={{ background: x.fill }} aria-hidden />
                      </ItemMedia>
                      <ItemContent className="min-w-0">
                        <ItemTitle className="w-full truncate font-normal">{x.name}</ItemTitle>
                      </ItemContent>
                      <ItemActions className="gap-0 text-sm tabular-nums">
                        <span className="text-muted-foreground w-12 text-right text-xs">{Math.round((x.value / catTotal) * 100)}%</span>
                        <span className="w-24 text-right">{fm(x.value)}</span>
                      </ItemActions>
                    </Item>
                  ))}
                </ItemGroup>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        {title("By client")}
        <CardContent>
          {clientRows.length === 0 ? (
            <Empty className="p-6">
              <EmptyDescription>
                Tag transactions with a client to see margin per client. <Link href="/clients" className="focus-visible:ring-ring/60 rounded-sm outline-none focus-visible:ring-2">Go to clients</Link>
              </EmptyDescription>
            </Empty>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="label border-b text-right">
                  <th className="py-2 text-left font-medium">Client</th>
                  <th className="py-2 font-medium">In</th>
                  <th className="py-2 font-medium">Out</th>
                  <th className="py-2 font-medium">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {clientRows.map((c) => (
                  <tr key={c.client.id} className="text-right tabular-nums">
                    <td className="max-w-0 py-2.5 text-left">
                      <Link href={`/clients/${c.client.id}`} className="focus-visible:ring-ring/60 flex items-center gap-2 rounded-sm outline-none hover:underline focus-visible:ring-2">
                        <ClientAvatar client={c.client} />
                        <span className="truncate">{c.client.name}</span>
                      </Link>
                    </td>
                    <td className="py-2.5">{fm(c.inUsd, true)}</td>
                    <td className="py-2.5">{fm(c.outUsd, true)}</td>
                    <td className={cn("py-2.5 font-medium", c.marginUsd < 0 ? "text-money-out" : "text-money-in")}>
                      {c.marginUsd < 0 ? "−" : ""}
                      {fm(Math.abs(c.marginUsd), true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4 py-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="label border-b text-right">
              <th className="p-3 text-left font-medium">Month</th>
              <th className="p-3 font-medium">In</th>
              <th className="p-3 font-medium">Out</th>
              <th className="p-3 font-medium">Net</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {[...series].reverse().map((m) => {
              const n = round2(m.inUsd - m.outUsd);
              return (
                <tr key={m.month} className="text-right tabular-nums">
                  <td className="p-3 text-left">{mon(m.month)} {m.month.slice(2, 4)}</td>
                  <td className="p-3">{fm(m.inUsd, true)}</td>
                  <td className="p-3">{fm(m.outUsd, true)}</td>
                  <td className={cn("p-3", n < 0 && "text-money-out")}>{n < 0 ? "−" : ""}{fm(Math.abs(n), true)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}
