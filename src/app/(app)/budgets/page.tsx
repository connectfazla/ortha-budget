import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { BudgetDrawer } from "@/components/budgets/budget-drawer";
import { ReportsNav } from "@/components/reports/section-nav";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { getBudgets, getCategories, getMonthSummary, requireUser } from "@/lib/data";
import { Money } from "@/components/money";
import { formatMoney, isMonthKey, monthKey } from "@/lib/money";
import { cn } from "@/lib/utils";

const shift = (m: string, d: number) => {
  const [y, mo] = m.split("-").map(Number);
  return monthKey(new Date(y, mo - 1 + d, 1));
};

export default async function BudgetsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireUser();
  const { month: q } = await searchParams;
  const month = isMonthKey(q) ? q : monthKey();
  const [budgets, categories, summary] = await Promise.all([getBudgets(), getCategories(), getMonthSummary(month)]);

  const spentBy = new Map(summary.byCategory.map((c) => [c.category, c.outUsd]));
  const rows = budgets.map((b) => ({ b, spent: spentBy.get(b.category) ?? 0 }));
  const limit = rows.reduce((s, r) => s + r.b.monthly_limit_usd, 0);
  const spent = rows.reduce((s, r) => s + r.spent, 0);
  const left = limit - spent;
  const unbudgeted = categories.filter((c) => !budgets.some((b) => b.category === c));
  const state = (spent: number, lim: number) => (spent > lim ? "over" : spent / lim >= 0.85 ? "warn" : "ok");
  const BAR = { ok: "bg-foreground", warn: "bg-warn", over: "bg-money-out" };
  const label = new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const add = (
    <Button size="lg" className="h-11">
      <Plus /> Budget
    </Button>
  );

  return (
    <>
      <ReportsNav />
      <PageHeader title="Budgets" actions={<BudgetDrawer categories={unbudgeted}>{add}</BudgetDrawer>} />
      <div className="flex items-center justify-between pb-3">
        <Link href={`/budgets?month=${shift(month, -1)}`} aria-label="Previous month" className="flex size-11 items-center justify-center">
          <ChevronLeft className="size-4" />
        </Link>
        <span className="text-sm font-medium">{label}</span>
        <Link href={`/budgets?month=${shift(month, 1)}`} aria-label="Next month" className="flex size-11 items-center justify-center">
          <ChevronRight className="size-4" />
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">No budgets yet. Set a monthly limit per category.</p>
          <BudgetDrawer categories={unbudgeted}>
            <Button variant="outline" size="lg" className="h-11">
              <Plus /> Add budget
            </Button>
          </BudgetDrawer>
        </div>
      ) : (
        <>
          <section className="bg-card shadow-card rounded-lg border p-4">
            <p className="label">{left < 0 ? "Over budget this month" : "Left to spend this month"}</p>
            <p className={cn("mt-1 text-4xl font-semibold tracking-tight", left < 0 && "text-money-out")}>
              <Money animate value={Math.abs(left)} hideCents />
              {left < 0 && <span className="ml-2 text-base font-medium">over</span>}
            </p>
            <div className="bg-muted mt-4 h-2.5 overflow-hidden rounded-sm" role="progressbar" aria-label="Spent of total budget" aria-valuenow={Math.round(spent)} aria-valuemax={Math.round(limit)}>
              <div className={cn("h-full", BAR[state(spent, limit)])} style={{ width: `${Math.min(100, (spent / limit) * 100)}%` }} />
            </div>
            <p className="text-muted-foreground mt-2 text-sm tabular-nums">
              {formatMoney(spent).replace(/\.00$/, "")} spent of {formatMoney(limit).replace(/\.00$/, "")}
            </p>
          </section>

          <ul className="bg-card shadow-card mt-4 divide-y rounded-lg border">
            {rows.map(({ b, spent }) => {
              const s = state(spent, b.monthly_limit_usd);
              return (
                <li key={b.id}>
                  <BudgetDrawer budget={b}>
                    <button type="button" className="press focus-visible:ring-ring/50 focus-visible:ring-2 outline-none hover:bg-muted/50 block min-h-14 w-full px-3 py-2.5 text-left">
                      <span className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate">{b.category}</span>
                        <span className={cn("shrink-0 font-medium tabular-nums", s === "over" && "text-money-out", s === "warn" && "text-warn")}>
                          {s === "over"
                            ? `Over by ${formatMoney(spent - b.monthly_limit_usd).replace(/\.00$/, "")}`
                            : `${formatMoney(b.monthly_limit_usd - spent).replace(/\.00$/, "")} left${s === "warn" ? ", nearly out" : ""}`}
                        </span>
                      </span>
                      <span className="text-muted-foreground mt-0.5 block text-xs tabular-nums">
                        {formatMoney(spent).replace(/\.00$/, "")} of {formatMoney(b.monthly_limit_usd).replace(/\.00$/, "")}
                      </span>
                      <span className="bg-muted mt-2 block h-1.5 overflow-hidden rounded-sm">
                        <span className={cn("block h-full", BAR[s])} style={{ width: `${Math.min(100, (spent / b.monthly_limit_usd) * 100)}%` }} />
                      </span>
                    </button>
                  </BudgetDrawer>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
