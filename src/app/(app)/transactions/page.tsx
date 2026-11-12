import { Money } from "@/components/money";
import { PageHeader } from "@/components/shell/page-header";
import { TransactionFilters, type Filters } from "@/components/transactions/transaction-filters";
import { TransactionList } from "@/components/transactions/transaction-list";
import { getCategories, getContractors, getTransactionTotals, getTransactions, requireUser } from "@/lib/data";
import { KINDS, isMonthKey } from "@/lib/money";
import type { TxnKind } from "@/lib/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Only whitelisted values get through; anything else is dropped, never passed to a query. */
function parseFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const q = one("q")?.trim().slice(0, 80);
  const month = one("month");
  const kind = one("kind");
  const direction = one("direction");
  return {
    q: q || undefined,
    month: isMonthKey(month) ? month : undefined,
    kind: kind && Object.hasOwn(KINDS, kind) ? (kind as TxnKind) : undefined,
    direction: direction === "in" || direction === "out" ? direction : undefined,
  };
}

export default async function TransactionsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser();
  const filters = parseFilters(await searchParams);
  const [transactions, totals, contractors, categories] = await Promise.all([
    getTransactions(filters),
    getTransactionTotals(filters),
    getContractors(),
    getCategories(),
  ]);

  const { count, inUsd, outUsd } = totals;
  const filtered = Boolean(filters.q || filters.month || filters.kind || filters.direction);

  return (
    <>
      <PageHeader title="Transactions" subtitle={`${count} ${count === 1 ? "entry" : "entries"}`} />
      <TransactionFilters filters={filters} />

      {/* [VIVID-TL] summary for the filtered set */}
      <p className="text-muted-foreground mb-3 flex gap-4 text-[11px] font-medium tracking-[0.08em] uppercase">
        <span>
          In <Money value={inUsd} direction="in" className="ml-1 text-sm tracking-normal" />
        </span>
        <span>
          Out <Money value={outUsd} direction="out" className="text-foreground ml-1 text-sm tracking-normal" />
        </span>
      </p>

      <TransactionList transactions={transactions} contractors={contractors} categories={categories} filtered={filtered} />
      {count > transactions.length && (
        <p className="text-muted-foreground mt-3 text-center text-xs">Showing {transactions.length} of {count}</p>
      )}
    </>
  );
}
