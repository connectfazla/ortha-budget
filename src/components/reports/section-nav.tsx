"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/reports", label: "Reports" },
  { href: "/budgets", label: "Budgets" },
];

/** Reports / Budgets chips (local to these two pages; PlansNav-style). */
export function ReportsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Reports" className="mb-4 flex gap-2 lg:hidden">
      {ITEMS.map((i) => {
        const active = pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "press focus-visible:ring-ring/60 flex h-9 shrink-0 items-center justify-center rounded-full px-4 text-sm font-semibold outline-none focus-visible:ring-2",
              active ? "bg-foreground text-background" : "bg-card text-foreground shadow-card hover:bg-muted",
            )}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
