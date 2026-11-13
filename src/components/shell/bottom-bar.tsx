"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListOrdered, Plus, Repeat, UserRound } from "lucide-react";
import { AddEntryDrawer } from "@/components/entry/add-entry-drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Client, Contractor } from "@/lib/types";

const starts = (p: string, ...prefixes: string[]) => prefixes.some((x) => p === x || p.startsWith(x + "/"));

const TABS = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  { href: "/transactions", label: "Transactions", icon: ListOrdered, match: (p: string) => starts(p, "/transactions") },
  null, // Add slot
  { href: "/subscriptions", label: "Plans", icon: Repeat, match: (p: string) => starts(p, "/subscriptions", "/lifetime", "/contractors", "/clients") },
  // Profile also holds what used to be the Reports tab, plus import and the old /settings path [Chime Profile tab].
  { href: "/profile", label: "Profile", icon: UserRound, match: (p: string) => starts(p, "/profile", "/reports", "/budgets", "/import", "/settings") },
];

/** Mobile tab bar [Revolut iOS tab bar]: icons over labels, the active tab in brand blue, a round blue Add in the centre. Hidden on lg+. */
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
      className="bg-card/85 fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_0_var(--elev-edge)] backdrop-blur-xl backdrop-saturate-150 lg:hidden"
    >
      {TABS.map((t) =>
        t ? (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.match(pathname) ? "page" : undefined}
            className={cn(
              "press focus-visible:ring-ring/60 relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-inset",
              t.match(pathname) ? "text-brand" : "text-muted-foreground",
            )}
          >
            <t.icon className="size-6" strokeWidth={t.match(pathname) ? 2.25 : 1.75} aria-hidden />
            {t.label}
          </Link>
        ) : (
          <div key="add" className="flex items-center justify-center">
            <AddEntryDrawer contractors={contractors} categories={categories} clients={clients} baseCurrency={baseCurrency}>
              {/* No tooltip: mobile only, and the label is the glyph everyone reads as "add". */}
              <Button size="icon-lg" aria-label="Add transaction" className="bg-brand hover:bg-brand/90 text-on-hero size-12 shadow-raised">
                <Plus className="size-6" aria-hidden />
              </Button>
            </AddEntryDrawer>
          </div>
        ),
      )}
    </nav>
  );
}
