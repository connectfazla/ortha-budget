-- Budget Ortha schema. Paste into Supabase → SQL Editor → Run, once, on a fresh project.
-- Auth is Supabase Auth (email + password): every row is owned by the user id in the JWT `sub` claim.

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
  fx_rate numeric(14, 6) not null default 1 check (fx_rate > 0), -- 1 unit of currency = fx_rate units of the user's base currency
  amount_base numeric(12, 2) generated always as (round(amount * fx_rate, 2)) stored,
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

-- Every actual money movement. Lifetime deals are kind = 'lifetime' with replaces_monthly set.
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub'),
  date date not null default current_date,
  direction direction not null,
  kind txn_kind not null,
  amount numeric(12, 2) not null check (amount > 0),
  currency char(3) not null default 'USD',
  fx_rate numeric(14, 6) not null default 1 check (fx_rate > 0),
  amount_base numeric(12, 2) generated always as (round(amount * fx_rate, 2)) stored,
  description text not null check (length(description) between 1 and 200),
  category text not null default 'Other',
  vendor text,
  contractor_id uuid,
  recurring_id uuid,
  replaces_monthly numeric(12, 2) check (replaces_monthly >= 0),
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
  monthly_limit numeric(12, 2) not null check (monthly_limit > 0),
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
  cash_on_hand numeric(14, 2) check (cash_on_hand >= 0),
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

-- ---------- 003: base currency, receipts, price history, cancel-by ----------

-- ---------- base currency ----------
-- Totals are now in each user's base currency instead of always USD.
-- fx_rate = units of the base currency per 1 unit of the entry's `currency`.
alter table user_settings add column base_currency char(3) not null default 'USD' check (base_currency ~ '^[A-Z]{3}$');

-- Switch base currency and convert every stored amount in one transaction.
-- p_rate = units of the NEW base currency per 1 unit of the OLD one.
create function change_base_currency(p_new char(3), p_rate numeric)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid text := (select auth.jwt()) ->> 'sub';
  old char(3);
begin
  if uid is null then raise exception 'not signed in'; end if;
  if p_new !~ '^[A-Z]{3}$' then raise exception 'invalid currency'; end if;
  if p_rate is null or p_rate <= 0 then raise exception 'rate must be positive'; end if;

  insert into user_settings (user_id) values (uid) on conflict (user_id) do nothing;
  select base_currency into old from user_settings where user_id = uid for update;
  if old = p_new then return; end if;

  update transactions set fx_rate = case when currency = p_new then 1 else fx_rate * p_rate end,
    replaces_monthly = round(replaces_monthly * p_rate, 2)
  where user_id = uid;
  update recurring set fx_rate = case when currency = p_new then 1 else fx_rate * p_rate end where user_id = uid;
  update budgets set monthly_limit = round(monthly_limit * p_rate, 2) where user_id = uid;
  update user_settings set base_currency = p_new, cash_on_hand = round(cash_on_hand * p_rate, 2), updated_at = now()
  where user_id = uid;
end;
$$;
revoke execute on function change_base_currency(char, numeric) from public, anon;
grant execute on function change_base_currency(char, numeric) to authenticated;

-- ---------- cancel-by dates + price history ----------
alter table recurring add column cancel_by date;

create table price_changes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub'),
  recurring_id uuid not null,
  old_amount numeric(12, 2) not null,
  new_amount numeric(12, 2) not null,
  currency char(3) not null,
  changed_on date not null default current_date,
  foreign key (recurring_id, user_id) references recurring (id, user_id) on delete cascade
);
create index price_changes_recurring on price_changes (recurring_id, changed_on desc);

-- Record every amount change on a plan automatically.
create function log_price_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.amount is distinct from old.amount then
    insert into price_changes (user_id, recurring_id, old_amount, new_amount, currency)
    values (new.user_id, new.id, old.amount, new.amount, new.currency);
  end if;
  return new;
end;
$$;
create trigger recurring_price_change after update of amount on recurring
  for each row execute function log_price_change();

