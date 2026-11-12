# Ortha Budget Tracker: Design Brief (Mobbin-grounded)

Cite keys in [brackets] resolve to the Refs table at the bottom (URLs exactly as Mobbin returned them).
Honest gaps: Mobbin has NO lifetime-deal/ROI screen and no contractor-payout list. Those two are adapted from goal-progress and payee-history screens (flagged below).
Base width 390px. Desktop (>=1024px) = same components, sidebar + 2-col content, drawers become right-side Sheet or centered Dialog.

## 1. Dashboard / Home
Pattern: stacked cards on a soft background. Hero "Net this month" card, then Upcoming strip, then Budget rings/bars, then chart. Copilot's Dashboard orders it exactly this way: spend line, To Review, Budgets, Upcoming, Net this month [CP-DASH-A][CP-DASH-B]. Net card = income vs spend split bar with two labelled values [CP-DASH-B][CP-DASH-C]. Mercury web home shows the desktop version: big balance, 30-day delta chips, area chart, widgets beside it [MERC-HOME].
Layout @390 (px-4 gutter, gap-3):
1. Header: month switcher (`< Nov 2026 >`, shadcn Button ghost + Popover) left, avatar right. No big logo.
2. Hero card (Card): label "Net this month", number 36px tabular, delta chip vs last month (Badge, green/red, "-46.6% vs Oct" as Copilot does [CP-DASH-B]). Below: 2-segment bar (In vs Out, Progress-style div), then 3-col stats: Money in | Money out | Monthly burn.
3. "Upcoming" horizontal scroll row of renewal chips: logo, name, amount, "in 8 days" (Copilot [CP-DASH-A]). Header link "Recurring >" goes to Subscriptions. Use ScrollArea horizontal, snap-x.
4. "Budgets": row of 5 ring tiles (SVG ring, label "$71 over"/"$1.52 left") [CP-DASH-B]; red ring when over. Link "Categories >".
5. Chart card: 6-month In/Out bars (Recharts via shadcn Chart), month pills below [UBANK-INOUT].
6. "Lifetime deals" mini-card: total paid, total monthly value replaced, avg payoff (optional, small).
Desktop: hero card spans 2 cols; Upcoming + Budgets right column; chart full width below (Mercury layout [MERC-HOME]).

## 2. Add-transaction bottom sheet
Pattern: Vaul drawer, 92dvh, drag handle. Top = direction segmented toggle (Outflow/Inflow) + giant signed amount, then iOS-style grouped list rows for fields. YNAB's Add Transaction is the closest match: Outflow|Inflow segmented control, red signed amount, grouped rows Payee/Category/Account/Date/Repeat, floating Save [YNAB-ADD]. Amount-first with big numerals and custom keypad: Cash App [CASH-AMT], GoPay (amount, category icon row, date in header, big green CTA) [GOPAY-ADD]. Brex shows "made in a different currency" toggle revealing currency under Amount [BREX-ADD].
Layout @390:
1. Handle + title "Add" + close (DrawerHeader).
2. Type picker: horizontal scroll chips (ToggleGroup type=single, pill): Subscription, One-time, Lifetime deal, Contractor, Expense, Income. Selecting type sets direction default (Income = in, rest = out) and reveals extra fields. Direction toggle (Outflow|Inflow, ToggleGroup) sits under it; needed because retainers are subscriptions with direction in.
3. Amount: 56px tabular, currency chip left of it (opens nested Drawer or Select: USD, BDT, EUR...). When non-USD, show muted "≈ $84.20 USD" line (Binance/Cash App secondary-value line [BINANCE-AMT][CASH-AMT]).
4. Grouped field list (Card with divided rows, label above value, chevron; YNAB [YNAB-ADD]): Name/Payee (Input), Category (opens Select/Command), Date (native `input type=date` or Calendar Popover), Repeat/Billing cycle (subscription only), Notes.
5. Type-specific rows: Lifetime deal => "Replaces $/mo" input. Contractor => Contractor picker. Subscription => billing cycle + next renewal.
6. Sticky footer CTA "Save" full width, 52px, ink-colored (GoPay/Cash App full-width bottom button [GOPAY-ADD][CASH-AMT]). Use numeric keyboard via `inputMode="decimal"`, not a custom keypad (YAGNI).
Desktop: same form in right Sheet (w-[440px]).

