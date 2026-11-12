# Ortha Budget: feature gaps vs market leaders (2026-11-13)

Evidence quality: WebSearch only (no deep fetch of feature pages). Many "review" hits are competitor/affiliate blogs
(Plutio, SubTracker, ReSubs, Gerald, unstar) and are flagged as weak. No direct Reddit threads surfaced. Treat user-value
claims as directional; vendor-feature claims are reasonably solid.

## What the app has today (from README + types.ts)
Transactions (6 kinds, per-entry currency + FX to USD), recurring w/ mark-paid, lifetime deals, contractors, category
budgets, reports, CSV export, dark mode (settings theme-switch). `Transaction`/`Recurring` have `notes`, `url`, `vendor`,
`category` only. NO client/project/tag field, NO attachments, NO reminders, NO import, NO search seen, NO manifest/PWA
(public/ has only icon.svg), base currency hardcoded USD (`amount_usd`).

## 1. Candidate features

Sources key (all URLs seen in search results):
- CM  https://copilot.money/  | CMH https://help.copilot.money/en/articles/11157550-quick-start-guide
- LM  https://lunchmoney.app/features | LMC https://lunchmoney.app/changelog
- LMB https://lunchmoney.app/blog/11-lunch-money-features-you-should-be-using-and-why
- BOB https://apps.apple.com/by/app/id1059152023?l=en-gb | BOBR https://appshunter.io/ios/app/1059152023/reviews/6
- TMS https://www.capterra.com/p/165241/TrackMySubs/ | TMSR https://www.capterra.com/p/165241/TrackMySubs/reviews/
- SPD https://www.spendee.com/premium | SPA https://apps.apple.com/us/app/spende-%ED%8E%B8%ED%95%9C-%EA%B0%80%EA%B3%84%EB%B6%80/id635861140?l=ar
- HAR https://www.getharvest.com/expenses/expense-tracker-with-wave | FBR https://www.techrepublic.com/article/freshbooks-review/?post_id=4111070
- WAVE https://www.plutio.com/compare/xero-vs-wave (competitor-authored, weak)
- BREX https://www.brex.com/support/what-are-auto-generated-receipts | BREXL https://www.brex.com/product/expense-management
- RAMP https://ramp.com/blog/brex-vs-mercury-vs-ramp (vendor-authored)
- YNAB https://www.ynab.com/the-ynab-dictionary-for-budgeting
- QBS/Bonsai tax: https://venture-lab.org/2026/best-finance-apps-freelancers-2026/ (aggregator, weak)
- RM  https://www.rocketmoney.com/learn/personal-finance/best-subscription-management-apps
- RMC https://ie.trustpilot.com/review/rocketmoney.com?page=2
- MON/YNAB complaints https://pocketclear.app/blog/ynab-complaints-problems.html , https://unstar.app/blog/ynab-vs-rocket-money-vs-monarch-budgeting-apps-ranked-2026 (secondary)

