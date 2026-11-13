"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setSecondaryCurrency } from "@/lib/actions";
import { CURRENCIES } from "@/lib/money";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";

export function SecondaryCurrencySetting({ current, base }: { current: string | null; base: string }) {
  const [code, setCode] = useState(current);
  const [pending, start] = useTransition();
  const options = CURRENCIES.filter((c) => c !== base);

  const save = (next: string | null) => {
    const before = code;
    setCode(next);
    start(async () => {
      const r = await setSecondaryCurrency(next);
      if (!r.ok) {
        setCode(before);
        return void toast.error(r.error);
      }
      toast.success(next ? `Showing ${next} under key amounts` : "Second currency is off");
    });
  };

  return (
    <FieldGroup className="gap-4">
      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="second-currency-on">Show a second currency</FieldLabel>
          <FieldDescription className="text-xs">A small converted amount under key totals, at today&apos;s rate.</FieldDescription>
        </FieldContent>
        <Switch id="second-currency-on" checked={code !== null} disabled={pending} onCheckedChange={(v) => save(v ? (options.includes("BDT") ? "BDT" : options[0]) : null)} />
      </Field>
      {code ? (
        <Field>
          <FieldLabel htmlFor="second-currency">Currency</FieldLabel>
          <NativeSelect id="second-currency" value={code} disabled={pending} onChange={(e) => save(e.target.value)} className="w-full [&_select]:h-11">
            {options.map((c) => (
              <NativeSelectOption key={c} value={c}>
                {c}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      ) : null}
    </FieldGroup>
  );
}
