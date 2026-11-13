import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { CashChart } from "@/components/dashboard/cash-chart";
import { ForecastCard } from "@/components/dashboard/forecast-card";
import { MonthSwitcher, monthLabel, shiftMonth } from "@/components/dashboard/month-switcher";
import { Money } from "@/components/money";
import { FirstRun } from "@/components/onboarding/first-run";
import { PageHeader } from "@/components/shell/page-header";
import {
  getBudgets, getCategories, getClients, getContractors, getLifetimeDeals, getMonthSummary, getMonthlySeries, getRecurring, getSettings,
  getTransactions, requireUser,
} from "@/lib/data";
import { forecast } from "@/lib/forecast";
import { formatMoney, isMonthKey, ltdPaybackMonths, monthKey, todayISO } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemGroup, ItemTitle } from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const dayNum = (s: string) => Math.round(Date.parse(s + "T00:00:00Z") / 86400000);
const addDays = (iso: string, n: number) => new Date((dayNum(iso) + n) * 86400000).toISOString().slice(0, 10);
const fmtDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export default async function HomePage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  const now = monthKey();
  const month = isMonthKey(sp.month) ? sp.month : now;
  const prevKey = shiftMonth(month, -1);
  const today = todayISO();

  const [summary, prev, recurring, budgets, series, ltds, settings, anyTxn] = await Promise.all([
    getMonthSummary(month),
    getMonthSummary(prevKey),
    getRecurring(),
    getBudgets(),
    getMonthlySeries(6),
    getLifetimeDeals(),
    getSettings(),
    getTransactions({ limit: 1 }),
  ]);

  if (anyTxn.length === 0 && recurring.length === 0) {
    const [contractors, categories, clients] = await Promise.all([getContractors(), getCategories(), getClients()]);
    return <FirstRun contractors={contractors} categories={categories} clients={clients.filter((c) => !c.archived)} today={today} baseCurrency={settings.base_currency} />;
  }

  const base = settings.base_currency;
  const prevHasData = prev.inUsd > 0 || prev.outUsd > 0;
  const delta = prevHasData && prev.netUsd !== 0 ? ((summary.netUsd - prev.netUsd) / Math.abs(prev.netUsd)) * 100 : null;
  const net = summary.netUsd;

  const fc = forecast(recurring, today, 90);
  const cutoffs = { 30: addDays(today, 30), 60: addDays(today, 60), 90: addDays(today, 90) };

  const taxSetAside = Math.max(summary.inUsd, 0) * (settings.tax_rate / 100);
  const burn = summary.recurringOutMonthlyUsd;
  const cash = settings.cash_on_hand;
  const runway = cash !== null && burn > 0 ? cash / burn : null;
  const cashAge = settings.cash_updated_at ? dayNum(today) - dayNum(settings.cash_updated_at.slice(0, 10)) : 0;

  const spent = new Map(summary.byCategory.map((c) => [c.category, c.outUsd]));
  const alerts = budgets
    .map((b) => ({ ...b, ratio: (spent.get(b.category) ?? 0) / b.monthly_limit }))
    .filter((b) => b.ratio >= 0.85)
    .sort((a, b) => b.ratio - a.ratio);

  const trials = recurring
    .filter((r) => r.status === "active" && r.trial_ends && r.trial_ends >= today && dayNum(r.trial_ends) - dayNum(today) <= 14)
    .sort((a, b) => a.trial_ends!.localeCompare(b.trial_ends!));

  const chartData = series.map((s) => ({ ...s, label: monthLabel(s.month, "short") }));
  const chartEmpty = series.every((s) => s.inUsd === 0 && s.outUsd === 0);

  const ltdPaid = ltds.reduce((a, t) => a + t.amount_base, 0);
  const ltdReplaces = ltds.reduce((a, t) => a + (t.replaces_monthly ?? 0), 0);
  const paybacks = ltds.map((t) => ltdPaybackMonths(t.amount_base, t.replaces_monthly)).filter((x): x is number => x !== null);
  const avgPayback = paybacks.length ? Math.round(paybacks.reduce((a, b) => a + b, 0) / paybacks.length) : null;

  const card = (title: string) => (
    <CardHeader>
      <CardTitle>
        <h2 className="label">{title}</h2>
      </CardTitle>
    </CardHeader>
  );

  return (
    <>
      <PageHeader title="Home" actions={<MonthSwitcher month={month} />} />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {alerts.length > 0 ? (
          <Link href="/budgets" className="press focus-visible:ring-ring/60 rounded-lg outline-none focus-visible:ring-2 lg:col-span-2">
            <Card size="sm" className="border-warn/40 border">
              <CardContent className="flex items-start gap-3 text-sm">
                <AlertTriangle className="text-warn mt-0.5 size-4 shrink-0" aria-hidden />
                <div className="min-w-0">
                  <p className="font-medium">{alerts.length === 1 ? "1 budget needs attention" : `${alerts.length} budgets need attention`}</p>
                  <p className="text-muted-foreground">
                    {alerts.map((a) => `${a.category} ${a.ratio > 1 ? "over by " + formatMoney((a.ratio - 1) * a.monthly_limit, base, { compact: true }) : Math.round(a.ratio * 100) + "% used"}`).join(", ")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ) : null}

        <Card className="lg:col-span-2">
          {card(`Net in ${monthLabel(month)}`)}
          <CardContent>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <Money animate value={net} currency={base} className={cn("text-4xl font-semibold tracking-tight", net < 0 && "text-money-out")} />
              {delta !== null ? (
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Badge variant="secondary" className={delta >= 0 ? "text-money-in" : "text-money-out"}>
                    {delta >= 0 ? "Up" : "Down"} {Math.abs(delta).toFixed(0)}%
                  </Badge>
                  from {monthLabel(prevKey, "short")}
                </span>
              ) : null}
            </div>
            <Separator className="my-4" />
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="label">Money in</dt>
                <dd className="mt-1 text-lg font-medium"><Money animate value={summary.inUsd} currency={base} direction="in" hideCents /></dd>
              </div>
              <div>
                <dt className="label">Money out</dt>
                <dd className="mt-1 text-lg font-medium"><Money animate value={summary.outUsd} currency={base} direction="out" hideCents /></dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <ForecastCard items={fc.items} today={today} cutoffs={cutoffs} currency={base} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <Card>
            {card("Set aside for tax")}
            <CardContent>
              {settings.tax_rate > 0 ? (
                <>
                  <p className="text-2xl font-semibold tracking-tight"><Money animate value={taxSetAside} currency={base} hideCents /></p>
                  <p className="text-muted-foreground mt-1 text-sm">{settings.tax_rate}% of {formatMoney(summary.inUsd, base)} income</p>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Not set. <Link href="/settings" className="text-brand focus-visible:ring-ring/60 rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2">Set a tax %</Link>
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            {card("Cash on hand")}
            <CardContent>
              {cash === null ? (
                <p className="text-sm">
                  <Link href="/settings" className="text-brand focus-visible:ring-ring/60 rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2">Add your cash balance</Link>
                  <span className="text-muted-foreground"> to see your runway.</span>
                </p>
              ) : (
                <>
                  <p className="text-2xl font-semibold tracking-tight"><Money animate value={cash} currency={base} hideCents /></p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {runway === null ? "No recurring costs yet." : `${runway.toFixed(1)} months of runway at ${formatMoney(burn, base, { compact: true })} a month`}
                  </p>
                  {cashAge > 30 ? <p className="text-warn mt-1 text-xs">Balance updated {cashAge} days ago.</p> : null}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {trials.length > 0 ? (
          <Card className="lg:col-span-2">
            {card("Trials ending soon")}
            <CardContent>
              <ItemGroup className="gap-0 divide-y">
                {trials.map((r) => (
                  <Item key={r.id} role="listitem" size="sm" className="rounded-none px-0">
                    <ItemContent className="min-w-0">
                      <ItemTitle className="w-full truncate font-normal">{r.name}</ItemTitle>
                    </ItemContent>
                    <ItemActions>
                      <Badge variant="outline">Ends {fmtDate(r.trial_ends!)}</Badge>
                    </ItemActions>
                  </Item>
                ))}
              </ItemGroup>
            </CardContent>
          </Card>
        ) : null}

        <Card className="lg:col-span-2">
          {card("Money in and out, last 6 months")}
          <CardContent>
            {chartEmpty ? (
              <Empty className="p-4">
                <EmptyDescription>Nothing logged in the last 6 months.</EmptyDescription>
              </Empty>
            ) : (
              <CashChart data={chartData} />
            )}
          </CardContent>
        </Card>

        {ltds.length > 0 ? (
          <Link href="/lifetime" className="press focus-visible:ring-ring/60 rounded-lg outline-none focus-visible:ring-2 lg:col-span-2">
            <Card>
              {card("Lifetime deals")}
              <CardContent>
                <dl className="grid grid-cols-3 gap-3">
                  <div><dt className="text-muted-foreground text-xs">Paid</dt><dd className="mt-1"><Money value={ltdPaid} currency={base} hideCents className="text-base font-medium" /></dd></div>
                  <div><dt className="text-muted-foreground text-xs">Replaces per month</dt><dd className="mt-1"><Money value={ltdReplaces} currency={base} hideCents className="text-base font-medium" /></dd></div>
                  <div><dt className="text-muted-foreground text-xs">Average payback</dt><dd className="mt-1 text-base font-medium tabular-nums">{avgPayback === null ? "None yet" : `${avgPayback} months`}</dd></div>
                </dl>
              </CardContent>
            </Card>
          </Link>
        ) : null}
      </div>
    </>
  );
}