| Feature | Leaders that have it | User value / evidence | Effort | Pri |
|---|---|---|---|---|
| Renewal reminders (email/push, N days before `next_due`) | Bobby (BOB), TrackMySubs (TMS: custom reminders, email alerts), Rocket Money (RM) | Core reason subscription trackers exist. Bobby reviews praise reminders (BOBR); complaints are about paywalled reminder slots and inaccurate wording. Reminders are the #1 differentiator vs a plain spreadsheet. | M (Vercel cron + Resend/email; push needs PWA+VAPID = L). Email-only is M. | P0 |
| Upcoming 30/60/90-day outflow forecast from recurring | YNAB scheduled txns (YNAB), Copilot Recurrings (CM), TMS calendar (TMS), Lunch Money recurring (LMB) | "What is due next and how much" is the main subscription-view question. Data already exists (`next_due`, interval). Pure read/calc, no new infra. | S | P0 |
| Client / project tag on transactions + recurring (profit per client) | Harvest per-project budget/expenses (HAR), FreshBooks Plus project profitability (FBR), Copilot tags (CM, added Jun 2024), Lunch Money tags (LM) | Agencies live on "did this client make money". Wave lacks it so users do it by hand (WAVE, weak source). Currently only free-text `notes`. Biggest agency-specific gap. | M (new `clients` table or a text `client`/`project` col, filter + report) | P0 |
| Search + filters (text, kind, category, date, client) | Every leader (Copilot, Monarch, Lunch Money) | Table stakes once >100 rows. Not found as a stated complaint, so evidence is "universal presence", not pain. | S | P0 |
| Base currency setting (not hardcoded USD) | Lunch Money "home currency" (LM), Spendee wallets (SPA), YNAB web-only multi-currency (unstar) | Agency owners outside the US (target users: AU/NZ/EU) see USD totals as wrong. Multi-currency is a known weak spot elsewhere (YNAB web-only), so a good version is a differentiator. | M (rename `amount_usd`->`amount_base`, store rate to base; migration touches every query) | P1 |
| Receipt / attachment upload | Harvest manual upload (HAR), FreshBooks Plus auto-capture (FBR), Spendee photo/AI scan (SPA), Brex/Ramp auto-match (BREX, RAMP) | Needed for tax/contractor proof; heavy in spend tools. For a tracker without bank sync it is a "nice evidence" feature, not daily. Supabase Storage + RLS bucket. Skip AI scan. | M | P1 |
| Tax set-aside % (of income, shown on dashboard) | QuickBooks Solopreneur estimates, Found/Lili auto set-aside (venture-lab, weak source) | Freelancers repeatedly told to hold 25-30% aside. We only need a user % setting and a "set aside this month" number, not tax filing. Evidence thin on the app side, strong on the advice side. | S | P1 |
| Cash on hand + runway (months) | Mercury/Ramp/Brex are banks/cards; no source found describing runway features (searched, nothing) | Natural for agencies, but needs a manual "balance" input. I found no leader evidence, so this is my inference. | S-M | P1 |
| Budget threshold alerts (80%/100%) | Brex/Ramp spend limits (BREXL, RAMP); Copilot budgets (CM) | In-app banner is cheap; push/email depends on reminder infra. Reviewers call Copilot budget analysis "light" (CM search summary). | S in-app, M email | P1 |
| CSV import (bank export, our own export) | Lunch Money CSV import incl. tags+currency (LMC), TrackMySubs CSV import/export (TMS via Product Hunt) | The substitute for bank sync: users paste a bank CSV. Also onboarding path from spreadsheets. Parsing/mapping UI is the cost. | M-L | P1 |
| Onboarding + sample data | Monarch onboarding 2-4 hrs setup complaint (joingerald, secondary); Bobby/Spendee fast manual start | Setup cost is a repeated pain; an empty app is weak. We already have seed.sql, so a "load sample / add first subscription" empty state is cheap. | S | P1 |
| PWA install (manifest + icons, offline shell) | Bobby is native iOS only, no web (BOB); Monarch mobile lags web (unstar) | App is mobile-first; add-to-home-screen gives app feel at low cost. Web push needs iOS 16.4+ and install. | S (manifest) / L (offline, push) | P1 |
| Undo delete / soft delete | Not found as a leader feature in my search | Mobile mis-taps. Small safety net; evidence is my judgment only. | S (toast undo, deferred delete) | P1 |
| Annual vs monthly cost toggle (normalised) | Subscription trackers show monthly and yearly totals (BOB, TMS) | Yearly view reveals true cost (annual plans, quarterly). Easy from existing interval. | S | P1 |
| Bulk edit / multi-select | Copilot/Lunch Money (not verified on pages) | Matters mostly after CSV import. | M | P2 |
| Budget rollover | Copilot optional Rollovers (CM), YNAB envelopes (YNAB) | Valued by personal budgeters; agencies budget by month per tool. Low fit. | M | P2 |
| Rules / auto-categorise | Lunch Money rules engine (LM), Copilot | Only matters with imports/bank sync. | M | P2 |
| Subscription trial tracking (trial end date) | TMS (weak: users wish for it, TMSR) | Real gap in leaders; cheap field + reminder. | S | P2 |
| Keyboard shortcuts (desktop) | none cited | Mobile-first app; no evidence. | S | P2 |
| Cancel guide / one-tap cancel | Rocket Money (RM) | Praised when it works, but cancel/dark-pattern complaints dominate (RMC, BBB). Not our brand. | L | Out |
| Invoices / proposals / time tracking | FreshBooks, Bonsai, Harvest, Plutio | Different product (billing). | L | Out |
| Shared / team access (partner, bookkeeper) | Monarch household praised (joingerald); Copilot single-user (CM search) | Data is strictly per-user today. A read-only "accountant share" later; not core. | L | P2 |

## 2. Recommended P0 set (8)
Goal: an agency owner on a phone can answer "what is due, what do I owe, which client pays."
1. Renewal reminders (email first; configurable days-before; include paused/cancelled exclusion).
2. 30/60/90-day upcoming-outflow (and inflow from retainers) forecast on dashboard, from `recurring`.
3. Client/project field on transactions and recurring, with per-client income / cost / margin report.
4. Search and filters on Transactions (text, kind, category, client, date range).
5. Monthly/annual toggle for recurring totals (shows true yearly cost). [tiny; ride with #2]
6. Empty-state onboarding with one-tap sample data and "add first subscription" prompt.
7. Undo delete (toast, deferred commit) for transactions/recurring.
8. PWA manifest (install to home screen) so mobile use feels native; defer push/offline.

Suggested next wave (P1): base-currency setting, tax set-aside %, runway/cash balance, CSV import, receipts, budget alerts.
Note on ordering: reminders (#1) are the strongest evidence-backed item. #3 is the strongest agency-specific differentiator but touches schema and reports.

## 3. Out of scope
- Bank sync / transaction auto-import: Plaid plus compliance, cost, and security surface; our README sells "no service key, private data".
- Auto subscription detection from bank data: needs bank sync first.
- Bill negotiation / cancellation concierge: Rocket Money's most-complained feature (RMC); legal and ops burden.
- Invoicing, proposals, contracts, time tracking: Wave/FreshBooks/Bonsai/Harvest territory; a different product.
- Corporate cards, spend limits, expense approvals: Ramp/Brex/Mercury need a card issuer/bank.
- Tax filing / 1099 / quarterly estimates beyond a simple set-aside %: liability and jurisdiction complexity.
- AI receipt scanning (OCR): cost and accuracy; plain attachment is enough.
- Investments / net worth / credit score: personal-finance scope, bank-data dependent.
- Multi-user org workspaces: Clerk Orgs + RLS rewrite; revisit if agencies ask.
- Native iOS app: PWA covers it.

## Honest gaps in evidence
- No G2/App Store review text read directly for Copilot, Monarch, YNAB, Lunch Money; complaints came via secondary roundups.
- No result at all for Mercury/Ramp/Brex runway features, Harvest/Plutio changelogs, or Wave changelog.
- Priorities for undo-delete, search, onboarding are partly judgment, not cited pain.
