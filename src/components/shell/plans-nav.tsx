"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/subscriptions", label: "Subscriptions" },
  { href: "/lifetime", label: "Lifetime" },
  { href: "/contractors", label: "Contractors" },
  { href: "/clients", label: "Clients" },
];

/** Segmented sub-nav for the mobile "Plans" tab. Hidden on desktop, where the sidebar lists each page. */
export function PlansNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Plans" className="bg-muted mb-4 grid grid-cols-4 gap-1 rounded-md border p-1 lg:hidden">
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
