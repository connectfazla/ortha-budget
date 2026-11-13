"use client";

import { useId, useState, useTransition, type ReactElement } from "react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createContractor, updateContractor } from "@/lib/actions";
import { CURRENCIES } from "@/lib/money";
import type { Contractor, RateType } from "@/lib/types";

// NativeSelect sizes its inner <select>; this lifts it to the 44px touch target the inputs use.
const NATIVE = "w-full *:data-[slot=native-select]:h-11";
const RATE_TYPES: { value: RateType; label: string }[] = [
  { value: "monthly", label: "Month" },
  { value: "hourly", label: "Hour" },
  { value: "fixed", label: "Fixed" },
];

/** Create (no `contractor`) or edit a contractor. `children` is the trigger element. */
export function ContractorDrawer({
  contractor,
  baseCurrency = "USD",
  children,
}: {
  contractor?: Contractor;
  /** Pre-picked currency for a new contractor. */
  baseCurrency?: string;
  children: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger render={children} />
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{contractor ? "Edit contractor" : "New contractor"}</DrawerTitle>
          <DrawerDescription className="sr-only">Contractor details</DrawerDescription>
        </DrawerHeader>
        {/* Popup unmounts on close, so form state resets on every open. */}
        <ContractorForm contractor={contractor} base={baseCurrency} onDone={() => setOpen(false)} />
      </DrawerContent>
    </Drawer>
  );
}

function ContractorForm({ contractor, base, onDone }: { contractor?: Contractor; base: string; onDone: () => void }) {
  const id = useId();
  const [pending, start] = useTransition();
  const [active, setActive] = useState(contractor?.active ?? true);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const rate = String(f.get("rate") ?? "").replace(/,/g, "").trim();
    const input = {
      name: String(f.get("name") ?? ""),
      role: String(f.get("role") ?? ""),
      email: String(f.get("email") ?? ""),
      rate: rate ? Number(rate) : null,
      rate_type: (f.get("rate_type") || null) as RateType | null,
      currency: String(f.get("currency") ?? base),
      active,
      notes: String(f.get("notes") ?? ""),
    };
    start(async () => {
      const r = contractor ? await updateContractor(contractor.id, input) : await createContractor(input);
      if (r.ok) {
        toast.success(contractor ? "Contractor updated" : "Contractor added");
        onDone();
      } else toast.error(r.error);
    });
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <Field>
        <FieldLabel htmlFor={`${id}-name`} className="label">Name</FieldLabel>
        <Input id={`${id}-name`} name="name" required defaultValue={contractor?.name} autoComplete="off" className="h-11" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor={`${id}-role`} className="label">Role</FieldLabel>
          <Input id={`${id}-role`} name="role" defaultValue={contractor?.role ?? ""} className="h-11" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-email`} className="label">Email</FieldLabel>
          <Input id={`${id}-email`} name="email" type="email" defaultValue={contractor?.email ?? ""} className="h-11" />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field>
          <FieldLabel htmlFor={`${id}-rate`} className="label">Rate</FieldLabel>
          <Input id={`${id}-rate`} name="rate" inputMode="decimal" defaultValue={contractor?.rate ?? ""} className="h-11" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-per`} className="label">Per</FieldLabel>
          <NativeSelect id={`${id}-per`} name="rate_type" defaultValue={contractor?.rate_type ?? "monthly"} className={NATIVE}>
            {RATE_TYPES.map((t) => (
              <NativeSelectOption key={t.value} value={t.value}>
                {t.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-cur`} className="label">Currency</FieldLabel>
          <NativeSelect id={`${id}-cur`} name="currency" defaultValue={contractor?.currency ?? base} className={NATIVE}>
            {CURRENCIES.map((c) => (
              <NativeSelectOption key={c} value={c}>
                {c}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor={`${id}-notes`} className="label">Notes</FieldLabel>
        <Textarea id={`${id}-notes`} name="notes" defaultValue={contractor?.notes ?? ""} rows={3} />
      </Field>
      <Field orientation="horizontal" className="min-h-11 justify-between">
        <FieldLabel htmlFor={`${id}-active`}>Active</FieldLabel>
        <Switch id={`${id}-active`} checked={active} onCheckedChange={setActive} />
      </Field>
      <Button type="submit" size="lg" className="h-11 focus-visible:ring-2 focus-visible:ring-ring/60" disabled={pending}>
        {pending ? (
          <>
            <Spinner /> Saving
          </>
        ) : (
          "Save"
        )}
      </Button>
    </form>
  );
}