-- ---------- receipts ----------
alter table transactions add constraint transactions_id_user unique (id, user_id);
create table attachments (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub'),
  transaction_id uuid not null,
  path text not null unique,           -- <user_id>/<uuid>.<ext> inside the private "receipts" bucket
  name text not null check (length(name) between 1 and 200),
  mime text not null check (mime in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf')),
  size integer not null check (size between 1 and 10485760),
  created_at timestamptz not null default now(),
  foreign key (transaction_id, user_id) references transactions (id, user_id) on delete cascade,
  check (split_part(path, '/', 1) = user_id)
);
create index attachments_txn on attachments (transaction_id);

alter table price_changes enable row level security;
alter table attachments enable row level security;
create policy own_price_changes on price_changes for all to authenticated
  using (user_id = ((select auth.jwt()) ->> 'sub')) with check (user_id = ((select auth.jwt()) ->> 'sub'));
create policy own_attachments on attachments for all to authenticated
  using (user_id = ((select auth.jwt()) ->> 'sub')) with check (user_id = ((select auth.jwt()) ->> 'sub'));
revoke all on price_changes, attachments from anon;

-- Private bucket; each user can only touch objects under their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do nothing;

create policy receipts_select on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = ((select auth.jwt()) ->> 'sub'));
create policy receipts_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = ((select auth.jwt()) ->> 'sub'));
create policy receipts_delete on storage.objects for delete to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = ((select auth.jwt()) ->> 'sub'));

-- Calendar feed now also returns cancel-by dates.
drop function calendar_feed(text);
create function calendar_feed(p_token text)
returns table (
  id uuid, name text, vendor text, direction direction, amount numeric, currency char(3),
  billing_interval billing_interval, next_due date, trial_ends date, cancel_by date
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.name, r.vendor, r.direction, r.amount, r.currency, r.billing_interval, r.next_due, r.trial_ends, r.cancel_by
  from recurring r
  join user_settings s on s.user_id = r.user_id
  where p_token is not null
    and length(p_token) >= 32
    and s.calendar_token = p_token
    and r.status = 'active';
$$;
revoke execute on function calendar_feed(text) from public, authenticated;
-- Intentionally public (calendar apps fetch without a login); the 32+ char secret token is the access control.
grant execute on function calendar_feed(text) to anon;

-- ---------- 004: push notifications ----------

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub'),
  endpoint text not null unique check (endpoint ~ '^https://' and length(endpoint) <= 1000),
  p256dh text not null check (length(p256dh) between 20 and 200),
  auth text not null check (length(auth) between 10 and 100),
  user_agent text check (length(user_agent) <= 300),
  created_at timestamptz not null default now(),
  last_sent_at timestamptz
);
create index push_subscriptions_user on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;
create policy own_push_subscriptions on push_subscriptions for all to authenticated
  using (user_id = ((select auth.jwt()) ->> 'sub')) with check (user_id = ((select auth.jwt()) ->> 'sub'));
revoke all on push_subscriptions from anon;

