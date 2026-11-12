import { Plus } from "lucide-react";
import { AddEntryDrawer } from "@/components/entry/add-entry-drawer";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/shell/page-header";
import { PlansNav } from "@/components/shell/plans-nav";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getCategories, getContractors, getLifetimeDeals, requireUser } from "@/lib/data";
import { formatMoney, ltdPaybackMonths } from "@/lib/money";
import { cn } from "@/lib/utils";

const LABEL = "text-muted-foreground text-[11px] font-medium tracking-[0.08em] uppercase";
const nowMs = () => Date.now();
const MONTH_MS = 30.4375 * 86_400_000;

export default async function LifetimePage() {
  await requireUser();
  const [deals, contractors, categories] = await Promise.all([getLifetimeDeals(), getContractors(), getCategories()]);
  const now = nowMs();

  const rows = deals
    .map((d) => {
      const rep = d.replaces_monthly_usd ?? 0;
      const months = Math.max(0, (now - Date.parse(`${d.date}T00:00:00Z`)) / MONTH_MS);
      const progress = rep > 0 ? Math.min(1, (months * rep) / d.amount_usd) : 0;
      const left = rep > 0 ? Math.max(1, (ltdPaybackMonths(d.amount_usd, rep) ?? 0) - Math.floor(months)) : Infinity;
      return { d, rep, progress, paidOff: rep > 0 && progress >= 1, left };
    })
    // pending (closest to break-even first), then no-baseline, then paid off
    .sort((a, b) => Number(a.paidOff) - Number(b.paidOff) || a.left - b.left);

  const paid = deals.reduce((s, d) => s + d.amount_usd, 0);
  const replaces = deals.reduce((s, d) => s + (d.replaces_monthly_usd ?? 0), 0);
  const paidOffCount = rows.filter((r) => r.paidOff).length;
  const add = (
    <AddEntryDrawer contractors={contractors} categories={categories} defaultKind="lifetime">
      <Button size="icon-lg" aria-label="Add lifetime deal">
        <Plus />
      </Button>
    </AddEntryDrawer>
  );

  return (
    <>
      <PlansNav />
      <PageHeader title="Lifetime deals" actions={add} />

      <div className="grid grid-cols-2 divide-x divide-y rounded-lg border">
        <Stat label="Paid total"><Money value={paid} direction="out" hideCents /></Stat>
        <Stat label="Replaces / mo"><Money value={replaces} hideCents /></Stat>
        <Stat label="Saved / yr"><Money value={replaces * 12} direction="in" hideCents /></Stat>
        <Stat label="Paid off"><span className="tabular-nums">{paidOffCount} / {deals.length}</span></Stat>
      </div>

      {rows.length === 0 ? (
        <div className="text-muted-foreground mt-4 flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center text-sm">
          <p>
            A lifetime deal (LTD) is a one-off purchase that replaces a monthly subscription. Log the price and what
            it replaces per month, and we track when it pays for itself.
          </p>
          {add}
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map(({ d, rep, progress, paidOff, left }) => (
            <li key={d.id}>
              <AddEntryDrawer contractors={contractors} categories={categories} transaction={d}>
                <button type="button" className="bg-card hover:bg-muted/50 block w-full rounded-lg border p-3 text-left">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{d.description}</div>
                      {d.vendor && <div className="text-muted-foreground truncate text-xs">{d.vendor}</div>}
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-sm border px-1.5 py-px text-[10px] leading-4 tracking-[0.08em] uppercase",
                        paidOff ? "text-money-in border-current" : "text-muted-foreground",
                      )}
                    >
                      {paidOff ? "Paid off" : rep > 0 ? `Pays off in ${left} mo` : "No baseline"}
                    </span>
                  </div>
                  <Progress value={Math.round(progress * 100)} className="mt-3" aria-label="Payback progress" />
                  <div className={cn(LABEL, "mt-2")}>
                    Paid {formatMoney(d.amount_usd, "USD").replace(/\.00$/, "")}
                    {rep > 0 && ` · Replaces ${formatMoney(rep, "USD").replace(/\.00$/, "")}/mo`}
                  </div>
                </button>
              </AddEntryDrawer>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="p-3">
      <div className={LABEL}>{label}</div>
      <div className="mt-1 text-lg font-semibold tracking-tight">{children}</div>
    </div>
  );
}