## 3. Transactions list
Pattern: sticky search bar + filter chips, rows grouped under date headers with daily total at right. Copilot: search+filter field, TODAY/YESTERDAY headers [CP-TX]. Monzo and Starling: date header with day total on the right [MONZO-ACT][STARLING-TX]. Vivid: removable filter chips row ("Money pocket x", Date, All filters) with "Spent this month / Incoming" summary under it [VIVID-TL]. Filter sheet: Mercury, date preset pills + collapsible sections + "See Results" + "Clear Filters (3)" [MERC-FILTER]. Direction filter (Any / In / Out) is a radio group in Mercury web [MERC-TX-WEB].
Layout @390:
1. Title "Transactions" (28px) + filter icon button.
2. Search Input (rounded-xl, bg-muted) [CP-TX].
3. Chip row (scroll): Month chip, Type, Direction, Category; active chips are filled with an x (Badge/Button toggle) [VIVID-TL].
4. Summary line: "In $4,200  Out $3,180" for the filtered set [VIVID-TL].
5. Grouped list: date header (muted caps 12px) + day net on right; row = category icon square 40px, name (15px/500), subtitle "Subscription · Figma", amount right-aligned tabular, green + for in, ink for out (Monzo shows only income in green [MONZO-ACT]; copy that: out stays neutral ink, in is green; red reserved for over-budget/overdue). Secondary original-currency line under amount, e.g. "৳12,000" (Monzo does exactly this [MONZO-SUBS]).
6. Filter drawer (Vaul): sections Date presets, Type, Direction, Category; footer "Show 42 results" + "Clear" [MERC-FILTER].
Desktop: Table (shadcn Table), columns Date/Name/Category/Type/Amount, filter bar above with popovers; Monarch web is the model (date-group rows with totals, search popover, orange Add button top right) [MONARCH-WEB]; Rocket Money web for filter pill row [RM-TX-WEB].

## 4. Subscriptions list
Pattern: grouped by billing cadence with next-due date under the name, kebab menu per row, inactive group greyed at bottom (Origin) [ORIGIN-REC]. Rocket Money: "Coming up" calendar strip, "Coming later" cards with "in 18 days", kebab, and a "Marked Paid" toast [RM-REC]. Copilot adds a "left to pay / paid so far" ring on top [CP-REC]. Monzo/Revolut: dense list with converted secondary amount [MONZO-SUBS][REVOLUT-SCHED].
Layout @390:
1. Header "Subscriptions" + add (+) icon button (Revolut puts + top right here [REVOLUT-SCHED]).
2. Summary card: "Monthly equivalent" (Out) and "Monthly recurring in" (retainers), plus "left to pay this month / paid so far" mini ring (Copilot [CP-REC]).
3. Tabs (shadcn Tabs): Out (tools) | In (retainers). Segmented, not chips.
4. List grouped: "Due this week", "Later", "Paused / Cancelled" (greyed, Origin [ORIGIN-REC]). Row: logo/initial tile, name, "Monthly · due Nov 20 (in 2d)" (amber text when <=3 days, Origin "Due in 2 days" [ORIGIN-REC]), amount right, `/mo` equivalent shown muted for annual plans ("$120/yr · $10/mo"), kebab (DropdownMenu): Mark paid, Pause, Cancel, Edit.
5. Swipe or button "Mark paid": inline small Button on due rows; result = Sonner toast "Marked Paid" [RM-REC].
6. Row tap opens Drawer detail: next charge date, cycle, status, Pause/Cancel as secondary rows (GoodRx/Ro manage-plan list pattern, destructive text link last [GOODRX-MANAGE][RO-MANAGE]).

