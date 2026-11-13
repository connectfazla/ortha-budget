"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { loadSampleData } from "@/lib/actions";
import { AddEntryDrawer } from "@/components/entry/add-entry-drawer";
import { NewRecurringButton } from "@/components/recurring/new-recurring-button";
import { Button } from "@/components/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import type { Client, Contractor } from "@/lib/types";

/** Apple-style first run: one headline, three plain steps, one quiet alternative. */
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
  const sample = () =>
    start(async () => {
      const r = await loadSampleData();
      if (!r.ok) toast.error(r.error);
    });

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
          <Button variant="outline" className="press h-11" nativeButton={false} render={<Link href="/settings" />}>Set</Button>
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
