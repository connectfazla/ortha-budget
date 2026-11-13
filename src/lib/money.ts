import type { BillingInterval, Direction, TxnKind } from "./types";

export const CURRENCIES = ["USD", "BDT", "EUR", "GBP", "AUD", "CAD", "INR", "AED"] as const;

export const KINDS: Record<TxnKind, { label: string; direction: Direction; hint: string }> = {
  subscription: { label: "Subscription", direction: "out", hint: "SaaS, tools, hosting" },
  one_time: { label: "One-time", direction: "out", hint: "Single purchase or payment" },
  lifetime: { label: "Lifetime deal", direction: "out", hint: "AppSumo-style LTD" },
  contractor: { label: "Contractor", direction: "out", hint: "Freelancer payout" },
  expense: { label: "Expense", direction: "out", hint: "Anything else going out" },
  income: { label: "Income", direction: "in", hint: "Client payment, retainer" },
};

export const INTERVALS: Record<BillingInterval, { label: string; perMonth: number }> = {
  weekly: { label: "Weekly", perMonth: 52 / 12 },
  monthly: { label: "Monthly", perMonth: 1 },
  quarterly: { label: "Quarterly", perMonth: 1 / 3 },
  yearly: { label: "Yearly", perMonth: 1 / 12 },
};

/**
 * The fixed category set every account starts with. `icon` is a lucide icon name (mapped in the category picker).
 * People add their own on top (categories table); names here never change, so old entries keep matching.
 */
export const CATEGORIES = [
  { name: "Software", direction: "out", icon: "app-window" },
  { name: "Hosting", direction: "out", icon: "server" },
  { name: "Design tools", direction: "out", icon: "pen-tool" },
  { name: "AI", direction: "out", icon: "sparkles" },
  { name: "Marketing", direction: "out", icon: "megaphone" },
  { name: "Contractors", direction: "out", icon: "users" },
  { name: "Office", direction: "out", icon: "building-2" },
  { name: "Hardware", direction: "out", icon: "laptop" },
  { name: "Legal & admin", direction: "out", icon: "scale" },
  { name: "Taxes & fees", direction: "out", icon: "landmark" },
  { name: "Bank fees", direction: "out", icon: "credit-card" },
  { name: "Travel", direction: "out", icon: "plane" },
  { name: "Meals", direction: "out", icon: "utensils" },
  { name: "Education", direction: "out", icon: "graduation-cap" },
  { name: "Other", direction: "out", icon: "circle-ellipsis" },
  { name: "Client work", direction: "in", icon: "briefcase" },
  { name: "Retainer", direction: "in", icon: "repeat" },
  { name: "Product sales", direction: "in", icon: "shopping-bag" },
  { name: "Other income", direction: "in", icon: "circle-plus" },
] as const satisfies readonly { name: string; direction: Direction; icon: string }[];

export const DEFAULT_CATEGORIES: string[] = CATEGORIES.map((c) => c.name);

export function monthlyEquivalent(amountUsd: number, interval: BillingInterval) {
  return round2(amountUsd * INTERVALS[interval].perMonth);
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

const fmtCache = new Map<string, Intl.NumberFormat>();
export function formatMoney(amount: number, currency = "USD", opts: { compact?: boolean } = {}) {
  const key = `${currency}:${opts.compact ? 1 : 0}`;
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol", // ৳45,000 not BDT 45,000
      notation: opts.compact ? "compact" : "standard",
      maximumFractionDigits: opts.compact ? 1 : 2,
      minimumFractionDigits: opts.compact ? 0 : 2,
    });
    fmtCache.set(key, f);
  }
  return f.format(amount);
}

/** "+$1,200.00" / "−$49.00" for lists. */
export function formatSigned(amountUsd: number, direction: Direction) {
  return `${direction === "in" ? "+" : "−"}${formatMoney(amountUsd)}`;
}

/** Months to pay off a lifetime deal vs the subscription it replaces; null if it replaces nothing. */
export function ltdPaybackMonths(priceUsd: number, replacesMonthlyUsd: number | null) {
  if (!replacesMonthlyUsd || replacesMonthlyUsd <= 0) return null;
  return Math.ceil(priceUsd / replacesMonthlyUsd);
}

/**
 * Your timezone (IANA name, e.g. "America/New_York"), set via NEXT_PUBLIC_APP_TZ. Servers run in UTC, so the server's
 * "today" and "this month" use this; otherwise a payment logged just after local midnight lands on the wrong day.
 */
export const APP_TZ = process.env.NEXT_PUBLIC_APP_TZ || "UTC";

/** Today as YYYY-MM-DD in APP_TZ. */
export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TZ }).format(new Date());
}

/** YYYY-MM for a date's local fields, or the current month in APP_TZ when no date is given. */
export function monthKey(d?: Date) {
  if (!d) return todayISO().slice(0, 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Shift a YYYY-MM key by n months. */
export function addMonths(key: string, n: number) {
  const [y, m] = key.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + n, 1));
}

/** First and last day (YYYY-MM-DD) of a YYYY-MM month. */
export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

export function isMonthKey(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}
