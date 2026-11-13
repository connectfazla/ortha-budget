-- 003: base currency, receipts, price history, cancel-by dates.
-- Already included in supabase/schema.sql for fresh installs; run this only to upgrade a 002 database.

-- ---------- base currency ----------
-- Totals are now in each user's base currency instead of always USD.
-- fx_rate = units of the base currency per 1 unit of the entry's `currency`.
alter table transactions rename column amount_usd to amount_base;
alter table recurring rename column amount_usd to amount_base;
alter table transactions rename column replaces_monthly_usd to replaces_monthly;
alter table budgets rename column monthly_limit_usd to monthly_limit;
alter table user_settings rename column cash_on_hand_usd to cash_on_hand;
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
