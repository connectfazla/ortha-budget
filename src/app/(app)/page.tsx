import Link from "next/link";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, BarChart3, Bell, PiggyBank, Plus, Repeat, Search, Upload } from "lucide-react";
import { CashChart } from "@/components/dashboard/cash-chart";
import { ForecastCard } from "@/components/dashboard/forecast-card";
import { MonthSwitcher, monthLabel, shiftMonth } from "@/components/dashboard/month-switcher";
import { Money } from "@/components/money";
import { FirstRun } from "@/components/onboarding/first-run";
import { PageHeader } from "@/components/shell/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getAvatarUrl, getBudgets, getCategories, getClients, getContractors, getLifetimeDeals, getMonthSummary, getMonthlySeries, getRecurring, getSettings,
  getTransactions, getUserEmail, requireUser,
} from "@/lib/data";
import { forecast } from "@/lib/forecast";
import { formatMoney, isMonthKey, ltdPaybackMonths, monthKey, todayISO } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
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

  const [summary, prev, recurring, budgets, series, ltds, settings, anyTxn, email] = await Promise.all([
    getMonthSummary(month),
    getMonthSummary(prevKey),
    getRecurring(),
    getBudgets(),
    getMonthlySeries(6),
    getLifetimeDeals(),
    getSettings(),
    getTransactions({ limit: 1 }),
    getUserEmail(),
  ]);

  if (anyTxn.length === 0 && recurring.length === 0) {
    const [contractors, categories, clients] = await Promise.all([getContractors(), getCategories(), getClients()]);
    return <FirstRun contractors={contractors} categories={categories} clients={clients.filter((c) => !c.archived)} today={today} baseCurrency={settings.base_currency} />;
  }

  const photoUrl = await getAvatarUrl(settings.avatar_path);
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
        <h2>{title}</h2>
      </CardTitle>
    </CardHeader>
  );

  // Hero actions [Revolut iOS Home: round frosted buttons, label underneath]. Add reuses the ?add=1 deep link
  // (CommandPalette opens the Add entry drawer, then drops the param).
  const actions = [
    { href: month === now ? "/?add=1" : `/?month=${month}&add=1`, label: "Add", icon: Plus },
    { href: "/subscriptions", label: "Subscriptions", icon: Repeat },
    { href: "/reports", label: "Reports", icon: BarChart3 },
    { href: "/budgets", label: "Budgets", icon: PiggyBank },
  ];
  const glassFocus = "outline-none focus-visible:ring-2 focus-visible:ring-on-hero/80";

  return (
    <>
      <div className="max-lg:sr-only">
        <PageHeader title="Home" />
      </div>

      {/* Hero [Revolut iOS Home]: full-bleed gradient on phones, a rounded panel on desktop. */}
      <section
        aria-labelledby="net-heading"
        className="hero-surface -mx-4 -mt-[calc(env(safe-area-inset-top)+1rem)] mb-4 overflow-hidden px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-10 lg:mx-0 lg:mt-0 lg:rounded-3xl lg:px-8 lg:pt-8 lg:pb-9"
      >
        {/* Phone top bar: avatar, frosted search pill, round icon buttons. */}
        <div className="flex items-center gap-2 lg:hidden">
          <Link href="/profile" aria-label="Profile" className={cn("press-strong shrink-0 rounded-full", glassFocus)}>
            <Avatar className="size-10 after:border-0">
              {photoUrl ? <AvatarImage src={photoUrl} alt="" /> : null}
              <AvatarFallback className="bg-on-hero text-hero-via text-[15px] font-bold">{(settings.display_name?.trim() || email || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          <Link href="/transactions" className={cn("hero-glass press flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full px-3.5 text-[15px] font-medium", glassFocus)}>
            <Search className="size-[18px] shrink-0 opacity-80" aria-hidden />
            <span className="truncate opacity-85">Search</span>
          </Link>
          <Link href="/import" aria-label="Import transactions" className={cn("hero-glass press-strong grid size-10 shrink-0 place-items-center rounded-full", glassFocus)}>
            <Upload className="size-[18px]" aria-hidden />
          </Link>
          <Link href="/profile/notifications" aria-label="Notifications" className={cn("hero-glass press-strong grid size-10 shrink-0 place-items-center rounded-full", glassFocus)}>
            <Bell className="size-[18px]" aria-hidden />
          </Link>
        </div>

        <div className="mt-9 flex flex-col items-center text-center lg:mt-0">
          <h2 id="net-heading" aria-label={`Net in ${monthLabel(month)}`} className="text-[15px] font-medium opacity-85">
            {month === now ? "Net this month" : `Net in ${monthLabel(month)}`}
          </h2>
          <Money animate secondary value={net} currency={base} className="mt-1.5 text-[44px] leading-[1.1] font-bold tracking-tight" />
          {delta !== null ? (
            <p className="mt-1.5 text-sm font-medium opacity-85">
              {delta >= 0 ? "Up" : "Down"} {Math.abs(delta).toFixed(0)}% from {monthLabel(prevKey, "short")}
            </p>
          ) : null}
          <div className="mt-4">
            <MonthSwitcher month={month} hero />
          </div>
        </div>

        <nav aria-label="Quick actions" className="mx-auto mt-7 grid max-w-sm grid-cols-4 gap-2">
          {actions.map((a) => (
            <Link key={a.label} href={a.href} className={cn("group flex flex-col items-center gap-2 rounded-2xl text-[13px] font-semibold", glassFocus)}>
              <span className="hero-glass press-strong grid size-12 place-items-center rounded-full">
                <a.icon className="size-[22px]" aria-hidden />
              </span>
              {a.label}
            </Link>
          ))}
        </nav>
      </section>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {alerts.length > 0 ? (
          <Link href="/budgets" className="press focus-visible:ring-ring/60 rounded-2xl outline-none focus-visible:ring-2 lg:col-span-2">
            <Card size="sm">
              <CardContent className="flex items-center gap-3 text-sm">
                <span className="bg-warn/12 text-warn grid size-10 shrink-0 place-items-center rounded-full">
                  <AlertTriangle className="size-[18px]" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold">{alerts.length === 1 ? "1 budget needs attention" : `${alerts.length} budgets need attention`}</p>
                  <p className="text-muted-foreground">
                    {alerts.map((a) => `${a.category} ${a.ratio > 1 ? "over by " + formatMoney((a.ratio - 1) * a.monthly_limit, base, { compact: true }) : Math.round(a.ratio * 100) + "% used"}`).join(", ")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ) : null}

        <Card className="lg:col-span-2">
          {card("This month")}
          <CardContent>
            <ItemGroup className="gap-0 sm:grid sm:grid-cols-2 sm:gap-3">
              {([
                { label: "Money in", value: summary.inUsd, dir: "in", Icon: ArrowDownLeft },
                { label: "Money out", value: summary.outUsd, dir: "out", Icon: ArrowUpRight },
              ] as const).map((m) => (
                <Item key={m.label} role="listitem" className="rounded-none border-0 px-0">
                  <ItemMedia variant="circle" className={m.dir === "in" ? "bg-money-in/12 text-money-in" : undefined}>
                    <m.Icon aria-hidden />
                  </ItemMedia>
                  <ItemContent className="min-w-0">
                    <ItemTitle className="text-muted-foreground text-[13px] font-medium">{m.label}</ItemTitle>
                  </ItemContent>
                  <ItemActions>
                    <Money animate secondary value={m.value} currency={base} direction={m.dir} hideCents className="text-lg font-bold" />
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          </CardContent>
        </Card>

        <ForecastCard items={fc.items} today={today} cutoffs={cutoffs} currency={base} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <Card>
            {card("Set aside for tax")}
            <CardContent>
              {settings.tax_rate > 0 ? (
                <>
                  <p className="text-[28px] leading-9 font-bold tracking-tight"><Money animate value={taxSetAside} currency={base} hideCents /></p>
                  <p className="text-muted-foreground mt-1 text-sm">{settings.tax_rate}% of {formatMoney(summary.inUsd, base)} income</p>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Not set. <Link href="/profile/money" className="text-brand focus-visible:ring-ring/60 rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2">Set a tax %</Link>
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            {card("Cash on hand")}
            <CardContent>
              {cash === null ? (
                <p className="text-sm">
                  <Link href="/profile/money" className="text-brand focus-visible:ring-ring/60 rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2">Add your cash balance</Link>
                  <span className="text-muted-foreground"> to see your runway.</span>
                </p>
              ) : (
                <>
                  <p className="text-[28px] leading-9 font-bold tracking-tight"><Money animate value={cash} currency={base} hideCents /></p>
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
              <ItemGroup className="gap-0">
                {trials.map((r) => (
                  <Item key={r.id} role="listitem" size="sm" className="rounded-none border-0 px-0">
                    <ItemMedia variant="circle" className="text-[15px] font-bold" aria-hidden>{r.name.slice(0, 1).toUpperCase()}</ItemMedia>
                    <ItemContent className="min-w-0">
                      <ItemTitle className="w-full truncate text-[15px]">{r.name}</ItemTitle>
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
          <Link href="/lifetime" className="press focus-visible:ring-ring/60 rounded-2xl outline-none focus-visible:ring-2 lg:col-span-2">
            <Card>
              {card("Lifetime deals")}
              <CardContent>
                <dl className="grid grid-cols-3 gap-3">
                  <div><dt className="text-muted-foreground text-xs">Paid</dt><dd className="mt-1"><Money value={ltdPaid} currency={base} hideCents className="text-base font-bold" /></dd></div>
                  <div><dt className="text-muted-foreground text-xs">Replaces per month</dt><dd className="mt-1"><Money value={ltdReplaces} currency={base} hideCents className="text-base font-bold" /></dd></div>
                  <div><dt className="text-muted-foreground text-xs">Average payback</dt><dd className="mt-1 text-base font-bold tabular-nums">{avgPayback === null ? "None yet" : `${avgPayback} months`}</dd></div>
                </dl>
              </CardContent>
            </Card>
          </Link>
        ) : null}
      </div>
    </>
  );
}
