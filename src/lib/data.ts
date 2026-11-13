import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES, KINDS, addMonths, monthKey, monthRange, monthlyEquivalent, round2 } from "@/lib/money";
import type { Attachment, Budget, CategoryOption, Client, Contractor, PriceChange, UserSettings, Direction, MonthSummary, Recurring, Transaction, TxnKind } from "@/lib/types";

/** Signed-in user id, or redirect to sign-in. Call at the top of every (app) page (the proxy also guards). */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/sign-in");
  return data.user.id;
});

/** The signed-in user's email, for the account menu. */
export const getUserEmail = cache(async () => {
  const { data } = await (await createClient()).auth.getUser();
  return data.user?.email ?? null;
});

function fail(what: string, error: { message: string }): never {
  throw new Error(`${what}: ${error.message}`);
}

export type TxnFilters = {
  month?: string; // YYYY-MM
  from?: string; // YYYY-MM-DD inclusive
  to?: string; // YYYY-MM-DD inclusive
  kind?: TxnKind;
  direction?: Direction;
  q?: string;
  contractorId?: string;
  clientId?: string;
  limit?: number;
};

// PostgREST caps each response at the project's max_rows (Supabase default 1000), so fetch in pages.
const PAGE = 1000;

export async function getTransactions(f: TxnFilters = {}): Promise<Transaction[]> {
  const supabase = await createClient();
  const build = () => {
    let query = supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id"); // stable order so pages don't overlap
    if (f.month) {
      const { from, to } = monthRange(f.month);
      query = query.gte("date", from).lte("date", to);
    }
    if (f.from) query = query.gte("date", f.from);
    if (f.to) query = query.lte("date", f.to);
    if (f.kind) query = query.eq("kind", f.kind);
    if (f.direction) query = query.eq("direction", f.direction);
    if (f.contractorId) query = query.eq("contractor_id", f.contractorId);
    if (f.clientId) query = query.eq("client_id", f.clientId);
    if (f.q) {
      // Strip PostgREST filter syntax characters so user text can't change the filter.
      const q = f.q.replace(/[,()*%\\]/g, " ").trim().slice(0, 80);
      if (q) query = query.or(`description.ilike.%${q}%,vendor.ilike.%${q}%,category.ilike.%${q}%`);
    }
    return query;
  };
  const max = f.limit ?? 500;
  const rows: Transaction[] = [];
  for (let start = 0; start < max; start += PAGE) {
    const end = Math.min(start + PAGE, max) - 1;
    const { data, error } = await build().range(start, end);
    if (error) fail("Load transactions", error);
    rows.push(...(data as Transaction[]));
    if (data.length < end - start + 1) break;
  }
  return rows;
}

/** Count and In/Out USD totals for a filter set, across all rows (not capped like the list). */
export async function getTransactionTotals(f: Omit<TxnFilters, "limit">) {
  const rows = await getTransactions({ ...f, limit: 1_000_000 });
  let inUsd = 0;
  let outUsd = 0;
  for (const t of rows) {
    if (t.direction === "in") inUsd += t.amount_base;
    else outUsd += t.amount_base;
  }
  return { count: rows.length, inUsd: round2(inUsd), outUsd: round2(outUsd) };
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("transactions").select("*").eq("id", id).maybeSingle();
  if (error) fail("Load transaction", error);
  return data as Transaction | null;
}

export async function getLifetimeDeals() {
  return getTransactions({ kind: "lifetime" });
}

export async function getRecurring(): Promise<Recurring[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("recurring").select("*").order("next_due", { ascending: true });
  if (error) fail("Load recurring", error);
  return data as Recurring[];
}

export const getContractors = cache(async (): Promise<Contractor[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("contractors").select("*").order("active", { ascending: false }).order("name");
  if (error) fail("Load contractors", error);
  return data as Contractor[];
});

export async function getContractor(id: string): Promise<Contractor | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("contractors").select("*").eq("id", id).maybeSingle();
  if (error) fail("Load contractor", error);
  return data as Contractor | null;
}

export async function getBudgets(): Promise<Budget[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("budgets").select("id, category, monthly_limit").order("category");
  if (error) fail("Load budgets", error);
  return data as Budget[];
}

/** Fixed categories plus the user's custom ones, with direction and icon, for the category picker. */
export const getCategoryOptions = cache(async (): Promise<CategoryOption[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("id, name, direction").order("name");
  if (error) fail("Load categories", error);
  const fixed: CategoryOption[] = CATEGORIES.map((c) => ({ name: c.name, direction: c.direction, icon: c.icon, custom: false }));
  const custom: CategoryOption[] = (data ?? [])
    .filter((c) => !CATEGORIES.some((f) => f.name.toLowerCase() === String(c.name).toLowerCase()))
    .map((c) => ({ id: c.id as string, name: c.name as string, direction: c.direction as Direction, icon: null, custom: true }));
  return [...fixed, ...custom];
});

/** Category names (fixed first, then custom) for filters and simple selects. */
export const getCategories = cache(async (): Promise<string[]> => (await getCategoryOptions()).map((c) => c.name));

