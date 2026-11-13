"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { changeBaseCurrency } from "@/lib/actions";
import { CURRENCIES } from "@/lib/money";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";

/**
 * Base currency switch [YNAB currency sheet]. Picking a new code prefills "1 <old> = ? <new>" from open.er-api.com
 * (client-side, editable; left empty if the fetch fails). Confirming converts every stored amount on the server.
 */
export function BaseCurrency({ current }: { current: string }) {
  const [code, setCode] = useState(current);
  const [rate, setRate] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  // One fetch per page load for the current base; a failed fetch is dropped so the next pick retries.
  const rates = useRef<Promise<Record<string, number>> | null>(null);
  const pickId = useRef(0);

  const pick = (next: string) => {
    setCode(next);
    setRate("");
    if (next === current) return;
    const id = ++pickId.current;
    rates.current ??= fetch(`https://open.er-api.com/v6/latest/${current}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { rates?: Record<string, number> }) => j.rates ?? {})
      .catch(() => {
        rates.current = null;
        return {};
      });
    rates.current.then((all) => {
      const v = all[next];
      if (id === pickId.current && v > 0) setRate(String(Number(v.toPrecision(6))));
    });
  };

  const n = Number(rate.replace(/,/g, "").trim());
  const valid = rate.trim() !== "" && Number.isFinite(n) && n > 0;
  const changed = code !== current;

  const confirm = () =>
    start(async () => {
      const r = await changeBaseCurrency(code, n);
      if (!r.ok) return void toast.error(r.error);
      toast.success(`Base currency is now ${code}`);
      setOpen(false);
      setRate("");
      rates.current = null; // the base just changed, so cached rates are for the wrong currency
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (changed && valid) setOpen(true);
      }}
    >
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="base-currency">Base currency</FieldLabel>
          <NativeSelect id="base-currency" value={code} onChange={(e) => pick(e.target.value)} className="w-full [&_select]:h-11">
            {CURRENCIES.map((c) => (
              <NativeSelectOption key={c} value={c}>
                {c}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldDescription>Every total and report shows in this currency.</FieldDescription>
        </Field>
        {changed ? (
          <Field data-invalid={rate.trim() !== "" && !valid}>
            <FieldLabel htmlFor="base-rate">
              1 {current} = ? {code}
            </FieldLabel>
            <Input
              id="base-rate"
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="Exchange rate"
              aria-invalid={rate.trim() !== "" && !valid}
              className="h-11 font-mono tabular-nums"
            />
            <FieldDescription>Filled in from today&apos;s market rate when available. Change it to match your bank.</FieldDescription>
            {rate.trim() !== "" && !valid ? <FieldError>Enter a rate above 0.</FieldError> : null}
          </Field>
        ) : null}
        <Button type="submit" variant="outline" className="h-11 self-start" disabled={!changed || !valid}>
          Change base currency
        </Button>
      </FieldGroup>

      <AlertDialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch to {code}?</AlertDialogTitle>
            <AlertDialogDescription>
              Every stored amount is converted at 1 {current} = {valid ? n : "?"} {code}. Totals, budgets and your cash balance all change to match.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirm} disabled={pending}>
              {pending ? <Spinner aria-hidden /> : null}
              Convert to {code}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