## 5. Lifetime deals (ADAPTED, no direct Mobbin match)
Pattern: goal-progress card where the bar fills as "payback" accrues. Quicken goal card (bar, "saved so far", target, "on track" badge) [QUICKEN-GOAL]; KOHO goal detail: big title, % complete, rows of label/value (Target, Saved, Complete by) [KOHO-GOAL]; Rocket Money goal: ring + Total Goal / Monthly rows [RM-GOAL].
Layout @390:
1. Summary card: "Paid $1,240 total · replaces $186/mo · saves $2,232/yr".
2. Card per deal (Card): name + vendor logo; Progress bar (value delivered vs price: months elapsed x replaces/mo / paid); line "Paid $199 · replaces $29/mo"; badge "Paid off in 7 mo" (green) or "Pays off in 3 mo" (neutral) [QUICKEN-GOAL badge idea].
3. Tap => Drawer with KOHO-style rows: Paid, Replaces/mo, Purchased, Break-even date [KOHO-GOAL].
Sort: closest to break-even first.

## 6. Contractors list + detail (ADAPTED)
Pattern: people list with avatar initials; detail = header (avatar, name, role) + primary actions + dated history list. Neo Financial: initials avatar, Request/Send buttons, history grouped by month with status [NEO-PAYEE]. Revolut Business: name, tags, "Payment details", "Payment history" section [REVBIZ-PAYEE]. Cash App: "Total received / Total sent" bar summary [CASH-HIST].
Layout @390:
List: search + rows (initials Avatar, name, role, "Last paid Nov 1", YTD in USD right, native BDT secondary muted).
Detail (route or full-height Drawer):
1. Back + kebab (Edit/Delete) [NEO-PAYEE].
2. Avatar 64px, name, role, rate "৳45,000/mo".
3. Stat pair: "Paid this year $4,120" | "Avg/mo $343" (Cash App total pair [CASH-HIST]).
4. Primary Button "Record payout" + secondary "Edit".
5. "Payout history" grouped by month: date, amount in BDT + USD equivalent at stored rate, Badge Paid/Scheduled.

## 7. Reports
Pattern: tabbed cards: Cash flow bars + totals grid, then category donut + ranked list. Origin Reports: 6-month green/orange bars with net line, totals grid (Total income, Total expenses, Net, Avg/mo) [ORIGIN-CASHFLOW]. Copilot net-income bars with month list underneath [CP-NETINC]. Quicken: one-line bar + month list table [QUICKEN-MONTH]. Category: Revolut donut with period pills 1W/1M/6M/1Y and list with % [REVOLUT-DONUT]; Origin donut + "% of expenses" rows + See more [ORIGIN-DONUT]; Buddy donut + rows [BUDDY-DONUT].
Layout @390:
1. Range pills (ToggleGroup): 3M / 6M / 12M / YTD.
2. Card "Cash flow": diverging bars (in up green, out down neutral/red-tint) + net line; totals 2x2 grid below [ORIGIN-CASHFLOW].
3. Card "Where it goes": donut 180px with total in centre, then ranked rows (icon, name, % , amount) [REVOLUT-DONUT][ORIGIN-DONUT]. Max 5 slices + "Other"; use a tonal ramp, not rainbow.
4. Month table: month | in | out | net (Copilot/Quicken [CP-NETINC][QUICKEN-MONTH]).
Desktop: cash flow and donut side by side (2 cols).

