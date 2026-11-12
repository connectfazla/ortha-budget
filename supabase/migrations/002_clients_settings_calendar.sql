-- 002: clients/projects, per-user settings (tax set-aside, cash on hand, calendar feed token), trial end dates.
-- Already included in supabase/schema.sql for fresh installs; run this only to upgrade an existing 001 database.

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
