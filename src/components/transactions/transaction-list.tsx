"use client";

// Mobile: date-grouped rows with day net [CP-TX][MONZO-ACT][STARLING-TX]; swipe a row left to delete (touch), or use
// the row menu (keyboard). Delete is optimistic with an Undo toast, as in Todoist's undo
// https://mobbin.com/flows/75508f3a-1e8a-4c94-bdaf-2584f4e80f55 . lg+: one table-style grid
// (Date / Description / Category / Type / Amount) [MONARCH-WEB]. Every row opens AddEntryDrawer in edit mode.

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowDownLeftIcon,
  InfinityIcon,
  MoreHorizontalIcon,
  PlusIcon,
  ReceiptIcon,
  RepeatIcon,
  ShoppingBagIcon,
  Trash2Icon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react";
import { AddEntryDrawer } from "@/components/entry/add-entry-drawer";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { deleteTransaction, restoreTransaction } from "@/lib/actions";
import { KINDS, formatMoney } from "@/lib/money";
import type { Client, Contractor, Transaction, TxnKind } from "@/lib/types";
import { SwipeRow } from "./swipe-row";
import { undoToast } from "@/components/motion/undo-toast";

const ICONS: Record<TxnKind, LucideIcon> = {
  subscription: RepeatIcon,
  one_time: ShoppingBagIcon,
  lifetime: InfinityIcon,
  contractor: UserRoundIcon,
  expense: ReceiptIcon,
  income: ArrowDownLeftIcon,
};

const LABEL = "text-muted-foreground text-xs font-medium";
// Shared column template so the lg header lines up with the rows.
const COLS = "lg:grid-cols-[96px_minmax(0,2fr)_minmax(0,1fr)_128px_160px_40px]";

// Built from the YYYY-MM-DD parts so server and client render the same string whatever the time zone.
function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", opts);
}

