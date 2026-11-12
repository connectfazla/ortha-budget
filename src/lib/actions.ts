"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CURRENCIES, INTERVALS, KINDS } from "@/lib/money";
import type { ActionResult, BillingInterval, Direction, RateType, RecurringStatus, TxnKind } from "@/lib/types";

// Server actions are a trust boundary: everything below is re-validated here, and RLS scopes rows to the user.

class Invalid extends Error {}

function text(v: unknown, field: string, { max = 200, required = false } = {}): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) {
    if (required) throw new Invalid(`${field} is required`);
    return null;
  }
  if (s.length > max) throw new Invalid(`${field} is too long`);
  return s;
}

function positive(v: unknown, field: string, { allowZero = false } = {}): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0 || (!allowZero && n === 0) || n > 1e10) throw new Invalid(`${field} must be a positive number`);
  return n;
}

function optionalPositive(v: unknown, field: string): number | null {
  return v === null || v === undefined || v === "" ? null : positive(v, field, { allowZero: true });
}

function oneOf<T extends string>(v: unknown, list: readonly T[], field: string): T {
  if (!list.includes(v as T)) throw new Invalid(`${field} is invalid`);
  return v as T;
}

function isoDate(v: unknown, field: string): string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) throw new Invalid(`${field} must be a date`);
  return v;
}

function uuid(v: unknown, field: string): string {
  if (typeof v !== "string" || !/^[0-9a-f-]{36}$/i.test(v)) throw new Invalid(`${field} is invalid`);
  return v;
}

function optionalUuid(v: unknown, field: string): string | null {
  return v ? uuid(v, field) : null;
}

const KIND_LIST = Object.keys(KINDS) as TxnKind[];
const INTERVAL_LIST = Object.keys(INTERVALS) as BillingInterval[];
const DIRECTIONS: Direction[] = ["in", "out"];
const STATUSES: RecurringStatus[] = ["active", "paused", "cancelled"];
const RATE_TYPES: RateType[] = ["hourly", "fixed", "monthly"];

function currency(v: unknown) {
  return oneOf(v ?? "USD", CURRENCIES, "Currency");
}

/** USD always has fx_rate 1, whatever the client sent. */
function fx(cur: string, v: unknown) {
  return cur === "USD" ? 1 : positive(v, "Exchange rate");
}

async function signedIn() {
  return Boolean((await auth()).userId);
}

async function run(fn: () => Promise<{ error: { message: string } | null }>): Promise<ActionResult> {
  if (!(await signedIn())) return { ok: false, error: "Not signed in" };
  try {
    const { error } = await fn();
    if (error) return { ok: false, error: error.message };
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    if (e instanceof Invalid) return { ok: false, error: e.message };
    throw e;
  }
}

/* ---------- transactions ---------- */

export type TransactionInput = {
  date: string;
  direction: Direction;
  kind: TxnKind;
  amount: number;
  currency: string;
  fx_rate: number;
  description: string;
  category: string;
  vendor?: string | null;
  contractor_id?: string | null;
  client_id?: string | null;
  replaces_monthly_usd?: number | null;
  notes?: string | null;
};

function parseTransaction(i: TransactionInput) {
  const cur = currency(i.currency);
  const kind = oneOf(i.kind, KIND_LIST, "Type");
  return {
    date: isoDate(i.date, "Date"),
    direction: oneOf(i.direction, DIRECTIONS, "Direction"),
    kind,
    amount: positive(i.amount, "Amount"),
    currency: cur,
    fx_rate: fx(cur, i.fx_rate),
    description: text(i.description, "Description", { required: true })!,
    category: text(i.category, "Category", { max: 60 }) ?? "Other",
    vendor: text(i.vendor, "Vendor", { max: 120 }),
    contractor_id: optionalUuid(i.contractor_id, "Contractor"),
    client_id: optionalUuid(i.client_id, "Client"),
    replaces_monthly_usd: kind === "lifetime" ? optionalPositive(i.replaces_monthly_usd, "Replaces per month") : null,
    notes: text(i.notes, "Notes", { max: 2000 }),
  };
}

