import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { PlansNav } from "@/components/shell/plans-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Money } from "@/components/money";
import { ContractorDrawer } from "@/components/contractors/contractor-drawer";
import { dateLabel, initials } from "@/components/contractors/initials";
import { getContractors, getSettings, requireUser } from "@/lib/data";
import { getContractorStats } from "@/lib/contractor-data";

export default async function ContractorsPage() {
  await requireUser();
  const [contractors, stats, settings] = await Promise.all([getContractors(), getContractorStats(), getSettings()]);
  const base = settings.base_currency;
  const add = (
    <Button size="lg" variant="brand" className="h-11 px-4" aria-label="Add contractor">
      <Plus /> <span className="hidden sm:inline">Contractor</span>
    </Button>
  );

  return (
    <>
      <PlansNav />
      <PageHeader
        title="Contractors"
        subtitle={`${contractors.length} ${contractors.length === 1 ? "person" : "people"}, paid this year in ${base}`}
        actions={<ContractorDrawer baseCurrency={base}>{add}</ContractorDrawer>}
      />
      {contractors.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No contractors yet</EmptyTitle>
            <EmptyDescription>Add the people you pay to track payouts and what each costs this year.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <ContractorDrawer baseCurrency={base}>
              <Button variant="outline" size="lg" className="h-11">
                <Plus /> Add contractor
              </Button>
            </ContractorDrawer>
          </EmptyContent>
        </Empty>
      ) : (
        <Card className="gap-0 py-0">
          <ul className="divide-y">
            {contractors.map((c) => {
              const s = stats.get(c.id);
              return (
                <li key={c.id}>
                  <Item
                    render={<Link href={`/contractors/${c.id}`} />}
                    className="min-h-16 flex-nowrap gap-3 rounded-none border-0 focus-visible:ring-inset active:bg-muted"
                  >
                    <ItemMedia>
                      <Avatar size="lg">
                        <AvatarFallback className="text-xs font-medium">{initials(c.name)}</AvatarFallback>
                      </Avatar>
                    </ItemMedia>
                    <ItemContent className="min-w-0 gap-0">
                      <ItemTitle className="w-full">
                        <span className="truncate">{c.name}</span>
                        {!c.active && <Badge variant="secondary">Inactive</Badge>}
                      </ItemTitle>
                      <ItemDescription className="truncate text-xs">{c.role ?? "No role set"}</ItemDescription>
                      <ItemDescription className="mt-0.5 text-xs">{s?.lastPaid ? `Last paid ${dateLabel(s.lastPaid)}` : "Not paid yet"}</ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Money animate value={s?.paidYtdUsd ?? 0} currency={base} className="text-sm font-medium" hideCents />
                    </ItemActions>
                  </Item>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
