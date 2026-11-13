import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Plus, ReceiptIcon } from "lucide-react";
import { AddEntryDrawer } from "@/components/entry/add-entry-drawer";
import { ContractorMenu } from "@/components/contractors/contractor-menu";
import { dateLabel, initials } from "@/components/contractors/initials";
import { Money } from "@/components/money";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import { getCategories, getClients, getContractor, getContractors, getSettings, getTransactions, requireUser } from "@/lib/data";
import { formatMoney, todayISO } from "@/lib/money";
import type { Transaction } from "@/lib/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PER = { monthly: " a month", hourly: " an hour", fixed: " fixed" } as const;

export default async function ContractorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [contractor, txns, contractors, categories, allClients, settings] = await Promise.all([
    getContractor(id),
    getTransactions({ contractorId: id, kind: "contractor", limit: 1000 }),
    getContractors(),
    getCategories(),
    getClients(),
    getSettings(),
  ]);
  const base = settings.base_currency;
  const clients = allClients.filter((c) => !c.archived);
  if (!contractor) notFound();

  const today = todayISO();
  const year = today.slice(0, 4);
  const ytd = txns.filter((t) => t.date.startsWith(year)).reduce((s, t) => s + t.amount_base, 0);
  const avg = ytd / Number(today.slice(5, 7));

  const groups = new Map<string, Transaction[]>();
  for (const t of txns) {
    const k = t.date.slice(0, 7);
    groups.set(k, [...(groups.get(k) ?? []), t]);
  }

  return (
    <>
      <Link href="/contractors" className="text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 outline-none -ml-1 flex h-11 items-center gap-1 text-sm">
        <ChevronLeft className="size-4" /> Contractors
      </Link>
      <header className="flex items-center gap-4 pb-4">
        <Avatar className="size-16">
          <AvatarFallback className="text-base font-medium">{initials(contractor.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="truncate text-[22px] leading-7 font-semibold tracking-tight">{contractor.name}</h1>
          <p className="text-muted-foreground truncate text-sm">{contractor.role ?? "No role set"}</p>
          <p className="mt-1 text-sm">
            {contractor.rate != null
              ? `${formatMoney(contractor.rate, contractor.currency)}${PER[contractor.rate_type ?? "monthly"]}`
              : "No rate set"}
            {!contractor.active && (
              <Badge variant="secondary" className="ml-2">
                Inactive
              </Badge>
            )}
          </p>
        </div>
      </header>

      <Card className="grid grid-cols-2 gap-0 divide-x py-0">
        <div className="p-3">
          <p className="label">Paid this year</p>
          <Money animate value={ytd} currency={base} className="mt-1 block text-2xl font-semibold tracking-tight" hideCents />
        </div>
        <div className="p-3">
          <p className="label">Average per month</p>
          <Money animate value={avg} currency={base} className="mt-1 block text-2xl font-semibold tracking-tight" hideCents />
        </div>
      </Card>

      <div className="flex gap-2 py-4">
        <AddEntryDrawer contractors={contractors} clients={clients} categories={categories} defaultKind="contractor" defaultContractorId={id} baseCurrency={base}>
          <Button size="lg" className="h-11 flex-[2]">
            <Plus /> Record payout
          </Button>
        </AddEntryDrawer>
        <ContractorMenu contractor={contractor} />
      </div>

      <h2 className="label pb-2">Payout history</h2>
      {txns.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ReceiptIcon />
            </EmptyMedia>
            <EmptyTitle>No payouts recorded yet</EmptyTitle>
            <EmptyDescription>Record a payout to start this history.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        [...groups].map(([month, rows]) => (
          <section key={month} className="mb-4">
            <h3 className="label pb-1">
              {new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h3>
            <Card className="gap-0 py-0">
              <ul className="divide-y">
                {rows.map((t) => (
                  <li key={t.id}>
                    <AddEntryDrawer contractors={contractors} clients={clients} categories={categories} transaction={t} baseCurrency={base}>
                      <Item
                        render={<button type="button" />}
                        className="min-h-14 flex-nowrap rounded-none border-0 text-left hover:bg-muted/50 focus-visible:ring-inset active:bg-muted"
                      >
                        <ItemContent className="min-w-0 gap-0">
                          <ItemTitle className="w-full font-normal">
                            <span className="truncate">{t.description}</span>
                          </ItemTitle>
                          <ItemDescription className="text-xs">{dateLabel(t.date)}</ItemDescription>
                        </ItemContent>
                        <ItemActions className="flex-col items-end gap-0 text-right">
                          <Money value={t.amount} currency={t.currency} direction={t.direction} className="block text-sm font-medium" />
                          {t.currency !== base && (
                            <span className="text-muted-foreground block text-xs tabular-nums">≈ {formatMoney(t.amount_base, base)}</span>
                          )}
                        </ItemActions>
                      </Item>
                    </AddEntryDrawer>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        ))
      )}
    </>
  );
}
