import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { PlansNav } from "@/components/shell/plans-nav";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/money";
import { ContractorDrawer } from "@/components/contractors/contractor-drawer";
import { Initials, LABEL, dateLabel } from "@/components/contractors/initials";
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
      <PageHeader title="Contractors" subtitle={`${contractors.length} / PAID YTD IN USD`} actions={<ContractorDrawer>{add}</ContractorDrawer>} />
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
        <ul className="bg-card divide-y rounded-lg border">
          {contractors.map((c) => {
            const s = stats.get(c.id);
            return (
              <li key={c.id}>
                <Link href={`/contractors/${c.id}`} className="hover:bg-muted/50 flex min-h-16 items-center gap-3 px-3 py-2.5">
                  <Initials name={c.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{c.name}</span>
                      {!c.active && <span className="text-muted-foreground rounded-sm border px-1 py-px text-[10px] tracking-[0.08em]">INACTIVE</span>}
                    </div>
                    <p className="text-muted-foreground truncate text-xs">{c.role ?? "—"}</p>
                    <p className={`${LABEL} mt-0.5 text-[10px]`}>{s?.lastPaid ? `LAST PAID ${dateLabel(s.lastPaid)}` : "NOT PAID YET"}</p>
                  </div>
                  <Money value={s?.paidYtdUsd ?? 0} className="text-sm font-medium" hideCents />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
