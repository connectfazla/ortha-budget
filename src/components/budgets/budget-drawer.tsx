"use client";

import { useState, useTransition, type ReactElement } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteBudget, upsertBudget } from "@/lib/actions";
import type { Budget } from "@/lib/types";

/** Edit/delete (`budget`) or create (`categories` = unbudgeted picker list). `children` is the trigger. */
export function BudgetDrawer({ budget, categories = [], children }: { budget?: Budget; categories?: string[]; children: ReactElement }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function done(r: { ok: true } | { ok: false; error: string }, msg: string) {
    if (r.ok) {
      toast.success(msg);
      setOpen(false);
    } else toast.error(r.error);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const category = budget?.category ?? String(f.get("category") ?? "");
    start(async () => done(await upsertBudget(category, Number(f.get("limit"))), "Budget saved"));
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger render={children} />
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{budget ? budget.category : "New budget"}</DrawerTitle>
          <DrawerDescription>Monthly limit in USD</DrawerDescription>
        </DrawerHeader>
        <form onSubmit={submit} className="flex flex-col gap-4 p-4">
          {!budget && (
            <div className="grid gap-1.5">
              <Label htmlFor="category" className="text-muted-foreground text-[11px] tracking-[0.08em] uppercase">Category</Label>
              <select
                id="category"
                name="category"
                required
                className="border-input h-11 w-full rounded-md border bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="limit" className="text-muted-foreground text-[11px] tracking-[0.08em] uppercase">
              Limit / month
            </Label>
            <Input id="limit" name="limit" required inputMode="decimal" defaultValue={budget?.monthly_limit_usd} className="h-14 text-2xl tracking-tight" />
          </div>
          <Button type="submit" size="lg" className="h-11" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
          {budget && (
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="h-11"
              disabled={pending}
              onClick={() => start(async () => done(await deleteBudget(budget.id), "Budget deleted"))}
            >
              Delete budget
            </Button>
          )}
        </form>
      </DrawerContent>
    </Drawer>
  );
}
