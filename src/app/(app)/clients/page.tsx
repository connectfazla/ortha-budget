import { PlusIcon } from "lucide-react";
import { ClientDrawer } from "@/components/clients/client-drawer";
import { ClientRow } from "@/components/clients/client-row";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { ItemGroup } from "@/components/ui/item";
import { getClientProfit, getClients, getSettings, requireUser } from "@/lib/data";
import { todayISO } from "@/lib/money";

export default async function ClientsPage() {
  await requireUser();
  const year = todayISO().slice(0, 4);
  const [profit, clients, settings] = await Promise.all([getClientProfit(`${year}-01-01`, `${year}-12-31`), getClients(), getSettings()]);
  const base = settings.base_currency;
  const byId = new Map(profit.map((p) => [p.client.id, p]));
  const rows = clients.map((client) => ({ client, inUsd: byId.get(client.id)?.inUsd ?? 0, outUsd: byId.get(client.id)?.outUsd ?? 0, marginUsd: byId.get(client.id)?.marginUsd ?? 0 }));
  const active = rows.filter((r) => !r.client.archived).sort((a, b) => b.marginUsd - a.marginUsd);
  const archived = rows.filter((r) => r.client.archived);

  const add = (
    <ClientDrawer>
      <Button className="h-11">
        <PlusIcon /> Add client
      </Button>
    </ClientDrawer>
  );
  const list = (items: typeof rows) => (
    <Card className="gap-0 py-0">
      <ItemGroup className="gap-0 divide-y">
        {items.map((r) => (
          <ClientRow key={r.client.id} {...r} currency={base} />
        ))}
      </ItemGroup>
    </Card>
  );

  return (
    <>
      <PageHeader title="Clients" subtitle={`Margin per client in ${year}`} actions={clients.length ? add : undefined} />
      {clients.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>No clients yet</EmptyTitle>
            <EmptyDescription>Add your first client to see which ones make you money.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{add}</EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="label hidden grid-cols-[auto_minmax(0,1fr)_7rem_7rem_8rem] gap-x-3 px-3 pb-2 lg:grid">
            <span className="w-6" />
            <span>Client</span>
            <span className="text-right">In</span>
            <span className="text-right">Out</span>
            <span className="text-right">Margin</span>
          </div>
          {active.length ? (
            list(active)
          ) : (
            <Empty className="border p-6">
              <EmptyDescription>All your clients are archived.</EmptyDescription>
            </Empty>
          )}
          {archived.length ? (
            // Native disclosure: no Collapsible in src/components/ui, and <details> needs no JS.
            <details className="group mt-6">
              <summary className="label hover:text-foreground focus-visible:ring-ring/50 flex h-11 cursor-pointer items-center rounded-md outline-none focus-visible:ring-3">
                Archived ({archived.length})
              </summary>
              {list(archived)}
            </details>
          ) : null}
        </>
      )}
    </>
  );
}
