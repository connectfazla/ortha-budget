import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CashChart } from "@/components/dashboard/cash-chart";
import { MonthSwitcher, monthLabel, shiftMonth } from "@/components/dashboard/month-switcher";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/shell/page-header";
import { getBudgets, getLifetimeDeals, getMonthSummary, getMonthlySeries, getRecurring, requireUser } from "@/lib/data";
import { INTERVALS, KINDS, formatMoney, isMonthKey, ltdPaybackMonths, monthKey, todayISO } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { TxnKind } from "@/lib/types";

const LABEL = "text-muted-foreground text-[11px] font-medium tracking-[0.08em] uppercase";
const CARD = "bg-card rounded-lg border p-4";
const EMPTY = "text-muted-foreground rounded-md border border-dashed p-4 text-center text-xs";
const TAG = "rounded-sm border px-1.5 py-0.5 text-[10px] font-medium tracking-[0.08em] uppercase";

function Head({ children, href, link }: { children: React.ReactNode; href?: string; link?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className={LABEL}>{children}</h2>
      {href ? (
        <Link href={href} className="text-brand inline-flex items-center gap-1 text-[11px] font-medium tracking-[0.08em] uppercase hover:underline">
          {link} <ArrowRight className="size-3" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

const dayNum = (s: string) => Math.round(Date.parse(s + "T00:00:00Z") / 86400000);

export default async function HomePage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  const now = monthKey();
  const month = isMonthKey(sp.month) ? sp.month : now;
  const prevKey = shiftMonth(month, -1);

  const [summary, prev, recurring, budgets, series, ltds] = await Promise.all([
    getMonthSummary(month),
    getMonthSummary(prevKey),
    getRecurring(),
    getBudgets(),
    getMonthlySeries(6),
    getLifetimeDeals(),
  ]);

  // Net delta vs previous month. No prior activity = no delta chip.
  const prevHasData = prev.inUsd > 0 || prev.outUsd > 0;
  const delta = prevHasData && prev.netUsd !== 0 ? ((summary.netUsd - prev.netUsd) / Math.abs(prev.netUsd)) * 100 : null;

  const total = summary.inUsd + summary.outUsd;
  const inPct = total > 0 ? (summary.inUsd / total) * 100 : 0;

  const todayN = dayNum(todayISO());
  const upcoming = recurring
    .filter((r) => r.status === "active" && dayNum(r.next_due) - todayN <= 30)
    .map((r) => ({ r, days: dayNum(r.next_due) - todayN }));

  const spent = new Map(summary.byCategory.map((c) => [c.category, c.outUsd]));
  const budgetRows = budgets
    .map((b) => ({ ...b, spent: spent.get(b.category) ?? 0 }))
    .sort((a, b) => b.spent / b.monthly_limit_usd - a.spent / a.monthly_limit_usd)
    .slice(0, 6);

  const chartData = series.map((s) => ({ ...s, label: monthLabel(s.month, "short").toUpperCase() }));
  const chartEmpty = series.every((s) => s.inUsd === 0 && s.outUsd === 0);

  const ltdPaid = ltds.reduce((a, t) => a + t.amount_usd, 0);
  const ltdReplaces = ltds.reduce((a, t) => a + (t.replaces_monthly_usd ?? 0), 0);
  const paybacks = ltds.map((t) => ltdPaybackMonths(t.amount_usd, t.replaces_monthly_usd)).filter((x): x is number => x !== null);
  const avgPayback = paybacks.length ? Math.round(paybacks.reduce((a, b) => a + b, 0) / paybacks.length) : null;

  const kindRows = (Object.keys(KINDS) as TxnKind[]).map((k) => ({ k, v: summary.byKind[k] })).filter((x) => x.v > 0);
  const kindMax = Math.max(...kindRows.map((x) => x.v), 1);

  const net = summary.netUsd;
  const gridBg = "bg-[radial-gradient(color-mix(in_oklab,var(--foreground)_6%,transparent)_1px,transparent_1px)] bg-[length:24px_24px]";

  return (
    <>
      <PageHeader title="Home" actions={<MonthSwitcher month={month} />} />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Hero [CP-DASH-B][MERC-HOME] */}
        <section className={cn(CARD, gridBg, "lg:col-span-2")} aria-label="Net this month">
          <h2 className={LABEL}>
            NET / {monthLabel(month).toUpperCase()}
          </h2>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Money value={net} className={cn("text-4xl font-semibold tracking-tight", net < 0 && "text-money-out")} />
            {delta !== null ? (
              <span className={cn("text-xs font-medium", delta >= 0 ? "text-money-in" : "text-money-out")}>
                {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% <span className="text-muted-foreground">vs {monthLabel(prevKey, "short")}</span>
              </span>
            ) : (
              <span className="text-muted-foreground text-xs">no prior month to compare</span>
            )}
          </div>
          <div
            className="bg-muted mt-4 flex h-2 overflow-hidden rounded-sm"
            role="img"
            aria-label={`In ${formatMoney(summary.inUsd)}, out ${formatMoney(summary.outUsd)}`}
          >
            <div className="bg-money-in" style={{ width: `${inPct}%` }} />
            <div className="bg-foreground" style={{ width: `${total > 0 ? 100 - inPct : 0}%` }} />
          </div>
          <dl className={cn("mt-4 grid gap-3 border-t pt-4", summary.recurringInMonthlyUsd > 0 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}>
            <Stat label="In" value={<Money value={summary.inUsd} direction="in" hideCents />} />
            <Stat label="Out" value={<Money value={summary.outUsd} direction="out" hideCents />} />
            <Stat label="Monthly burn" value={<Money value={summary.recurringOutMonthlyUsd} hideCents />} />
            {summary.recurringInMonthlyUsd > 0 ? <Stat label="MRR in" value={<Money value={summary.recurringInMonthlyUsd} direction="in" hideCents />} /> : null}
          </dl>
        </section>

        {/* Upcoming [CP-DASH-A] */}
        <section className={CARD} aria-label="Upcoming renewals">
          <Head href="/subscriptions" link="Recurring">UPCOMING / 30D</Head>
          {upcoming.length === 0 ? (
            <p className={EMPTY}>Nothing due in the next 30 days.</p>
          ) : (
            <ul className="divide-y">
              {upcoming.slice(0, 5).map(({ r, days }) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate">{r.name}</p>
                    <p className="text-muted-foreground text-[11px]">{INTERVALS[r.billing_interval].label}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={cn(TAG, days < 0 ? "text-money-out" : days <= 7 ? "text-warn" : "text-muted-foreground")}>
                      {days < 0 ? `OVERDUE ${-days}D` : days === 0 ? "TODAY" : `DUE ${days}D`}
                    </span>
                    <Money value={r.amount_usd} direction={r.direction} className="text-[13px]" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Budgets [CP-DASH-B] */}
        <section className={cn(CARD, "lg:col-span-1")} aria-label="Budgets">
          <Head href="/budgets" link="Budgets">BUDGETS</Head>
          {budgetRows.length === 0 ? (
            <Link href="/budgets" className={cn(EMPTY, "block hover:text-foreground")}>No budgets yet. Set a monthly limit per category.</Link>
          ) : (
            <ul className="space-y-3">
              {budgetRows.map((b) => {
                const ratio = b.spent / b.monthly_limit_usd;
                const over = ratio > 1;
                return (
                  <li key={b.id}>
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                      <span className="truncate">{b.category}</span>
                      <span className={cn("tabular-nums", over ? "text-money-out" : ratio >= 0.8 ? "text-warn" : "text-muted-foreground")}>
                        {over ? `OVER ${formatMoney(b.spent - b.monthly_limit_usd, "USD", { compact: true })}` : `${formatMoney(b.monthly_limit_usd - b.spent, "USD", { compact: true })} LEFT`}
                      </span>
                    </div>
                    <div className="bg-muted h-1.5 overflow-hidden rounded-sm" role="img" aria-label={`${Math.round(ratio * 100)}% of ${formatMoney(b.monthly_limit_usd)}`}>
                      <div className={cn("h-full", over ? "bg-money-out" : ratio >= 0.8 ? "bg-warn" : "bg-brand")} style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Chart [UBANK-INOUT] */}
        <section className={cn(CARD, "lg:col-span-2")} aria-label="Six month cash flow">
          <div className="mb-3 flex items-center justify-between">
            <h2 className={LABEL}>IN / OUT · 6 MONTHS</h2>
            <div className="text-muted-foreground flex gap-3 text-[10px] tracking-[0.08em] uppercase">
              <span className="flex items-center gap-1.5"><span className="bg-money-in size-2 rounded-[2px]" />IN</span>
              <span className="flex items-center gap-1.5"><span className="bg-foreground size-2 rounded-[2px]" />OUT</span>
            </div>
          </div>
          {chartEmpty ? <p className={EMPTY}>No transactions in the last 6 months. Tap Add to log the first one.</p> : <CashChart data={chartData} />}
        </section>

        {/* Lifetime deals */}
        <section className={CARD} aria-label="Lifetime deals">
          <Head href="/lifetime" link="Deals">LIFETIME DEALS</Head>
          {ltds.length === 0 ? (
            <p className={EMPTY}>No lifetime deals logged.</p>
          ) : (
            <dl className="grid grid-cols-3 gap-3">
              <Stat label="Paid" value={<Money value={ltdPaid} hideCents className="text-base" />} />
              <Stat label="Replaces /mo" value={<Money value={ltdReplaces} hideCents className="text-base" />} />
              <Stat label="Avg payback" value={<span className="text-base tabular-nums">{avgPayback === null ? "n/a" : `${avgPayback} MO`}</span>} />
            </dl>
          )}
        </section>

        {/* By kind */}
        <section className={cn(CARD, "lg:col-span-2")} aria-label="Breakdown by kind">
          <h2 className={cn(LABEL, "mb-3")}>BY KIND / {monthLabel(month, "short").toUpperCase()}</h2>
          {kindRows.length === 0 ? (
            <p className={EMPTY}>Nothing logged for {monthLabel(month)}.</p>
          ) : (
            <ul className="divide-y">
              {kindRows.map(({ k, v }) => (
                <li key={k} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 py-2 text-sm first:pt-0 last:pb-0">
                  <span className="text-muted-foreground text-[11px] tracking-[0.08em] uppercase">{KINDS[k].label}</span>
                  <div className="bg-muted h-1 rounded-sm">
                    <div className={cn("h-full rounded-sm", k === "income" ? "bg-money-in" : "bg-foreground")} style={{ width: `${(v / kindMax) * 100}%` }} />
                  </div>
                  <Money value={v} direction={k === "income" ? "in" : undefined} className="text-[13px]" />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className={LABEL}>{label}</dt>
      <dd className="mt-1 text-lg font-medium tracking-tight">{value}</dd>
    </div>
  );
}
