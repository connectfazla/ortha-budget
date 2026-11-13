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

/** Chip row for the mobile "Plans" tab [Revolut iOS filter chips]. Hidden on desktop, where the sidebar lists each page. */
export function PlansNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Plans" className="mb-4 flex gap-2 overflow-x-auto [scrollbar-width:none] lg:hidden">
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
