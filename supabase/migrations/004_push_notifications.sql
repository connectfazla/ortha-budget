-- 004: Web Push notifications (home-screen app on iOS 16.4+, Android, desktop).
-- Already included in supabase/schema.sql for fresh installs; run this only to upgrade a 003 database.

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
