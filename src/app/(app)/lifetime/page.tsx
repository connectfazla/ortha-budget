import { InfinityIcon, Plus } from "lucide-react";
import { AddEntryDrawer } from "@/components/entry/add-entry-drawer";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/shell/page-header";
import { PlansNav } from "@/components/shell/plans-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemTitle } from "@/components/ui/item";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getCategories, getClients, getContractors, getLifetimeDeals, getSettings, requireUser } from "@/lib/data";
import { formatMoney, ltdPaybackMonths } from "@/lib/money";
import { cn } from "@/lib/utils";

const nowMs = () => Date.now();
const MONTH_MS = 30.4375 * 86_400_000;

export default async function LifetimePage() {
  await requireUser();
  const [deals, contractors, categories, allClients, settings] = await Promise.all([
    getLifetimeDeals(),
    getContractors(),
    getCategories(),
    getClients(),
    getSettings(),
  ]);
  const base = settings.base_currency;
  const whole = (n: number) => formatMoney(n, base).replace(/\.00$/, "");
  const clients = allClients.filter((c) => !c.archived);
  const now = nowMs();

  const rows = deals
    .map((d) => {
      const rep = d.replaces_monthly ?? 0;
      const months = Math.max(0, (now - Date.parse(`${d.date}T00:00:00Z`)) / MONTH_MS);
      const progress = rep > 0 ? Math.min(1, (months * rep) / d.amount_base) : 0;
      const left = rep > 0 ? Math.max(1, (ltdPaybackMonths(d.amount_base, rep) ?? 0) - Math.floor(months)) : Infinity;
      return { d, rep, progress, paidOff: rep > 0 && progress >= 1, left };
    })
    // pending (closest to break-even first), then no-baseline, then paid off
    .sort((a, b) => Number(a.paidOff) - Number(b.paidOff) || a.left - b.left);

  const paid = deals.reduce((s, d) => s + d.amount_base, 0);
  const replaces = deals.reduce((s, d) => s + (d.replaces_monthly ?? 0), 0);
  const paidOffCount = rows.filter((r) => r.paidOff).length;
  const add = (
    <Tooltip>
      <AddEntryDrawer contractors={contractors} clients={clients} categories={categories} defaultKind="lifetime" baseCurrency={base}>
        <TooltipTrigger render={<Button size="icon-lg" variant="brand" aria-label="Add lifetime deal" />}>
          <Plus />
        </TooltipTrigger>
      </AddEntryDrawer>
      <TooltipContent>Add lifetime deal</TooltipContent>
    </Tooltip>
  );

  return (
    <>
      <PlansNav />
      <PageHeader title="Lifetime deals" actions={add} />

      <Card className="grid grid-cols-2 gap-0 divide-x divide-y py-0">
        <Stat label="Paid in total"><Money animate value={paid} currency={base} direction="out" hideCents /></Stat>
        <Stat label="Replaces per month"><Money animate value={replaces} currency={base} hideCents /></Stat>
        <Stat label="Saved per year"><Money animate value={replaces * 12} currency={base} direction="in" hideCents /></Stat>
        <Stat label="Paid off"><span className="tabular-nums">{paidOffCount} of {deals.length}</span></Stat>
      </Card>

      {rows.length === 0 ? (
        <Empty className="mt-4 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <InfinityIcon />
            </EmptyMedia>
            <EmptyTitle>No lifetime deals yet</EmptyTitle>
            <EmptyDescription>
              A lifetime deal (LTD) is a one-off purchase that replaces a monthly subscription. Log the price and what
              it replaces per month, and we track when it pays for itself.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{add}</EmptyContent>
        </Empty>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map(({ d, rep, progress, paidOff, left }) => (
            <li key={d.id}>
              <AddEntryDrawer contractors={contractors} clients={clients} categories={categories} transaction={d} baseCurrency={base}>
                <Item
                  variant="outline"
                  render={<button type="button" />}
                  className="bg-card hover:bg-muted/50 active:bg-muted items-start p-3 text-left"
                >
                  <ItemContent className="min-w-0 gap-0">
                    <ItemTitle className="w-full">
                      <span className="truncate">{d.description}</span>
                    </ItemTitle>
                    {d.vendor && <ItemDescription className="truncate text-xs">{d.vendor}</ItemDescription>}
                  </ItemContent>
                  <ItemActions>
                    <Badge variant="secondary" className={cn(paidOff && "bg-money-in/10 text-money-in")}>
                      {paidOff ? "Paid off" : rep > 0 ? `Pays off in ${left} ${left === 1 ? "month" : "months"}` : "No baseline"}
                    </Badge>
                  </ItemActions>
                  <ItemFooter className="flex-col items-stretch gap-2 pt-1">
                    <Progress value={Math.round(progress * 100)} aria-label="Payback progress" />
                    <span className="text-muted-foreground flex flex-wrap gap-x-4 text-xs">
                      <span>Paid {whole(d.amount_base)}</span>
                      {rep > 0 && <span>Replaces {whole(rep)} a month</span>}
                    </span>
                  </ItemFooter>
                </Item>
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
      <div className="label">{label}</div>
      <div className="mt-1 text-lg font-semibold tracking-tight">{children}</div>
    </div>
  );
}
