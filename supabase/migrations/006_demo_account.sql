-- 006: public demo account that resets itself.
-- The demo user's id lives in app_secrets ('demo_user_id'); it is created by signing up demo@example.com once.
-- Already included in supabase/schema.sql for fresh installs (the schedule only runs if demo_user_id is set).

-- Wipe the demo account and load a realistic sample ledger. Also restores the email and password,
-- in case a visitor changed them through the Auth API.
create function reset_demo()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid text := (select value from app_secrets where name = 'demo_user_id');
  d date := current_date;
  acme uuid; northwind uuid; alex uuid; rafi uuid; figma uuid;
begin
  if uid is null then return; end if;

  delete from attachments where user_id = uid;
  delete from push_subscriptions where user_id = uid;
  delete from price_changes where user_id = uid;
  delete from transactions where user_id = uid;
  delete from recurring where user_id = uid;
  delete from contractors where user_id = uid;
  delete from clients where user_id = uid;
  delete from budgets where user_id = uid;
  delete from categories where user_id = uid;
  delete from user_settings where user_id = uid;

  update auth.users
  set email = 'demo@example.com',
      encrypted_password = crypt('demo1234', gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      updated_at = now()
  where id = uid::uuid;

  insert into user_settings (user_id, tax_rate, cash_on_hand, cash_updated_at, base_currency, timezone)
  values (uid, 25, 18400, now(), 'USD', 'UTC');

  insert into clients (user_id, name, color) values (uid, 'Acme Co', '#0666eb') returning id into acme;
  insert into clients (user_id, name, color) values (uid, 'Northwind', '#10b981') returning id into northwind;

  insert into contractors (user_id, name, role, rate, rate_type, currency)
  values (uid, 'Alex Rivera', 'Frontend developer', 3200, 'monthly', 'USD') returning id into alex;
  insert into contractors (user_id, name, role, rate, rate_type, currency)
  values (uid, 'Rafi Hasan', 'Motion designer', 45000, 'monthly', 'BDT') returning id into rafi;

  insert into recurring (user_id, name, vendor, direction, amount, billing_interval, next_due, category)
  values (uid, 'Figma Professional', 'Figma', 'out', 45, 'monthly', d + 3, 'Design tools') returning id into figma;
  insert into recurring (user_id, name, vendor, direction, amount, currency, fx_rate, billing_interval, next_due, category, client_id, contractor_id, trial_ends, cancel_by) values
    (uid, 'Vercel Pro', 'Vercel', 'out', 20, 'USD', 1, 'monthly', d + 9, 'Hosting', null, null, null, null),
    (uid, 'Claude Max', 'Anthropic', 'out', 100, 'USD', 1, 'monthly', d + 15, 'AI', null, null, null, null),
    (uid, 'Google Workspace', 'Google', 'out', 168, 'USD', 1, 'yearly', d + 120, 'Software', null, null, null, null),
    (uid, 'Notion Plus', 'Notion', 'out', 10, 'USD', 1, 'monthly', d + 12, 'Software', null, null, d + 5, null),
    (uid, 'Webflow CMS', 'Webflow', 'out', 29, 'USD', 1, 'monthly', d + 2, 'Hosting', null, null, null, d + 2),
    (uid, 'Retainer · Acme Co', null, 'in', 2400, 'USD', 1, 'monthly', d + 6, 'Retainer', acme, null, null, null),
    (uid, 'Retainer · Northwind', null, 'in', 1500, 'USD', 1, 'monthly', d + 18, 'Retainer', northwind, null, null, null),
    (uid, 'Rafi monthly', null, 'out', 45000, 'BDT', 0.0082, 'monthly', d + 20, 'Contractors', null, rafi, null, null);

  -- Six months of history so charts, reports and the year-end summary have shape.
  insert into transactions (user_id, date, direction, kind, amount, currency, fx_rate, description, category, vendor, client_id, contractor_id, recurring_id, replaces_monthly) values
    (uid, d - 1,   'in',  'income',       3500, 'USD', 1,      'Website build · Acme Co',      'Client work',   null,      acme,      null,  null,  null),
    (uid, d - 3,   'out', 'subscription', 45,   'USD', 1,      'Figma Professional',           'Design tools',  'Figma',   null,      null,  figma, null),
    (uid, d - 5,   'out', 'contractor',   1600, 'USD', 1,      'Payout · Alex Rivera',         'Contractors',   null,      acme,      alex,  null,  null),
    (uid, d - 6,   'out', 'contractor',   45000,'BDT', 0.0082, 'Payout · Rafi Hasan',          'Contractors',   null,      northwind, rafi,  null,  null),
    (uid, d - 9,   'out', 'lifetime',     69,   'USD', 1,      'TidyCal lifetime',             'Software',      'AppSumo', null,      null,  null,  12),
    (uid, d - 12,  'out', 'one_time',     1299, 'USD', 1,      'Studio display',               'Hardware',      'Apple',   null,      null,  null,  null),
    (uid, d - 14,  'out', 'expense',      86,   'USD', 1,      'Client lunch',                 'Meals',         null,      northwind, null,  null,  null),
    (uid, d - 20,  'in',  'income',       1500, 'USD', 1,      'Retainer · Northwind',         'Retainer',      null,      northwind, null,  null,  null),
    (uid, d - 34,  'in',  'income',       2400, 'USD', 1,      'Retainer · Acme Co',           'Retainer',      null,      acme,      null,  null,  null),
    (uid, d - 36,  'out', 'contractor',   3200, 'USD', 1,      'Payout · Alex Rivera',         'Contractors',   null,      acme,      alex,  null,  null),
    (uid, d - 40,  'out', 'expense',      220,  'USD', 1,      'Ads test',                     'Marketing',     'Meta',    null,      null,  null,  null),
    (uid, d - 52,  'in',  'income',       4200, 'USD', 1,      'Brand refresh · Northwind',    'Client work',   null,      northwind, null,  null,  null),
    (uid, d - 64,  'in',  'income',       2400, 'USD', 1,      'Retainer · Acme Co',           'Retainer',      null,      acme,      null,  null,  null),
    (uid, d - 70,  'out', 'contractor',   3200, 'USD', 1,      'Payout · Alex Rivera',         'Contractors',   null,      acme,      alex,  null,  null),
    (uid, d - 75,  'out', 'expense',      540,  'USD', 1,      'Conference ticket',            'Travel',        null,      null,      null,  null,  null),
    (uid, d - 95,  'out', 'lifetime',     149,  'USD', 1,      'Pictory lifetime',             'AI',            'AppSumo', null,      null,  null,  29),
    (uid, d - 96,  'in',  'income',       2400, 'USD', 1,      'Retainer · Acme Co',           'Retainer',      null,      acme,      null,  null,  null),
    (uid, d - 110, 'in',  'income',       6800, 'USD', 1,      'Product site · Northwind',     'Client work',   null,      northwind, null,  null,  null),
    (uid, d - 118, 'out', 'contractor',   3200, 'USD', 1,      'Payout · Alex Rivera',         'Contractors',   null,      northwind, alex,  null,  null),
    (uid, d - 126, 'in',  'income',       2400, 'USD', 1,      'Retainer · Acme Co',           'Retainer',      null,      acme,      null,  null,  null),
    (uid, d - 140, 'out', 'expense',      129,  'USD', 1,      'Course: motion design',        'Education',     null,      null,      null,  null,  null),
    (uid, d - 150, 'in',  'income',       3100, 'USD', 1,      'Landing page · Acme Co',       'Client work',   null,      acme,      null,  null,  null),
    (uid, d - 160, 'out', 'contractor',   3200, 'USD', 1,      'Payout · Alex Rivera',         'Contractors',   null,      acme,      alex,  null,  null);

  insert into budgets (user_id, category, monthly_limit) values
    (uid, 'Design tools', 120), (uid, 'AI', 150), (uid, 'Contractors', 5000), (uid, 'Marketing', 300), (uid, 'Meals', 80);
end;
$$;
revoke execute on function reset_demo() from public, anon, authenticated;

-- True for the shared demo login. Security definer because signed-in users can't read app_secrets.
create function is_demo_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select ((select auth.jwt()) ->> 'sub') is not distinct from (select value from app_secrets where name = 'demo_user_id');
$$;
revoke execute on function is_demo_user() from public, anon;
grant execute on function is_demo_user() to authenticated;

-- The demo account can't upload receipts (keeps the shared login from becoming free file hosting).
drop policy if exists receipts_insert on storage.objects;
create policy receipts_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = ((select auth.jwt()) ->> 'sub')
    and not (select public.is_demo_user())
  );

-- Reset every 6 hours.
select cron.schedule('ortha-demo-reset', '0 */6 * * *', 'select public.reset_demo()');
