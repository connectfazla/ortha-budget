import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { PlansNav } from "@/components/shell/plans-nav";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/money";
import { ContractorDrawer } from "@/components/contractors/contractor-drawer";
import { Initials, dateLabel } from "@/components/contractors/initials";
import { getContractors, requireUser } from "@/lib/data";
import { getContractorStats } from "@/lib/contractor-data";

export default async function ContractorsPage() {
  await requireUser();
  const [contractors, stats] = await Promise.all([getContractors(), getContractorStats()]);
  const add = (
    <Button size="lg" className="h-11" aria-label="Add contractor">
      <Plus /> <span className="hidden sm:inline">Contractor</span>
    </Button>
  );

  return (
    <>
      <PlansNav />
      <PageHeader
        title="Contractors"
        subtitle={`${contractors.length} ${contractors.length === 1 ? "person" : "people"}, paid this year in USD`}
        actions={<ContractorDrawer>{add}</ContractorDrawer>}
      />
      {contractors.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
          <Users className="text-muted-foreground size-6" />
          <p className="text-muted-foreground text-sm">No contractors yet.</p>
          <ContractorDrawer>
            <Button variant="outline" size="lg" className="h-11">
              <Plus /> Add contractor
            </Button>
          </ContractorDrawer>
        </div>
      ) : (
        <ul className="bg-card shadow-card divide-y rounded-lg border">
          {contractors.map((c) => {
            const s = stats.get(c.id);
            return (
              <li key={c.id}>
                <Link href={`/contractors/${c.id}`} className="press focus-visible:ring-ring/50 focus-visible:ring-2 outline-none hover:bg-muted/50 flex min-h-16 items-center gap-3 px-3 py-2.5">
                  <Initials name={c.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{c.name}</span>
                      {!c.active && <span className="text-muted-foreground rounded-sm border px-1 py-px text-xs">Inactive</span>}
                    </div>
                    <p className="text-muted-foreground truncate text-xs">{c.role ?? "No role set"}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">{s?.lastPaid ? `Last paid ${dateLabel(s.lastPaid)}` : "Not paid yet"}</p>
                  </div>
                  <Money animate value={s?.paidYtdUsd ?? 0} className="text-sm font-medium" hideCents />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
