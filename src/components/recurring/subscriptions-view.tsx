"use client";

import { useEffect, useState, useTransition } from "react";
import { MoreVertical, RepeatIcon } from "lucide-react";
import { toast } from "sonner";
import { Money } from "@/components/money";
import { undoToast } from "@/components/motion/undo-toast";
import { PageHeader } from "@/components/shell/page-header";
import { NewRecurringButton } from "@/components/recurring/new-recurring-button";
import { RecurringDrawer } from "@/components/recurring/recurring-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deleteRecurring, markRecurringPaid, restoreRecurring, setRecurringStatus } from "@/lib/actions";
import { INTERVALS, formatMoney, monthlyEquivalent } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Client, Contractor, Direction, PriceChange, Recurring, RecurringStatus } from "@/lib/types";

const MS = 86_400_000;
const day = (s: string) => Date.parse(`${s}T00:00:00Z`);
const fmtDate = (s: string) => new Date(day(s)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const TRIAL_WINDOW = 14;
const PRICE_WINDOW = 90;

export function SubscriptionsView({
  items,
  contractors,
  clients,
  categories,
  today,
  priceChanges = [],
  baseCurrency: base = "USD",
}: {
  items: Recurring[];
  contractors: Contractor[];
  clients: Client[];
  categories: string[];
  today: string;
  priceChanges?: PriceChange[];
  /** The user's base currency (settings); every *_base amount is in it. */
  baseCurrency?: string;
}) {
  const [tab, setTab] = useState<Direction>("out");
  const [period, setPeriod] = useState<"month" | "year">("month");
  const [drawer, setDrawer] = useState<{ open: boolean; item: Recurring | null }>({ open: false, item: null });
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [paidId, setPaidId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!paidId) return;
    const t = setTimeout(() => setPaidId(null), 2200);
    return () => clearTimeout(t);
  }, [paidId]);

  const history = new Map<string, PriceChange[]>();
  for (const c of priceChanges) history.set(c.recurring_id, [...(history.get(c.recurring_id) ?? []), c]);
  /** Latest change, if it is an increase inside the window. */
  const raise = (i: Recurring) => {
    const c = history.get(i.id)?.[0];
    if (!c || c.new_amount <= c.old_amount || (day(today) - day(c.changed_on.slice(0, 10))) / MS > PRICE_WINDOW) return null;
    return `Price up ${Math.round(((c.new_amount - c.old_amount) / c.old_amount) * 100)}% on ${fmtDate(c.changed_on.slice(0, 10))}`;
  };

  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  const visible = items.filter((i) => !hidden.has(i.id));
  const active = visible.filter((i) => i.status === "active");
  const mult = period === "year" ? 12 : 1;
  const sum = (d: Direction) => active.filter((i) => i.direction === d).reduce((s, i) => s + monthlyEquivalent(i.amount_base, i.billing_interval), 0) * mult;
  const count = (d: Direction) => visible.filter((i) => i.direction === d).length;

  const list = visible.filter((i) => i.direction === tab);
  const dueIn = (i: Recurring) => Math.round((day(i.next_due) - day(today)) / MS);
  const trialIn = (i: Recurring) => (i.trial_ends ? Math.round((day(i.trial_ends) - day(today)) / MS) : null);
  const act = (i: Recurring) => i.status === "active";
  const trialSoon = (i: Recurring) => act(i) && trialIn(i) !== null && trialIn(i)! >= 0 && trialIn(i)! <= TRIAL_WINDOW;
  const cancelIn = (i: Recurring) => (i.cancel_by ? Math.round((day(i.cancel_by) - day(today)) / MS) : null);
  const cancelSoon = (i: Recurring) => act(i) && cancelIn(i) !== null && cancelIn(i)! >= 0 && cancelIn(i)! <= TRIAL_WINDOW;
  const top = (i: Recurring) => trialSoon(i) || cancelSoon(i);
  const rest = list.filter((i) => !top(i));
  const groups = [
    { key: "trial", label: `Trials ending in ${TRIAL_WINDOW} days`, rows: list.filter(trialSoon).sort((a, b) => trialIn(a)! - trialIn(b)!) },
    { key: "cancel", label: `Cancel by in ${TRIAL_WINDOW} days`, rows: list.filter((i) => cancelSoon(i) && !trialSoon(i)).sort((a, b) => cancelIn(a)! - cancelIn(b)!) },
    { key: "overdue", label: "Overdue", rows: rest.filter((i) => act(i) && dueIn(i) < 0) },
    { key: "soon", label: "Due in 7 days", rows: rest.filter((i) => act(i) && dueIn(i) >= 0 && dueIn(i) <= 7) },
    { key: "later", label: "Later", rows: rest.filter((i) => act(i) && dueIn(i) > 7) },
    { key: "off", label: "Paused or cancelled", rows: rest.filter((i) => !act(i)) },
  ].filter((g) => g.rows.length);

  const open = (item: Recurring | null) => setDrawer({ open: true, item });
  const markPaid = (i: Recurring) =>
    start(async () => {
      const r = await markRecurringPaid(i.id, new Date().toLocaleDateString("en-CA"));
      if (r.ok) {
        setPaidId(i.id);
        toast.success(r.nextDue ? `Marked paid, next due ${fmtDate(r.nextDue)}` : "Marked paid");
      } else toast.error(r.error);
    });
  const setStatus = (i: Recurring, s: RecurringStatus) =>
    start(async () => {
      const r = await setRecurringStatus(i.id, s);
      if (r.ok) toast.success(s === "active" ? "Resumed" : s === "paused" ? "Paused" : "Cancelled");
      else toast.error(r.error);
    });
  const setHide = (id: string, on: boolean) =>
    setHidden((h) => {
      const n = new Set(h);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
  const remove = (i: Recurring) => {
    setHide(i.id, true);
    start(async () => {
      const r = await deleteRecurring(i.id);
      if (!r.ok) {
        setHide(i.id, false);
        toast.error(r.error);
        return;
      }
      undoToast(`Deleted ${i.name}`, async () => {
        const back = await restoreRecurring(i);
        if (back.ok) setHide(i.id, false);
        else toast.error(back.error);
      });
    });
  };

  const newProps = { contractors, categories, clients, today, baseCurrency: base };

  return (
    <>
      <PageHeader title="Subscriptions" actions={<NewRecurringButton {...newProps} />} />

      <div className="mb-2 flex justify-end">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as "month" | "year")}>
          <TabsList className="h-9">
            <TabsTrigger value="month">Monthly</TabsTrigger>
            <TabsTrigger value="year">Annual</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <Card className="grid grid-cols-3 gap-0 divide-x py-0">
        <Stat label={period === "year" ? "Burn per year" : "Burn per month"}><Money animate value={sum("out")} currency={base} direction="out" hideCents={period === "year"} /></Stat>
        <Stat label={period === "year" ? "Retainers per year" : "Retainers per month"}><Money animate value={sum("in")} currency={base} direction="in" hideCents={period === "year"} /></Stat>
        <Stat label="Active plans"><span className="tabular-nums">{active.length}</span></Stat>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Direction)} className="mt-4">
        <TabsList className="h-10 w-full">
          <TabsTrigger value="out">Paying out ({count("out")})</TabsTrigger>
          <TabsTrigger value="in">Coming in ({count("in")})</TabsTrigger>
        </TabsList>
      </Tabs>

      {groups.length === 0 ? (
        <Empty className="mt-4 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RepeatIcon />
            </EmptyMedia>
            <EmptyTitle>{tab === "out" ? "No subscriptions or contractor pay yet" : "No client retainers yet"}</EmptyTitle>
            <EmptyDescription>
              {tab === "out" ? "Add a plan to see its renewal dates and monthly burn." : "Add a retainer to see what comes in each month."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <NewRecurringButton variant="outline" className="h-11" {...newProps}>
              Add {tab === "out" ? "subscription" : "retainer"}
            </NewRecurringButton>
          </EmptyContent>
        </Empty>
      ) : (
        groups.map((g) => (
          <section key={g.key} className="mt-5">
            <h2 className="label mb-1 flex justify-between">
              <span>{g.label}</span>
              <span className="tabular-nums">{g.rows.length}</span>
            </h2>
            <Card className={cn("gap-0 py-0", g.key === "off" && "opacity-60")}>
            <ul className="divide-y">
              {g.rows.map((i) => {
                const d = dueIn(i);
                const t = trialIn(i);
                const needsPay = act(i) && d <= 7 && !top(i);
                const up = raise(i);
                const cb = act(i) && i.cancel_by && cancelIn(i)! >= 0 ? i.cancel_by : null;
                const client = i.client_id ? clientName.get(i.client_id) : undefined;
                return (
                  <li key={i.id} className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <Item
                        size="sm"
                        render={<button type="button" onClick={() => open(i)} />}
                        className="press min-h-11 min-w-0 flex-1 flex-nowrap gap-3 rounded-md border-0 p-0 text-left"
                      >
                        <ItemMedia className="bg-muted size-9 rounded-md border text-sm font-medium" aria-hidden>
                          {i.name.slice(0, 1).toUpperCase()}
                        </ItemMedia>
                        <ItemContent className="min-w-0 gap-0.5">
                          <ItemTitle className="w-full">
                            <span className="truncate">{i.name}</span>
                          </ItemTitle>
                          <ItemDescription className="flex flex-wrap items-center gap-x-3 text-xs">
                            <span>{INTERVALS[i.billing_interval].label}</span>
                            <span>Due {fmtDate(i.next_due)}</span>
                            {client && <span className="truncate">{client}</span>}
                          </ItemDescription>
                          {(t !== null && act(i) && t >= 0) || cb || up || g.key === "overdue" || g.key === "soon" || !act(i) ? (
                            <span className="mt-1 flex flex-wrap gap-1.5">
                              {t !== null && act(i) && t >= 0 && <Tag tone="warn">{`Trial ends ${fmtDate(i.trial_ends!)}`}</Tag>}
                              {cb && <Tag tone="warn">{`Cancel by ${fmtDate(cb)}`}</Tag>}
                              {up && <Tag tone="out">{up}</Tag>}
                              {g.key === "overdue" && <Tag tone="out">Overdue</Tag>}
                              {g.key === "soon" && <Tag tone="warn">{d === 0 ? "Due today" : `Due in ${d} days`}</Tag>}
                              {!act(i) && <Tag>{i.status === "paused" ? "Paused" : "Cancelled"}</Tag>}
                            </span>
                          ) : null}
                        </ItemContent>
                        <ItemActions className="shrink-0 flex-col items-end gap-0 text-right text-sm">
                          <Money value={i.amount_base} currency={base} direction={i.direction} />
                          {i.currency !== base && <span className="text-muted-foreground block text-xs tabular-nums">{formatMoney(i.amount, i.currency)}</span>}
                          {i.billing_interval !== "monthly" && (
                            <span className="text-muted-foreground block text-xs tabular-nums">
                              {formatMoney(monthlyEquivalent(i.amount_base, i.billing_interval), base)} a month
                            </span>
                          )}
                        </ItemActions>
                      </Item>
                      <DropdownMenu>
                        <Tooltip>
                          <TooltipTrigger
                            render={<DropdownMenuTrigger render={<Button variant="ghost" size="icon-lg" aria-label={`Actions for ${i.name}`} />} />}
                          >
                            <MoreVertical />
                          </TooltipTrigger>
                          <TooltipContent>Actions</TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="end">
                          {act(i) && <DropdownMenuItem disabled={pending} onClick={() => markPaid(i)}>Mark paid</DropdownMenuItem>}
                          <DropdownMenuItem disabled={pending} onClick={() => open(i)}>Edit</DropdownMenuItem>
                          {act(i) ? (
                            <DropdownMenuItem disabled={pending} onClick={() => setStatus(i, "paused")}>Pause</DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem disabled={pending} onClick={() => setStatus(i, "active")}>Resume</DropdownMenuItem>
                          )}
                          {i.status !== "cancelled" && <DropdownMenuItem disabled={pending} onClick={() => setStatus(i, "cancelled")}>Cancel</DropdownMenuItem>}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" disabled={pending} onClick={() => remove(i)}>
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {paidId === i.id ? (
                      <PaidCheck />
                    ) : (
                      needsPay && (
                        <Button variant="outline" size="sm" className="mt-1 ml-12 h-9" disabled={pending} onClick={() => markPaid(i)}>
                          Mark paid
                        </Button>
                      )
                    )}
                  </li>
                );
              })}
            </ul>
            </Card>
          </section>
        ))
      )}

      <RecurringDrawer
        open={drawer.open}
        onOpenChange={(o) => setDrawer((s) => ({ ...s, open: o }))}
        item={drawer.item}
        contractors={contractors}
        clients={clients.filter((c) => !c.archived)}
        categories={categories}
        today={today}
        priceChanges={drawer.item ? history.get(drawer.item.id) : undefined}
        baseCurrency={base}
      />
    </>
  );
}

