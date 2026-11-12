"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createRecurring, updateRecurring, type RecurringInput } from "@/lib/actions";
import { CURRENCIES, INTERVALS, formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { BillingInterval, Client, Contractor, Direction, Recurring, RecurringStatus } from "@/lib/types";

const NATIVE =
  "border-input dark:bg-input/30 h-11 w-full rounded-md border bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const LABEL = "label";

// USD-per-unit rates from open.er-api.com (same helper as add-entry-drawer), fetched once per page load.
let ratesPromise: Promise<Record<string, number>> | null = null;
function usdRate(cur: string): Promise<number | null> {
  ratesPromise ??= fetch("https://open.er-api.com/v6/latest/USD")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((j: { rates?: Record<string, number> }) => j.rates ?? {})
    .catch(() => {
      ratesPromise = null;
      return {};
    });
  return ratesPromise.then((rates) => (rates[cur] > 0 ? Number((1 / rates[cur]).toPrecision(6)) : null));
}

const num = (s: string) => Number(s.replace(/,/g, "").trim());

export function RecurringDrawer({
  open,
  onOpenChange,
  item,
  contractors,
  clients,
  categories,
  today,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  item: Recurring | null;
  contractors: Contractor[];
  /** Active clients for the optional Client row. Omit and the row is hidden. */
  clients?: Client[];
  categories: string[];
  today: string;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-sm font-medium">
            {item ? "Edit recurring" : "New recurring"}
          </DrawerTitle>
        </DrawerHeader>
        {/* Form mounts only while open, so state resets per open. */}
        <Form item={item} contractors={contractors} clients={clients} categories={categories} today={today} close={() => onOpenChange(false)} />
      </DrawerContent>
    </Drawer>
  );
}

function Form({
  item,
  contractors,
  clients,
  categories,
  today,
  close,
}: {
  item: Recurring | null;
  contractors: Contractor[];
  clients?: Client[];
  categories: string[];
  today: string;
  close: () => void;
}) {
  const [pending, start] = useTransition();
  const [name, setName] = useState(item?.name ?? "");
  const [vendor, setVendor] = useState(item?.vendor ?? "");
  const [direction, setDirection] = useState<Direction>(item?.direction ?? "out");
  const [amount, setAmount] = useState(item ? String(item.amount) : "");
  const [currency, setCurrency] = useState(item?.currency ?? "USD");
  const [fx, setFx] = useState(item && item.currency !== "USD" ? String(item.fx_rate) : "");
  const latestCurrency = useRef(currency);

  function pickCurrency(cur: string) {
    latestCurrency.current = cur;
    setCurrency(cur);
    setFx("");
    if (cur === "USD") return;
    usdRate(cur).then((rate) => {
      if (rate && latestCurrency.current === cur) setFx((f) => (f === "" ? String(rate) : f));
    });
  }
  const [interval, setInterval_] = useState<BillingInterval>(item?.billing_interval ?? "monthly");
  const [nextDue, setNextDue] = useState(item?.next_due ?? today);
  const [category, setCategory] = useState(item?.category ?? "Software");
  const [status, setStatus] = useState<RecurringStatus>(item?.status ?? "active");
  const [contractor, setContractor] = useState(item?.contractor_id ?? "none");
  const [clientId, setClientId] = useState(item?.client_id ?? "none");
  const [trialEnds, setTrialEnds] = useState(item?.trial_ends ?? "");
  const [url, setUrl] = useState(item?.url ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");

  const items = [{ value: "none", label: "None" }, ...contractors.map((c) => ({ value: c.id, label: c.name }))];

  const clientItems = [{ value: "none", label: "None" }, ...(clients ?? []).map((c) => ({ value: c.id, label: c.name }))];

  const isUsd = currency === "USD";
  const amountN = num(amount);
  const fxN = isUsd ? 1 : num(fx);

  function save() {
    if (!isUsd && !(fxN > 0)) {
      toast.error("Enter the FX rate to USD");
      return;
    }
    const input: RecurringInput = {
      name,
      vendor: vendor || null,
      direction,
      amount: Number(amount),
      currency,
      fx_rate: fxN,
      billing_interval: interval,
      next_due: nextDue,
      category,
      status,
      contractor_id: contractor === "none" ? null : contractor,
      client_id: clientId === "none" ? null : clientId,
      trial_ends: trialEnds || null,
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
        <div className="grid grid-cols-2 gap-1 rounded-md border p-1" role="group" aria-label="Direction">
          {(["out", "in"] as const).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={direction === d}
              onClick={() => setDirection(d)}
              className={cn(
                "focus-visible:ring-ring/50 h-9 rounded-sm text-xs font-medium outline-none focus-visible:ring-3",
                direction === d ? "bg-muted text-foreground border" : "text-muted-foreground",
              )}
            >
              {d === "out" ? "Money out" : "Money in (retainer)"}
            </button>
          ))}
        </div>

        <Field label="Name">
          <Input className="h-11" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
        </Field>
        <Field label="Vendor">
          <Input className="h-11" value={vendor} onChange={(e) => setVendor(e.target.value)} />
        </Field>

        <div className="grid grid-cols-[1fr_6.5rem] gap-2">
          <Field label="Amount">
            <Input className="h-11" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </Field>
          <Field label="Currency">
            <select className={NATIVE} value={currency} onChange={(e) => pickCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
        {currency !== "USD" && (
          <Field label={`USD per 1 ${currency}`}>
            <Input className="h-11" inputMode="decimal" value={fx} onChange={(e) => setFx(e.target.value.replace(/[^\d.,]/g, ""))} required />
          </Field>
        )}
        {!isUsd && amountN > 0 && fxN > 0 && (
          <p className="text-muted-foreground tabular-nums text-xs">≈ {formatMoney(Math.round(amountN * fxN * 100) / 100)} USD</p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Field label="Billing">
            <select className={NATIVE} value={interval} onChange={(e) => setInterval_(e.target.value as BillingInterval)}>
              {Object.entries(INTERVALS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Next due">
            <Input className="h-11" type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} required />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Category">
            <Input className="h-11" list="rec-cats" value={category} onChange={(e) => setCategory(e.target.value)} />
            <datalist id="rec-cats">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Status">
            <select className={NATIVE} value={status} onChange={(e) => setStatus(e.target.value as RecurringStatus)}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </Field>
        </div>

        <Field label="Contractor (optional)">
          <Select value={contractor} onValueChange={(v) => setContractor(v ?? "none")} items={items}>
            <SelectTrigger className="h-11 w-full" aria-label="Contractor">
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
          <Field label="Client (optional)">
            <Select value={clientId} onValueChange={(v) => setClientId(v ?? "none")} items={clientItems}>
              <SelectTrigger className="h-11 w-full" aria-label="Client">
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
        <Field label="Trial ends (optional)">
          <Input className="h-11" type="date" value={trialEnds} onChange={(e) => setTrialEnds(e.target.value)} />
        </Field>
        <Field label="URL">
          <Input className="h-11" type="url" inputMode="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
        </Field>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
        </Field>
      </div>
      <div className="bg-popover sticky bottom-0 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
          {pending ? "Saving…" : item ? "Save changes" : "Add recurring"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Label className={cn(LABEL, "flex-col items-stretch gap-1.5")}>
      {label}
      {children}
    </Label>
  );
}
