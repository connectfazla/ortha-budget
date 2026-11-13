# E2E tests (Playwright)

Runs every feature after login at 390x844 (mobile) and 1440x900 (desktop). Start the app yourself first (`npm run dev` or `npm start`); there is no webServer.

Env vars (real env wins; `.env.local` is loaded automatically):
- `E2E_EMAIL`, `E2E_PASSWORD`: optional. Without them the setup signs up a fresh `e2e+<time>@example.com` account each run.
- `NEXT_PUBLIC_SUPABASE_URL` (or `NEXT_PUBLIC_NEXT_PUBLIC_SUPABASE_URL`) and `NEXT_PUBLIC_SUPABASE_ANON_KEY`: from `.env.local`.
- `E2E_BASE_URL`: optional, default http://localhost:3000.

Run: `npx playwright test` (or `npm run test:e2e`). One project: `--project=desktop`. List: `--list`.

The `onboarding` project needs an empty account and skips itself otherwise. Specs create `e2e-<timestamp>` rows and do not clean all of them up, so reset the account to re-test first-run.