export async function createTransaction(input: TransactionInput) {
  return run(async () => (await createClient()).from("transactions").insert(parseTransaction(input)));
}

export async function updateTransaction(id: string, input: TransactionInput) {
  return run(async () => (await createClient()).from("transactions").update(parseTransaction(input)).eq("id", uuid(id, "id")));
}

/** Undo for deleteTransaction: re-inserts the same row (same id) from the copy the client kept. */
export async function restoreTransaction(row: TransactionInput & { id: string; recurring_id?: string | null }) {
  return run(async () =>
    (await createClient())
      .from("transactions")
      .insert({ ...parseTransaction(row), id: uuid(row.id, "id"), recurring_id: optionalUuid(row.recurring_id, "Plan") }),
  );
}

export async function deleteTransaction(id: string) {
  return run(async () => (await createClient()).from("transactions").delete().eq("id", uuid(id, "id")));
}

/* ---------- recurring (subscriptions, retainers, monthly contractor pay) ---------- */

export type RecurringInput = {
  name: string;
  vendor?: string | null;
  direction: Direction;
  amount: number;
  currency: string;
  fx_rate: number;
  billing_interval: BillingInterval;
  next_due: string;
  category: string;
  status: RecurringStatus;
  contractor_id?: string | null;
  client_id?: string | null;
  trial_ends?: string | null;
  url?: string | null;
  notes?: string | null;
};

