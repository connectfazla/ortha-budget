"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, ListOrdered, Plus, Repeat } from "lucide-react";
import { AddEntryDrawer } from "@/components/entry/add-entry-drawer";
import { cn } from "@/lib/utils";
import type { Contractor } from "@/lib/types";

const starts = (p: string, ...prefixes: string[]) => prefixes.some((x) => p === x || p.startsWith(x + "/"));

const TABS = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  { href: "/transactions", label: "Activity", icon: ListOrdered, match: (p: string) => starts(p, "/transactions") },
  null, // Add slot
  { href: "/subscriptions", label: "Plans", icon: Repeat, match: (p: string) => starts(p, "/subscriptions", "/lifetime", "/contractors") },
  { href: "/reports", label: "Reports", icon: BarChart3, match: (p: string) => starts(p, "/reports", "/budgets") },
];

/** Mobile tab bar [YNAB-BUDGET]: 5 slots, raised square Add in the centre. Hidden on lg+. */
export function BottomBar({ contractors, categories }: { contractors: Contractor[]; categories: string[] }) {
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
              "relative flex h-16 flex-col items-center justify-center gap-1 text-[10px] font-medium tracking-[0.08em] uppercase",
              t.match(pathname) ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {t.match(pathname) ? <span className="bg-brand absolute inset-x-3 top-0 h-0.5" /> : null}
            <t.icon className="size-5" aria-hidden />
            {t.label}
          </Link>
        ) : (
          <div key="add" className="relative flex justify-center">
            <AddEntryDrawer contractors={contractors} categories={categories}>
              <button
                type="button"
                aria-label="Add transaction"
                className="bg-primary text-primary-foreground focus-visible:ring-ring/50 absolute -top-4 grid size-14 place-items-center rounded-md border outline-none focus-visible:ring-3 active:translate-y-px"
              >
                <Plus className="size-6" aria-hidden />
              </button>
            </AddEntryDrawer>
          </div>
        ),
      )}
    </nav>
  );
}
