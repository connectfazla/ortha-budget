"use client";

// Command palette + keyboard shortcuts. Mobbin refs: Stripe search palette with grouped results
// https://mobbin.com/screens/86771aa2-510b-484f-988e-d4a76085a01a , Luma "Quick actions" with a shortcut hint
// https://mobbin.com/screens/a2868ad5-6a82-4c3a-9a1c-c1dd091d1018 , n8n grouped commands
// https://mobbin.com/screens/28338d7a-25d5-4fd0-8357-9a770b30ac00
// Ctrl/Cmd+K opens it. n = new transaction, g then h/t/s/r = go to a page, ? = shortcut list.

import { Fragment, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { BarChart3, Briefcase, FileUp, Gift, Home, ListOrdered, MoonIcon, PiggyBank, Plus, Repeat, SearchIcon, UserRound, Users, type LucideIcon } from "lucide-react";
import { AddEntryDrawer } from "@/components/entry/add-entry-drawer";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import type { Client, Contractor } from "@/lib/types";

const PAGES: { href: string; label: string; icon: LucideIcon; keys?: string }[] = [
  { href: "/", label: "Home", icon: Home, keys: "g h" },
  { href: "/transactions", label: "Transactions", icon: ListOrdered, keys: "g t" },
  { href: "/subscriptions", label: "Subscriptions", icon: Repeat, keys: "g s" },
  { href: "/lifetime", label: "Lifetime deals", icon: Gift },
  { href: "/contractors", label: "Contractors", icon: Users },
  { href: "/clients", label: "Clients", icon: Briefcase },
  { href: "/reports", label: "Reports", icon: BarChart3, keys: "g r" },
  { href: "/budgets", label: "Budgets", icon: PiggyBank },
  { href: "/import", label: "Import transactions", icon: FileUp },
  { href: "/profile", label: "Profile", icon: UserRound },
];
const GO: Record<string, string> = { h: "/", t: "/transactions", s: "/subscriptions", r: "/reports" };

/** What it does, the key combos (each a list of keys pressed together), and the word between combos. */
const SHORTCUTS: [string, string[][], ("or" | "then")?][] = [
  ["Open the command palette", [["Ctrl", "K"], ["Cmd", "K"]], "or"],
  ["New transaction", [["n"]]],
  ["Go to Home", [["g"], ["h"]], "then"],
  ["Go to Transactions", [["g"], ["t"]], "then"],
  ["Go to Subscriptions", [["g"], ["s"]], "then"],
  ["Go to Reports", [["g"], ["r"]], "then"],
  ["Show this list", [["?"]]],
];

/** Typing in a field, or another dialog is open: leave single-key shortcuts alone. */
function typing(t: EventTarget | null) {
  const el = t instanceof HTMLElement ? t : null;
  return Boolean(el?.closest("input, textarea, select, [contenteditable]:not([contenteditable=false])"));
}

export function CommandPalette({
  contractors,
  categories,
  clients,
  baseCurrency,
}: {
  contractors: Contractor[];
  categories: string[];
  clients?: Client[];
  /** The user's base currency (settings), passed to the add-entry drawer. */
  baseCurrency?: string;
}) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [q, setQ] = useState("");
  const addRef = useRef<HTMLSpanElement>(null);
  const goAt = useRef(0);

  const addTransaction = () => addRef.current?.querySelector("button")?.click();

  // ?add=1 (the evening reminder opens /transactions?add=1) opens the Add entry drawer once, then drops the param.
  const params = useSearchParams();
  const pathname = usePathname();
  useEffect(() => {
    if (params.get("add") !== "1") return;
    addTransaction();
    const rest = new URLSearchParams(params);
    rest.delete("add");
    router.replace(rest.size ? `${pathname}?${rest}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.isComposing || e.defaultPrevented) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target) || document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      if (e.key === "?") {
        e.preventDefault();
        setHelp(true);
      } else if (e.key === "n") {
        e.preventDefault();
        addTransaction();
      } else if (e.key === "g") {
        goAt.current = e.timeStamp;
      } else if (GO[e.key] && e.timeStamp - goAt.current < 1200) {
        goAt.current = 0;
        router.push(GO[e.key]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  // Close first so focus is released before the next surface opens.
  const run = (fn: () => void) => {
    setOpen(false);
    setTimeout(fn, 80);
  };
  const term = q.trim().slice(0, 80);

  return (
    <>
      <span ref={addRef} className="hidden">
        <AddEntryDrawer contractors={contractors} categories={categories} clients={clients} baseCurrency={baseCurrency}>
          <button type="button" tabIndex={-1} aria-hidden />
        </AddEntryDrawer>
      </span>

      <CommandDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setQ("");
        }}
        title="Command palette"
        description="Search pages and actions"
      >
        <Command>
          <CommandInput value={q} onValueChange={setQ} placeholder="Search pages, actions, transactions" />
          <CommandList>
            <CommandEmpty>Nothing matches.</CommandEmpty>
            {term ? (
              <CommandGroup heading="Transactions">
                <CommandItem className="outline-none focus-visible:ring-2 focus-visible:ring-ring" forceMount value={`search ${term}`} onSelect={() => run(() => router.push(`/transactions?q=${encodeURIComponent(term)}`))}>
                  <SearchIcon />
                  Search transactions for &ldquo;{term}&rdquo;
                </CommandItem>
              </CommandGroup>
            ) : null}
            <CommandGroup heading="Actions">
              <CommandItem className="outline-none focus-visible:ring-2 focus-visible:ring-ring" value="add transaction new" onSelect={() => run(addTransaction)}>
                <Plus />
                Add transaction
                <Hint>n</Hint>
              </CommandItem>
              <CommandItem className="outline-none focus-visible:ring-2 focus-visible:ring-ring" value="toggle theme dark light" onSelect={() => run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))}>
                <MoonIcon />
                Toggle theme
              </CommandItem>
              <CommandItem className="outline-none focus-visible:ring-2 focus-visible:ring-ring" value="keyboard shortcuts help" onSelect={() => run(() => setHelp(true))}>
                Keyboard shortcuts
                <Hint>?</Hint>
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Go to">
              {PAGES.map((p) => (
                <CommandItem className="outline-none focus-visible:ring-2 focus-visible:ring-ring" key={p.href} value={`go ${p.label}`} onSelect={() => run(() => router.push(p.href))}>
                  <p.icon />
                  {p.label}
                  {p.keys ? <Hint>{p.keys}</Hint> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>

      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogDescription>Shortcuts pause while you type in a field.</DialogDescription>
          </DialogHeader>
          <dl className="divide-y text-sm">
            {SHORTCUTS.map(([what, combos, join]) => (
              <div key={what} className="flex items-center justify-between gap-3 py-2">
                <dt>{what}</dt>
                <dd className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  {combos.map((keys, i) => (
                    <Fragment key={i}>
                      {i > 0 ? <span>{join}</span> : null}
                      <KbdGroup>
                        {keys.map((k) => (
                          <Kbd key={k}>{k}</Kbd>
                        ))}
                      </KbdGroup>
                    </Fragment>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Space-separated keys pressed in sequence, e.g. "g h". */
function Hint({ children }: { children: string }) {
  return (
    <KbdGroup className="ml-auto">
      {children.split(" ").map((k) => (
        <Kbd key={k}>{k}</Kbd>
      ))}
    </KbdGroup>
  );
}
