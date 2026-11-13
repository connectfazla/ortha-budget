"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/lib/actions";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Briefcase, Gift, Home, ListOrdered, PiggyBank, Plus, Repeat, Settings, Users } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { AddEntryDrawer } from "@/components/entry/add-entry-drawer";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Client, Contractor } from "@/lib/types";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/transactions", label: "Transactions", icon: ListOrdered },
  { href: "/subscriptions", label: "Subscriptions", icon: Repeat },
  { href: "/lifetime", label: "Lifetime deals", icon: Gift },
  { href: "/contractors", label: "Contractors", icon: Users },
  { href: "/clients", label: "Clients", icon: Briefcase },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/budgets", label: "Budgets", icon: PiggyBank },
];

/** Desktop sidebar [MERC-HOME][WISE-WEB]. 240px, hidden below lg. The one desktop "Add" lives here. */
export function Sidebar({
  email,
  contractors,
  categories,
  clients,
  baseCurrency,
}: {
  email: string | null;
  contractors: Contractor[];
  categories: string[];
  clients: Client[];
  baseCurrency: string;
}) {
  const pathname = usePathname();
  const active = (h: string) => (h === "/" ? pathname === "/" : pathname === h || pathname.startsWith(h + "/"));
  const item = (href: string, label: string, Icon: typeof Home) => (
    <Link
      key={href}
      href={href}
      aria-current={active(href) ? "page" : undefined}
      className={cn(
        "press focus-visible:ring-ring/60 relative flex h-9 items-center gap-2.5 px-4 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-inset",
        active(href) ? "bg-card text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-card/60",
      )}
    >
      {active(href) ? <span className="bg-brand absolute inset-y-0 left-0 w-0.5" /> : null}
      <Icon className="size-4" aria-hidden />
      {label}
    </Link>
  );
  return (
    <aside className="bg-sidebar sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r lg:flex">
      <div className="px-4 pt-5 pb-4">
        <Logo />
      </div>
      <div className="px-4 pb-4">
        <AddEntryDrawer contractors={contractors} categories={categories} clients={clients} baseCurrency={baseCurrency}>
          <Button className="w-full justify-start gap-2" size="lg">
            <Plus aria-hidden /> Add transaction
            <Kbd className="bg-primary-foreground/15 text-primary-foreground ml-auto">N</Kbd>
          </Button>
        </AddEntryDrawer>
      </div>
      <nav aria-label="Primary" className="flex flex-1 flex-col">
        {NAV.map((n) => item(n.href, n.label, n.icon))}
      </nav>
      <Separator />
      <div className="py-2">
        {item("/settings", "Settings", Settings)}
        <form action={signOut} className="flex items-center gap-2 px-4 pt-2 pb-1">
          <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs" title={email ?? undefined}>
            {email}
          </span>
          <Button type="submit" variant="ghost" size="icon-sm" aria-label="Sign out" className="press">
            <LogOut />
          </Button>
        </form>
      </div>
    </aside>
  );
}
