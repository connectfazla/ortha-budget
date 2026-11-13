"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveSettings } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

const bad = (s: string) => s.trim() !== "" && !Number.isFinite(Number(s.replace(/,/g, "")));

export function SettingsForm({ taxRate, cash, currency }: { taxRate: number; cash: number | null; currency: string }) {
  const [tax, setTax] = useState(String(taxRate || ""));
  const [bal, setBal] = useState(cash === null ? "" : String(cash));
  const [pending, start] = useTransition();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bad(tax) || bad(bal)) return;
    start(async () => {
      const r = await saveSettings({ tax_rate: tax.trim() === "" ? 0 : Number(tax), cash_on_hand: bal.trim() === "" ? null : Number(bal.replace(/,/g, "")) });
      if (r.ok) toast.success("Saved");
      else toast.error(r.error);
    });
  };
  return (
    <form onSubmit={submit}>
      <FieldGroup className="gap-4">
        <Field data-invalid={bad(tax)}>
          <FieldLabel htmlFor="tax-rate">Tax set-aside (%)</FieldLabel>
          <Input id="tax-rate" inputMode="decimal" value={tax} onChange={(e) => setTax(e.target.value)} placeholder="0" aria-invalid={bad(tax)} className="h-11" />
          <FieldDescription>Share of each month&apos;s income to put aside. Leave at 0 to hide it.</FieldDescription>
          {bad(tax) ? <FieldError>Enter a number, like 25.</FieldError> : null}
        </Field>
        <Field data-invalid={bad(bal)}>
          <FieldLabel htmlFor="cash-on-hand">Cash on hand ({currency})</FieldLabel>
          <Input id="cash-on-hand" inputMode="decimal" value={bal} onChange={(e) => setBal(e.target.value)} placeholder="0.00" aria-invalid={bad(bal)} className="h-11" />
          <FieldDescription>Used for runway. Update it when your balance changes.</FieldDescription>
          {bad(bal) ? <FieldError>Enter an amount, like 12000.</FieldError> : null}
        </Field>
        <Button type="submit" className="h-11 self-start" disabled={pending}>
          {pending ? <Spinner aria-hidden /> : null}
          Save
        </Button>
      </FieldGroup>
    </form>
  );
}
