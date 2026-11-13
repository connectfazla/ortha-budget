-- 005: user-defined categories on top of the fixed set shipped in the app.
-- Already included in supabase/schema.sql for fresh installs; run this only to upgrade a 004 database.

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
