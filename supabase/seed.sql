-- Optional demo data. Sign up in the app once, copy your Clerk user id (Clerk dashboard → Users, starts with "user_"),
-- paste it below, then run this in the Supabase SQL Editor.
-- Delete later with: delete from transactions; delete from recurring; delete from contractors; delete from budgets;

do $$
declare
  uid text := 'user_REPLACE_ME';
  c_alex uuid;
  c_sam uuid;
  r_figma uuid;
begin
  if uid = 'user_REPLACE_ME' then
    raise exception 'Set uid to your Clerk user id first';
  end if;

  insert into contractors (user_id, name, role, email, rate, rate_type, currency)
  values (uid, 'Alex Rivera', 'Frontend dev', 'alex@example.com', 45000, 'monthly', 'BDT')
  returning id into c_alex;
  insert into contractors (user_id, name, role, rate, rate_type, currency)
  values (uid, 'Sam Lee', 'Motion designer', 40, 'hourly', 'USD')
  returning id into c_sam;

  insert into recurring (user_id, name, vendor, direction, amount, billing_interval, next_due, category)
  values (uid, 'Figma Professional', 'Figma', 'out', 45, 'monthly', current_date + 3, 'Design tools')
  returning id into r_figma;
  insert into recurring (user_id, name, vendor, direction, amount, billing_interval, next_due, category) values
    (uid, 'Vercel Pro', 'Vercel', 'out', 20, 'monthly', current_date + 9, 'Hosting'),
    (uid, 'Claude Max', 'Anthropic', 'out', 100, 'monthly', current_date + 15, 'AI'),
    (uid, 'Google Workspace', 'Google', 'out', 168, 'yearly', current_date + 120, 'Software'),
    (uid, 'Retainer · Acme Co', null, 'in', 1200, 'monthly', current_date + 6, 'Client work'),
    (uid, 'Adobe CC', 'Adobe', 'out', 59.99, 'monthly', current_date - 2, 'Design tools');
  insert into recurring (user_id, name, direction, amount, currency, fx_rate, billing_interval, next_due, category, contractor_id)
  values (uid, 'Alex monthly', 'out', 45000, 'BDT', 0.0082, 'monthly', current_date + 18, 'Contractors', c_alex);

  insert into transactions (user_id, date, direction, kind, amount, currency, fx_rate, description, category, vendor, contractor_id, recurring_id, replaces_monthly_usd) values
    (uid, current_date - 1,  'in',  'income',       3500,  'USD', 1,      'Website build · Northwind', 'Client work', 'Northwind', null, null, null),
    (uid, current_date - 3,  'out', 'subscription', 45,    'USD', 1,      'Figma Professional', 'Design tools', 'Figma', null, r_figma, null),
    (uid, current_date - 4,  'out', 'contractor',   45000, 'BDT', 0.0082, 'Payout · Alex Rivera', 'Contractors', null, c_alex, null, null),
    (uid, current_date - 6,  'out', 'contractor',   640,   'USD', 1,      'Payout · Sam Lee', 'Contractors', null, c_sam, null, null),
    (uid, current_date - 8,  'out', 'lifetime',     69,    'USD', 1,      'TidyCal lifetime', 'Software', 'AppSumo', null, null, 12),
    (uid, current_date - 95, 'out', 'lifetime',     149,   'USD', 1,      'Pictory lifetime', 'AI', 'AppSumo', null, null, 29),
    (uid, current_date - 10, 'out', 'one_time',     1299,  'USD', 1,      'Studio display', 'Hardware', 'Apple', null, null, null),
    (uid, current_date - 12, 'out', 'expense',      54.5,  'USD', 1,      'LLC annual report', 'Legal & admin', null, null, null, null),
    (uid, current_date - 35, 'in',  'income',       2800,  'USD', 1,      'Landing page · Globex', 'Client work', null, null, null, null),
    (uid, current_date - 38, 'out', 'contractor',   45000, 'BDT', 0.0082, 'Payout · Alex Rivera', 'Contractors', null, c_alex, null, null),
    (uid, current_date - 40, 'out', 'subscription', 45,    'USD', 1,      'Figma Professional', 'Design tools', 'Figma', null, r_figma, null),
    (uid, current_date - 66, 'in',  'income',       4100,  'USD', 1,      'Retainer + extras', 'Client work', null, null, null, null),
    (uid, current_date - 70, 'out', 'expense',      220,   'USD', 1,      'Meta ads test', 'Marketing', 'Meta', null, null, null);

  insert into budgets (user_id, category, monthly_limit_usd) values
    (uid, 'Design tools', 120), (uid, 'AI', 150), (uid, 'Contractors', 1200), (uid, 'Marketing', 300);
end $$;
