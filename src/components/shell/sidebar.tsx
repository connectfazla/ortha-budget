"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/lib/actions";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Briefcase, Gift, Home, ListOrdered, PiggyBank, Plus, Repeat, UserRound, Users } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { AddEntryDrawer } from "@/components/entry/add-entry-drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  name,
  photoUrl,
  contractors,
  categories,
  clients,
  baseCurrency,
}: {
  email: string | null;
  name: string | null;
  photoUrl: string | null;
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
        "press focus-visible:ring-ring/60 relative mx-2 flex h-10 items-center gap-3 rounded-full px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset",
        active(href) ? "bg-brand/10 text-brand font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
      )}
    >
      <Icon className="size-[18px]" aria-hidden />
      {label}
    </Link>
  );
  return (
    <aside className="bg-sidebar sticky top-0 hidden h-dvh w-60 shrink-0 flex-col shadow-[1px_0_0_var(--elev-edge)] lg:flex">
      <div className="px-4 pt-5 pb-4">
        <Logo />
      </div>
      <div className="px-4 pb-4">
        <AddEntryDrawer contractors={contractors} categories={categories} clients={clients} baseCurrency={baseCurrency}>
          <Button className="bg-brand hover:bg-brand/90 text-on-hero h-10 w-full justify-start gap-2 px-4" size="lg">
            <Plus aria-hidden /> Add transaction
            <Kbd className="bg-on-hero/20 text-on-hero ml-auto">N</Kbd>
          </Button>
        </AddEntryDrawer>
      </div>
      <nav aria-label="Primary" className="flex flex-1 flex-col gap-0.5">
        {NAV.map((n) => item(n.href, n.label, n.icon))}
      </nav>
      <Separator />
      <div className="py-2">
        {item("/profile", "Profile", UserRound)}
        <form action={signOut} className="flex items-center gap-2 px-4 pt-2 pb-1">
          <Avatar size="sm" className="after:border-0">
            {photoUrl ? <AvatarImage src={photoUrl} alt="" /> : null}
            <AvatarFallback className="bg-brand text-on-hero text-[11px] font-bold">{(name ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs" title={email ?? undefined}>
            {name}
          </span>
          <Button type="submit" variant="ghost" size="icon-sm" aria-label="Sign out" className="press">
            <LogOut />
          </Button>
        </form>
      </div>
    </aside>
  );
}
