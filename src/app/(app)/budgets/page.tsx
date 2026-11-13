import { Plus } from "lucide-react";
import { BudgetDrawer } from "@/components/budgets/budget-drawer";
import { MonthSwitcher } from "@/components/dashboard/month-switcher";
import { ReportsNav } from "@/components/reports/section-nav";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemGroup, ItemTitle } from "@/components/ui/item";
import { Progress } from "@/components/ui/progress";
import { getBudgets, getCategories, getMonthSummary, getSettings, requireUser } from "@/lib/data";
import { Money } from "@/components/money";
import { formatMoney, isMonthKey, monthKey } from "@/lib/money";
import { cn } from "@/lib/utils";

export default async function BudgetsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireUser();
  const { month: q } = await searchParams;
  const month = isMonthKey(q) ? q : monthKey();
  const [budgets, categories, summary, settings] = await Promise.all([getBudgets(), getCategories(), getMonthSummary(month), getSettings()]);
  const base = settings.base_currency;

  const spentBy = new Map(summary.byCategory.map((c) => [c.category, c.outUsd]));
  const rows = budgets.map((b) => ({ b, spent: spentBy.get(b.category) ?? 0 }));
  const limit = rows.reduce((s, r) => s + r.b.monthly_limit, 0);
  const spent = rows.reduce((s, r) => s + r.spent, 0);
  const left = limit - spent;
  const unbudgeted = categories.filter((c) => !budgets.some((b) => b.category === c));
  const state = (spent: number, lim: number) => (spent > lim ? "over" : spent / lim >= 0.85 ? "warn" : "ok");
  // Progress indicator colour per state (Progress renders its own track and indicator).
  const BAR = {
    ok: "[&_[data-slot=progress-indicator]]:bg-foreground",
    warn: "[&_[data-slot=progress-indicator]]:bg-warn",
    over: "[&_[data-slot=progress-indicator]]:bg-money-out",
  };

  const fm = (n: number) => formatMoney(n, base).replace(/\.00$/, "");
  const pct = (a: number, b: number) => Math.min(100, (a / b) * 100);
  const add = (
    <Button size="lg" className="h-11">
      <Plus /> Budget
    </Button>
  );

  return (
    <>
      <ReportsNav />
      <PageHeader title="Budgets" actions={<BudgetDrawer categories={unbudgeted} currency={base}>{add}</BudgetDrawer>} />
      <div className="flex justify-center pb-3">
        <MonthSwitcher month={month} base="/budgets" allowFuture />
      </div>

      {rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>No budgets yet</EmptyTitle>
            <EmptyDescription>Set a monthly limit per category.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <BudgetDrawer categories={unbudgeted} currency={base}>
              <Button variant="outline" size="lg" className="h-11">
                <Plus /> Add budget
              </Button>
            </BudgetDrawer>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                <h2 className="label">{left < 0 ? "Over budget this month" : "Left to spend this month"}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn("text-4xl font-semibold tracking-tight", left < 0 && "text-money-out")}>
                <Money animate value={Math.abs(left)} currency={base} hideCents />
                {left < 0 && <span className="ml-2 text-base font-medium">over</span>}
              </p>
              <Progress
                value={pct(spent, limit)}
                aria-label="Spent of total budget"
                className={cn("mt-4 [&_[data-slot=progress-track]]:h-2.5 [&_[data-slot=progress-track]]:rounded-sm", BAR[state(spent, limit)])}
              />
              <p className="text-muted-foreground mt-2 text-sm tabular-nums">
                {fm(spent)} spent of {fm(limit)}
              </p>
            </CardContent>
          </Card>

          <Card className="mt-4 gap-0 py-0">
            <ItemGroup className="gap-0 divide-y">
              {rows.map(({ b, spent }) => {
                const s = state(spent, b.monthly_limit);
                return (
                  <div role="listitem" key={b.id}>
                    <BudgetDrawer budget={b} currency={base}>
                      <Item render={<button type="button" />} className="hover:bg-muted/50 active:bg-muted min-h-14 rounded-none px-3 text-left">
                        <ItemContent className="min-w-0 gap-0.5">
                          <ItemTitle className="w-full truncate font-normal">{b.category}</ItemTitle>
                          <ItemDescription className="text-xs tabular-nums">
                            {fm(spent)} of {fm(b.monthly_limit)}
                          </ItemDescription>
                        </ItemContent>
                        <ItemActions className={cn("self-start text-sm font-medium tabular-nums", s === "over" && "text-money-out", s === "warn" && "text-warn")}>
                          {s === "over" ? `Over by ${fm(spent - b.monthly_limit)}` : `${fm(b.monthly_limit - spent)} left${s === "warn" ? ", nearly out" : ""}`}
                        </ItemActions>
                        <ItemFooter>
                          <Progress
                            value={pct(spent, b.monthly_limit)}
                            aria-label={`${b.category} spent`}
                            className={cn("w-full [&_[data-slot=progress-track]]:h-1.5 [&_[data-slot=progress-track]]:rounded-sm", BAR[s])}
                          />
                        </ItemFooter>
                      </Item>
                    </BudgetDrawer>
                  </div>
                );
              })}
            </ItemGroup>
          </Card>
        </>
      )}
    </>
  );
}
