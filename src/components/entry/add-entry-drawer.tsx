"use client";

// CONTRACT (owned by the Transactions builder; the shell imports it):
// <AddEntryDrawer contractors={...} defaultKind? transaction?>{trigger}</AddEntryDrawer>
// - children: the trigger element (rendered via the drawer's Trigger `render` prop).
// - transaction: when set, the drawer edits that row instead of creating one.
// Layout: brief §2 [YNAB-ADD][GOPAY-ADD][CASH-AMT][BINANCE-AMT][BREX-ADD].
// New subscriptions (and income set to repeat, i.e. retainers) save as real plans via createSubscription:
// Repeats / Next charge / Paid today rows follow Orbit "Add Subscription" (Payment date, Billing cycle, Free trial
// switch in one grouped list) and Monzo "How often does this payment repeat?" (Weekly to Yearly).

import { useEffect, useId, useRef, useState, useTransition, type ReactElement } from "react";
import { toast } from "sonner";
import { RepeatIcon, Trash2Icon, XIcon } from "lucide-react";
import {
  createSubscription,
  createTransaction,
  deleteTransaction,
  updateTransaction,
  type RecurringInput,
  type TransactionInput,
} from "@/lib/actions";
import { CURRENCIES, INTERVALS, KINDS, formatMoney, round2 } from "@/lib/money";
import type { BillingInterval, Client, Contractor, Direction, Transaction, TxnKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { CategoryPicker } from "@/components/categories/category-picker";
import { useCategoryOptions } from "@/components/categories/category-context";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Receipts } from "@/components/receipts/receipts";
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { baseRate, useDesktop } from "./fx";
import { addInterval, shortDay } from "./interval";
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
  /** @deprecated Unused: categories come from useCategoryOptions(). Kept optional so callers compile. */
  categories?: string[];
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

