"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, ListOrdered, Plus, Repeat } from "lucide-react";
import { AddEntryDrawer } from "@/components/entry/add-entry-drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Client, Contractor } from "@/lib/types";

const starts = (p: string, ...prefixes: string[]) => prefixes.some((x) => p === x || p.startsWith(x + "/"));

const TABS = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  { href: "/transactions", label: "Activity", icon: ListOrdered, match: (p: string) => starts(p, "/transactions") },
  null, // Add slot
  { href: "/subscriptions", label: "Plans", icon: Repeat, match: (p: string) => starts(p, "/subscriptions", "/lifetime", "/contractors", "/clients") },
  { href: "/reports", label: "Reports", icon: BarChart3, match: (p: string) => starts(p, "/reports", "/budgets") },
];

/** Mobile tab bar [YNAB-BUDGET]: 5 slots, raised square Add in the centre. Hidden on lg+. */
export function BottomBar({
  contractors,
  categories,
  clients,
  baseCurrency,
}: {
  contractors: Contractor[];
  categories: string[];
  clients: Client[];
  baseCurrency: string;
}) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="bg-card fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {TABS.map((t) =>
        t ? (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.match(pathname) ? "page" : undefined}
            className={cn(
              "press focus-visible:ring-ring/60 relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset",
              t.match(pathname) ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {t.match(pathname) ? <span className="bg-brand absolute inset-x-3 top-0 h-0.5" /> : null}
            <t.icon className="size-5" aria-hidden />
            {t.label}
          </Link>
        ) : (
          <div key="add" className="relative flex justify-center">
            <AddEntryDrawer contractors={contractors} categories={categories} clients={clients} baseCurrency={baseCurrency}>
              {/* No tooltip: mobile only, and the label is the glyph everyone reads as "add". */}
              <Button size="icon-lg" aria-label="Add transaction" className="absolute -top-4 size-14 rounded-md border">
                <Plus className="size-6" aria-hidden />
              </Button>
            </AddEntryDrawer>
          </div>
        ),
      )}
    </nav>
  );
}
