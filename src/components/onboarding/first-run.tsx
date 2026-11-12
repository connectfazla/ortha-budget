"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { loadSampleData } from "@/lib/actions";
import { AddEntryDrawer } from "@/components/entry/add-entry-drawer";
import { NewRecurringButton } from "@/components/recurring/new-recurring-button";
import { Button } from "@/components/ui/button";
import type { Client, Contractor } from "@/lib/types";

/** Apple-style first run: one headline, three plain steps, one quiet alternative. */
export function FirstRun({
  contractors,
  categories,
  clients,
  today,
}: {
  contractors: Contractor[];
  categories: string[];
  clients: Client[];
  today: string;
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
      <ol className="mt-8 divide-y border-y">
        <Step n={1} title="Add your first subscription" body="Tools, hosting, retainers. Anything that repeats.">
          <NewRecurringButton contractors={contractors} categories={categories} clients={clients} today={today} variant="outline" className="press h-11" size="default">
            Add
          </NewRecurringButton>
        </Step>
        <Step n={2} title="Add a payment" body="One client payment or one purchase is enough.">
          <AddEntryDrawer contractors={contractors} categories={categories} clients={clients}>
            <Button variant="outline" className="press h-11">Add</Button>
          </AddEntryDrawer>
        </Step>
        <Step n={3} title="Set your tax percentage" body="We show how much of your income to set aside.">
          <Button variant="outline" className="press h-11" nativeButton={false} render={<Link href="/settings" />}>Set</Button>
        </Step>
      </ol>
      <Button variant="ghost" className="press text-muted-foreground mt-6 h-11 self-start focus-visible:ring-2 active:opacity-80 disabled:opacity-50" onClick={sample} disabled={pending}>
        {pending ? "Loading sample data" : "Load sample data"}
      </Button>
    </div>
  );
}

function Step({ n, title, body, children }: { n: number; title: string; body: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-4 py-4">
      <span className="bg-muted text-muted-foreground grid size-8 shrink-0 place-items-center rounded-full text-sm font-medium tabular-nums">{n}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium">{title}</p>
        <p className="text-muted-foreground text-sm">{body}</p>
      </div>
      {children}
    </li>
  );
}