// Sheet order and labels: the everyday type first, and "repeats" vs "once" spelled out (owner feedback).
const KIND_KEYS: TxnKind[] = ["expense", "subscription", "one_time", "lifetime", "contractor", "income"];
const kindLabel = (k: TxnKind) => (k === "one_time" ? "One-time purchase" : KINDS[k].label);
const KIND_HINT: Record<TxnKind, string> = {
  expense: "A single cost, logged on its date.",
  subscription: "Repeats. Saves a plan under Subscriptions with renewal reminders.",
  one_time: "Paid once. No renewals.",
  lifetime: "Paid once for lasting access. Shows payback against what it replaces.",
  contractor: "A payout to someone on your Contractors list.",
  income: "Money in. Set Repeats for a retainer.",
};
type Repeat = BillingInterval | "never";

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
  const options = useCategoryOptions();
  // Repeating entries (new only): a subscription always repeats; income repeats when set (a retainer).
  const [repeat, setRepeat] = useState<Repeat>(defaultKind === "subscription" ? "monthly" : "never");
  const [nextCharge, setNextCharge] = useState(""); // "" = auto: today plus one interval
  const [paidToday, setPaidToday] = useState(true);
  const repeatable = !t && (kind === "subscription" || kind === "income");
  const isPlan = repeatable && repeat !== "never";
  const nextDue = repeat === "never" ? "" : nextCharge || addInterval(today(), repeat);

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
    next: isPlan && !nextDue ? "Pick the next charge date" : null,
  };
  const firstError = errors.amount ?? errors.fx ?? errors.description ?? errors.next;

  // Switching money in/out drops a category that belongs to the other side (Software makes no sense on income).
  function pickDirection(d: Direction) {
    setDirection(d);
    if (options.some((o) => o.name === category && o.direction !== d)) setCategory("");
  }

  function pickKind(k: TxnKind) {
    setKind(k);
    pickDirection(KINDS[k].direction);
    if (k === "subscription" && repeat === "never") setRepeat("monthly");
    if (k === "income") setRepeat("never");
  }

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
      category: category || (direction === "in" ? "Other income" : "Other"),
      vendor: vendor.trim() || null,
      contractor_id: kind === "contractor" ? contractorId : null,
      client_id: clientId === "none" ? null : clientId,
      replaces_monthly: kind === "lifetime" && replaces.trim() ? num(replaces) : null,
      notes: notes.trim() || null,
    };
    if (isPlan) return savePlan(input, repeat as BillingInterval);
    startTransition(async () => {
      const res = t ? await updateTransaction(t.id, input) : await createTransaction(input);
      if (!res.ok) return void toast.error(res.error);
      toast.success(t ? "Saved" : "Added");
      onDone();
    });
  }

  function savePlan(i: TransactionInput, interval: BillingInterval) {
    const plan: RecurringInput = {
      name: i.description,
      vendor: i.vendor,
      direction: i.direction,
      amount: i.amount,
      currency: i.currency,
      fx_rate: i.fx_rate,
      billing_interval: interval,
      // Paid today: mark_recurring_paid logs today's payment and moves next_due on by one interval, so start one back.
      // ponytail: a custom next date on the 29th-31st can land 1-3 days early after the round trip; send next_due
      // straight through once createSubscription takes the date it should end on.
      next_due: paidToday ? (nextCharge ? addInterval(nextCharge, interval, -1) : today()) : nextDue,
      category: i.category,
      status: "active",
      client_id: i.client_id,
      notes: i.notes,
    };
    startTransition(async () => {
      const res = await createSubscription(plan, paidToday, today());
      if (!res.ok) return void toast.error(res.error);
      const what = i.direction === "in" ? "payment" : "charge";
      toast.success(`Added ${plan.name}${paidToday ? ` and logged today’s ${what}` : ""}. Next ${what} ${shortDay(nextDue)}`);
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
              if (k) pickKind(k); // ignore the deselect, keep one pressed
            }}
            className="w-max gap-1.5 px-4 pb-2.5"
          >
            {KIND_KEYS.map((k) => (
              <ToggleGroupItem key={k} value={k} className={CHIP}>
                {k === "subscription" ? <RepeatIcon aria-hidden /> : null}
                {kindLabel(k)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <p className="text-xs text-muted-foreground">
          {t && kind === "subscription" ? "Edits this one charge. The plan itself lives under Subscriptions." : KIND_HINT[kind]}
        </p>

        {/* Outflow / Inflow [YNAB-ADD]: separate because a retainer is an "in" subscription. */}
        <ToggleGroup
          aria-label="Direction"
          value={[direction]}
          onValueChange={(v) => v[0] && pickDirection(v[0] as Direction)}
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
            <CategoryPicker id={`${id}-cat`} value={category} onChange={setCategory} direction={direction} className="h-12 flex-1 justify-end" />
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
          {repeatable ? (
            <Field orientation="horizontal" className={ROW}>
              <FieldLabel htmlFor={`${id}-repeat`} className={ROW_LABEL}>
                Repeats
              </FieldLabel>
              <NativeSelect
                id={`${id}-repeat`}
                value={repeat}
                onChange={(e) => setRepeat(e.target.value as Repeat)}
                className="min-w-0 flex-1 *:data-[slot=native-select]:h-12 *:data-[slot=native-select]:border-0 *:data-[slot=native-select]:bg-transparent *:data-[slot=native-select]:text-right *:data-[slot=native-select]:shadow-none dark:*:data-[slot=native-select]:bg-transparent"
              >
                {kind === "income" ? <NativeSelectOption value="never">Never</NativeSelectOption> : null}
                {Object.entries(INTERVALS).map(([k, v]) => (
                  <NativeSelectOption key={k} value={k}>
                    {v.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          ) : null}
          {isPlan ? (
            <>
              <Field orientation="horizontal" data-invalid={!!err("next")} className={ROW}>
                <FieldLabel htmlFor={`${id}-next`} className={ROW_LABEL}>
                  {direction === "in" ? "Next payment" : "Next charge"}
                </FieldLabel>
                <Input
                  id={`${id}-next`}
                  type="date"
                  required
                  value={nextDue}
                  onChange={(e) => setNextCharge(e.target.value)}
                  aria-invalid={!!err("next")}
                  className={FIELD}
                />
              </Field>
              <Field orientation="horizontal" className={ROW}>
                <FieldLabel htmlFor={`${id}-paid`} className="label flex-1">
                  {direction === "in" ? "Received today" : "Paid today"}
                </FieldLabel>
                <Switch id={`${id}-paid`} checked={paidToday} onCheckedChange={setPaidToday} />
              </Field>
            </>
          ) : (
            <Field orientation="horizontal" className={ROW}>
              <FieldLabel htmlFor={`${id}-date`} className={ROW_LABEL}>
                Date
              </FieldLabel>
              <Input id={`${id}-date`} type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={FIELD} />
            </Field>
          )}
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

        {isPlan ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {paidToday
              ? `Logs today’s ${direction === "in" ? "payment" : "charge"} now. The plan counts in Subscriptions, the forecast and reminders.`
              : "The plan counts in Subscriptions, the forecast and reminders. Nothing is logged until you mark it paid."}
          </p>
        ) : (
          <Receipts transactionId={t?.id} />
        )}

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
          ) : isPlan ? (
            direction === "in" ? "Save retainer" : "Save subscription"
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
