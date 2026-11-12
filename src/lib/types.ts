// Mirrors supabase/schema.sql. Numeric columns arrive from PostgREST as numbers.

export type Direction = "in" | "out";
export type TxnKind = "subscription" | "one_time" | "lifetime" | "contractor" | "expense" | "income";
export type BillingInterval = "weekly" | "monthly" | "quarterly" | "yearly";
export type RecurringStatus = "active" | "paused" | "cancelled";
export type RateType = "hourly" | "fixed" | "monthly";

export type Contractor = {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  rate: number | null;
  rate_type: RateType | null;
  currency: string;
  active: boolean;
  notes: string | null;
  created_at: string;
};

export type Recurring = {
  id: string;
  name: string;
  vendor: string | null;
  direction: Direction;
  amount: number;
  currency: string;
  fx_rate: number;
  amount_usd: number;
  billing_interval: BillingInterval;
  next_due: string; // YYYY-MM-DD
  category: string;
  status: RecurringStatus;
  contractor_id: string | null;
  client_id: string | null;
  trial_ends: string | null; // YYYY-MM-DD, free trial end
  url: string | null;
  notes: string | null;
  created_at: string;
};

export type Transaction = {
  id: string;
  date: string; // YYYY-MM-DD
  direction: Direction;
  kind: TxnKind;
  amount: number;
  currency: string;
  fx_rate: number;
  amount_usd: number;
  description: string;
  category: string;
  vendor: string | null;
  contractor_id: string | null;
  client_id: string | null;
  recurring_id: string | null;
  replaces_monthly_usd: number | null;
  notes: string | null;
  created_at: string;
};

export type Client = {
  id: string;
  name: string;
  color: string | null;
  archived: boolean;
  created_at: string;
};

export type UserSettings = {
  tax_rate: number; // % of income to set aside
  cash_on_hand_usd: number | null;
  cash_updated_at: string | null;
  calendar_token: string | null;
};

export type Budget = {
  id: string;
  category: string;
  monthly_limit_usd: number;
};

export type MonthSummary = {
  month: string; // YYYY-MM
  inUsd: number;
  outUsd: number;
  netUsd: number;
  byKind: Record<TxnKind, number>; // out-going USD per kind (income kinds count money in)
  byCategory: { category: string; outUsd: number }[];
  recurringOutMonthlyUsd: number; // burn from active recurring "out" items
  recurringInMonthlyUsd: number; // MRR from active retainers
};

export type ActionResult = { ok: true } | { ok: false; error: string };
