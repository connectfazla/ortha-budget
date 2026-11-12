"use client";

// Mobile: date-grouped rows with day net [CP-TX][MONZO-ACT][STARLING-TX]. lg+: one table-style grid
// (Date / Description / Category / Type / Amount) [MONARCH-WEB]. Every row opens AddEntryDrawer in edit mode.

import Link from "next/link";
import {
  ArrowDownLeftIcon,
  InfinityIcon,
  PlusIcon,
  ReceiptIcon,
  RepeatIcon,
  ShoppingBagIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react";
import { AddEntryDrawer } from "@/components/entry/add-entry-drawer";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { KINDS, formatMoney } from "@/lib/money";
import type { Contractor, Transaction, TxnKind } from "@/lib/types";

const ICONS: Record<TxnKind, LucideIcon> = {
  subscription: RepeatIcon,
  one_time: ShoppingBagIcon,
  lifetime: InfinityIcon,
  contractor: UserRoundIcon,
  expense: ReceiptIcon,
  income: ArrowDownLeftIcon,
};

const LABEL = "text-muted-foreground text-[11px] font-medium tracking-[0.08em] uppercase";
// Shared column template so the lg header lines up with the rows.
const COLS = "lg:grid-cols-[96px_minmax(0,2fr)_minmax(0,1fr)_128px_160px]";

// Built from the YYYY-MM-DD parts so server and client render the same string whatever the time zone.
function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", opts);
}

export function TransactionList({
  transactions,
  contractors,
  categories,
  filtered,
}: {
  transactions: Transaction[];
  contractors: Contractor[];
  categories: string[];
  filtered: boolean;
}) {
  if (transactions.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center text-sm">
        <p>{filtered ? "Nothing matches these filters." : "No transactions yet. Log your first income or expense."}</p>
        <div className="flex gap-2">
          {filtered ? (
            <Button variant="outline" className="h-11 rounded-md" nativeButton={false} render={<Link href="/transactions" />}>
              Clear filters
            </Button>
          ) : null}
          <AddEntryDrawer contractors={contractors} categories={categories}>
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
  for (const t of transactions) {
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
      </div>
      {groups.map((g) => (
        <section key={g.date} aria-label={fmtDate(g.date, { weekday: "long", month: "long", day: "numeric" })} className="divide-y">
          <h2 className={`bg-muted/50 flex items-center justify-between px-4 py-2 lg:hidden ${LABEL}`}>
            <span>{fmtDate(g.date, { weekday: "short", month: "short", day: "numeric" })}</span>
            <Money value={Math.abs(g.net)} direction={g.net >= 0 ? "in" : "out"} className="text-[11px] tracking-normal" />
          </h2>
          {g.rows.map((t) => {
            const Icon = ICONS[t.kind];
            return (
              <AddEntryDrawer key={t.id} contractors={contractors} categories={categories} transaction={t}>
                <button
                  type="button"
                  aria-label={`Edit ${t.description}`}
                  className={`hover:bg-muted/50 focus-visible:bg-muted/50 grid min-h-16 w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 text-left outline-none lg:min-h-12 lg:py-2 ${COLS}`}
                >
                  <span className="text-muted-foreground hidden text-sm tabular-nums lg:block">
                    {fmtDate(t.date, { month: "short", day: "numeric" })}
                  </span>
                  <span className="bg-muted grid size-10 place-items-center rounded-md border lg:hidden">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-medium lg:text-sm">{t.description}</span>
                    <span className="text-muted-foreground block truncate text-xs lg:hidden">
                      <span className="tracking-[0.08em] uppercase">{KINDS[t.kind].label}</span> · {t.vendor ?? t.category}
                    </span>
                    {t.vendor ? <span className="text-muted-foreground hidden truncate text-xs lg:block">{t.vendor}</span> : null}
                  </span>
                  <span className="text-muted-foreground hidden truncate text-sm lg:block">{t.category}</span>
                  <span className="hidden lg:block">
                    <span className="inline-flex h-6 items-center gap-1.5 rounded-sm border px-1.5 text-[10px] tracking-[0.08em] uppercase">
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
            );
          })}
        </section>
      ))}
    </div>
  );
}
