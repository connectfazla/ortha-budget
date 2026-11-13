"use client";

// CONTRACT (owned by the Transactions builder; the shell imports it):
// <AddEntryDrawer contractors={...} categories={...} defaultKind? transaction?>{trigger}</AddEntryDrawer>
// - children: the trigger element (rendered via the drawer's Trigger `render` prop).
// - transaction: when set, the drawer edits that row instead of creating one.
// Layout: brief §2 [YNAB-ADD][GOPAY-ADD][CASH-AMT][BINANCE-AMT][BREX-ADD].

import { useEffect, useId, useRef, useState, useTransition, type ReactElement } from "react";
import { toast } from "sonner";
import { Trash2Icon, XIcon } from "lucide-react";
import { createTransaction, deleteTransaction, updateTransaction, type TransactionInput } from "@/lib/actions";
import { CURRENCIES, KINDS, formatMoney, round2 } from "@/lib/money";
import type { Client, Contractor, Direction, Transaction, TxnKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Receipts } from "@/components/receipts/receipts";
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { baseRate, useDesktop } from "./fx";
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
  /** Active clients for the optional Client row. Omit and the row is hidden. */
  clients?: Client[];
  /** Pre-pick this client (new entries from a client page). */
  defaultClientId?: string;
  transaction?: Transaction;
  /** The user's base currency (settings). Amounts convert into it; it needs no FX rate. */
  baseCurrency?: string;
};

const KIND_KEYS = Object.keys(KINDS) as TxnKind[];

const num = (s: string) => Number(s.replace(/,/g, "").trim());
const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local