## 8. Budgets per category
Pattern: list rows with a thin colour-coded bar and "spent / budget" right-aligned; summary card above. Copilot Categories: donut summary "spent / total budget", rows with bar colour by state (red over, amber near, green ok) [CP-CATS]. Origin Budget tab: gauge + rows "$7 of $200" [ORIGIN-BUDGET]. Cleo: grouped sections with "42% of income" and bar rows [CLEO-BUDGET]. YNAB: green pill for available per row [YNAB-BUDGET].
Layout @390:
1. Month switcher.
2. Summary Card: "$2,383 spent of $2,900" + wide Progress + "$517 left".
3. Rows (list, hairline dividers): icon tile, name, thin Progress (6px), right "$565 / $892". Colours: ok = muted-ink/accent, 85%+ = amber, over = red (Copilot [CP-CATS]).
4. Row tap => Drawer: edit budget amount (big number input), copy-to-next-month toggle.
5. Floating "+ Budget" only on this tab (secondary to global Add).

## 9. Navigation + Add action
Mobile: 4-tab bottom bar + centred Add. YNAB tab bar puts a "Transaction" (+) in the middle [YNAB-BUDGET]; Copilot uses a floating + FAB bottom right on lists [CP-TX][CP-CATS]; Starling/Monzo use 5 labelled icon tabs [STARLING-TX][MONZO-SUBS]. Decision: bottom bar 5 slots: Home, Activity (transactions), **Add (raised centre button, opens drawer)**, Plans (Subscriptions/LTDs/Contractors as segmented sub-nav), Reports. Budgets lives inside Reports header tab and Home card. Bar: 64px + safe-area, labels 11px, active = ink icon filled + label, no pill.
Desktop (>=1024): left Sidebar (shadcn Sidebar), 240px: org switcher top, nav (Home, Transactions, Subscriptions, Lifetime deals, Contractors, Reports, Budgets), bookmarks/secondary below, Settings bottom. Primary "Add transaction" is a filled button top right of the page header (Monarch [MONARCH-WEB]) and a "Move money"-style dropdown in Mercury [MERC-HOME]. Sidebar is light grey, active item = subtle filled row (Mercury/Rocket Money [MERC-HOME][RM-TX-WEB]). Wise/Square confirm the same structure [WISE-WEB][SQUARE-WEB].

## 10. Login
Pattern: single centred card, minimal. Mercury: email + password (eye toggle), one primary button, passkey secondary [MERC-LOGIN]. Acctual: "Welcome back" + Continue with Google above email/password + black Continue [ACCTUAL-LOGIN]. Mobile brand-led: Wise full-bleed with big headline and two pill buttons [WISE-LOGIN].
Layout @390: logo mark top-left, vertically near-centre block: H1 "Sign in" 28px, Email Input, Password Input (eye toggle, forgot link under), full-width primary Button 52px, optional "Continue with Google" Button outline above divider. Single-user app: omit sign-up. Desktop: same card, 400px, on `bg-muted` page [MERC-LOGIN].

## Visual direction
Reference mix: Mercury/Origin calm neutral surfaces, Copilot's card-on-tint layering, Monzo's restrained green-only-for-income.

Colour tokens (hex; contrast vs bg checked, all >=4.5:1 for text):
| token | light | dark |
|---|---|---|
| --background | #F6F6F3 | #0C0D0F |
| --card | #FFFFFF | #16181B |
| --foreground | #15171A | #F2F3F4 |
| --muted-foreground | #5F6368 (6.0:1 on card) | #9AA0A6 (7.0:1) |
| --border | #E6E6E1 | #26292D |
| --primary (ink) | #15171A | #F2F3F4 |
| --accent (indigo, links/active/chart-1) | #3D4BD6 (6.3:1) | #8E99FF (7.4:1) |
| --money-in | #17703F (5.9:1 on #FFF) | #5FD491 (9.8:1 on #16181B) |
| --money-out (use for over-budget/overdue/negative net) | #B3261E (6.7:1) | #FF8F86 (7.6:1) |
| --warn (near budget, due soon) | #8A5A00 | #F2B84B |
Rule: money-in = green with leading "+"; ordinary outflows stay ink (Monzo [MONZO-ACT]); red only for over/overdue/negative net. Never colour alone: always +/- sign and text. Chart ramp: indigo, then 4 tonal greys/ink-blues, "Other" = #C9CBD0 / #3A3E44.

