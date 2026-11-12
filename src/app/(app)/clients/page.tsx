import { PlusIcon } from "lucide-react";
import { ClientDrawer } from "@/components/clients/client-drawer";
import { ClientRow } from "@/components/clients/client-row";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { getClientProfit, getClients, requireUser } from "@/lib/data";
import { todayISO } from "@/lib/money";

export default async function ClientsPage() {
  await requireUser();
  const year = todayISO().slice(0, 4);
  const [profit, clients] = await Promise.all([getClientProfit(`${year}-01-01`, `${year}-12-31`), getClients()]);
  const byId = new Map(profit.map((p) => [p.client.id, p]));
  const rows = clients.map((client) => ({ client, inUsd: byId.get(client.id)?.inUsd ?? 0, outUsd: byId.get(client.id)?.outUsd ?? 0, marginUsd: byId.get(client.id)?.marginUsd ?? 0 }));
  const active = rows.filter((r) => !r.client.archived).sort((a, b) => b.marginUsd - a.marginUsd);
  const archived = rows.filter((r) => r.client.archived);

  const add = (
    <ClientDrawer>
      <Button className="press h-11">
        <PlusIcon /> Add client
      </Button>
    </ClientDrawer>
  );

  return (
    <>
      <PageHeader title="Clients" subtitle={`Margin per client in ${year}`} actions={clients.length ? add : undefined} />
      {clients.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center text-sm">
          <p>Add your first client to see which ones make you money.</p>
          {add}
        </div>
      ) : (
        <>
          <div className="label hidden grid-cols-[auto_minmax(0,1fr)_7rem_7rem_8rem] gap-x-3 px-3 pb-2 lg:grid">
            <span className="w-3" />
            <span>Client</span>
            <span className="text-right">In</span>
            <span className="text-right">Out</span>
            <span className="text-right">Margin</span>
          </div>
          {active.length ? (
            <ul className="bg-card divide-y rounded-lg border">{active.map((r) => <ClientRow key={r.client.id} {...r} />)}</ul>
          ) : (
            <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">All your clients are archived.</p>
          )}
          {archived.length ? (
            <details className="group mt-6">
              <summary className="label hover:text-foreground focus-visible:ring-ring/50 flex h-11 cursor-pointer items-center rounded-md outline-none focus-visible:ring-3">
                Archived ({archived.length})
              </summary>
              <ul className="bg-card divide-y rounded-lg border">{archived.map((r) => <ClientRow key={r.client.id} {...r} />)}</ul>
            </details>
          ) : null}
        </>
      )}
    </>
  );
}
