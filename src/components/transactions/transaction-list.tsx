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
  ListIcon,
  MoreHorizontalIcon,
  PaperclipIcon,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  receiptCounts,
  baseCurrency: base = "USD",
}: {
  transactions: Transaction[];
  contractors: Contractor[];
  categories: string[];
  clients?: Client[];
  filtered: boolean;
  /** Transaction id to receipt count; rows with a count show a paperclip. */
  receiptCounts?: Record<string, number>;
  /** The user's base currency (settings); amount_base is in it. */
  baseCurrency?: string;
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
          replaces_monthly: t.replaces_monthly,
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
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ListIcon />
          </EmptyMedia>
          <EmptyTitle>{filtered ? "Nothing matches these filters" : "No transactions yet"}</EmptyTitle>
          <EmptyDescription>
            {filtered ? "Clear the filters or try another search." : "Log your first income or expense, or import a CSV."}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row flex-wrap justify-center gap-2">
          {filtered ? (
            <Button variant="outline" className="h-11" nativeButton={false} render={<Link href="/transactions" />}>
              Clear filters
            </Button>
          ) : (
            <Button variant="outline" className="h-11" nativeButton={false} render={<Link href="/import" />}>
              Import CSV
            </Button>
          )}
          <AddEntryDrawer contractors={contractors} categories={categories} clients={clients} baseCurrency={base}>
            <Button className="h-11">
              <PlusIcon /> Add entry
            </Button>
          </AddEntryDrawer>
        </EmptyContent>
      </Empty>
    );
  }

  // Rows arrive sorted by date desc, so consecutive runs are the day groups.
  const groups: { date: string; net: number; rows: Transaction[] }[] = [];
  for (const t of visible) {
    let g = groups.at(-1);
    if (!g || g.date !== t.date) groups.push((g = { date: t.date, net: 0, rows: [] }));
    g.rows.push(t);
    g.net += t.direction === "in" ? t.amount_base : -t.amount_base;
  }

  return (
    // ponytail: one Drawer root per row; fine at the 500-row query cap, switch to one shared drawer if lists get longer.
    <Card className="gap-0 py-2 lg:divide-y lg:py-0">
      <div className={`hidden gap-3 px-4 py-2 lg:grid ${COLS} ${LABEL}`}>
        <span>Date</span>
        <span>Description</span>
        <span>Category</span>
        <span>Type</span>
        <span className="text-right">Amount</span>
        <span />
      </div>
      {groups.map((g) => (
        <section key={g.date} aria-label={fmtDate(g.date, { weekday: "long", month: "long", day: "numeric" })} className="lg:divide-y">
          <h2 className="flex items-center justify-between px-4 pt-3 pb-1 text-[15px] font-bold tracking-tight lg:hidden">
            <span>{fmtDate(g.date, { weekday: "short", month: "short", day: "numeric" })}</span>
            <Money value={Math.abs(g.net)} currency={base} direction={g.net >= 0 ? "in" : "out"} className="text-muted-foreground text-[13px] font-semibold" />
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
                    <AddEntryDrawer contractors={contractors} categories={categories} clients={clients} transaction={t} baseCurrency={base}>
                      <Item
                        render={<button type="button" aria-label={`Edit ${t.description}`} />}
                        className={`grid min-h-16 grid-cols-[40px_minmax(0,1fr)_auto] gap-3 rounded-none border-0 px-4 py-2.5 text-left focus-visible:ring-inset lg:min-h-12 lg:py-2 ${COLS}`}
                      >
                        <span className="text-muted-foreground hidden text-sm tabular-nums lg:block">
                          {fmtDate(t.date, { month: "short", day: "numeric" })}
                        </span>
                        <ItemMedia variant="circle" className="lg:hidden">
                          <Icon aria-hidden />
                          <span className="sr-only">{KINDS[t.kind].label}</span>
                        </ItemMedia>
                        <ItemContent className="min-w-0 gap-0">
                          <ItemTitle className="w-full gap-1.5 text-[15px] lg:text-sm">
                            <span className="truncate">{t.description}</span>
                            {receiptCounts?.[t.id] ? (
                              <>
                                <PaperclipIcon className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
                                <span className="sr-only">{receiptCounts[t.id]} {receiptCounts[t.id] === 1 ? "receipt" : "receipts"}</span>
                              </>
                            ) : null}
                          </ItemTitle>
                          <ItemDescription className="truncate text-[13px] lg:hidden">{t.vendor ?? t.category}</ItemDescription>
                          {t.vendor ? <ItemDescription className="hidden truncate text-xs lg:block">{t.vendor}</ItemDescription> : null}
                        </ItemContent>
                        <span className="text-muted-foreground hidden truncate text-sm lg:block">{t.category}</span>
                        <span className="hidden lg:block">
                          <Badge variant="outline">
                            <Icon data-icon="inline-start" aria-hidden />
                            {KINDS[t.kind].label}
                          </Badge>
                        </span>
                        <ItemActions className="flex-col items-end gap-0 text-right">
                          <Money secondary value={t.amount_base} currency={base} direction={t.direction} className="block text-[15px] font-semibold lg:text-sm" />
                          {t.currency !== base ? (
                            <span className="text-muted-foreground block text-xs tabular-nums">{formatMoney(t.amount, t.currency)}</span>
                          ) : null}
                        </ItemActions>
                      </Item>
                    </AddEntryDrawer>
                    {/* Keyboard and desktop route to delete. On touch the swipe covers it, so it only shows on focus there. */}
                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-lg"
                                  aria-label={`Actions for ${t.description}`}
                                  className="absolute top-1/2 right-2 size-10 -translate-y-1/2 max-lg:sr-only max-lg:focus-visible:not-sr-only max-lg:focus-visible:border max-lg:focus-visible:bg-card"
                                />
                              }
                            />
                          }
                        >
                          <MoreHorizontalIcon aria-hidden />
                        </TooltipTrigger>
                        <TooltipContent>Actions</TooltipContent>
                      </Tooltip>
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
    </Card>
  );
}
