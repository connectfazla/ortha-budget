import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { AddEntryDrawer } from "@/components/entry/add-entry-drawer";
import { ContractorMenu } from "@/components/contractors/contractor-menu";
import { Initials, LABEL, dateLabel } from "@/components/contractors/initials";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { getCategories, getClients, getContractor, getContractors, getTransactions, requireUser } from "@/lib/data";
import { formatMoney, todayISO } from "@/lib/money";
import type { Transaction } from "@/lib/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PER = { monthly: " a month", hourly: " an hour", fixed: " fixed" } as const;

export default async function ContractorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [contractor, txns, contractors, categories, allClients] = await Promise.all([
    getContractor(id),
    getTransactions({ contractorId: id, kind: "contractor", limit: 1000 }),
    getContractors(),
    getCategories(),
    getClients(),
  ]);
  const clients = allClients.filter((c) => !c.archived);
  if (!contractor) notFound();

  const today = todayISO();
  const year = today.slice(0, 4);
  const ytd = txns.filter((t) => t.date.startsWith(year)).reduce((s, t) => s + t.amount_usd, 0);
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
        <Initials name={contractor.name} className="size-16 text-base" />
        <div className="min-w-0">
          <h1 className="truncate text-[22px] leading-7 font-semibold tracking-tight">{contractor.name}</h1>
          <p className="text-muted-foreground truncate text-sm">{contractor.role ?? "—"}</p>
          <p className="mt-1 text-sm">
            {contractor.rate != null
              ? `${formatMoney(contractor.rate, contractor.currency)}${PER[contractor.rate_type ?? "monthly"]}`
              : "No rate set"}
            {!contractor.active && <span className="text-muted-foreground ml-2 rounded-sm border px-1 py-px text-xs">Inactive</span>}
          </p>
        </div>
      </header>

      <div className="bg-card shadow-card grid grid-cols-2 divide-x rounded-lg border">
        <div className="p-3">
          <p className={LABEL}>Paid this year</p>
          <Money animate value={ytd} className="mt-1 block text-2xl font-semibold tracking-tight" hideCents />
        </div>
        <div className="p-3">
          <p className={LABEL}>Average per month</p>
          <Money animate value={avg} className="mt-1 block text-2xl font-semibold tracking-tight" hideCents />
        </div>
      </div>

      <div className="flex gap-2 py-4">
        <AddEntryDrawer contractors={contractors} clients={clients} categories={categories} defaultKind="contractor" defaultContractorId={id}>
          <Button size="lg" className="h-11 flex-[2]">
            <Plus /> Record payout
          </Button>
        </AddEntryDrawer>
        <ContractorMenu contractor={contractor} />
      </div>

      <h2 className={`${LABEL} pb-2`}>Payout history</h2>
      {txns.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">No payouts recorded yet.</p>
      ) : (
        [...groups].map(([month, rows]) => (
          <section key={month} className="mb-4">
            <h3 className={`${LABEL} pb-1`}>
              {new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h3>
            <ul className="bg-card divide-y rounded-lg border">
              {rows.map((t) => (
                <li key={t.id}>
                  <AddEntryDrawer contractors={contractors} clients={clients} categories={categories} transaction={t}>
                    <button type="button" className="press focus-visible:ring-ring/50 focus-visible:ring-2 outline-none hover:bg-muted/50 flex min-h-14 w-full items-center justify-between gap-3 px-3 py-2 text-left">
                      <span className="min-w-0">
                        <span className="block truncate text-sm">{t.description}</span>
                        <span className={LABEL}>{dateLabel(t.date)}</span>
                      </span>
                      <span className="text-right">
                        <Money value={t.amount} currency={t.currency} direction={t.direction} className="block text-sm font-medium" />
                        {t.currency !== "USD" && (
                          <span className="text-muted-foreground block text-xs tabular-nums">≈ {formatMoney(t.amount_usd)}</span>
                        )}
                      </span>
                    </button>
                  </AddEntryDrawer>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
