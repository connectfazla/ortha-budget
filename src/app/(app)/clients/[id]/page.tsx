import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, Plus } from "lucide-react";
import { ClientDrawer } from "@/components/clients/client-drawer";
import { Swatch } from "@/components/clients/client-row";
import { AddEntryDrawer } from "@/components/entry/add-entry-drawer";
import { Money } from "@/components/money";
import { TransactionList } from "@/components/transactions/transaction-list";
import { Button } from "@/components/ui/button";
import { getCategories, getClientProfit, getClients, getContractors, getRecurring, getTransactions, requireUser } from "@/lib/data";
import { INTERVALS, todayISO } from "@/lib/money";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const day = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const year = todayISO().slice(0, 4);
  const [clients, profit, txns, recurring, contractors, categories] = await Promise.all([
    getClients(),
    getClientProfit(`${year}-01-01`, `${year}-12-31`),
    getTransactions({ clientId: id, limit: 200 }),
    getRecurring(),
    getContractors(),
    getCategories(),
  ]);
  const client = clients.find((c) => c.id === id);
  if (!client) notFound();
  const p = profit.find((x) => x.client.id === id);
  const inUsd = p?.inUsd ?? 0;
  const outUsd = p?.outUsd ?? 0;
  const margin = p?.marginUsd ?? 0;
  const plans = recurring.filter((r) => r.client_id === id && r.status !== "cancelled");

  return (
    <>
      <Link href="/clients" className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 rounded-sm outline-none focus-visible:ring-3 -ml-1 flex h-11 items-center gap-1 text-sm">
        <ChevronLeft className="size-4" aria-hidden /> Clients
      </Link>
      <header className="flex items-center gap-2.5 pb-4">
        <Swatch color={client.color} className="size-4" />
        <h1 className="truncate text-[22px] leading-7 font-semibold tracking-tight">{client.name}</h1>
        {client.archived ? <span className="text-muted-foreground rounded-sm border px-1.5 py-px text-xs">Archived</span> : null}
      </header>

      <section aria-label={`${client.name} margin in ${year}`} className="bg-card rounded-lg border p-4">
        <p className="label">Margin in {year}</p>
        <Money
          animate
          value={margin}
          className={`mt-1 block text-4xl font-semibold tracking-tight ${margin < 0 ? "text-money-out" : margin > 0 ? "text-money-in" : ""}`}
        />
        <dl className="mt-4 grid grid-cols-2 divide-x border-t pt-3">
          <div>
            <dt className="label">In</dt>
            <dd className="mt-0.5 text-lg font-medium">
              <Money value={inUsd} direction="in" hideCents />
            </dd>
          </div>
          <div className="pl-4">
            <dt className="label">Out</dt>
            <dd className="mt-0.5 text-lg font-medium">
              <Money value={outUsd} hideCents />
            </dd>
          </div>
        </dl>
      </section>

      <div className="flex gap-2 py-4">
        <AddEntryDrawer contractors={contractors} categories={categories} clients={clients} defaultClientId={id}>
          <Button size="lg" className="press h-11 flex-[2]">
            <Plus /> Add transaction
          </Button>
        </AddEntryDrawer>
        <ClientDrawer client={client}>
          <Button variant="outline" size="lg" className="press h-11 flex-1">
            <Pencil /> Edit
          </Button>
        </ClientDrawer>
      </div>

      <h2 className="label pb-2">Retainers and plans</h2>
      {plans.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          No recurring plans. Tag a retainer with this client under{" "}
          <Link href="/subscriptions" className="text-foreground focus-visible:ring-ring/50 rounded-sm outline-none focus-visible:ring-3 underline underline-offset-2">
            Subscriptions
          </Link>
          .
        </p>
      ) : (
        <ul className="bg-card divide-y rounded-lg border">
          {plans.map((r) => (
            <li key={r.id} className="flex min-h-14 items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0">
                <span className="block truncate text-sm">{r.name}</span>
                <span className="text-muted-foreground block text-xs">Next due {day(r.next_due)}</span>
              </span>
              <span className="text-right">
                <Money value={r.amount} currency={r.currency} direction={r.direction} className="block text-sm font-medium" />
                <span className="text-muted-foreground block text-xs">{INTERVALS[r.billing_interval].label}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <h2 className="label pt-6 pb-2">Transactions</h2>
      <TransactionList transactions={txns} contractors={contractors} categories={categories} filtered={false} />
    </>
  );
}
