import { Money } from "@/components/money";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shell/page-header";
import { TransactionFilters, type Filters } from "@/components/transactions/transaction-filters";
import { TransactionList } from "@/components/transactions/transaction-list";
import { getAttachmentCounts, getCategories, getClients, getContractors, getSettings, getTransactionTotals, getTransactions, requireUser } from "@/lib/data";
import { KINDS, isMonthKey } from "@/lib/money";
import type { TxnKind } from "@/lib/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Only whitelisted values get through; anything else is dropped, never passed to a query. */
const isoDay = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().startsWith(v) ? v : undefined);

function parseFilters(sp: Record<string, string | string[] | undefined>, clientIds: Set<string>): Filters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const q = one("q")?.trim().slice(0, 80);
  const month = one("month");
  const kind = one("kind");
  const direction = one("direction");
  return {
    q: q || undefined,
    month: isMonthKey(month) ? month : undefined,
    kind: kind && Object.hasOwn(KINDS, kind) ? (kind as TxnKind) : undefined,
    clientId: clientIds.has(one("clientId") ?? "") ? one("clientId") : undefined,
    from: isoDay(one("from")),
    to: isoDay(one("to")),
    direction: direction === "in" || direction === "out" ? direction : undefined,
  };
}

export default async function TransactionsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser();
  const [sp, clients] = await Promise.all([searchParams, getClients()]);
  const filters = parseFilters(sp, new Set(clients.map((c) => c.id)));
  const [transactions, totals, contractors, categories, receiptCounts, settings] = await Promise.all([
    getTransactions(filters),
    getTransactionTotals(filters),
    getContractors(),
    getCategories(),
    getAttachmentCounts(),
    getSettings(),
  ]);
  const base = settings.base_currency;
  const activeClients = clients.filter((c) => !c.archived || c.id === filters.clientId);

  const { count, inUsd, outUsd } = totals;
  const filtered = Boolean(filters.q || filters.month || filters.kind || filters.direction || filters.clientId || filters.from || filters.to);

  return (
    <>
      <PageHeader title="Transactions" subtitle={`${count} ${count === 1 ? "entry" : "entries"}`}
        actions={
          <Button variant="outline" className="h-11 rounded-md" nativeButton={false} render={<Link href="/import" />}>
            Import CSV
          </Button>
        }
      />
      <TransactionFilters filters={filters} clients={activeClients} />

      {/* [VIVID-TL] summary for the filtered set */}
      <p className="text-muted-foreground mb-3 flex gap-4 text-xs font-medium">
        <span>
          In <Money value={inUsd} currency={base} direction="in" className="ml-1 text-sm" />
        </span>
        <span>
          Out <Money value={outUsd} currency={base} direction="out" className="text-foreground ml-1 text-sm" />
        </span>
      </p>

      <TransactionList transactions={transactions} contractors={contractors} categories={categories} clients={activeClients} filtered={filtered} receiptCounts={Object.fromEntries(receiptCounts)} baseCurrency={base} />
      {count > transactions.length && (
        <p className="text-muted-foreground mt-3 text-center text-xs">Showing {transactions.length} of {count}</p>
      )}
    </>
  );
}
