-- Ortha Budget schema. Paste into Supabase → SQL Editor → Run, once, on a fresh project.
-- Auth is Clerk (Supabase third-party auth): every row is owned by the Clerk user id in the JWT `sub` claim.

create type direction as enum ('in', 'out');
create type txn_kind as enum ('subscription', 'one_time', 'lifetime', 'contractor', 'expense', 'income');
create type billing_interval as enum ('weekly', 'monthly', 'quarterly', 'yearly');
create type recurring_status as enum ('active', 'paused', 'cancelled');

create table contractors (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub'),
  name text not null check (length(name) between 1 and 120),
  role text,
  email text,
  rate numeric(12, 2) check (rate >= 0),
  rate_type text check (rate_type in ('hourly', 'fixed', 'monthly')),
  currency char(3) not null default 'USD',
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

-- Anything that repeats: SaaS subscriptions (out), client retainers (in), monthly contractor pay (out).
create table recurring (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub'),
  name text not null check (length(name) between 1 and 120),
  vendor text,
  direction direction not null default 'out',
  amount numeric(12, 2) not null check (amount > 0),
  currency char(3) not null default 'USD',
  fx_rate numeric(14, 6) not null default 1 check (fx_rate > 0), -- 1 unit of currency = fx_rate USD
  amount_usd numeric(12, 2) generated always as (round(amount * fx_rate, 2)) stored,
  billing_interval billing_interval not null default 'monthly',
  next_due date not null,
  category text not null default 'Software',
  status recurring_status not null default 'active',
  contractor_id uuid,
  url text,
  notes text,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  -- Composite FK: a row can only point at a contractor owned by the same user (FK checks bypass RLS).
  foreign key (contractor_id, user_id) references contractors (id, user_id) on delete set null (contractor_id)
);

-- Every actual money movement. Lifetime deals are kind = 'lifetime' with replaces_monthly_usd set.
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub'),
  date date not null default current_date,
  direction direction not null,
  kind txn_kind not null,
  amount numeric(12, 2) not null check (amount > 0),
  currency char(3) not null default 'USD',
  fx_rate numeric(14, 6) not null default 1 check (fx_rate > 0),
  amount_usd numeric(12, 2) generated always as (round(amount * fx_rate, 2)) stored,
  description text not null check (length(description) between 1 and 200),
  category text not null default 'Other',
  vendor text,
  contractor_id uuid,
  recurring_id uuid,
  replaces_monthly_usd numeric(12, 2) check (replaces_monthly_usd >= 0),
  notes text,
  created_at timestamptz not null default now(),
  foreign key (contractor_id, user_id) references contractors (id, user_id) on delete set null (contractor_id),
  foreign key (recurring_id, user_id) references recurring (id, user_id) on delete set null (recurring_id)
);
create index transactions_user_date on transactions (user_id, date desc);
create index transactions_contractor on transactions (contractor_id) where contractor_id is not null;
create index recurring_user on recurring (user_id);
create index contractors_user on contractors (user_id);

create table budgets (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub'),
  category text not null,
  monthly_limit_usd numeric(12, 2) not null check (monthly_limit_usd > 0),
  unique (user_id, category)
);

-- Row level security: every row belongs to its owner only.
alter table contractors enable row level security;
alter table recurring enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;

-- Policies apply to signed-in users only; anon gets nothing.
create policy own_contractors on contractors for all to authenticated using (user_id = ((select auth.jwt()) ->> 'sub')) with check (user_id = ((select auth.jwt()) ->> 'sub'));
create policy own_recurring on recurring for all to authenticated using (user_id = ((select auth.jwt()) ->> 'sub')) with check (user_id = ((select auth.jwt()) ->> 'sub'));
create policy own_transactions on transactions for all to authenticated using (user_id = ((select auth.jwt()) ->> 'sub')) with check (user_id = ((select auth.jwt()) ->> 'sub'));
create policy own_budgets on budgets for all to authenticated using (user_id = ((select auth.jwt()) ->> 'sub')) with check (user_id = ((select auth.jwt()) ->> 'sub'));

