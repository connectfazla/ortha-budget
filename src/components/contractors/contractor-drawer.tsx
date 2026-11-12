"use client";

import { useState, useTransition, type ReactElement } from "react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createContractor, updateContractor } from "@/lib/actions";
import { CURRENCIES } from "@/lib/money";
import type { Contractor, RateType } from "@/lib/types";

const SELECT =
  "border-input bg-transparent h-11 w-full rounded-md border px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";
const RATE_TYPES: RateType[] = ["monthly", "hourly", "fixed"];

/** Create (no `contractor`) or edit a contractor. `children` is the trigger element. */
export function ContractorDrawer({ contractor, children }: { contractor?: Contractor; children: ReactElement }) {
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
        <ContractorForm contractor={contractor} onDone={() => setOpen(false)} />
      </DrawerContent>
    </Drawer>
  );
}

function ContractorForm({ contractor, onDone }: { contractor?: Contractor; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [active, setActive] = useState(contractor?.active ?? true);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const input = {
      name: String(f.get("name") ?? ""),
      role: String(f.get("role") ?? ""),
      email: String(f.get("email") ?? ""),
      rate: f.get("rate") ? Number(f.get("rate")) : null,
      rate_type: (f.get("rate_type") || null) as RateType | null,
      currency: String(f.get("currency") ?? "USD"),
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
          <Field label="Name">
            <Input name="name" required defaultValue={contractor?.name} autoComplete="off" className="h-11" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role">
              <Input name="role" defaultValue={contractor?.role ?? ""} className="h-11" />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" defaultValue={contractor?.email ?? ""} className="h-11" />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Rate">
              <Input name="rate" inputMode="decimal" defaultValue={contractor?.rate ?? ""} className="h-11" />
            </Field>
            <Field label="Per">
              <select name="rate_type" aria-label="Per" defaultValue={contractor?.rate_type ?? "monthly"} className={SELECT}>
                {RATE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Currency">
              <select name="currency" aria-label="Currency" defaultValue={contractor?.currency ?? "USD"} className={SELECT}>
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Notes">
            <Textarea name="notes" defaultValue={contractor?.notes ?? ""} rows={3} />
          </Field>
          <div className="flex items-center justify-between">
            <Label htmlFor="active-switch">Active</Label>
            <Switch id="active-switch" checked={active} onCheckedChange={setActive} />
          </div>
          <Button type="submit" size="lg" className="h-11" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-muted-foreground text-[11px] tracking-[0.08em] uppercase">{label}</span>
      {children}
    </label>
  );
}