function parseRecurring(i: RecurringInput) {
  const cur = currency(i.currency);
  const url = text(i.url, "URL", { max: 500 });
  if (url && !/^https?:\/\//i.test(url)) throw new Invalid("URL must start with http:// or https://");
  return {
    name: text(i.name, "Name", { required: true, max: 120 })!,
    vendor: text(i.vendor, "Vendor", { max: 120 }),
    direction: oneOf(i.direction, DIRECTIONS, "Direction"),
    amount: positive(i.amount, "Amount"),
    currency: cur,
    fx_rate: fx(cur, i.fx_rate),
    billing_interval: oneOf(i.billing_interval, INTERVAL_LIST, "Billing interval"),
    next_due: isoDate(i.next_due, "Next due"),
    category: text(i.category, "Category", { max: 60 }) ?? "Software",
    status: oneOf(i.status, STATUSES, "Status"),
    contractor_id: optionalUuid(i.contractor_id, "Contractor"),
    client_id: optionalUuid(i.client_id, "Client"),
    trial_ends: i.trial_ends ? isoDate(i.trial_ends, "Trial ends") : null,
    url,
    notes: text(i.notes, "Notes", { max: 2000 }),
  };
}

export async function createRecurring(input: RecurringInput) {
  return run(async () => (await createClient()).from("recurring").insert(parseRecurring(input)));
}

export async function updateRecurring(id: string, input: RecurringInput) {
  return run(async () => (await createClient()).from("recurring").update(parseRecurring(input)).eq("id", uuid(id, "id")));
}

export async function setRecurringStatus(id: string, status: RecurringStatus) {
  return run(async () =>
    (await createClient()).from("recurring").update({ status: oneOf(status, STATUSES, "Status") }).eq("id", uuid(id, "id")),
  );
}

/** Undo for deleteRecurring. */
export async function restoreRecurring(row: RecurringInput & { id: string }) {
  return run(async () => (await createClient()).from("recurring").insert({ ...parseRecurring(row), id: uuid(row.id, "id") }));
}

export async function deleteRecurring(id: string) {
  return run(async () => (await createClient()).from("recurring").delete().eq("id", uuid(id, "id")));
}

/**
 * Logs a transaction for this period and advances next_due (one DB transaction).
 * `date` is the user's local today (YYYY-MM-DD): the DB clock is UTC and would log the wrong day near midnight.
 */
export async function markRecurringPaid(id: string, date: string): Promise<ActionResult & { nextDue?: string }> {
  if (!(await signedIn())) return { ok: false, error: "Not signed in" };
  try {
    const { data, error } = await (await createClient()).rpc("mark_recurring_paid", {
      p_id: uuid(id, "id"),
      p_date: isoDate(date, "Date"),
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/", "layout");
    return { ok: true, nextDue: data as string };
  } catch (e) {
    if (e instanceof Invalid) return { ok: false, error: e.message };
    throw e;
  }
}

/* ---------- contractors ---------- */

export type ContractorInput = {
  name: string;
  role?: string | null;
  email?: string | null;
  rate?: number | null;
  rate_type?: RateType | null;
  currency: string;
  active: boolean;
  notes?: string | null;
};

function parseContractor(i: ContractorInput) {
  const email = text(i.email, "Email", { max: 200 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Invalid("Email is invalid");
  return {
    name: text(i.name, "Name", { required: true, max: 120 })!,
    role: text(i.role, "Role", { max: 120 }),
    email,
    rate: optionalPositive(i.rate, "Rate"),
    rate_type: i.rate_type ? oneOf(i.rate_type, RATE_TYPES, "Rate type") : null,
    currency: currency(i.currency),
    active: Boolean(i.active),
    notes: text(i.notes, "Notes", { max: 2000 }),
  };
}

export async function createContractor(input: ContractorInput) {
  return run(async () => (await createClient()).from("contractors").insert(parseContractor(input)));
}

export async function updateContractor(id: string, input: ContractorInput) {
  return run(async () => (await createClient()).from("contractors").update(parseContractor(input)).eq("id", uuid(id, "id")));
}

export async function deleteContractor(id: string) {
  return run(async () => (await createClient()).from("contractors").delete().eq("id", uuid(id, "id")));
}

/* ---------- budgets ---------- */

export async function upsertBudget(category: string, monthlyLimitUsd: number) {
  return run(async () =>
    (await createClient())
      .from("budgets")
      .upsert(
        {
          category: text(category, "Category", { required: true, max: 60 })!,
          monthly_limit_usd: positive(monthlyLimitUsd, "Monthly limit"),
        },
        { onConflict: "user_id,category" },
      ),
  );
}

export async function deleteBudget(id: string) {
  return run(async () => (await createClient()).from("budgets").delete().eq("id", uuid(id, "id")));
}

/* ---------- clients / projects ---------- */

export type ClientInput = { name: string; color?: string | null; archived?: boolean };

function parseClient(i: ClientInput) {
  const color = text(i.color, "Color", { max: 7 });
  if (color && !/^#[0-9a-f]{6}$/.test(color)) throw new Invalid("Color must be a hex like #3d4bd6");
  return { name: text(i.name, "Name", { required: true, max: 120 })!, color, archived: Boolean(i.archived) };
}

export async function createClientRecord(input: ClientInput) {
  return run(async () => (await createClient()).from("clients").insert(parseClient(input)));
}

export async function updateClientRecord(id: string, input: ClientInput) {
  return run(async () => (await createClient()).from("clients").update(parseClient(input)).eq("id", uuid(id, "id")));
}

export async function deleteClientRecord(id: string) {
  return run(async () => (await createClient()).from("clients").delete().eq("id", uuid(id, "id")));
}

/* ---------- settings ---------- */

export type SettingsInput = { tax_rate: number; cash_on_hand_usd: number | null };

export async function saveSettings(input: SettingsInput) {
  return run(async () => {
    const tax = Number(input.tax_rate);
    if (!Number.isFinite(tax) || tax < 0 || tax > 100) throw new Invalid("Tax set-aside must be 0–100%");
    const cash = optionalPositive(input.cash_on_hand_usd, "Cash on hand");
    const row: Record<string, unknown> = { tax_rate: tax, cash_on_hand_usd: cash, updated_at: new Date().toISOString() };
    if (cash !== null) row.cash_updated_at = new Date().toISOString();
    return (await createClient()).from("user_settings").upsert(row, { onConflict: "user_id" });
  });
}

/** Turns the private calendar feed on (new secret) or off (null). Rotating invalidates the old URL. */
export async function setCalendarFeed(on: boolean) {
  return run(async () => {
    const token = on ? Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url") : null;
    return (await createClient()).from("user_settings").upsert({ calendar_token: token }, { onConflict: "user_id" });
  });
}

/* ---------- onboarding ---------- */

/** One-tap sample data for an empty account, so the app has something to show. */
export async function loadSampleData() {
  return run(async () => {
    const supabase = await createClient();
    const { count } = await supabase.from("transactions").select("id", { count: "exact", head: true });
    if (count) throw new Invalid("Sample data is only for an empty account");
    const day = (n: number) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + n);
      return d.toISOString().slice(0, 10);
    };
    const { data: client, error: ce } = await supabase.from("clients").insert({ name: "Acme Co", color: "#3d4bd6" }).select("id").single();
    if (ce) return { error: ce };
    const { data: dev, error: de } = await supabase
      .from("contractors")
      .insert({ name: "Alex Rivera", role: "Frontend dev", rate: 3200, rate_type: "monthly", currency: "USD" })
      .select("id")
      .single();
    if (de) return { error: de };
    const rec = await supabase.from("recurring").insert([
      { name: "Figma Professional", vendor: "Figma", direction: "out", amount: 45, billing_interval: "monthly", next_due: day(3), category: "Design tools" },
      { name: "Vercel Pro", vendor: "Vercel", direction: "out", amount: 20, billing_interval: "monthly", next_due: day(9), category: "Hosting" },
      { name: "Google Workspace", vendor: "Google", direction: "out", amount: 168, billing_interval: "yearly", next_due: day(120), category: "Software" },
      { name: "Notion Plus", vendor: "Notion", direction: "out", amount: 10, billing_interval: "monthly", next_due: day(12), category: "Software", trial_ends: day(5) },
      { name: "Retainer · Acme Co", direction: "in", amount: 2400, billing_interval: "monthly", next_due: day(6), category: "Client work", client_id: client.id },
    ]);
    if (rec.error) return rec;
    return supabase.from("transactions").insert([
      { date: day(-1), direction: "in", kind: "income", amount: 3500, description: "Website build · Acme Co", category: "Client work", client_id: client.id },
      { date: day(-3), direction: "out", kind: "subscription", amount: 45, description: "Figma Professional", category: "Design tools", vendor: "Figma" },
      { date: day(-5), direction: "out", kind: "contractor", amount: 1600, description: "Payout · Alex Rivera", category: "Contractors", contractor_id: dev.id, client_id: client.id },
      { date: day(-9), direction: "out", kind: "lifetime", amount: 69, description: "TidyCal lifetime", category: "Software", vendor: "AppSumo", replaces_monthly_usd: 12 },
      { date: day(-12), direction: "out", kind: "one_time", amount: 1299, description: "Studio display", category: "Hardware" },
      { date: day(-34), direction: "in", kind: "income", amount: 2400, description: "Retainer · Acme Co", category: "Client work", client_id: client.id },
      { date: day(-40), direction: "out", kind: "expense", amount: 220, description: "Ads test", category: "Marketing" },
    ]);
  });
}

/* ---------- CSV import ---------- */

/** Bulk insert parsed rows (max 2000 per call). Each row is validated like a manual entry; one bad row fails the batch. */
export async function importTransactions(rows: TransactionInput[]): Promise<ActionResult & { count?: number }> {
  if (!Array.isArray(rows) || rows.length === 0) return { ok: false, error: "No rows to import" };
  if (rows.length > 2000) return { ok: false, error: "Import at most 2000 rows at a time" };
  let parsed;
  try {
    parsed = rows.map((r, i) => {
      try {
        return parseTransaction(r);
      } catch (e) {
        if (e instanceof Invalid) throw new Invalid(`Row ${i + 1}: ${e.message}`);
        throw e;
      }
    });
  } catch (e) {
    if (e instanceof Invalid) return { ok: false, error: e.message };
    throw e;
  }
  const res = await run(async () => (await createClient()).from("transactions").insert(parsed));
  return res.ok ? { ok: true, count: parsed.length } : res;
}
