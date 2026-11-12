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
import { cn } from "@/lib/utils";

const CARD = "bg-card shadow-card rounded-xl border p-4";
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
    return <FirstRun contractors={contractors} categories={categories} clients={clients.filter((c) => !c.archived)} today={today} />;
  }

  const prevHasData = prev.inUsd > 0 || prev.outUsd > 0;
  const delta = prevHasData && prev.netUsd !== 0 ? ((summary.netUsd - prev.netUsd) / Math.abs(prev.netUsd)) * 100 : null;
  const net = summary.netUsd;

  const fc = forecast(recurring, today, 90);
  const cutoffs = { 30: addDays(today, 30), 60: addDays(today, 60), 90: addDays(today, 90) };

  const taxSetAside = Math.max(summary.inUsd, 0) * (settings.tax_rate / 100);
  const burn = summary.recurringOutMonthlyUsd;
  const cash = settings.cash_on_hand_usd;
  const runway = cash !== null && burn > 0 ? cash / burn : null;
  const cashAge = settings.cash_updated_at ? dayNum(today) - dayNum(settings.cash_updated_at.slice(0, 10)) : 0;

  const spent = new Map(summary.byCategory.map((c) => [c.category, c.outUsd]));
  const alerts = budgets
    .map((b) => ({ ...b, ratio: (spent.get(b.category) ?? 0) / b.monthly_limit_usd }))
    .filter((b) => b.ratio >= 0.85)
    .sort((a, b) => b.ratio - a.ratio);

  const trials = recurring
    .filter((r) => r.status === "active" && r.trial_ends && r.trial_ends >= today && dayNum(r.trial_ends) - dayNum(today) <= 14)
    .sort((a, b) => a.trial_ends!.localeCompare(b.trial_ends!));

  const chartData = series.map((s) => ({ ...s, label: monthLabel(s.month, "short") }));
  const chartEmpty = series.every((s) => s.inUsd === 0 && s.outUsd === 0);

  const ltdPaid = ltds.reduce((a, t) => a + t.amount_usd, 0);
  const ltdReplaces = ltds.reduce((a, t) => a + (t.replaces_monthly_usd ?? 0), 0);
  const paybacks = ltds.map((t) => ltdPaybackMonths(t.amount_usd, t.replaces_monthly_usd)).filter((x): x is number => x !== null);
  const avgPayback = paybacks.length ? Math.round(paybacks.reduce((a, b) => a + b, 0) / paybacks.length) : null;

  return (
    <>
      <PageHeader title="Home" actions={<MonthSwitcher month={month} />} />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {alerts.length > 0 ? (
          <Link href="/budgets" className={cn(CARD, "press border-warn/40 flex items-start gap-3 py-3 lg:col-span-2")}>
            <AlertTriangle className="text-warn mt-0.5 size-4 shrink-0" aria-hidden />
            <div className="min-w-0 text-sm">
              <p className="font-medium">{alerts.length === 1 ? "1 budget needs attention" : `${alerts.length} budgets need attention`}</p>
              <p className="text-muted-foreground">
                {alerts.map((a) => `${a.category} ${a.ratio > 1 ? "over by " + formatMoney((a.ratio - 1) * a.monthly_limit_usd, "USD", { compact: true }) : Math.round(a.ratio * 100) + "% used"}`).join(", ")}
              </p>
            </div>
          </Link>
        ) : null}

        <section className={cn(CARD, "lg:col-span-2")} aria-label="Net this month">
          <h2 className="label">Net in {monthLabel(month)}</h2>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Money animate value={net} className={cn("text-4xl font-semibold tracking-tight", net < 0 && "text-money-out")} />
            {delta !== null ? (
              <span className={cn("text-xs font-medium", delta >= 0 ? "text-money-in" : "text-money-out")}>
                {delta >= 0 ? "Up" : "Down"} {Math.abs(delta).toFixed(0)}% <span className="text-muted-foreground">from {monthLabel(prevKey, "short")}</span>
              </span>
            ) : null}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t pt-4">
            <div>
              <dt className="label">Money in</dt>
              <dd className="mt-1 text-lg font-medium"><Money animate value={summary.inUsd} direction="in" hideCents /></dd>
            </div>
            <div>
              <dt className="label">Money out</dt>
              <dd className="mt-1 text-lg font-medium"><Money animate value={summary.outUsd} direction="out" hideCents /></dd>
            </div>
          </dl>
        </section>

        <ForecastCard items={fc.items} today={today} cutoffs={cutoffs} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <section className={CARD} aria-label="Tax set-aside">
            <h2 className="label">Set aside for tax</h2>
            {settings.tax_rate > 0 ? (
              <>
                <p className="mt-1 text-2xl font-semibold tracking-tight"><Money animate value={taxSetAside} hideCents /></p>
                <p className="text-muted-foreground mt-1 text-sm">{settings.tax_rate}% of {formatMoney(summary.inUsd)} income</p>
              </>
            ) : (
              <p className="text-muted-foreground mt-2 text-sm">
                Not set. <Link href="/settings" className="text-brand font-medium underline-offset-4 hover:underline">Set a tax %</Link>
              </p>
            )}
          </section>
          <section className={CARD} aria-label="Cash and runway">
            <h2 className="label">Cash on hand</h2>
            {cash === null ? (
              <p className="mt-2 text-sm">
                <Link href="/settings" className="text-brand font-medium underline-offset-4 hover:underline">Add your cash balance</Link>
                <span className="text-muted-foreground"> to see your runway.</span>
              </p>
            ) : (
              <>
                <p className="mt-1 text-2xl font-semibold tracking-tight"><Money animate value={cash} hideCents /></p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {runway === null ? "No recurring costs yet." : `${runway.toFixed(1)} months of runway at ${formatMoney(burn, "USD", { compact: true })} a month`}
                </p>
                {cashAge > 30 ? <p className="text-warn mt-1 text-xs">Balance updated {cashAge} days ago.</p> : null}
              </>
            )}
          </section>
        </div>

        {trials.length > 0 ? (
          <section className={cn(CARD, "lg:col-span-2")} aria-label="Trials ending soon">
            <h2 className="label mb-2">Trials ending soon</h2>
            <ul className="divide-y">
              {trials.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="truncate">{r.name}</span>
                  <span className="text-muted-foreground shrink-0 text-xs">Ends {fmtDate(r.trial_ends!)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className={cn(CARD, "lg:col-span-2")} aria-label="Six month cash flow">
          <h2 className="label mb-3">Money in and out, last 6 months</h2>
          {chartEmpty ? <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">Nothing logged in the last 6 months.</p> : <CashChart data={chartData} />}
        </section>

        {ltds.length > 0 ? (
          <Link href="/lifetime" className={cn(CARD, "press lg:col-span-2")} aria-label="Lifetime deals">
            <h2 className="label">Lifetime deals</h2>
            <dl className="mt-2 grid grid-cols-3 gap-3">
              <div><dt className="text-muted-foreground text-xs">Paid</dt><dd className="mt-1"><Money value={ltdPaid} hideCents className="text-base font-medium" /></dd></div>
              <div><dt className="text-muted-foreground text-xs">Replaces per month</dt><dd className="mt-1"><Money value={ltdReplaces} hideCents className="text-base font-medium" /></dd></div>
              <div><dt className="text-muted-foreground text-xs">Average payback</dt><dd className="mt-1 text-base font-medium tabular-nums">{avgPayback === null ? "None yet" : `${avgPayback} months`}</dd></div>
            </dl>
          </Link>
        ) : null}
      </div>
    </>
  );
}