Type: Inter (Google Font), weights 400/500/600, `font-variant-numeric: tabular-nums` on every money value (Tailwind `tabular-nums`), `font-feature-settings: "cv11","ss01"` optional. Scale (px/line): 12/16 caption (caps +0.04em for group headers), 14/20 secondary, 15/22 body+row title, 17/24 section title, 22/28 page title, 28/34 big stat, 36/40 hero number, 56/60 add-sheet amount. Currency symbol at 60% size, cents at 60% size and lowered (Monzo/Starling-style `108.63` [MONZO-ACT][MONZO-SUBS]).

Radius: card 16px, inner tiles/inputs 12px, chips/buttons 999px for chips, 12px for primary CTA (52px tall), drawer top corners 24px. Spacing: 4px base; page gutter 16px (24px desktop), card padding 16px, list row 56-64px, section gap 24px, card gap 12px. Hit targets >=44px. Shadows: none on cards in light (1px border), subtle 0 1px 2px only on floating Add and drawer.

What made the best references feel premium:
1. One hero number with a delta chip and a split bar, nothing else competing (Copilot Net this month [CP-DASH-B], Revolut donut centre [REVOLUT-DONUT]).
2. Colour used as signal only: green income, red over-budget, everything else ink/grey (Monzo list [MONZO-ACT], Copilot rings [CP-DASH-B]).
3. Secondary-currency line under every converted amount, small and muted (Monzo [MONZO-SUBS]).
4. Date-grouped lists with a right-aligned day total and hairline dividers, no per-row cards (Monzo, Starling [MONZO-ACT][STARLING-TX]).
5. Forms that are one amount + a grouped list of tappable rows, with a single sticky CTA (YNAB, GoPay [YNAB-ADD][GOPAY-ADD]).