export function TransactionList({
  transactions,
  contractors,
  categories,
  clients,
  filtered,
}: {
  transactions: Transaction[];
  contractors: Contractor[];
  categories: string[];
  clients?: Client[];
  filtered: boolean;
}) {
  // Rows deleted (hidden at once) or on their way out (fading for ~140ms before they are hidden).
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [leaving, setLeaving] = useState<ReadonlySet<string>>(new Set());
  const [, startTransition] = useTransition();
  // Ids present on first render never animate in; ids that show up later (add, undo, import) do.
  const [seen] = useState(() => new Set(transactions.map((t) => t.id)));
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    const added = transactions.filter((t) => !seen.has(t.id)).map((t) => t.id);
    if (!added.length) return;
    added.forEach((id) => seen.add(id));
    setFresh(new Set(added)); // eslint-disable-line react-hooks/set-state-in-effect -- marks rows for the one-off enter animation
  }, [transactions, seen]);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const flip = (set: ReadonlySet<string>, id: string, on: boolean) => {
    const next = new Set(set);
    if (on) next.add(id);
    else next.delete(id);
    return next;
  };

  function remove(t: Transaction) {
    if (leaving.has(t.id) || hidden.has(t.id)) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setLeaving((s) => flip(s, t.id, true));
    timers.current.push(
      setTimeout(
        () => {
          setHidden((s) => flip(s, t.id, true));
          setLeaving((s) => flip(s, t.id, false));
        },
        reduced ? 0 : 140,
      ),
    );
    startTransition(async () => {
      const res = await deleteTransaction(t.id);
      if (!res.ok) {
        setHidden((s) => flip(s, t.id, false));
        setLeaving((s) => flip(s, t.id, false));
        toast.error(res.error);
        return;
      }
      undoToast(`Deleted ${t.description}`, async () => {
        const r = await restoreTransaction({
          id: t.id,
          date: t.date,
          direction: t.direction,
          kind: t.kind,
          amount: t.amount,
          currency: t.currency,
          fx_rate: t.fx_rate,
          description: t.description,
          category: t.category,
          vendor: t.vendor,
          contractor_id: t.contractor_id,
          client_id: t.client_id,
          recurring_id: t.recurring_id,
          replaces_monthly_usd: t.replaces_monthly_usd,
          notes: t.notes,
        });
        if (r.ok) setHidden((s) => flip(s, t.id, false));
        else toast.error(r.error);
      });
    });
  }

  const visible = transactions.filter((t) => !hidden.has(t.id));

  if (visible.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center text-sm">
        <p>{filtered ? "Nothing matches these filters." : "No transactions yet. Log your first income or expense, or import a CSV."}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {filtered ? (
            <Button variant="outline" className="h-11 rounded-md" nativeButton={false} render={<Link href="/transactions" />}>
              Clear filters
            </Button>
          ) : (
            <Button variant="outline" className="h-11 rounded-md" nativeButton={false} render={<Link href="/import" />}>
              Import CSV
            </Button>
          )}
          <AddEntryDrawer contractors={contractors} categories={categories} clients={clients}>
            <Button className="h-11 rounded-md">
              <PlusIcon /> Add entry
            </Button>
          </AddEntryDrawer>
        </div>
      </div>
    );
  }

  // Rows arrive sorted by date desc, so consecutive runs are the day groups.
  const groups: { date: string; net: number; rows: Transaction[] }[] = [];
  for (const t of visible) {
    let g = groups.at(-1);
    if (!g || g.date !== t.date) groups.push((g = { date: t.date, net: 0, rows: [] }));
    g.rows.push(t);
    g.net += t.direction === "in" ? t.amount_usd : -t.amount_usd;
  }

  return (
    // ponytail: one Drawer root per row; fine at the 500-row query cap, switch to one shared drawer if lists get longer.
    <div className="bg-card divide-y rounded-lg border">
      <div className={`hidden gap-3 px-4 py-2 lg:grid ${COLS} ${LABEL}`}>
        <span>Date</span>
        <span>Description</span>
        <span>Category</span>
        <span>Type</span>
        <span className="text-right">Amount</span>
        <span />
      </div>
      {groups.map((g) => (
        <section key={g.date} aria-label={fmtDate(g.date, { weekday: "long", month: "long", day: "numeric" })} className="divide-y">
          <h2 className={`bg-muted/50 flex items-center justify-between px-4 py-2 lg:hidden ${LABEL}`}>
            <span>{fmtDate(g.date, { weekday: "short", month: "short", day: "numeric" })}</span>
            <Money value={Math.abs(g.net)} direction={g.net >= 0 ? "in" : "out"} className="text-xs" />
          </h2>
          {g.rows.map((t) => {
            const Icon = ICONS[t.kind];
            return (
              <div
                key={t.id}
                className={`transition-[opacity,translate] duration-[var(--dur-fast,140ms)] ease-[var(--ease-in,cubic-bezier(.4,0,1,1))] motion-reduce:transition-none ${
                  leaving.has(t.id) ? "-translate-x-2 opacity-0" : ""
                } ${fresh.has(t.id) ? "animate-in fade-in slide-in-from-top-1 duration-[var(--dur-base,220ms)] motion-reduce:animate-none" : ""}`}
              >
                <SwipeRow label={t.description} onDelete={() => remove(t)}>
                  <div className="hover:bg-muted/50 focus-within:bg-muted/50 relative">
                    <AddEntryDrawer contractors={contractors} categories={categories} clients={clients} transaction={t}>
                      <button
                        type="button"
                        aria-label={`Edit ${t.description}`}
                        className={`grid min-h-16 w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-inset lg:min-h-12 lg:py-2 ${COLS}`}
                      >
                        <span className="text-muted-foreground hidden text-sm tabular-nums lg:block">
                          {fmtDate(t.date, { month: "short", day: "numeric" })}
                        </span>
                        <span className="bg-muted grid size-10 place-items-center rounded-md border lg:hidden">
                          <Icon className="size-4" aria-hidden />
                          <span className="sr-only">{KINDS[t.kind].label}</span>
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[15px] font-medium lg:text-sm">{t.description}</span>
                          <span className="text-muted-foreground block truncate text-xs lg:hidden">{t.vendor ?? t.category}</span>
                          {t.vendor ? <span className="text-muted-foreground hidden truncate text-xs lg:block">{t.vendor}</span> : null}
                        </span>
                        <span className="text-muted-foreground hidden truncate text-sm lg:block">{t.category}</span>
                        <span className="hidden lg:block">
                          <span className="inline-flex h-6 items-center gap-1.5 rounded-sm border px-1.5 text-xs">
                            <Icon className="size-3" aria-hidden />
                            {KINDS[t.kind].label}
                          </span>
                        </span>
                        <span className="text-right">
                          <Money value={t.amount_usd} direction={t.direction} className="block text-[15px] font-medium lg:text-sm" />
                          {t.currency !== "USD" ? (
                            <span className="text-muted-foreground block text-xs tabular-nums">{formatMoney(t.amount, t.currency)}</span>
                          ) : null}
                        </span>
                      </button>
                    </AddEntryDrawer>
                    {/* Keyboard and desktop route to delete. On touch the swipe covers it, so it only shows on focus there. */}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label={`Actions for ${t.description}`}
                        className="focus-visible:ring-ring/60 hover:bg-muted absolute top-1/2 right-2 grid size-10 -translate-y-1/2 place-items-center rounded-md outline-none focus-visible:ring-3 max-lg:sr-only max-lg:focus-visible:not-sr-only max-lg:focus-visible:bg-card max-lg:focus-visible:border"
                      >
                        <MoreHorizontalIcon className="size-4" aria-hidden />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem variant="destructive" onClick={() => remove(t)}>
                          <Trash2Icon /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </SwipeRow>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
