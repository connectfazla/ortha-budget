"use client";

import { useId, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { XIcon } from "lucide-react";
import { baseRate, useDesktop } from "@/components/entry/fx";
import { CategoryPicker } from "@/components/categories/category-picker";
import { useCategoryOptions } from "@/components/categories/category-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { createRecurring, updateRecurring, type RecurringInput } from "@/lib/actions";
import { CURRENCIES, INTERVALS, formatMoney, round2 } from "@/lib/money";
import type { BillingInterval, Client, Contractor, Direction, PriceChange, Recurring, RecurringStatus } from "@/lib/types";

// NativeSelect sizes its inner <select>; this lifts it to the 44px touch target the inputs use.
const NATIVE = "w-full *:data-[slot=native-select]:h-11";
const SEGMENT = "h-9 text-xs text-muted-foreground data-pressed:text-foreground";

const fmtDay = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const num = (s: string) => Number(s.replace(/,/g, "").trim());

export function RecurringDrawer({
  open,
  onOpenChange,
  item,
  contractors,
  clients,
  today,
  priceChanges,
  baseCurrency = "USD",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  item: Recurring | null;
  contractors: Contractor[];
  /** Active clients for the optional Client row. Omit and the row is hidden. */
  clients?: Client[];
  /** @deprecated Unused: categories come from useCategoryOptions(). Kept optional so callers compile. */
  categories?: string[];
  today: string;
  /** Price history for `item`, newest first. */
  priceChanges?: PriceChange[];
  /** The user's base currency (settings). */
  baseCurrency?: string;
}) {
  // Same layout as AddEntryDrawer: right-hand panel on desktop, bottom sheet on mobile.
  const desktop = useDesktop();
  return (
    <Drawer open={open} onOpenChange={onOpenChange} swipeDirection={desktop ? "right" : "down"}>
      <DrawerContent className="lg:h-dvh lg:max-h-dvh lg:w-[440px] lg:border-l">
        <DrawerHeader className="flex-row items-center justify-between pt-2 pb-2 text-left">
          <DrawerTitle className="text-sm font-medium">
            {item ? "Edit recurring" : "New recurring"}
          </DrawerTitle>
          <DrawerClose render={<Button type="button" variant="ghost" size="icon-lg" aria-label="Close" />}>
            <XIcon />
          </DrawerClose>
        </DrawerHeader>
        {/* Form mounts only while open, so state resets per open. */}
        <Form
          item={item}
          contractors={contractors}
          clients={clients}
          today={today}
          priceChanges={priceChanges}
          base={baseCurrency}
          close={() => onOpenChange(false)}
        />
      </DrawerContent>
    </Drawer>
  );
}

function Form({
  item,
  contractors,
  clients,
  today,
  priceChanges,
  base,
  close,
}: {
  item: Recurring | null;
  contractors: Contractor[];
  clients?: Client[];
  today: string;
  priceChanges?: PriceChange[];
  base: string;
  close: () => void;
}) {
  const id = useId();
  const [pending, start] = useTransition();
  const [name, setName] = useState(item?.name ?? "");
  const [vendor, setVendor] = useState(item?.vendor ?? "");
  const [direction, setDirection] = useState<Direction>(item?.direction ?? "out");
  const [amount, setAmount] = useState(item ? String(item.amount) : "");
  const [currency, setCurrency] = useState(item?.currency ?? base);
  const [fx, setFx] = useState(item && item.currency !== base ? String(item.fx_rate) : "");
  const [fxError, setFxError] = useState(false);
  const latestCurrency = useRef(currency);

  function pickCurrency(cur: string) {
    latestCurrency.current = cur;
    setCurrency(cur);
    setFx("");
    setFxError(false);
    if (cur === base) return;
    baseRate(cur, base).then((rate) => {
      if (rate && latestCurrency.current === cur) setFx((f) => (f === "" ? String(rate) : f));
    });
  }
  const [interval, setInterval_] = useState<BillingInterval>(item?.billing_interval ?? "monthly");
  const [nextDue, setNextDue] = useState(item?.next_due ?? today);
  const [category, setCategory] = useState(item?.category ?? "Software");
  const options = useCategoryOptions();

  // Money in/out flips drop a category of the other side, then default to that side's first one.
  function pickDirection(d: Direction) {
    setDirection(d);
    if (options.some((o) => o.name === category && o.direction !== d)) setCategory(d === "in" ? "Retainer" : "Software");
  }
  const [status, setStatus] = useState<RecurringStatus>(item?.status ?? "active");
  const [contractor, setContractor] = useState(item?.contractor_id ?? "none");
  const [clientId, setClientId] = useState(item?.client_id ?? "none");
  const [trialEnds, setTrialEnds] = useState(item?.trial_ends ?? "");
  const [cancelBy, setCancelBy] = useState(item?.cancel_by ?? "");
  const [url, setUrl] = useState(item?.url ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");

  const items = [{ value: "none", label: "None" }, ...contractors.map((c) => ({ value: c.id, label: c.name }))];

  const clientItems = [{ value: "none", label: "None" }, ...(clients ?? []).map((c) => ({ value: c.id, label: c.name }))];

  const isBase = currency === base;
  const amountN = num(amount);
  const fxN = isBase ? 1 : num(fx);

  function save() {
    if (!isBase && !(fxN > 0)) {
      setFxError(true);
      toast.error(`Enter what 1 ${currency} is in ${base}`);
      return;
    }
    const input: RecurringInput = {
      name,
      vendor: vendor || null,
      direction,
      amount: amountN,
      currency,
      fx_rate: fxN,
      billing_interval: interval,
      next_due: nextDue,
      category,
      status,
      contractor_id: contractor === "none" ? null : contractor,
      client_id: clientId === "none" ? null : clientId,
      trial_ends: trialEnds || null,
      cancel_by: cancelBy || null,
      url: url || null,
      notes: notes || null,
    };
    start(async () => {
      const r = item ? await updateRecurring(item.id, input) : await createRecurring(input);
      if (r.ok) {
        toast.success(item ? "Saved" : "Added");
        close();
      } else toast.error(r.error);
    });
  }

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <ToggleGroup
          aria-label="Direction"
          value={[direction]}
          onValueChange={(v) => v[0] && pickDirection(v[0] as Direction)}
          spacing={0}
          variant="outline"
          className="grid w-full grid-cols-2"
        >
          <ToggleGroupItem value="out" className={SEGMENT}>
            Money out
          </ToggleGroupItem>
          <ToggleGroupItem value="in" className={SEGMENT}>
            Money in (retainer)
          </ToggleGroupItem>
        </ToggleGroup>

        <Field>
          <FieldLabel htmlFor={`${id}-name`} className="label">Name</FieldLabel>
          <Input id={`${id}-name`} className="h-11" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-vendor`} className="label">Vendor</FieldLabel>
          <Input id={`${id}-vendor`} className="h-11" value={vendor} onChange={(e) => setVendor(e.target.value)} />
        </Field>

        <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2">
          <Field>
            <FieldLabel htmlFor={`${id}-amount`} className="label">Amount</FieldLabel>
            <Input id={`${id}-amount`} className="h-11" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))} required />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-cur`} className="label">Currency</FieldLabel>
            <NativeSelect id={`${id}-cur`} className={NATIVE} value={currency} onChange={(e) => pickCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <NativeSelectOption key={c} value={c}>
                  {c}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>
        {!isBase && (
          <Field data-invalid={fxError}>
            <FieldLabel htmlFor={`${id}-fx`} className="label">
              1 {currency} in {base}
            </FieldLabel>
            <Input
              id={`${id}-fx`}
              className="h-11"
              inputMode="decimal"
              value={fx}
              aria-invalid={fxError}
              onChange={(e) => {
                setFxError(false);
                setFx(e.target.value.replace(/[^\d.,]/g, ""));
              }}
              required
            />
            {fxError ? (
              <FieldError>Enter what 1 {currency} is in {base}.</FieldError>
            ) : amountN > 0 && fxN > 0 ? (
              <FieldDescription className="text-xs tabular-nums">
                ≈ {formatMoney(round2(amountN * fxN), base)} {base}
              </FieldDescription>
            ) : null}
          </Field>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
          <Field>
            <FieldLabel htmlFor={`${id}-interval`} className="label">Billing</FieldLabel>
            <NativeSelect id={`${id}-interval`} className={NATIVE} value={interval} onChange={(e) => setInterval_(e.target.value as BillingInterval)}>
              {Object.entries(INTERVALS).map(([k, v]) => (
                <NativeSelectOption key={k} value={k}>
                  {v.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-due`} className="label">Next due</FieldLabel>
            <Input id={`${id}-due`} className="h-11" type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} required />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor={`${id}-cat`} className="label">Category</FieldLabel>
          <CategoryPicker
            id={`${id}-cat`}
            value={category}
            onChange={setCategory}
            direction={direction}
            className="h-11 w-full rounded-md border border-input bg-card px-2 focus-visible:border-ring/70 focus-visible:ring-ring/15 dark:bg-input/30"
          />
        </Field>
        <Field>
          <FieldLabel id={`${id}-status`} className="label">Status</FieldLabel>
          <ToggleGroup
            aria-labelledby={`${id}-status`}
            value={[status]}
            onValueChange={(v) => v[0] && setStatus(v[0] as RecurringStatus)}
            spacing={0}
            variant="outline"
            className="grid w-full grid-cols-3"
          >
            <ToggleGroupItem value="active" className={SEGMENT}>Active</ToggleGroupItem>
            <ToggleGroupItem value="paused" className={SEGMENT}>Paused</ToggleGroupItem>
            <ToggleGroupItem value="cancelled" className={SEGMENT}>Cancelled</ToggleGroupItem>
          </ToggleGroup>
        </Field>

        <Field>
          <FieldLabel htmlFor={`${id}-contractor`} className="label">Contractor (optional)</FieldLabel>
          <Select value={contractor} onValueChange={(v) => setContractor(v ?? "none")} items={items}>
            <SelectTrigger id={`${id}-contractor`} className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {items.map((i) => (
                <SelectItem key={i.value} value={i.value}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {clients ? (
          <Field>
            <FieldLabel htmlFor={`${id}-client`} className="label">Client (optional)</FieldLabel>
            <Select value={clientId} onValueChange={(v) => setClientId(v ?? "none")} items={clientItems}>
              <SelectTrigger id={`${id}-client`} className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {clientItems.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : null}
        <Field>
          <FieldLabel htmlFor={`${id}-trial`} className="label">Trial ends (optional)</FieldLabel>
          <Input id={`${id}-trial`} className="h-11" type="date" value={trialEnds} onChange={(e) => setTrialEnds(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-cancel`} className="label">Cancel by (optional)</FieldLabel>
          <Input id={`${id}-cancel`} className="h-11" type="date" value={cancelBy} onChange={(e) => setCancelBy(e.target.value)} />
          <FieldDescription className="text-xs">We&apos;ll remind you in your calendar.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-url`} className="label">URL</FieldLabel>
          <Input id={`${id}-url`} className="h-11" type="url" inputMode="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-notes`} className="label">Notes</FieldLabel>
          <Textarea id={`${id}-notes`} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
        </Field>
        {item && priceChanges && priceChanges.length > 0 ? (
          <section aria-labelledby={`${id}-history`}>
            <h3 id={`${id}-history`} className="label">Price history</h3>
            <Card size="sm" className="mt-1.5 gap-0 py-0">
              <ul className="divide-y text-sm">
                {priceChanges.map((c) => (
                  <li key={c.id} className="flex items-baseline justify-between gap-3 px-3 py-2">
                    <span className="text-muted-foreground tabular-nums text-xs">{fmtDay(c.changed_on)}</span>
                    <span className="tabular-nums">
                      from {formatMoney(c.old_amount, c.currency)} to {formatMoney(c.new_amount, c.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        ) : null}
      </div>
      <div className="bg-popover sticky bottom-0 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
          {pending ? (
            <>
              <Spinner /> Saving
            </>
          ) : item ? (
            "Save changes"
          ) : (
            "Add recurring"
          )}
        </Button>
      </div>
    </form>
  );
}