-- Log a payment for a recurring item and roll next_due forward, atomically. Returns the new next_due.
-- ponytail: month-end dates drift (Jan 31 → Feb 28 → Mar 28); store an anchor day if that matters.
create function mark_recurring_paid(p_id uuid, p_date date default current_date)
returns date
language plpgsql
security invoker
set search_path = public
as $$
declare
  r recurring;
  new_due date;
begin
  select * into r from recurring where id = p_id for update;
  if not found then
    raise exception 'recurring item not found';
  end if;

  insert into transactions (date, direction, kind, amount, currency, fx_rate, description, category, vendor, contractor_id, recurring_id)
  values (
    p_date, r.direction,
    (case
      when r.direction = 'in' then 'income'
      when r.contractor_id is not null then 'contractor'
      else 'subscription'
    end)::txn_kind,
    r.amount, r.currency, r.fx_rate, r.name, r.category, r.vendor, r.contractor_id, r.id
  );

  update recurring
  set next_due = (next_due + case r.billing_interval
    when 'weekly' then interval '7 days'
    when 'monthly' then interval '1 month'
    when 'quarterly' then interval '3 months'
    else interval '1 year' end)::date
  where id = p_id
  returning next_due into new_due;

  return new_due;
end;
$$;

revoke execute on function mark_recurring_paid(uuid, date) from public, anon;
grant execute on function mark_recurring_paid(uuid, date) to authenticated;

-- Defense in depth: the anon role never touches app tables, even if a policy is later loosened.
revoke all on contractors, recurring, transactions, budgets from anon;

-- ---------- 002: clients, settings, calendar feed ----------

create table clients (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub'),
  name text not null check (length(name) between 1 and 120),
  color text check (color ~ '^#[0-9a-f]{6}$'),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, name)
);

alter table transactions
  add column client_id uuid,
  add foreign key (client_id, user_id) references clients (id, user_id) on delete set null (client_id);
alter table recurring
  add column client_id uuid,
  add column trial_ends date,
  add foreign key (client_id, user_id) references clients (id, user_id) on delete set null (client_id);
create index transactions_client on transactions (client_id) where client_id is not null;
create index recurring_client on recurring (client_id) where client_id is not null;

create table user_settings (
  user_id text primary key default (auth.jwt() ->> 'sub'),
  tax_rate numeric(5, 2) not null default 0 check (tax_rate between 0 and 100),
  cash_on_hand_usd numeric(14, 2) check (cash_on_hand_usd >= 0),
  cash_updated_at timestamptz,
  -- Secret for the private .ics calendar feed (≥32 chars, random). Null = feed off.
  calendar_token text unique check (calendar_token is null or length(calendar_token) >= 32),
  updated_at timestamptz not null default now()
);

alter table clients enable row level security;
alter table user_settings enable row level security;
create policy own_clients on clients for all to authenticated
  using (user_id = ((select auth.jwt()) ->> 'sub')) with check (user_id = ((select auth.jwt()) ->> 'sub'));
create policy own_settings on user_settings for all to authenticated
  using (user_id = ((select auth.jwt()) ->> 'sub')) with check (user_id = ((select auth.jwt()) ->> 'sub'));
revoke all on clients, user_settings from anon;

-- Calendar feed: the only unauthenticated read path. Returns active plans for whoever owns the token, nothing else.
create function calendar_feed(p_token text)
returns table (
  id uuid, name text, vendor text, direction direction, amount numeric, currency char(3),
  billing_interval billing_interval, next_due date, trial_ends date
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.name, r.vendor, r.direction, r.amount, r.currency, r.billing_interval, r.next_due, r.trial_ends
  from recurring r
  join user_settings s on s.user_id = r.user_id
  where p_token is not null
    and length(p_token) >= 32
    and s.calendar_token = p_token
    and r.status = 'active';
$$;
revoke execute on function calendar_feed(text) from public;
-- Intentionally public (calendar apps fetch without a login); the 32+ char secret token is the access control.
grant execute on function calendar_feed(text) to anon;
