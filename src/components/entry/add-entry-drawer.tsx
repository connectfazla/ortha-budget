"use client";

// CONTRACT (owned by the Transactions builder; the shell imports it):
// <AddEntryDrawer contractors={...} categories={...} defaultKind? transaction?>{trigger}</AddEntryDrawer>
// - children: the trigger element (rendered via the drawer's Trigger `render` prop).
// - transaction: when set, the drawer edits that row instead of creating one.
// Layout: brief §2 [YNAB-ADD][GOPAY-ADD][CASH-AMT][BINANCE-AMT][BREX-ADD].

import { useEffect, useId, useRef, useState, useTransition, type ReactElement, type ReactNode } from "react";
import { toast } from "sonner";
import { Trash2Icon, XIcon } from "lucide-react";
import { createTransaction, deleteTransaction, updateTransaction, type TransactionInput } from "@/lib/actions";
import { CURRENCIES, KINDS, formatMoney, round2 } from "@/lib/money";
import type { Contractor, Direction, Transaction, TxnKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export type AddEntryDrawerProps = {
  children: ReactElement;
  contractors: Contractor[];
  categories: string[];
  defaultKind?: TxnKind;
  /** Pre-pick this contractor (new contractor payouts from a contractor's page). */
  defaultContractorId?: string;
  transaction?: Transaction;
};

const KIND_KEYS = Object.keys(KINDS) as TxnKind[];

// USD-per-unit rates from open.er-api.com, fetched once per page load and only when a non-USD currency is picked.
let ratesPromise: Promise<Record<string, number>> | null = null;
function usdRate(cur: string): Promise<number | null> {
  ratesPromise ??= fetch("https://open.er-api.com/v6/latest/USD")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((j: { rates?: Record<string, number> }) => j.rates ?? {})
    .catch(() => {
      ratesPromise = null; // let a later pick retry
      return {};
    });
  return ratesPromise.then((rates) => (rates[cur] > 0 ? Number((1 / rates[cur]).toPrecision(6)) : null));
}

const num = (s: string) => Number(s.replace(/,/g, "").trim());
const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local

export function AddEntryDrawer({ children, ...props }: AddEntryDrawerProps) {
  const [open, setOpen] = useState(false);
  return (
    <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
      <DrawerTrigger render={children} />
      <DrawerContent className="h-[92dvh] max-h-[92dvh] rounded-t-xl lg:mx-auto lg:max-w-[480px] lg:border-x">
        {/* The popup unmounts when closed, so the form re-initialises (resets) on every open. */}
        <EntryForm {...props} onDone={() => setOpen(false)} />
      </DrawerContent>
    </Drawer>
  );
}

function EntryForm({
  contractors,
  categories,
  defaultKind = "expense",
  defaultContractorId,
  transaction: t,
  onDone,
}: Omit<AddEntryDrawerProps, "children"> & { onDone: () => void }) {
  const id = useId();
  const [pending, startTransition] = useTransition();
  const preset = t ? undefined : contractors.find((c) => c.id === defaultContractorId);
  const [kind, setKind] = useState<TxnKind>(t?.kind ?? defaultKind);
  const [direction, setDirection] = useState<Direction>(t?.direction ?? KINDS[defaultKind].direction);
  const [amount, setAmount] = useState(t ? String(t.amount) : "");
  const [currency, setCurrency] = useState(t?.currency ?? preset?.currency ?? "USD");
  const [fx, setFx] = useState(t && t.currency !== "USD" ? String(t.fx_rate) : "");
  const [description, setDescription] = useState(t?.description ?? (preset ? `Payout · ${preset.name}` : ""));
  const [category, setCategory] = useState(t?.category ?? (preset ? "Contractors" : ""));
  const [vendor, setVendor] = useState(t?.vendor ?? "");
  const [date, setDate] = useState(t?.date ?? today);
  const [notes, setNotes] = useState(t?.notes ?? "");
  const [replaces, setReplaces] = useState(t?.replaces_monthly_usd != null ? String(t.replaces_monthly_usd) : "");
  const [contractorId, setContractorId] = useState<string | null>(t?.contractor_id ?? preset?.id ?? null);
  const [showErrors, setShowErrors] = useState(false);
  const latestCurrency = useRef(currency);

  // Prefill the FX rate once when the form opens on a preset non-USD contractor.
  const presetCurrency = preset?.currency;
  useEffect(() => {
    if (!presetCurrency || presetCurrency === "USD") return;
    usdRate(presetCurrency).then((rate) => {
      if (rate && latestCurrency.current === presetCurrency) setFx((f) => (f === "" ? String(rate) : f));
    });
  }, [presetCurrency]);

  const isUsd = currency === "USD";
  const amountN = num(amount);
  const fxN = isUsd ? 1 : num(fx);
  const errors = {
    amount: !(amountN > 0) ? "Enter an amount above 0" : null,
    fx: !isUsd && !(fxN > 0) ? "Enter the FX rate to USD" : null,
    description: !description.trim() ? "Description is required" : null,
  };
  const firstError = errors.amount ?? errors.fx ?? errors.description;

  function pickCurrency(cur: string) {
    latestCurrency.current = cur;
    setCurrency(cur);
    setFx("");
    if (cur === "USD") return;
    // Nicety only: prefill if the free API answers and the user hasn't typed a rate or switched currency.
    usdRate(cur).then((rate) => {
      if (rate && latestCurrency.current === cur) setFx((f) => (f === "" ? String(rate) : f));
    });
  }

  function pickContractor(cid: string | null) {
    setContractorId(cid);
    const c = contractors.find((x) => x.id === cid);
    if (!c) return;
    setDescription(`Payout · ${c.name}`);
    if (!category) setCategory("Contractors");
    if (c.currency !== currency) pickCurrency(c.currency);
  }

  function save() {
    if (firstError) {
      setShowErrors(true);
      toast.error(firstError);
      return;
    }
    const input: TransactionInput = {
      date,
      direction,
      kind,
      amount: amountN,
      currency,
      fx_rate: fxN,
      description: description.trim(),
      category: category.trim(),
      vendor: vendor.trim() || null,
      contractor_id: kind === "contractor" ? contractorId : null,
      replaces_monthly_usd: kind === "lifetime" && replaces.trim() ? num(replaces) : null,
      notes: notes.trim() || null,
    };
    startTransition(async () => {
      const res = t ? await updateTransaction(t.id, input) : await createTransaction(input);
      if (!res.ok) return void toast.error(res.error);
      toast.success(t ? "Saved" : "Added");
      onDone();
    });
  }

  function remove() {
    if (!t) return;
    startTransition(async () => {
      const res = await deleteTransaction(t.id);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Deleted");
      onDone();
    });
  }

  const contractorItems = Object.fromEntries(contractors.map((c) => [c.id, c.name]));

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <DrawerHeader className="flex-row items-center justify-between pt-2 pb-2 text-left">
        <DrawerTitle className="text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
          {t ? "Edit entry" : "Add entry"}
        </DrawerTitle>
        <DrawerClose render={<Button type="button" variant="ghost" size="icon-lg" aria-label="Close" />}>
          <XIcon />
        </DrawerClose>
      </DrawerHeader>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
        {/* Type chips [GOPAY-ADD]: picking one sets the direction default. */}
        <ToggleGroup
          aria-label="Type"
          value={[kind]}
          onValueChange={(v) => {
            const k = v[0] as TxnKind | undefined;
            if (!k) return; // keep one pressed
            setKind(k);
            setDirection(KINDS[k].direction);
          }}
          className="-mx-4 w-auto max-w-none gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
        >
          {KIND_KEYS.map((k) => (
            <ToggleGroupItem key={k} value={k} className={CHIP}>
              {KINDS[k].label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {/* Outflow / Inflow [YNAB-ADD]: separate because a retainer is an "in" subscription. */}
        <ToggleGroup
          aria-label="Direction"
          value={[direction]}
          onValueChange={(v) => v[0] && setDirection(v[0] as Direction)}
          spacing={0}
          variant="outline"
          className="mt-3 grid w-full grid-cols-2"
        >
          <ToggleGroupItem value="out" className={SEGMENT}>
            Outflow
          </ToggleGroupItem>
          <ToggleGroupItem value="in" className={SEGMENT}>
            Inflow
          </ToggleGroupItem>
        </ToggleGroup>

        {/* Amount [CASH-AMT][BREX-ADD] */}
        <div className="mt-5 flex items-center gap-2">
          <Select value={currency} onValueChange={(v) => v && pickCurrency(v)}>
            <SelectTrigger aria-label="Currency" className="h-11 rounded-md px-2.5 text-sm font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span
            aria-hidden
            className={cn("text-[48px] leading-none tracking-tight", direction === "in" ? "text-money-in" : "text-muted-foreground")}
          >
            {direction === "in" ? "+" : "−"}
          </span>
          <label htmlFor={`${id}-amt`} className="sr-only">
            Amount
          </label>
          <input
            id={`${id}-amt`}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
            aria-invalid={showErrors && !!errors.amount}
            className={cn(
              "min-w-0 flex-1 bg-transparent text-[48px] leading-none font-medium tracking-tight tabular-nums outline-none placeholder:text-muted-foreground/50 aria-invalid:text-money-out",
              direction === "in" && "text-money-in",
            )}
          />
        </div>

        {/* Non-USD: rate + secondary value line [BINANCE-AMT][BREX-ADD] */}
        {!isUsd ? (
          <Group className="mt-4">
            <Row label="FX → USD" htmlFor={`${id}-fx`}>
              <Input
                id={`${id}-fx`}
                inputMode="decimal"
                autoComplete="off"
                placeholder={`USD per 1 ${currency}`}
                value={fx}
                onChange={(e) => setFx(e.target.value.replace(/[^\d.,]/g, ""))}
                aria-invalid={showErrors && !!errors.fx}
                className={FIELD}
              />
            </Row>
          </Group>
        ) : null}
        <p className="mt-2 h-4 text-xs text-muted-foreground tabular-nums">
          {!isUsd && amountN > 0 && fxN > 0 ? `≈ ${formatMoney(round2(amountN * fxN))} USD` : null}
        </p>

        {/* Grouped rows [YNAB-ADD] */}
        <Group className="mt-3">
          <Row label="Description" htmlFor={`${id}-desc`}>
            <Input
              id={`${id}-desc`}
              required
              maxLength={200}
              placeholder="Figma, client payment…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-invalid={showErrors && !!errors.description}
              className={FIELD}
            />
          </Row>
          {kind === "contractor" ? (
            <Row label="Contractor">
              <Select value={contractorId} onValueChange={pickContractor} items={contractorItems}>
                <SelectTrigger aria-label="Contractor" className={cn(FIELD, "w-full justify-end gap-2 border-0")}>
                  <SelectValue placeholder={contractors.length ? "Choose" : "None yet"} />
                </SelectTrigger>
                <SelectContent>
                  {contractors.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
          ) : null}
          <Row label="Category" htmlFor={`${id}-cat`}>
            <Input
              id={`${id}-cat`}
              list={`${id}-cats`}
              maxLength={60}
              placeholder="Other"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={FIELD}
            />
            <datalist id={`${id}-cats`}>
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Row>
          <Row label="Vendor" htmlFor={`${id}-vendor`}>
            <Input
              id={`${id}-vendor`}
              maxLength={120}
              placeholder="Optional"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className={FIELD}
            />
          </Row>
          <Row label="Date" htmlFor={`${id}-date`}>
            <Input
              id={`${id}-date`}
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={FIELD}
            />
          </Row>
          {kind === "lifetime" ? (
            <Row label="Replaces $/mo" htmlFor={`${id}-repl`}>
              <Input
                id={`${id}-repl`}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={replaces}
                onChange={(e) => setReplaces(e.target.value.replace(/[^\d.,]/g, ""))}
                className={FIELD}
              />
            </Row>
          ) : null}
          <Row label="Notes" htmlFor={`${id}-notes`}>
            <Input
              id={`${id}-notes`}
              maxLength={2000}
              placeholder="Optional"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={FIELD}
            />
          </Row>
        </Group>

        {kind === "subscription" ? (
          <p className="mt-3 text-xs text-muted-foreground">
            This logs a single charge. Recurring plans with renewal dates live under Plans → Subscriptions.
          </p>
        ) : null}

        {t ? (
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button type="button" variant="ghost" className="mt-6 h-11 w-full text-money-out" disabled={pending} />}
            >
              <Trash2Icon /> Delete entry
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                <AlertDialogDescription>
                  {t.description} · {formatMoney(t.amount, t.currency)}. This can’t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={remove} disabled={pending}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>

      {/* Sticky CTA [GOPAY-ADD][CASH-AMT] */}
      <div className="shrink-0 border-t bg-popover p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button type="submit" disabled={pending} className="h-[52px] w-full rounded-md text-sm tracking-[0.08em] uppercase">
          {pending ? "Saving…" : t ? "Save changes" : "Save"}
        </Button>
      </div>
    </form>
  );
}

const CHIP =
  "h-9 rounded-sm border px-3 text-[11px] tracking-[0.08em] uppercase data-pressed:border-foreground data-pressed:bg-foreground data-pressed:text-background";
const SEGMENT =
  "h-10 text-[11px] tracking-[0.08em] uppercase data-pressed:bg-foreground data-pressed:text-background first:rounded-l-md last:rounded-r-md";
const FIELD =
  "h-12 rounded-none border-0 bg-transparent px-0 text-right shadow-none focus-visible:ring-0 dark:bg-transparent aria-invalid:text-money-out aria-invalid:ring-0";

function Group({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("divide-y rounded-lg border bg-card", className)}>{children}</div>;
}

function Row({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-12 items-center gap-3 px-3 focus-within:bg-muted/40">
      <label htmlFor={htmlFor} className="w-28 shrink-0 text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