export function summarize(month: string, txns: Transaction[], recurring: Recurring[]): MonthSummary {
  const byKind = Object.fromEntries(Object.keys(KINDS).map((k) => [k, 0])) as Record<TxnKind, number>;
  const cats = new Map<string, number>();
  let inUsd = 0;
  let outUsd = 0;
  for (const t of txns) {
    // Income counts money in; every other kind counts money out (a refund on a tool doesn't inflate its spend).
    if ((t.kind === "income") === (t.direction === "in")) byKind[t.kind] += t.amount_base;
    if (t.direction === "in") inUsd += t.amount_base;
    else {
      outUsd += t.amount_base;
      cats.set(t.category, (cats.get(t.category) ?? 0) + t.amount_base);
    }
  }
  let recurringOutMonthlyUsd = 0;
  let recurringInMonthlyUsd = 0;
  for (const r of recurring) {
    if (r.status !== "active") continue;
    const m = monthlyEquivalent(r.amount_base, r.billing_interval);
    if (r.direction === "out") recurringOutMonthlyUsd += m;
    else recurringInMonthlyUsd += m;
  }
  return {
    month,
    inUsd: round2(inUsd),
    outUsd: round2(outUsd),
    netUsd: round2(inUsd - outUsd),
    byKind,
    byCategory: [...cats].map(([category, v]) => ({ category, outUsd: round2(v) })).sort((a, b) => b.outUsd - a.outUsd),
    recurringOutMonthlyUsd: round2(recurringOutMonthlyUsd),
    recurringInMonthlyUsd: round2(recurringInMonthlyUsd),
  };
}

export async function getMonthSummary(month = monthKey()): Promise<MonthSummary> {
  const [txns, recurring] = await Promise.all([getTransactions({ month, limit: 100_000 }), getRecurring()]);
  return summarize(month, txns, recurring);
}

/** In/out per month for the last `months` months (oldest first), for bar charts. */
export async function getMonthlySeries(months = 6) {
  const current = monthKey();
  const keys = Array.from({ length: months }, (_, i) => addMonths(current, i - (months - 1)));
  const data = await getTransactions({
    from: monthRange(keys[0]).from,
    to: monthRange(keys[keys.length - 1]).to,
    limit: 100_000,
  });
  const rows = new Map(keys.map((k) => [k, { month: k, inUsd: 0, outUsd: 0 }]));
  for (const t of data) {
    const row = rows.get(t.date.slice(0, 7));
    if (!row) continue;
    if (t.direction === "in") row.inUsd += t.amount_base;
    else row.outUsd += t.amount_base;
  }
  return [...rows.values()].map((r) => ({ ...r, inUsd: round2(r.inUsd), outUsd: round2(r.outUsd) }));
}

export const getClients = cache(async (): Promise<Client[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").select("*").order("archived").order("name");
  if (error) fail("Load clients", error);
  return data as Client[];
});

const DEFAULT_SETTINGS: UserSettings = {
  tax_rate: 0,
  cash_on_hand: null,
  cash_updated_at: null,
  calendar_token: null,
  base_currency: "USD",
  timezone: "UTC",
  notify_renewals: true,
  notify_trials: true,
  notify_budgets: true,
  notify_daily_log: true,
  digest_hour: 9,
  reminder_hour: 21,
};

/** The user's settings row, or defaults when they haven't saved any yet. */
export const getSettings = cache(async (): Promise<UserSettings> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_settings")
    .select(
      "tax_rate, cash_on_hand, cash_updated_at, calendar_token, base_currency, timezone, notify_renewals, notify_trials, notify_budgets, notify_daily_log, digest_hour, reminder_hour",
    )
    .maybeSingle();
  if (error) fail("Load settings", error);
  return (data as UserSettings | null) ?? DEFAULT_SETTINGS;
});

/** Income, costs and margin per client over a date range (USD). Rows without a client are left out. */
export async function getClientProfit(from: string, to: string) {
  const [txns, clients] = await Promise.all([getTransactions({ from, to, limit: 100_000 }), getClients()]);
  const by = new Map(clients.map((c) => [c.id, { client: c, inUsd: 0, outUsd: 0 }]));
  for (const t of txns) {
    const row = t.client_id ? by.get(t.client_id) : undefined;
    if (!row) continue;
    if (t.direction === "in") row.inUsd += t.amount_base;
    else row.outUsd += t.amount_base;
  }
  return [...by.values()]
    .map((r) => ({ ...r, inUsd: round2(r.inUsd), outUsd: round2(r.outUsd), marginUsd: round2(r.inUsd - r.outUsd) }))
    .filter((r) => r.inUsd > 0 || r.outUsd > 0 || !r.client.archived)
    .sort((a, b) => b.marginUsd - a.marginUsd);
}

/** Price history for one plan (newest first), or for all plans when no id is given. */
export async function getPriceChanges(recurringId?: string): Promise<PriceChange[]> {
  const supabase = await createClient();
  let q = supabase.from("price_changes").select("id, recurring_id, old_amount, new_amount, currency, changed_on").order("changed_on", { ascending: false });
  if (recurringId) q = q.eq("recurring_id", recurringId);
  const { data, error } = await q.limit(500);
  if (error) fail("Load price changes", error);
  return data as PriceChange[];
}

export async function getAttachments(transactionId: string): Promise<Attachment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("attachments").select("*").eq("transaction_id", transactionId).order("created_at");
  if (error) fail("Load attachments", error);
  return data as Attachment[];
}

/** Transaction ids that have at least one receipt, for the paperclip marker in lists. */
export async function getAttachmentCounts(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("attachments").select("transaction_id").limit(10_000);
  if (error) fail("Load attachments", error);
  const m = new Map<string, number>();
  for (const r of data as { transaction_id: string }[]) m.set(r.transaction_id, (m.get(r.transaction_id) ?? 0) + 1);
  return m;
}

/** How many push subscriptions (devices) the user has turned on. */
export async function getPushDeviceCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase.from("push_subscriptions").select("id", { count: "exact", head: true });
  if (error) fail("Load push devices", error);
  return count ?? 0;
}
