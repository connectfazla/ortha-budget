"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { loadSampleData } from "@/lib/actions";
import { AddEntryDrawer } from "@/components/entry/add-entry-drawer";
import { NewRecurringButton } from "@/components/recurring/new-recurring-button";
import { Button } from "@/components/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import type { Client, Contractor } from "@/lib/types";
import { ThemeSwitch } from "./theme-switch";

const noop = () => () => {};
// Whether this browser already holds a theme choice (next-themes' default storage key "theme", src/app/layout.tsx).
// Read once per page load: tapping a tile writes the key, and that must not jump past the question.
let askedBefore: boolean | undefined;
const readAsked = () => {
  try {
    return (askedBefore ??= localStorage.getItem("theme") !== null);
  } catch {
    return (askedBefore = true); // storage blocked: skip the question, System still applies
  }
};

/**
 * Apple-style first run. Screen 1 asks for light, dark or system once per browser [Starling App Theme][Mercury
 * Appearance]; screen 2 is one headline, three plain steps and one quiet alternative.
 */
export function FirstRun({
  contractors,
  categories,
  clients,
  today,
  baseCurrency,
}: {
  contractors: Contractor[];
  categories: string[];
  clients: Client[];
  today: string;
  baseCurrency: string;
}) {
  const [pending, start] = useTransition();
  const { theme, setTheme } = useTheme();
  const asked = useSyncExternalStore(noop, readAsked, () => null);
  const [looked, setLooked] = useState(false);
  const sample = () =>
    start(async () => {
      const r = await loadSampleData();
      if (!r.ok) toast.error(r.error);
    });

  // Server pass: the stored theme is unknown, so hold the space instead of flashing the wrong screen.
  if (asked === null) return <div className="min-h-[70dvh]" />;

  if (!asked && !looked) {
    const next = () => {
      setTheme(theme ?? "system"); // saves the choice, so this screen shows once
      askedBefore = true;
      setLooked(true);
    };
    return (
      <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center py-8">
        <h1 className="text-balance text-3xl font-semibold tracking-tight">How should Budget Ortha look?</h1>
        <p className="text-muted-foreground mt-3 text-base">System follows your device&apos;s setting. You can change this any time in Profile.</p>
        <ThemeSwitch className="mt-8" />
        <Button className="press focus-visible:ring-ring/60 mt-8 h-11 focus-visible:ring-2" onClick={next}>
          Continue
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center py-8">
      <h1 className="text-balance text-3xl font-semibold tracking-tight">Know what you owe before it is due.</h1>
      <p className="text-muted-foreground mt-3 text-base">Three steps and your dashboard fills in.</p>
      <ItemGroup className="mt-8 gap-0 divide-y border-y">
        <Step n={1} title="Add your first subscription" body="Tools, hosting, retainers. Anything that repeats.">
          <NewRecurringButton contractors={contractors} categories={categories} clients={clients} today={today} baseCurrency={baseCurrency} variant="outline" className="press h-11" size="default">
            Add
          </NewRecurringButton>
        </Step>
        <Step n={2} title="Add a payment" body="One client payment or one purchase is enough.">
          <AddEntryDrawer contractors={contractors} categories={categories} clients={clients} baseCurrency={baseCurrency}>
            <Button variant="outline" className="press h-11">Add</Button>
          </AddEntryDrawer>
        </Step>
        <Step n={3} title="Set your tax percentage" body="We show how much of your income to set aside.">
          <Button variant="outline" className="press h-11" nativeButton={false} render={<Link href="/profile/money" />}>Set</Button>
        </Step>
      </ItemGroup>
      <Button variant="ghost" className="text-muted-foreground mt-6 h-11 self-start" onClick={sample} disabled={pending}>
        {pending ? <Spinner aria-hidden /> : null}
        {pending ? "Loading sample data" : "Load sample data"}
      </Button>
    </div>
  );
}

function Step({ n, title, body, children }: { n: number; title: string; body: string; children: React.ReactNode }) {
  return (
    <Item role="listitem" className="gap-4 rounded-none px-0 py-4">
      <ItemMedia className="bg-muted text-muted-foreground size-8 rounded-full text-sm font-medium tabular-nums">{n}</ItemMedia>
      <ItemContent className="min-w-0 gap-0">
        <ItemTitle className="text-[15px]">{title}</ItemTitle>
        <ItemDescription>{body}</ItemDescription>
      </ItemContent>
      <ItemActions>{children}</ItemActions>
    </Item>
  );
}
