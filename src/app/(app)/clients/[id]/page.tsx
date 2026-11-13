import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, Plus } from "lucide-react";
import { ClientDrawer } from "@/components/clients/client-drawer";
import { ClientAvatar } from "@/components/clients/client-row";
import { AddEntryDrawer } from "@/components/entry/add-entry-drawer";
import { Money } from "@/components/money";
import { TransactionList } from "@/components/transactions/transaction-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { getCategories, getClientProfit, getClients, getContractors, getRecurring, getSettings, getTransactions, requireUser } from "@/lib/data";
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
  const [clients, profit, txns, recurring, contractors, categories, settings] = await Promise.all([
    getClients(),
    getClientProfit(`${year}-01-01`, `${year}-12-31`),
    getTransactions({ clientId: id, limit: 200 }),
    getRecurring(),
    getContractors(),
    getCategories(),
    getSettings(),
  ]);
  const base = settings.base_currency;
  const client = clients.find((c) => c.id === id);
  if (!client) notFound();
  const p = profit.find((x) => x.client.id === id);
  const inUsd = p?.inUsd ?? 0;
  const outUsd = p?.outUsd ?? 0;
  const margin = p?.marginUsd ?? 0;
  const plans = recurring.filter((r) => r.client_id === id && r.status !== "cancelled");

  return (
    <>
      <Button variant="ghost" className="text-muted-foreground -ml-2 h-11 gap-1 px-2" nativeButton={false} render={<Link href="/clients" />}>
        <ChevronLeft aria-hidden /> Clients
      </Button>
      <header className="flex items-center gap-2.5 pb-4">
        <ClientAvatar client={client} size="default" />
        <h1 className="truncate text-[22px] leading-7 font-semibold tracking-tight">{client.name}</h1>
        {client.archived ? <Badge variant="outline">Archived</Badge> : null}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="label">Margin in {year}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Money
            animate
            secondary
            value={margin}
            currency={base}
            className={`block text-4xl font-semibold tracking-tight ${margin < 0 ? "text-money-out" : margin > 0 ? "text-money-in" : ""}`}
          />
          <Separator className="mt-4" />
          <dl className="grid grid-cols-2 divide-x pt-3">
            <div>
              <dt className="label">In</dt>
              <dd className="mt-0.5 text-lg font-medium">
                <Money value={inUsd} currency={base} direction="in" hideCents />
              </dd>
            </div>
            <div className="pl-4">
              <dt className="label">Out</dt>
              <dd className="mt-0.5 text-lg font-medium">
                <Money value={outUsd} currency={base} hideCents />
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="flex gap-2 py-4">
        <AddEntryDrawer contractors={contractors} categories={categories} clients={clients} defaultClientId={id} baseCurrency={base}>
          <Button size="lg" className="h-11 flex-[2]">
            <Plus /> Add transaction
          </Button>
        </AddEntryDrawer>
        <ClientDrawer client={client}>
          <Button variant="outline" size="lg" className="h-11 flex-1">
            <Pencil /> Edit
          </Button>
        </ClientDrawer>
      </div>

      <h2 className="label pb-2">Retainers and plans</h2>
      {plans.length === 0 ? (
        <Empty className="border p-6">
          <EmptyDescription>
            No recurring plans. Tag a retainer with this client under <Link href="/subscriptions" className="focus-visible:ring-ring/60 rounded-sm outline-none focus-visible:ring-2">Subscriptions</Link>.
          </EmptyDescription>
        </Empty>
      ) : (
        <Card className="gap-0 py-0">
          <ItemGroup className="gap-0 divide-y">
            {plans.map((r) => (
              <Item key={r.id} role="listitem" className="min-h-14 rounded-none px-3 py-2">
                <ItemContent className="min-w-0 gap-0">
                  <ItemTitle className="w-full truncate font-normal">{r.name}</ItemTitle>
                  <ItemDescription className="text-xs">Next due {day(r.next_due)}</ItemDescription>
                </ItemContent>
                <ItemActions className="flex-col items-end gap-0">
                  <Money value={r.amount_base} currency={base} direction={r.direction} className="text-sm font-medium" />
                  <span className="text-muted-foreground text-xs">{INTERVALS[r.billing_interval].label}</span>
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        </Card>
      )}

      <h2 className="label pt-6 pb-2">Transactions</h2>
      <TransactionList transactions={txns} contractors={contractors} categories={categories} filtered={false} />
    </>
  );
}
