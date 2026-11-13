"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/reports", label: "Reports" },
  { href: "/budgets", label: "Budgets" },
];

/** Reports / Budgets segmented switch (local to these two pages; PlansNav-style). */
export function ReportsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Reports" className="bg-muted mb-4 grid grid-cols-2 gap-1 rounded-md border p-1 lg:hidden">
      {ITEMS.map((i) => {
        const active = pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "press focus-visible:ring-ring/60 flex h-9 items-center justify-center rounded-sm text-xs font-medium outline-none focus-visible:ring-2",
              active ? "bg-card text-foreground border" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
