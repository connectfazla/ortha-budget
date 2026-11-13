"use client";

import { useState, useTransition, type ReactElement } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CategoryPicker } from "@/components/categories/category-picker";
import { useDesktop } from "@/components/entry/fx";
import { Spinner } from "@/components/ui/spinner";
import { deleteBudget, upsertBudget } from "@/lib/actions";
import type { Budget } from "@/lib/types";

/** Edit/delete (`budget`) or create. `children` is the trigger. Limits are in `currency` (the base). */
export function BudgetDrawer({
  budget,
  currency,
  children,
}: {
  budget?: Budget;
  /** @deprecated Unused: the picker lists every spending category (picking a budgeted one updates its limit). */
  categories?: string[];
  currency: string;
  children: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [category, setCategory] = useState("");
  const desktop = useDesktop();

  function done(r: { ok: true } | { ok: false; error: string }, msg: string) {
    if (r.ok) {
      toast.success(msg);
      setOpen(false);
      setCategory("");
    } else toast.error(r.error);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const cat = budget?.category ?? category;
    if (!cat) return void toast.error("Choose a category");
    start(async () => done(await upsertBudget(cat, Number(f.get("limit"))), "Budget saved"));
  }

  return (
    // Same layout as the other drawers: right-hand panel on desktop (the category sub-sheet stacks the same way).
    <Drawer open={open} onOpenChange={setOpen} swipeDirection={desktop ? "right" : "down"}>
      <DrawerTrigger render={children} />
      <DrawerContent className="lg:h-dvh lg:max-h-dvh lg:w-[440px] lg:border-l">
        <DrawerHeader>
          <DrawerTitle>{budget ? budget.category : "New budget"}</DrawerTitle>
          <DrawerDescription>Monthly limit in {currency}</DrawerDescription>
        </DrawerHeader>
        <form onSubmit={submit} className="flex flex-col gap-4 p-4">
          {!budget && (
            <Field>
              <FieldLabel htmlFor="category">Category</FieldLabel>
              <CategoryPicker
                id="category"
                value={category}
                onChange={setCategory}
                direction="out"
                className="h-11 w-full rounded-md border border-input bg-card px-2 focus-visible:border-ring/70 focus-visible:ring-ring/15 dark:bg-input/30"
              />
            </Field>
          )}
          <Field>
            <FieldLabel htmlFor="limit">Limit per month ({currency})</FieldLabel>
            <Input id="limit" name="limit" required inputMode="decimal" defaultValue={budget?.monthly_limit} className="h-14 text-2xl tracking-tight" />
          </Field>
          <Button type="submit" size="lg" className="h-11" disabled={pending}>
            {pending ? <Spinner aria-hidden /> : null}
            Save
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
