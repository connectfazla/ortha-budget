"use client";

import { useState, useTransition } from "react";
import { MoreVertical, Plus } from "lucide-react";
import { toast } from "sonner";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/shell/page-header";
import { RecurringDrawer } from "@/components/recurring/recurring-drawer";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deleteRecurring, markRecurringPaid, setRecurringStatus } from "@/lib/actions";
import { INTERVALS, formatMoney, monthlyEquivalent } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Contractor, Direction, Recurring, RecurringStatus } from "@/lib/types";

const LABEL = "text-muted-foreground text-[11px] font-medium tracking-[0.08em] uppercase";
const MS = 86_400_000;
const day = (s: string) => Date.parse(`${s}T00:00:00Z`);
const fmtDate = (s: string) => new Date(day(s)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).toUpperCase();

export function SubscriptionsView({
  items,
  contractors,
  categories,
  today,
}: {
  items: Recurring[];
  contractors: Contractor[];
  categories: string[];
  today: string;
}) {
  const [tab, setTab] = useState<Direction>("out");
  const [drawer, setDrawer] = useState<{ open: boolean; item: Recurring | null }>({ open: false, item: null });
  const [deleting, setDeleting] = useState<Recurring | null>(null);
  const [pending, start] = useTransition();

  const active = items.filter((i) => i.status === "active");
  const sum = (d: Direction) => active.filter((i) => i.direction === d).reduce((s, i) => s + monthlyEquivalent(i.amount_usd, i.billing_interval), 0);
  const count = (d: Direction) => items.filter((i) => i.direction === d).length;

  const list = items.filter((i) => i.direction === tab);
  const dueIn = (i: Recurring) => Math.round((day(i.next_due) - day(today)) / MS);
  const act = (i: Recurring) => i.status === "active";
  const groups = [
    { key: "overdue", label: "Overdue", rows: list.filter((i) => act(i) && dueIn(i) < 0) },
    { key: "soon", label: "Due ≤7d", rows: list.filter((i) => act(i) && dueIn(i) >= 0 && dueIn(i) <= 7) },
    { key: "later", label: "Later", rows: list.filter((i) => act(i) && dueIn(i) > 7) },
    { key: "off", label: "Paused / cancelled", rows: list.filter((i) => !act(i)) },
  ].filter((g) => g.rows.length);

  const open = (item: Recurring | null) => setDrawer({ open: true, item });
  const run = (fn: () => Promise<{ ok: true; nextDue?: string } | { ok: false; error: string }>, ok: (nextDue?: string) => string) =>
    start(async () => {
      const r = await fn();
      if (r.ok) toast.success(ok(r.nextDue));
      else toast.error(r.error);
    });
  const markPaid = (i: Recurring) =>
    run(
      () => markRecurringPaid(i.id, new Date().toLocaleDateString("en-CA")),
      (n) => (n ? `Marked paid · next due ${fmtDate(n)}` : "Marked paid"),
    );
  const setStatus = (i: Recurring, s: RecurringStatus) => run(() => setRecurringStatus(i.id, s), () => (s === "active" ? "Resumed" : s === "paused" ? "Paused" : "Cancelled"));

  return (
    <>
      <PageHeader
        title="Subscriptions"
        actions={
          <Button size="icon-lg" aria-label="Add recurring item" onClick={() => open(null)}>
            <Plus />
          </Button>
        }
      />

      <div className="grid grid-cols-3 divide-x rounded-lg border">
        <Stat label="Burn / mo"><Money value={sum("out")} direction="out" /></Stat>
        <Stat label="MRR / mo"><Money value={sum("in")} direction="in" /></Stat>
        <Stat label="Active"><span className="tabular-nums">{active.length}</span></Stat>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Direction)} className="mt-4">
        <TabsList className="h-10 w-full">
          <TabsTrigger value="out">OUT · {count("out")}</TabsTrigger>
          <TabsTrigger value="in">IN · {count("in")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {groups.length === 0 ? (
        <div className="text-muted-foreground mt-4 flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center text-sm">
          {tab === "out" ? "No subscriptions or contractor pay yet." : "No client retainers yet."}
          <Button variant="outline" onClick={() => open(null)}>
            <Plus /> Add {tab === "out" ? "subscription" : "retainer"}
          </Button>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.key} className="mt-5">
            <h2 className={cn(LABEL, "mb-1 flex justify-between")}>
              <span>{g.label}</span>
              <span className="tabular-nums">{g.rows.length}</span>
            </h2>
            <ul className={cn("divide-y rounded-lg border", g.key === "off" && "opacity-60")}>
              {g.rows.map((i) => {
                const d = dueIn(i);
                const needsPay = act(i) && d <= 7;
                return (
                  <li key={i.id} className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => open(i)} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left">
                        <span aria-hidden className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md border text-sm font-medium uppercase">
                          {i.name.slice(0, 1)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{i.name}</span>
                          <span className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] tracking-[0.08em] uppercase">
                            {INTERVALS[i.billing_interval].label} · Due {fmtDate(i.next_due)}
                            {g.key === "overdue" && <Tag tone="out">Overdue</Tag>}
                            {g.key === "soon" && <Tag tone="warn">{d === 0 ? "Due today" : `Due ${d}d`}</Tag>}
                            {!act(i) && <Tag>{i.status}</Tag>}
                          </span>
                        </span>
                        <span className="shrink-0 text-right text-sm">
                          <Money value={i.amount_usd} direction={i.direction} />
                          {(i.billing_interval !== "monthly" || i.currency !== "USD") && (
                            <span className="text-muted-foreground block text-[11px]">
                              {i.currency !== "USD" && `${formatMoney(i.amount, i.currency)} `}
                              {i.billing_interval !== "monthly" && `${formatMoney(monthlyEquivalent(i.amount_usd, i.billing_interval), "USD")}/mo`}
                            </span>
                          )}
                        </span>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-lg" aria-label={`Actions for ${i.name}`} />}>
                          <MoreVertical />
                        </DropdownMenuTrigger>
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
                          <DropdownMenuItem variant="destructive" disabled={pending} onClick={() => setDeleting(i)}>
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {needsPay && (
                      <Button variant="outline" size="sm" className="mt-1 ml-12 h-9" disabled={pending} onClick={() => markPaid(i)}>
                        Mark paid
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      <RecurringDrawer
        open={drawer.open}
        onOpenChange={(o) => setDrawer((s) => ({ ...s, open: o }))}
        item={drawer.item}
        contractors={contractors}
        categories={categories}
        today={today}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Past transactions stay. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                const i = deleting!;
                setDeleting(null);
                run(() => deleteRecurring(i.id), () => "Deleted");
              }}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

function Tag({ tone, children }: { tone?: "out" | "warn"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-sm border px-1.5 py-px text-[10px] leading-4 tracking-[0.08em]",
        tone === "out" && "text-money-out border-current",
        tone === "warn" && "text-warn border-current",
      )}
    >
      {children}
    </span>
  );
}