export function AddEntryDrawer({ children, ...props }: AddEntryDrawerProps) {
  const [open, setOpen] = useState(false);
  // Desktop: a right-hand panel keeps the list visible beside the form (Stripe "Add Transaction rule",
  // incident.io "Declare incident"). Mobile: the bottom sheet.
  const desktop = useDesktop();
  return (
    <Drawer open={open} onOpenChange={setOpen} swipeDirection={desktop ? "right" : "down"} showSwipeHandle={!desktop}>
      <DrawerTrigger render={children} />
      <DrawerContent className="max-lg:h-[92dvh] max-lg:max-h-[92dvh] max-lg:rounded-t-xl lg:h-dvh lg:max-h-dvh lg:w-[440px] lg:border-l">
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
  clients,
  defaultClientId,
  transaction: t,
  baseCurrency: base = "USD",
  onDone,
}: Omit<AddEntryDrawerProps, "children"> & { onDone: () => void }) {
  const id = useId();
  const [pending, startTransition] = useTransition();
  const preset = t ? undefined : contractors.find((c) => c.id === defaultContractorId);
  const [kind, setKind] = useState<TxnKind>(t?.kind ?? defaultKind);
  const [direction, setDirection] = useState<Direction>(t?.direction ?? KINDS[defaultKind].direction);
  const [amount, setAmount] = useState(t ? String(t.amount) : "");
  const [currency, setCurrency] = useState(t?.currency ?? preset?.currency ?? base);
  const [fx, setFx] = useState(t && t.currency !== base ? String(t.fx_rate) : "");
  const [description, setDescription] = useState(t?.description ?? (preset ? `Payout, ${preset.name}` : ""));
  const [category, setCategory] = useState(t?.category ?? (preset ? "Contractors" : ""));
  const [vendor, setVendor] = useState(t?.vendor ?? "");
  const [date, setDate] = useState(t?.date ?? today);
  const [notes, setNotes] = useState(t?.notes ?? "");
  const [replaces, setReplaces] = useState(t?.replaces_monthly != null ? String(t.replaces_monthly) : "");
  const [contractorId, setContractorId] = useState<string | null>(t?.contractor_id ?? preset?.id ?? null);
  const [clientId, setClientId] = useState<string>(t?.client_id ?? defaultClientId ?? "none");
  const [showErrors, setShowErrors] = useState(false);
  const latestCurrency = useRef(currency);

  // Prefill the FX rate once when the form opens on a preset contractor paid in another currency.
  const presetCurrency = preset?.currency;
  useEffect(() => {
    if (!presetCurrency || presetCurrency === base) return;
    baseRate(presetCurrency, base).then((rate) => {
      if (rate && latestCurrency.current === presetCurrency) setFx((f) => (f === "" ? String(rate) : f));
    });
  }, [presetCurrency, base]);

  const isBase = currency === base;
  const amountN = num(amount);
  const fxN = isBase ? 1 : num(fx);
  const errors = {
    amount: !(amountN > 0) ? "Enter an amount above 0" : null,
    fx: !isBase && !(fxN > 0) ? `Enter what 1 ${currency} is in ${base}` : null,
    description: !description.trim() ? "Description is required" : null,
  };
  const firstError = errors.amount ?? errors.fx ?? errors.description;

  function pickCurrency(cur: string) {
    latestCurrency.current = cur;
    setCurrency(cur);
    setFx("");
    if (cur === base) return;
    // Nicety only: prefill if the free API answers and the user hasn't typed a rate or switched currency.
    baseRate(cur, base).then((rate) => {
      if (rate && latestCurrency.current === cur) setFx((f) => (f === "" ? String(rate) : f));
    });
  }

  function pickContractor(cid: string | null) {
    setContractorId(cid);
    const c = contractors.find((x) => x.id === cid);
    if (!c) return;
    setDescription(`Payout, ${c.name}`);
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
      client_id: clientId === "none" ? null : clientId,
      replaces_monthly: kind === "lifetime" && replaces.trim() ? num(replaces) : null,
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

  const clientItems = [{ value: "none", label: "None" }, ...(clients ?? []).map((c) => ({ value: c.id, label: c.name }))];
  const contractorItems = Object.fromEntries(contractors.map((c) => [c.id, c.name]));
  const err = (k: keyof typeof errors) => (showErrors ? errors[k] : null);

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <DrawerHeader className="flex-row items-center justify-between pt-2 pb-2 text-left">
        <DrawerTitle className="text-sm font-medium">
          {t ? "Edit entry" : "Add entry"}
        </DrawerTitle>
        <DrawerClose render={<Button type="button" variant="ghost" size="icon-lg" aria-label="Close" />}>
          <XIcon />
        </DrawerClose>
      </DrawerHeader>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
        {/* Type chips [GOPAY-ADD]: picking one sets the direction default. */}
        <ScrollArea className="-mx-4">
          <ToggleGroup
            aria-label="Type"
            value={[kind]}
            onValueChange={(v) => {
              const k = v[0] as TxnKind | undefined;
              if (!k) return; // keep one pressed
              setKind(k);
              setDirection(KINDS[k].direction);
            }}
            className="w-max gap-1.5 px-4 pb-2.5"
          >
            {KIND_KEYS.map((k) => (
              <ToggleGroupItem key={k} value={k} className={CHIP}>
                {KINDS[k].label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Outflow / Inflow [YNAB-ADD]: separate because a retainer is an "in" subscription. */}
        <ToggleGroup
          aria-label="Direction"
          value={[direction]}
          onValueChange={(v) => v[0] && setDirection(v[0] as Direction)}
          spacing={0}
          variant="outline"
          className="mt-1 grid w-full grid-cols-2"
        >
          <ToggleGroupItem value="out" className={SEGMENT}>
            Outflow
          </ToggleGroupItem>
          <ToggleGroupItem value="in" className={SEGMENT}>
            Inflow
          </ToggleGroupItem>
        </ToggleGroup>

        {/* Amount [CASH-AMT][BREX-ADD]. The big number stays a raw input (a display number, not a form box). */}
        <Field data-invalid={!!err("amount")} className="mt-5 gap-1">
          <FieldLabel htmlFor={`${id}-amt`} className="sr-only">
            Amount in {currency}
          </FieldLabel>
          <div className="flex items-center gap-2">
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
            <input
              id={`${id}-amt`}
              inputMode="decimal"
              enterKeyHint="done"
              autoComplete="off"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
              aria-invalid={!!err("amount")}
              className={cn(
                "min-w-0 flex-1 rounded-md bg-transparent text-[48px] leading-none font-medium tracking-tight tabular-nums outline-none placeholder:text-muted-foreground/50 focus-visible:ring-3 focus-visible:ring-ring/15 aria-invalid:text-money-out",
                direction === "in" && "text-money-in",
              )}
            />
          </div>
          <FieldError>{err("amount")}</FieldError>
        </Field>

        {/* Other currency: rate + secondary value line [BINANCE-AMT][BREX-ADD] */}
        {!isBase ? (
          <Card size="sm" className="mt-4 gap-0 py-0">
            <Field orientation="horizontal" data-invalid={!!err("fx")} className={ROW}>
              <FieldLabel htmlFor={`${id}-fx`} className={ROW_LABEL}>
                1 {currency} =
              </FieldLabel>
              <Input
                id={`${id}-fx`}
                inputMode="decimal"
                autoComplete="off"
                placeholder="Rate"
                value={fx}
                onChange={(e) => setFx(e.target.value.replace(/[^\d.,]/g, ""))}
                aria-invalid={!!err("fx")}
                className={FIELD}
              />
              <span className="text-muted-foreground text-sm">{base}</span>
            </Field>
          </Card>
        ) : null}
        <FieldError className="mt-1 text-xs">{err("fx")}</FieldError>
        <p className="mt-2 h-4 text-xs text-muted-foreground tabular-nums">
          {!isBase && amountN > 0 && fxN > 0 ? `≈ ${formatMoney(round2(amountN * fxN), base)} ${base}` : null}
        </p>

        {/* Grouped rows [YNAB-ADD] */}
        <Card size="sm" className="mt-3 gap-0 divide-y py-0">
          <Field orientation="horizontal" data-invalid={!!err("description")} className={ROW}>
            <FieldLabel htmlFor={`${id}-desc`} className={ROW_LABEL}>
              Description
            </FieldLabel>
            <Input
              id={`${id}-desc`}
              required
              maxLength={200}
              placeholder="Figma, client payment…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-invalid={!!err("description")}
              className={FIELD}
            />
          </Field>
          {kind === "contractor" ? (
            <Field orientation="horizontal" className={ROW}>
              <FieldLabel htmlFor={`${id}-contractor`} className={ROW_LABEL}>
                Contractor
              </FieldLabel>
              <Select value={contractorId} onValueChange={pickContractor} items={contractorItems}>
                <SelectTrigger id={`${id}-contractor`} className={cn(FIELD, "w-full justify-end gap-2 border-0")}>
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
            </Field>
          ) : null}
          {clients ? (
            <Field orientation="horizontal" className={ROW}>
              <FieldLabel htmlFor={`${id}-client`} className={ROW_LABEL}>
                Client
              </FieldLabel>
              <Select value={clientId} onValueChange={(v) => setClientId(v ?? "none")} items={clientItems}>
                <SelectTrigger id={`${id}-client`} className={cn(FIELD, "w-full justify-end gap-2 border-0")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {clientItems.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}
          <Field orientation="horizontal" className={ROW}>
            <FieldLabel htmlFor={`${id}-cat`} className={ROW_LABEL}>
              Category
            </FieldLabel>
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
          </Field>
          <Field orientation="horizontal" className={ROW}>
            <FieldLabel htmlFor={`${id}-vendor`} className={ROW_LABEL}>
              Vendor
            </FieldLabel>
            <Input
              id={`${id}-vendor`}
              maxLength={120}
              placeholder="Optional"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className={FIELD}
            />
          </Field>
          <Field orientation="horizontal" className={ROW}>
            <FieldLabel htmlFor={`${id}-date`} className={ROW_LABEL}>
              Date
            </FieldLabel>
            <Input id={`${id}-date`} type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={FIELD} />
          </Field>
          {kind === "lifetime" ? (
            <Field orientation="horizontal" className={ROW}>
              <FieldLabel htmlFor={`${id}-repl`} className={ROW_LABEL}>
                Replaces a month
              </FieldLabel>
              <Input
                id={`${id}-repl`}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={replaces}
                onChange={(e) => setReplaces(e.target.value.replace(/[^\d.,]/g, ""))}
                className={FIELD}
              />
              <span className="text-muted-foreground text-sm">{base}</span>
            </Field>
          ) : null}
          <Field orientation="horizontal" className={ROW}>
            <FieldLabel htmlFor={`${id}-notes`} className={ROW_LABEL}>
              Notes
            </FieldLabel>
            <Input
              id={`${id}-notes`}
              maxLength={2000}
              placeholder="Optional"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={FIELD}
            />
          </Field>
        </Card>
        <FieldError className="mt-1 text-xs">{err("description")}</FieldError>

        {kind === "subscription" ? (
          <p className="mt-3 text-xs text-muted-foreground">
            This logs a single charge. Recurring plans with renewal dates live under Plans, then Subscriptions.
          </p>
        ) : null}

        <Receipts transactionId={t?.id} />

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
                  {t.description}, {formatMoney(t.amount, t.currency)}. This can’t be undone.
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
        <Button type="submit" disabled={pending} className="h-[52px] w-full rounded-md text-sm">
          {pending ? (
            <>
              <Spinner /> Saving
            </>
          ) : t ? (
            "Save changes"
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </form>
  );
}

const CHIP =
  "h-9 rounded-sm border px-3 text-xs data-pressed:border-foreground data-pressed:bg-foreground data-pressed:text-background";
const SEGMENT =
  "h-10 text-xs text-muted-foreground data-pressed:text-foreground";
// Grouped rows [YNAB-ADD]: label left, borderless control right; the row tints while a control inside has focus.
const ROW = "min-h-12 gap-3 px-3 focus-within:bg-muted/40";
const ROW_LABEL = "label w-28 flex-none!";
const FIELD =
  "h-12 min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 text-right shadow-none focus-visible:ring-0 dark:bg-transparent aria-invalid:text-money-out aria-invalid:ring-0";