## Refs (Mobbin URLs exactly as returned)
[CP-DASH-A] Copilot dashboard: spend chart, To Review, Upcoming, Net this month: https://mobbin.com/screens/39e851c1-7c5d-4f1e-bf81-1c3be05e5566?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[CP-DASH-B] Copilot dashboard: budget rings, Upcoming, Net this month income/spend bar: https://mobbin.com/screens/a0fcfcb0-2e7a-40eb-8cbd-f0845067be4a?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[CP-DASH-C] Copilot dashboard: budgets, Net this month, Goals: https://mobbin.com/screens/c1bb5363-d727-4f41-a45b-56979b528927?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[UBANK-INOUT] Ubank In & Out monthly bars + Money in/out rows: https://mobbin.com/screens/5f44b5d5-380d-4eb6-a0c9-a168e20ef257?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[MERC-HOME] Mercury web home (sidebar, balance chart, widgets): https://mobbin.com/screens/d575358b-679b-4d52-aa98-5026970291b3?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[YNAB-ADD] YNAB Add Transaction (Outflow/Inflow, grouped rows): https://mobbin.com/screens/a452e7ce-2b77-4583-bd9d-cfa47a9570cc?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[CASH-AMT] Cash App amount entry: https://mobbin.com/screens/7ab24037-4bcd-4a7f-bb1d-c771e8b695da?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[GOPAY-ADD] GoPay Add expense manually: https://mobbin.com/screens/115a5791-ab25-44ff-8cc1-78289f83acf5?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[BREX-ADD] Brex expense form with different-currency toggle: https://mobbin.com/screens/8145ca51-fddd-4dab-adf9-e1b4da5ea3ae?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[BINANCE-AMT] Binance amount with approx fiat line: https://mobbin.com/screens/c4349593-5ce1-46f5-ba33-1e1ab7d11773?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[CP-TX] Copilot Transactions (search, date groups): https://mobbin.com/screens/39d3efee-7a8a-4fa5-ae15-1065a33dfae1?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[MONZO-ACT] Monzo All activity: https://mobbin.com/screens/8f921563-4da7-4e2b-98ea-e3e5e47b9229?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[STARLING-TX] Starling transactions grouped by date: https://mobbin.com/screens/5f00713b-a76e-45eb-8ca6-694eb41fd744?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[VIVID-TL] Vivid Timeline with filter chips: https://mobbin.com/screens/df920d40-f082-47f9-87bc-397cfa42f1e6?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[MERC-FILTER] Mercury mobile Filters sheet: https://mobbin.com/screens/f8e44e87-126f-43d2-9989-77e1fd089481?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[MERC-TX-WEB] Mercury web Transactions with direction filter: https://mobbin.com/screens/a8225239-95e8-4be6-8f48-2cbf3e15ed05?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[MONARCH-WEB] Monarch web transactions: https://mobbin.com/screens/6d7710b7-7222-45d8-a3a9-550a8bae1516?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[RM-TX-WEB] Rocket Money web Transactions: https://mobbin.com/screens/dea33000-a12e-4329-86c6-8a54e24d7e49?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[RM-REC] Rocket Money Recurring (Coming later, Marked Paid toast): https://mobbin.com/screens/117a0083-80d1-40ea-96a2-6e4e451ee582?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[CP-REC] Copilot Recurrings (left to pay / paid so far): https://mobbin.com/screens/9b90fb9b-60eb-4a4c-9755-56c0ae9e2893?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[ORIGIN-REC] Origin Recurring grouped by cadence, Inactive: https://mobbin.com/screens/3441dd7a-d41e-4406-950a-299684f6dc02?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[MONZO-SUBS] Monzo Subscriptions & Direct Debits with converted amounts: https://mobbin.com/screens/3feb7d59-56c4-4d9a-a24e-372d32ae64e8?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[REVOLUT-SCHED] Revolut Scheduled payments: https://mobbin.com/screens/87422e20-8bd6-4ab7-a663-35776baff036?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[GOODRX-MANAGE] GoodRx Manage your plan: https://mobbin.com/screens/440942f2-dd10-41d9-9182-362b71f00591?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[RO-MANAGE] Ro Manage subscription: https://mobbin.com/screens/39dc1f21-1599-4f25-a377-bfd3a64f19d3?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[QUICKEN-GOAL] Quicken Savings Goals card: https://mobbin.com/screens/ae165087-821c-4ef6-b5df-c407f1167d57?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[KOHO-GOAL] KOHO goal detail: https://mobbin.com/screens/e3f695e8-7f25-4c66-88a1-7798f3a526a9?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[RM-GOAL] Rocket Money goal ring: https://mobbin.com/screens/4dd0e004-24b3-4efa-8e10-2af3b11251b9?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[NEO-PAYEE] Neo Financial contact detail with history: https://mobbin.com/screens/9aedcd46-79ae-4f83-88c6-c16ad22331f9?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[REVBIZ-PAYEE] Revolut Business recipient detail: https://mobbin.com/screens/c84834be-cc04-4c99-9975-375b81a80e95?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[CASH-HIST] Cash App Your history (received/sent bar): https://mobbin.com/screens/7f385fb7-e1cb-40e6-b1cf-8b0275a88e7f?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[ORIGIN-CASHFLOW] Origin Reports cash flow bars + totals: https://mobbin.com/screens/bde9a7b4-75d4-4490-985c-7457d86d980f?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[CP-NETINC] Copilot net income bars + month list: https://mobbin.com/screens/088f1e0a-1d5c-4daa-a0ac-519460f16512?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[QUICKEN-MONTH] Quicken Spending by Month: https://mobbin.com/screens/097a0f40-ea48-4f41-952d-aef9374ade50?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[REVOLUT-DONUT] Revolut category donut with period pills: https://mobbin.com/screens/56d80261-ebab-49c4-aa2c-de9e23c41abb?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[ORIGIN-DONUT] Origin category breakdown donut: https://mobbin.com/screens/2d9ad60d-fc72-4c9c-a0d5-ac5c18ff4bc4?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[BUDDY-DONUT] Buddy expenses donut + list: https://mobbin.com/screens/f0a8a0b7-4cb9-438a-a81f-e696fef59b9e?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[CP-CATS] Copilot Categories (spent/budget bars): https://mobbin.com/screens/d9ca88ae-5d46-4213-a5aa-5afeb48d4d06?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[ORIGIN-BUDGET] Origin Breakdown & Budget gauge: https://mobbin.com/screens/413f86df-ddd9-4956-8dfa-515256bd949d?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[CLEO-BUDGET] Cleo Budget tab rows: https://mobbin.com/screens/1cca6424-88ee-4c14-8d48-322c0b08d828?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[YNAB-BUDGET] YNAB Plan with centre Transaction tab: https://mobbin.com/screens/3c57f2d6-37a5-424a-afd7-8fb0abbfd8c2?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[WISE-WEB] Wise web home with sidebar: https://mobbin.com/screens/cb4fa4d4-d7b3-40ea-9a12-2a2498c2062d?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[SQUARE-WEB] Square web home with sidebar: https://mobbin.com/screens/a7b88cfc-ad6a-45c2-ab23-46ac537546c9?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[MERC-LOGIN] Mercury web login: https://mobbin.com/screens/b89808de-bdd7-4fe6-9afb-350e77f1c493?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[ACCTUAL-LOGIN] Acctual web login: https://mobbin.com/screens/9a6aa694-b946-4726-af1a-e79659adfa3d?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
[WISE-LOGIN] Wise iOS welcome/login: https://mobbin.com/screens/84b41552-3303-4521-a758-1eaa96419548?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp

