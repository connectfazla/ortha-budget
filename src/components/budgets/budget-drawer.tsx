"use client";

import { useState, useTransition, type ReactElement } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { deleteBudget, upsertBudget } from "@/lib/actions";
import type { Budget } from "@/lib/types";

/** Edit/delete (`budget`) or create (`categories` = unbudgeted picker list). `children` is the trigger. Limits are in `currency` (the base). */
export function BudgetDrawer({
  budget,
  categories = [],
  currency,
  children,
}: {
  budget?: Budget;
  categories?: string[];
  currency: string;
  children: ReactElement;
}) {
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
          <DrawerDescription>Monthly limit in {currency}</DrawerDescription>
        </DrawerHeader>
        <form onSubmit={submit} className="flex flex-col gap-4 p-4">
          {!budget && (
            <Field>
              <FieldLabel htmlFor="category">Category</FieldLabel>
              <NativeSelect id="category" name="category" required className="w-full [&_select]:h-11 [&_select]:text-base md:[&_select]:text-sm">
                {categories.map((c) => (
                  <NativeSelectOption key={c}>{c}</NativeSelectOption>
                ))}
              </NativeSelect>
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
