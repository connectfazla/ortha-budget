import Link from "next/link";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PrintButton } from "@/components/annual/print-button";
import { cn } from "@/lib/utils";
import type { getAnnual } from "@/components/annual/annual-data";

type Annual = Awaited<ReturnType<typeof getAnnual>>;

const TH = "label py-2 font-medium";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="gap-2 print:break-inside-avoid print:rounded-none print:border-t">
      <CardHeader className="print:px-0">
        <CardTitle>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="print:px-0">{children}</CardContent>
    </Card>
  );
}

function None({ children }: { children: React.ReactNode }) {
  return (
    <Empty className="items-start p-0 text-left">
      <EmptyDescription>{children}</EmptyDescription>
    </Empty>
  );
}

export function AnnualReport({ a, minYear, maxYear, generated }: { a: Annual; minYear: number; maxYear: number; generated: string }) {
  const m = (value: number, className?: string) => <Money value={value} currency={a.currency} className={className} />;
  const yearLink = (y: number, Icon: typeof ChevronLeft) => (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant="ghost" size="icon-lg" className="hover:bg-card" aria-label={`Year ${y}`} nativeButton={false} render={<Link href={`/reports/annual?year=${y}`} />} />}
      >
        <Icon aria-hidden />
      </TooltipTrigger>
      <TooltipContent>{`Year ${y}`}</TooltipContent>
    </Tooltip>
  );
  const stats = [
    ["Income", a.income],
    ["Costs", a.costs],
    ["Net", a.net],
  ] as const;

  return (
    <div className="annual-doc space-y-4">
      <style>{`
        @page { size: A4; margin: 16mm; }
        @media print {
          aside, nav[aria-label="Primary"], nav.fixed, [data-sonner-toaster] { display: none !important; }
          html, body { background: white !important; color: black !important; }
          .annual-doc, .annual-doc * { color: black !important; background: transparent !important; box-shadow: none !important; }
          .annual-doc tr, .annual-doc table { break-inside: avoid; }
          main > div { max-width: none !important; padding: 0 !important; }
        }
      `}</style>

      <header className="flex flex-wrap items-start justify-between gap-3 pt-2">
        <div>
          <h1 className="text-[22px] leading-7 font-semibold tracking-tight">Annual summary {a.year}</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Generated {generated}. All amounts in {a.currency}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <nav aria-label="Year" className="bg-muted flex items-center gap-1 rounded-md border p-1">
            {a.year > minYear ? yearLink(a.year - 1, ChevronLeft) : null}
            <span aria-current="page" className="bg-card min-w-14 rounded-sm border px-2 py-1.5 text-center text-sm font-medium tabular-nums">
              {a.year}
            </span>
            {a.year < maxYear ? yearLink(a.year + 1, ChevronRight) : null}
          </nav>
          <Button variant="outline" size="lg" nativeButton={false} render={<a href={`/api/report/${a.year}`} download />}>
            <Download aria-hidden />
            CSV
          </Button>
          <PrintButton />
        </div>
      </header>

      {a.empty ? (
        <Empty className="border p-8">
          <EmptyDescription>
            No entries in {a.year}. Pick another year, or <Link href="/transactions" className="focus-visible:ring-ring/60 rounded-sm outline-none focus-visible:ring-2">add entries</Link>.
          </EmptyDescription>
        </Empty>
      ) : (
        <>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {stats.map(([k, v]) => (
              <Card key={k} className="gap-1 px-4 print:rounded-none print:px-0">
                <dt className="label">{k}</dt>
                <dd className="text-2xl font-semibold tracking-tight">
                  {m(v, k === "Income" ? "text-money-in" : k === "Net" && v < 0 ? "text-money-out" : undefined)}
                </dd>
              </Card>
            ))}
          </dl>

          <Section title="Tax set-aside">
            {a.taxRate > 0 ? (
              <p className="text-sm">
                At {a.taxRate}% of income, set aside <span className="font-medium">{m(a.taxSetAside)}</span>.
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                No tax rate saved.{" "}
                <Link href="/profile/money" className="text-foreground focus-visible:ring-ring/60 rounded-sm underline underline-offset-2 outline-none focus-visible:ring-2 print:hidden">
                  Set a tax %
                </Link>
              </p>
            )}
          </Section>

          <Section title="Costs by category">
            {a.categories.length === 0 ? (
              <None>No costs this year.</None>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-right">
                    <th className={cn(TH, "text-left")}>Category</th>
                    <th className={TH}>Share</th>
                    <th className={TH}>Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {a.categories.map((c) => (
                    <tr key={c.category} className="text-right">
                      <td className="py-2 text-left">{c.category}</td>
                      <td className="text-muted-foreground py-2 tabular-nums">{a.costs > 0 ? Math.round((c.total / a.costs) * 100) : 0}%</td>
                      <td className="py-2">{m(c.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section title="By client">
            {a.clients.length === 0 ? (
              <None>No entries are tagged with a client.</None>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-right">
                    <th className={cn(TH, "text-left")}>Client</th>
                    <th className={TH}>Income</th>
                    <th className={TH}>Costs</th>
                    <th className={TH}>Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {a.clients.map((c) => (
                    <tr key={c.client.id} className="text-right">
                      <td className="max-w-0 truncate py-2 text-left">{c.client.name}</td>
                      <td className="py-2">{m(c.inUsd)}</td>
                      <td className="py-2">{m(c.outUsd)}</td>
                      <td className="py-2">{m(c.marginUsd, c.marginUsd < 0 ? "text-money-out" : undefined)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section title="Contractor payouts">
            {a.contractors.length === 0 ? (
              <None>No contractor payouts this year.</None>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-right">
                    <th className={cn(TH, "text-left")}>Contractor</th>
                    <th className={TH}>Payments</th>
                    <th className={TH}>Total paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {a.contractors.map((c) => (
                    <tr key={c.id} className="text-right">
                      <td className="max-w-0 truncate py-2 text-left">{c.name}</td>
                      <td className="py-2 tabular-nums">{c.count}</td>
                      <td className="py-2">{m(c.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section title="Lifetime deals bought">
            {a.lifetime.length === 0 ? (
              <None>No lifetime deals bought this year.</None>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-right">
                    <th className={cn(TH, "text-left")}>Deal</th>
                    <th className={cn(TH, "text-left")}>Date</th>
                    <th className={TH}>Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {a.lifetime.map((t) => (
                    <tr key={t.id} className="text-right">
                      <td className="max-w-0 truncate py-2 text-left">{t.description}</td>
                      <td className="py-2 text-left font-mono text-xs">{t.date}</td>
                      <td className="py-2">{m(t.amount_base)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        </>
      )}

      <p className="text-muted-foreground pt-2 text-xs">This is a summary of your entries, not tax advice. Check figures with an accountant before filing.</p>
    </div>
  );
}