-- What to notify about, and when (hours are in the user's own timezone).
alter table user_settings
  add column timezone text not null default 'UTC' check (length(timezone) between 1 and 64),
  add column notify_renewals boolean not null default true,
  add column notify_trials boolean not null default true,
  add column notify_budgets boolean not null default true,
  add column notify_daily_log boolean not null default true,
  add column digest_hour smallint not null default 9 check (digest_hour between 0 and 23),
  add column reminder_hour smallint not null default 21 check (reminder_hour between 0 and 23);

-- Server-only secrets for the hourly job. No grants: only the security-definer functions below read them.
create table app_secrets (
  name text primary key,
  value text not null
);
alter table app_secrets enable row level security;
revoke all on app_secrets from public, anon, authenticated;

create function secret_ok(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_secret is not null and length(p_secret) >= 32
     and p_secret = (select value from app_secrets where name = 'push_cron');
$$;
revoke execute on function secret_ok(text) from public, anon, authenticated;

-- Everything due to be pushed this hour, one row per (subscription, message kind).
-- kind = 'digest' at the user's digest_hour (renewals tomorrow, trials, cancel-by, overdue, over budget),
-- kind = 'log' at reminder_hour when nothing has been logged today.
-- Callable by anon (the cron route has no user session) but returns nothing unless p_secret matches.
create function push_due(p_secret text, p_now timestamptz default now())
returns table (user_id text, endpoint text, p256dh text, auth text, kind text, payload jsonb)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not secret_ok(p_secret) then return; end if;

  return query
  with s as (
    select ps.user_id, ps.endpoint, ps.p256dh, ps.auth,
           coalesce(us.notify_renewals, true) as n_ren,
           coalesce(us.notify_trials, true) as n_tri,
           coalesce(us.notify_budgets, true) as n_bud,
           coalesce(us.notify_daily_log, true) as n_log,
           coalesce(us.digest_hour, 9) as d_hour,
           coalesce(us.reminder_hour, 21) as r_hour,
           coalesce(us.base_currency, 'USD') as base,
           (p_now at time zone coalesce(us.timezone, 'UTC')) as local_ts
    from push_subscriptions ps
    left join user_settings us on us.user_id = ps.user_id
  ),
  l as (select *, local_ts::date as today, extract(hour from local_ts)::int as hr from s)
  -- Morning digest
  select l.user_id, l.endpoint, l.p256dh, l.auth, 'digest'::text,
    jsonb_build_object(
      'renewals', case when l.n_ren then (
        select coalesce(jsonb_agg(jsonb_build_object('name', r.name, 'amount', r.amount, 'currency', r.currency, 'direction', r.direction)), '[]')
        from recurring r where r.user_id = l.user_id and r.status = 'active' and r.next_due = l.today + 1) else '[]'::jsonb end,
      'overdue', case when l.n_ren then (
        select count(*) from recurring r where r.user_id = l.user_id and r.status = 'active' and r.next_due < l.today) else 0 end,
      'trials', case when l.n_tri then (
        select coalesce(jsonb_agg(jsonb_build_object('name', r.name, 'kind', case when r.trial_ends = l.today + 1 then 'trial' else 'cancel' end)), '[]')
        from recurring r where r.user_id = l.user_id and r.status = 'active'
          and (r.trial_ends = l.today + 1 or r.cancel_by between l.today and l.today + 2)) else '[]'::jsonb end,
      'over_budget', case when l.n_bud then (
        select coalesce(jsonb_agg(b.category), '[]')
        from budgets b
        where b.user_id = l.user_id and b.monthly_limit < (
          select coalesce(sum(t.amount_base), 0) from transactions t
          where t.user_id = l.user_id and t.direction = 'out' and t.category = b.category
            and t.date >= date_trunc('month', l.today)::date and t.date <= l.today)) else '[]'::jsonb end,
      'base', l.base)
  from l where l.hr = l.d_hour
  union all
  -- Evening "add today's expenses", only if nothing was logged today
  select l.user_id, l.endpoint, l.p256dh, l.auth, 'log'::text, jsonb_build_object('base', l.base)
  from l
  where l.n_log and l.hr = l.r_hour
    and not exists (select 1 from transactions t where t.user_id = l.user_id and t.date = l.today);
end;
$$;
revoke execute on function push_due(text, timestamptz) from public, authenticated;
-- Intentionally anon-callable; the secret is the access control (same pattern as calendar_feed).
grant execute on function push_due(text, timestamptz) to anon;

-- Lets the job drop subscriptions the push service reports as gone (HTTP 404/410).
create function push_forget(p_secret text, p_endpoint text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not secret_ok(p_secret) then return; end if;
  delete from push_subscriptions where endpoint = p_endpoint;
end;
$$;
revoke execute on function push_forget(text, text) from public, authenticated;
grant execute on function push_forget(text, text) to anon;

-- Hourly trigger: pg_cron calls the app's cron route (URL + secret stored in app_secrets, set per deployment).
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create function push_tick()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  url text := (select value from app_secrets where name = 'push_cron_url');
  secret text := (select value from app_secrets where name = 'push_cron');
begin
  if url is null or secret is null then return; end if;
  perform net.http_post(
    url := url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end;
$$;
revoke execute on function push_tick() from public, anon, authenticated;

select cron.schedule('ortha-push-hourly', '0 * * * *', 'select public.push_tick()');

-- ---------- 005: custom categories ----------

create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub'),
  name text not null check (length(btrim(name)) between 1 and 40),
  direction direction not null default 'out',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
alter table categories enable row level security;
create policy own_categories on categories for all to authenticated
  using (user_id = ((select auth.jwt()) ->> 'sub')) with check (user_id = ((select auth.jwt()) ->> 'sub'));
revoke all on categories from anon;
