# Ortha Budget

A mobile-first budget tracker for small agencies and freelancers. It tracks:

- **Subscriptions**: tools you pay for and retainers you receive, with renewal dates and one-tap "mark paid".
- **One-time payments**, **lifetime deals** (with "pays for itself in N months"), **contractor pay** and other **expenses**.
- **Any currency per entry**, rolled up into USD totals. Rates prefill from a free FX API and stay editable.
- **Budgets** per category, **reports** (cash flow, where the money goes) and **CSV export**.

Every account is private. Anyone can sign up, and each user only ever sees their own rows (enforced by Postgres row-level security).

**Stack:** Next.js 16 · React 19 · Tailwind v4 · shadcn/ui (Base UI) · Clerk (auth) · Supabase (Postgres + RLS).
Design notes and the Mobbin references behind each screen are in [`docs/DESIGN-BRIEF.md`](docs/DESIGN-BRIEF.md).

## Self-host

1. **Clerk**: create an application at [dashboard.clerk.com](https://dashboard.clerk.com). Under **Configure → Session** (or via `clerk config patch`), add the custom session claim `{"role": "authenticated"}`. Note your Frontend API domain (e.g. `your-app.clerk.accounts.dev`).
2. **Supabase**: create a project. Under **Authentication → Sign In / Providers → Third-Party Auth**, add **Clerk** with that domain. Then open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql).
3. **Env**: `cp .env.local.example .env.local` and fill it in. Use the Supabase **publishable/anon** key. The app never needs the service-role key.
4. `npm install && npm run dev`, then open http://localhost:3000 and sign up.

Optional demo data: put your Clerk user id into [`supabase/seed.sql`](supabase/seed.sql) and run it.

**Deploy (Vercel):** import the repo, add the same env vars, deploy. For production, create a Clerk production instance on your own domain and point Supabase third-party auth at it.

## How the security works

- **Auth**: Clerk handles sign-up and sign-in. `src/proxy.ts` requires a session on every route except `/sign-in` and `/sign-up`.
- **Data access**: the server talks to Supabase **as the signed-in user**, passing the Clerk session token. Supabase verifies it as a third-party JWT. RLS policies allow a row only when `user_id = auth.jwt() ->> 'sub'`. The `anon` role has no table grants.
- **No admin key in the app**: there is no service-role key, so a bug in app code cannot read another user's data.
- **Input**: every server action re-validates its input (types, enums, lengths, dates, UUIDs) before it reaches the database. Composite foreign keys stop a row from pointing at another user's contractor or plan.
- **Headers**: HSTS, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, nosniff, a strict referrer policy and a locked-down permissions policy.
- **CSV export**: escaped, with spreadsheet formula injection neutralised.

Found a vulnerability? See [SECURITY.md](SECURITY.md).

## Data model

| table | what |
|---|---|
| `transactions` | Every real money movement. `kind` is one of subscription, one_time, lifetime, contractor, expense, income. `amount_usd = amount × fx_rate`. |
| `recurring` | Plans that repeat. "Mark paid" calls `mark_recurring_paid()`, which logs a transaction and moves `next_due` forward in one DB transaction. |
| `contractors` | People you pay, with a default rate and currency. |
| `budgets` | A monthly USD limit per category. |

## License

[MIT](LICENSE)