/** Checkmark recipe (MOTION-SPEC 2.8): circle pops in on --spring-pop, then the check path draws over 320ms. */
function PaidCheck() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(r);
  }, []);
  return (
    <span role="status" className="text-money-in mt-1 ml-12 flex h-9 items-center gap-2 text-sm font-medium">
      <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden>
        <circle
          cx="12"
          cy="12"
          r="11"
          className="fill-money-in origin-center motion-reduce:transition-none"
          style={{ transform: on ? "scale(1)" : "scale(0.4)", transition: "transform 360ms var(--spring-pop)" }}
        />
        <path
          d="M7 12.5l3.2 3.2L17 9"
          stroke="var(--background)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="24"
          className="motion-reduce:transition-none"
          style={{ strokeDashoffset: on ? 0 : 24, transition: "stroke-dashoffset 320ms var(--ease-out) 160ms" }}
        />
      </svg>
      Paid
    </span>
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

/** Status tag: soft tint of the tone's hue, full-strength text (spec § 4, Stripe pills). */
function Tag({ tone, children }: { tone?: "out" | "warn"; children: React.ReactNode }) {
  return (
    <Badge variant={tone === "out" ? "destructive" : "secondary"} className={cn(tone === "warn" && "bg-warn/10 text-warn")}>
      {children}
    </Badge>
  );
}