## OVERRIDE (owner, 2026-11-13): tech-ish + mono. This beats the visual direction above where they conflict.
Layouts, patterns and Mobbin references above stay the same. Only the skin changes:
- Font: **Geist Mono everywhere** (already wired as `font-sans` / `font-mono`). No second font. Slashed zero is on. Money values keep `tabular-nums`.
- Shape: small radius. `--radius` is 6px: cards `rounded-lg` (≈6–8px), inputs/buttons `rounded-md`, chips `rounded-sm` (squarish tags, not pills). The drawer's top corners are 12px max. The raised centre Add button is a square with rounded-md, not a circle.
- Lines over shadows: 1px hairline borders (`border-border`), no drop shadows except the drawer. Dividers between list rows. A dashed border (`border-dashed`) on empty states and "add" tiles.
- Labels: section headers and table headers in UPPERCASE 11px, `tracking-[0.08em]`, muted (e.g. `NET / NOV 2026`, `UPCOMING`, `PAYOUT HISTORY`). Use `/` or `·` as separators, never decorative icons for decoration's sake.
- Status as tags: compact square tags like `ACTIVE`, `PAUSED`, `DUE 2D`, `OVER`, `IN`/`OUT`. Use a 6px status dot (green/amber/red/grey) before a label where it helps.
- Numbers are the hero: big figures in mono at 36px (hero) and 48px (add amount), with tight tracking (`tracking-tight`). Deltas look like `▲ 12.4%` / `▼ 3.1%`.
- Charts: thin bars (radius 1–2px), a dotted grid (`strokeDasharray="2 4"`), mono axis ticks at 10–11px, and no chart gradients.
- Accent: indigo `text-brand`/`bg-brand` used sparingly for focus, the active nav item marker (a 2px left bar on desktop, a top bar on mobile tabs) and chart-1. Money in = `text-money-in`, over/overdue = `text-money-out`, due soon = `text-warn`.
- Optional texture: a very subtle 24px grid or dot background on the dashboard hero card only (`bg-[radial-gradient(...)]` at ~6% opacity). Nowhere else.
