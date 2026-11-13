# Budget Ortha: Motion + Polish Spec (Apple/Stripe vibe, Geist Sans + Geist Mono)

Note: Mobbin is static frames. Motion is inferred from frame sequences (before/after states) plus standard iOS/web practice. Citations below are only flows/screens Mobbin actually returned. Swipe-row, pull-to-refresh and Things returned nothing usable; those recipes cite no Mobbin source (Todoist undo is cited).
Supersedes the OVERRIDE in DESIGN-BRIEF.md for font (no longer mono everywhere), radius and shadows. Layouts stay.

## 1. Motion tokens (put in globals.css under :root / @theme)
```css
:root{
  --dur-instant:90ms;  /* press, toggle */
  --dur-fast:140ms;    /* hover, focus ring, tab underline */
  --dur-base:220ms;    /* popover, toast, row insert */
  --dur-slow:360ms;    /* sheet open, number roll, page enter */
  --ease-out:cubic-bezier(.22,1,.36,1);        /* default enter (expo-ish) */
  --ease-in:cubic-bezier(.4,0,1,1);            /* exits, faster than enters */
  --ease-inout:cubic-bezier(.65,0,.35,1);      /* moves on screen */
  --ease-ios:cubic-bezier(.32,.72,0,1);        /* iOS sheet curve */
  /* spring approximations via linear(), ~10% overshoot, ~450ms */
  --spring-soft:linear(0,.2 6%,.58 15%,.86 26%,1.02 38%,1.05 46%,1.03 56%,1 72%,.995 86%,1);
  /* bouncier, for success check / Add button: ~12% overshoot */
  --spring-pop:linear(0,.32 8%,.78 17%,1.1 29%,1.12 36%,1.04 50%,.99 64%,1.003 80%,1);
  --press-scale:.97;     /* buttons, rows: .985; big cards .99; icon buttons .92 */
  --stagger:35ms;        /* per item, cap 8 items (280ms total) */
}
@media (prefers-reduced-motion:reduce){
  :root{--dur-instant:1ms;--dur-fast:1ms;--dur-base:1ms;--dur-slow:1ms;--stagger:0ms}
  *{scroll-behavior:auto!important}
}
```
Rules: enter 220-360ms ease-out; exit = 60-70% of enter, ease-in; animate only transform/opacity (+ filter on overlays); never animate layout props on lists. Hover only behind `@media (hover:hover)`. Tailwind v4: expose with `@theme{--ease-ios:...;--ease-out-expo:...}` then `ease-ios`, `duration-[var(--dur-base)]`.

## 2. Patterns

### 2.1 Number transitions (count-up / rolling digits)
Cite: Cash App Pay amount entry, digits appear live as typed, new trailing digit dimmed ("$100.5" then "0" faded): https://mobbin.com/flows/f6326eeb-9398-4f5e-a354-e81d5327ec07?tab=screens&utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp . Mercury Home balance with small-cents superscript and delta chips: https://mobbin.com/flows/273099ab-2d19-4c94-9fdc-1bec9fbc1819?tab=screens&utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp . Apple Wallet Card balance hero: https://mobbin.com/flows/ff145366-1efe-457a-a0f9-df22b5954da9?tab=screens&utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
Where: dashboard hero net/balance, budget remaining, report totals, add-entry amount.
Recipe, no dep (rolling digit column, ~35 lines):
- `<Money>` splits the formatted string into chars. Each digit renders `<span class="inline-block h-[1lh] overflow-hidden"><span style="transform:translateY(calc(var(--d)*-1lh));transition:transform var(--dur-slow) var(--ease-out)">0 1 2 ... 9 stacked with block</span></span>`. Set `--d` to the digit. Non-digits (`$ , .`) render static. `tabular-nums` + Geist Mono makes widths stable. Key the char slots from the right so adding a digit does not remount others.
- Mount: render from `--d:0` then set the real value in `useEffect` (or `@starting-style { transform:translateY(0) }`). Only animate on first paint of a screen and on value change, never on every re-render.
- Add-entry keypad: no roll; instead new digit `@starting-style{opacity:0;transform:translateY(4px)}` 140ms; blur-free. Cents dimmed `text-muted-foreground` until typed (Cash App).
- Reduced-motion: tokens collapse to 1ms so it just snaps.
- Dep verdict: no library. `@number-flow/react` (~3kB) is the only one worth it if you later want automatic diff animation, but the 35-line version covers us.

### 2.2 Press states / scale-on-tap
Cite: Todoist raised red FAB + pill tab bar: https://mobbin.com/flows/75508f3a-1e8a-4c94-bdaf-2584f4e80f55?tab=screens&utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp ; Cash App Pay (large keypad + black Pay pill).
Where: every Button, tab bar items, centre Add button, list rows, cards that link.
```css
.press{transition:transform var(--dur-instant) var(--ease-out),background-color var(--dur-fast);}
.press:active{transform:scale(var(--press-scale));transition-duration:60ms}
```
Tailwind: `active:scale-[.97] transition-transform duration-100`. Release uses ease-out so it springs back; add `will-change` only on the Add button. Add button: `:active{scale:.92}` and on release `animation:pop 360ms var(--spring-pop)` (scale 1 to 1.06 to 1). Do not scale full-width list rows; use `active:bg-muted` instead (Apple Wallet rows highlight, never shrink). Put it once in `ui/button.tsx` cva base so everything inherits.

### 2.3 Sheet presentation / dismissal
Cite: Copilot add-transaction sheet (grabber, Regular/Income/Transfer segmented, name, amount, SAVE above keyboard): https://mobbin.com/flows/a90d6aef-b871-4b5b-94b8-2e8797c90e5c?tab=screens&utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp ; Cash App note sheet over amount screen: https://mobbin.com/flows/05ec0cd3-c44f-46bb-b108-2dccf68de195?tab=screens&utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp ; Revolut New payment sheet: https://mobbin.com/flows/c4a1fcdc-9763-40cb-8470-3ca850e88da2?tab=screens&utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp ; Apple Wallet transaction detail pushed page: https://mobbin.com/flows/9e942fd2-b19d-4163-91c5-d5c41a7ca6b9?tab=screens&utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
Where: add-entry drawer, edit entry, filters, contractor/subscription detail.
Recipe on Base UI Dialog/Drawer data-attributes (`data-starting-style`, `data-ending-style`, `data-open`, `data-closed`):
```css
.sheet{transform:translateY(0);transition:transform 360ms var(--ease-ios);}
.sheet[data-starting-style],.sheet[data-ending-style]{transform:translateY(100%);}
.sheet[data-ending-style]{transition-duration:240ms;transition-timing-function:var(--ease-in)}
.backdrop{opacity:1;transition:opacity 300ms}
.backdrop[data-starting-style],.backdrop[data-ending-style]{opacity:0}
```
- Backdrop `bg-black/40` plus `backdrop-blur-[2px]` on iOS only if cheap. Page behind: `transform:scale(.97)` + radius when open (Apple stack), via `body:has([data-open].sheet)` on the app root, 360ms ease-ios. Skip if jank on low-end.
- Drag-to-dismiss: Base UI/vaul-style is a dep; do pointer events on the grabber only: `touch-action:none`, track dy, set `--dy` on the sheet, release if dy>120px or velocity>0.5px/ms. ~30 lines. Rubber-band up: `dy<0 ? dy*0.15`.
- Focus: autofocus amount field on open (Copilot does name; we do amount, see 3). Use `100dvh`/`visualViewport` so SAVE sits above keyboard (Copilot, Cash App).
- Corner radius 20px top, grabber 36x5 pill.

### 2.4 Swipe-to-action rows
Source: no usable Mobbin hit (search returned static lists: Wealthfront https://mobbin.com/screens/7d890851-0489-4e75-8576-6970d538af41?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp and Venmo have none). Pattern is Apple Mail / Things.
Where: transactions list (swipe left = delete, right = edit/duplicate), subscriptions (pause), contractors.
Recipe: row = `overflow-hidden relative`; action layer absolutely behind; foreground `transform:translateX(var(--x))`. Pointer events with `touch-action:pan-y`; lock axis after 8px; resist: `x = dx*0.85`; full-swipe commit at 45% width (action label scales 1 to 1.1, `navigator.vibrate?.(8)`); release below threshold springs back with `--spring-soft` 360ms. Snap-open at 80px for the button. On commit: row collapses (see 2.7) and Undo toast fires. Desktop: same actions as a hover-revealed icon group + `Delete`/`E` keys on the focused row. Always offer a non-gesture path (row menu) for a11y.

### 2.5 Undo toasts
Cite: Todoist Completing a task, bottom "Undo / Completed" bar above the tab bar, row removed immediately: https://mobbin.com/flows/5c2fb775-e7b4-4fc2-957f-5cff8dd75f40?tab=screens&utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp ; Linear "Document duplicated" bottom-right toast with close: https://mobbin.com/flows/7f57f5f7-6f37-4233-9994-44ecfb5a13e0?tab=screens&utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
Where: delete entry/subscription/contractor, mark paid, pause.
Recipe: optimistic remove first; toast holds `{id, snapshot, timer}`; 6s lifetime with a 2px progress line (`animation:shrink 6s linear forwards; transform-origin:left`); pauses on hover/focus (`animation-play-state`); Undo restores snapshot and cancels the server delete (delay the real delete until the timer ends, or soft-delete flag and restore). Mobile: full-width pill above tab bar (`bottom:calc(env(safe-area-inset-bottom)+72px)`); desktop bottom-right 360px. Enter `translateY(12px)+opacity` 220ms ease-out via `@starting-style`; stack max 3, older shrink `scale(.95)`. `role="status"` `aria-live="polite"`; Undo is a real button; shortcut Cmd/Ctrl+Z while toast is up. sonner is already the shadcn default; if installed, use it and style; otherwise 40 lines.

### 2.6 Skeleton to content
Cite: Google search skeleton bars: https://mobbin.com/screens/c18a51d4-44f9-445c-abac-10c3c384ad2e?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp ; Waymo card skeleton keeps tab bar live: https://mobbin.com/screens/209d586d-c74b-476b-883f-50b5d26c6a78?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
Where: dashboard hero + list, reports, transactions (via `loading.tsx` per route).
Recipe: skeleton blocks match real heights/radii (no layout shift); shimmer is one gradient: `background:linear-gradient(90deg,var(--muted) 0 40%,color-mix(in oklab,var(--muted),white 55%) 50%,var(--muted) 60%);background-size:200% 100%;animation:sh 1.4s linear infinite`. Reduced-motion: static. Swap to content: content wrapper `animation:fade-up 220ms var(--ease-out) both` (opacity 0, translateY 4px). Only show skeleton after 150ms delay (`animation-delay`) to avoid flash on fast loads. Stagger first 8 rows by `--i*35ms`.

### 2.7 List insert / remove
Cite: Copilot transactions list before/after adding "coffee" (new row appears at top of TODAY): https://mobbin.com/flows/92822164-61f6-4c3b-b36f-f1d0650137ca?tab=screens&utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp ; Todoist completed row vanishes and list closes the gap.
Where: transactions list, subscriptions, contractors.
Recipe: insert: `@starting-style{opacity:0;transform:translateY(-6px);}` + `grid-template-rows:0fr to 1fr` wrapper 220ms ease-out; highlight flash `background:color-mix(in oklab,var(--brand) 10%,transparent)` fading over 1200ms so the user sees where it landed. Remove: set `data-removing`, collapse `grid-template-rows:1fr to 0fr` + opacity 0 in 200ms, then drop from state on `transitionend`. For reordering across date groups, use View Transitions: `document.startViewTransition(() => flushSync(update))` with `view-transition-name:tx-${id}` on rows (only mounted rows; names must be unique) and `::view-transition-group(*){animation-duration:260ms;animation-timing-function:var(--ease-ios)}`. Feature-check `document.startViewTransition`.

### 2.8 Success confirmation (checkmark morph)
Cite: Cash App "You sent $1" green check + Done: https://mobbin.com/flows/05ec0cd3-c44f-46bb-b108-2dccf68de195?tab=screens&utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp ; Revolut Review transfer then transfer-in-progress timeline: https://mobbin.com/flows/c4a1fcdc-9763-40cb-8470-3ca850e88da2?tab=screens&utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
Where: Save in add-entry drawer (button morphs to check, sheet closes 600ms later), mark-paid, sign-in success.
Recipe: Save button states `idle > pending (spinner, width locked) > done`. Done: button bg to `--money-in`, SVG check path `stroke-dasharray:24;stroke-dashoffset:24` animating to 0 over 320ms ease-out after a circle scale from `--spring-pop`. Then close the sheet and run the 2.7 insert flash on the new row. No confetti (Todoist's is gamified; wrong for money). Reduced-motion: swap instantly, still close. Optional `navigator.vibrate?.(10)`.

### 2.9 Pull-to-refresh
Source: no Mobbin hit. Where: dashboard + transactions on mobile PWA only. Recipe: skip custom; native browser pull-to-refresh works in Safari/Chrome. If installed as standalone PWA, set `overscroll-behavior-y:contain` on sheets only; add custom only if data goes stale (call `router.refresh()` on `visibilitychange`). Low value, skip for v1.

### 2.10 Segmented control indicator slide
Cite: Copilot Regular/Income/Transfer in sheet: https://mobbin.com/flows/69cf35a5-3637-428f-af71-4662d58ffb92?tab=screens&utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp ; Apple Wallet Week/Month/Year and By Category/By Merchant: https://mobbin.com/flows/ecf29e25-069b-41c1-9d07-a8c3bb749279?tab=screens&utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp ; Stripe filter tab cards (All/Succeeded/Failed with counts): https://mobbin.com/flows/c879c167-7f59-4b50-9275-20aa31c7e7be?tab=screens&utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
Where: add-entry type (Expense/Income), reports range (Week/Month/Year), transactions filter, budgets period.
Recipe: radio group (Base UI `Tabs`/`ToggleGroup` or native radios) with one indicator: `<span class="absolute inset-y-0.5 rounded-md bg-background shadow-sm" style="width:calc(100%/var(--n));transform:translateX(calc(var(--i)*100%));transition:transform var(--dur-base) var(--ease-ios)">`. Equal-width segments make this pure CSS. Base UI Tabs exposes `--active-tab-left/width` CSS vars on the indicator for variable widths. Text colour crossfade 140ms. Arrow keys switch; content below crossfades 140ms.

### 2.11 Hover / focus on web
Cite: Stripe Transactions table (row checkbox, `...` row menu, Clear filters) https://mobbin.com/flows/c879c167-7f59-4b50-9275-20aa31c7e7be?tab=screens&utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp ; Linear row-action menu with shortcut hints https://mobbin.com/flows/7f57f5f7-6f37-4233-9994-44ecfb5a13e0?tab=screens&utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
Recipe: rows `hover:bg-muted/60` 100ms in, 0ms... keep symmetrical 140ms; row actions `opacity-0 group-hover:opacity-100 group-focus-within:opacity-100`. Focus: `focus-visible:ring-2 ring-brand/40 ring-offset-2 ring-offset-background`, never on mouse click. Links: underline-offset-4 decoration fades in. Inputs: border-color + 3px `ring-brand/15` glow on focus (Stripe), 140ms. Cursor stays default on rows unless clickable.

### 2.12 Empty states and first-run
Cite: Todoist inbox-zero illustrated empty "Enjoy the rest of your day": https://mobbin.com/flows/5c2fb775-e7b4-4fc2-957f-5cff8dd75f40?tab=screens&utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp ; Stripe Home "Get started" checklist card, dismissible, plus dashed "No data" chart panel: https://mobbin.com/flows/545a744c-9b68-4b16-b3ce-25344345c93d?tab=screens&utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp ; Mercury Home onboarding stepper (ticks, current step, "5 min"): https://mobbin.com/flows/273099ab-2d19-4c94-9fdc-1bec9fbc1819?tab=screens&utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp ; Copilot dashed "ADD A NEW TRANSACTION" row: https://mobbin.com/flows/92822164-61f6-4c3b-b36f-f1d0650137ca?tab=screens&utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
Where: every list (dashed border per brief), dashboard first-run checklist (add first entry, set a budget, add a subscription), contractors, LTD.
Recipe: empty = dashed card, one line of mono label, one sentence, one primary CTA, no illustration. Dashboard first-run card with 3 steps; ticks draw with stroke-dashoffset (2.8), progress persisted, dismiss with X (`localStorage` ok, or DB). Empty chart renders the real axes with dashed grid + "No data yet", not a blank hole (Stripe).

### 2.13 Command palette / shortcuts
Cite: Linear Keyboard shortcuts panel (Cmd+K, G then X, `?`): https://mobbin.com/flows/239089b5-97e5-4698-af22-ae79d337538c?tab=screens&utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp ; Stripe trigger-search popover with category chips + highlighted row: https://mobbin.com/screens/f61e5fd1-51da-4bd3-91e4-e9e2595fdc11?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp ; Mercury "Search or jump to" Cmd+K field: https://mobbin.com/flows/733d05a9-5416-4a31-a848-5370137e7277?tab=screens&utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp
Where: desktop only. Cmd/Ctrl+K palette (jump to page, add expense, search transactions); `N` new entry; `G` then `T/S/B/R` go-to; `?` cheat sheet; `/` focus search; `Esc` closes.
Recipe: shadcn `Command` (cmdk) is already in the shadcn set, so no new dep. Dialog enter `scale(.98)+opacity` 140ms ease-out, top 20vh, active row `bg-muted` with brand left bar. Show `<kbd>` hints in Geist Mono 11px. Guard shortcuts when focus is in input/textarea/contenteditable. Hide on touch (`@media (pointer:coarse)`).

## 3. UX polish checklist (<=20)
1. Add-entry: open focused on amount, `inputmode="decimal"`, `enterkeyhint="done"`; amount is 48px mono, tabular, cents dimmed until typed (Cash App/Copilot).
2. Add-entry smart defaults: today's date, last-used category + account, type = Expense; one tap on a recent-category chip row; Save reachable above keyboard.
3. Optimistic add/edit/delete everywhere (`useOptimistic` + server action); roll back with an error toast on failure.
4. Undo on every destructive action (2.5); no confirm dialogs for reversible deletes. Confirm dialog only for account/data wipe in settings.
5. Draft autosave of the add-entry drawer in `sessionStorage` (try/catch); restore on reopen, clear on Save; discard on explicit close only after 2s of inactivity guard.
6. Drawer focus management: trap, return focus to the Add button on close, Esc/drag/backdrop all dismiss; `aria-modal`, scroll lock without layout jump (`scrollbar-gutter:stable`).
7. Dismiss guard: if the draft has an amount, backdrop-tap shakes/rubber-bands the sheet instead of discarding.
8. Dashboard: count-up hero once per session, delta chip `▲ 12.4%`, skeleton to content; tapping a card deep-links to the pre-filtered list.
9. Transactions: sticky date-group headers (`sticky top-0 bg-background/80 backdrop-blur`), search + filter chips (Stripe), swipe actions, virtualise only >300 rows.
10. Transactions: group totals right-aligned per day; row tap opens a detail sheet (Wallet detail pattern: big amount, meta, category picker, delete).
11. Subscriptions: "next bill in Nd" mono tag, amber at <=3 days; pause/resume toggle is optimistic with a switch thumb slide (140ms).
12. Lifetime deals: show payback/"saved" figure as the hero number; status tag `OWNED`/`WISHLIST`; empty state explains LTD in one line.
13. Contractors: payout history as a Mercury-style table on desktop, stacked rows on mobile; "Mark paid" gets the check morph + undo.
14. Reports: segmented range with sliding indicator (2.10), chart bars grow from 0 once (`scaleY` 360ms, stagger 20ms), tooltip follows pointer with 80ms lag-free (no transition on position).
15. Budgets: progress bar width animates on value change (transform `scaleX`, not width); colour shifts at 80% (warn) and 100% (out); inline edit of the limit on tap.
16. Settings: auto-save toggles with a tiny "Saved" mono confirmation (fades in 140ms, out after 1.5s); no global Save button.
17. Sign-in: autofill-friendly (`autocomplete="email"`, `current-password`), `inputmode="email"`, button pending state locks width, error shakes field once (`translateX` +-4px, 240ms) and sets `aria-invalid` + focuses it; Enter submits.
18. Page transitions: `@view-transition{navigation:auto}` + 200ms crossfade of main only; keep tab bar named (`view-transition-name:tabbar`) so it does not flicker. Preserve scroll per tab.
19. Haptics: `navigator.vibrate?.(8-10)` on swipe commit, save, delete (Android only; iOS Safari ignores it, so never rely on it for feedback; visuals carry the meaning).
20. Reduced motion + perf: all of the above collapse through the tokens; test with `prefers-reduced-motion`; no motion on first paint of the sign-in page; avoid `transition:all`.

## 4. Visual refinements (hybrid type)
Type: Geist Sans for UI text and headings; Geist Mono (slashed zero, `tabular-nums`) for money, dates in tags, 11px uppercase labels, kbd hints. Hero number 40px mono `tracking-tight`, cents 0.6em superscript-ish in muted (Mercury). Sans body 14-15px, labels sans 13px medium (Apple/Stripe use sans for labels; keep mono only for the tiny caps).
Radius scale (grow back from 6px): `--radius:.625rem` (10px) base. xs 4 (tags, kbd) / sm 6 (chips, inputs inside dense tables) / md 8 (buttons, inputs) / lg 12 (cards) / xl 16 (hero card, popovers) / sheet top 20 / Add button 16 (squircle-ish; keep square-ish, not circle) / pills only for segmented control track + toast. Nested radius rule: inner = outer - padding.
Surface hierarchy (3 levels, light): L0 page `#f6f7f9`-ish tinted neutral; L1 card white; L2 popover/sheet white + stronger shadow. Dark: L0 near-black, L1 +4% lightness, L2 +8%, separated by 1px `white/8` border rather than shadow. Grouped lists (Apple Wallet) = one white rounded-xl container with hairline dividers inset 16px, not separate cards per row.
Border vs shadow: cards = 1px border `black/6` PLUS shadow-1 (both, Stripe style, border sharpens the edge, shadow gives lift); table rows and dividers = border only; inputs = border only, focus adds ring; popovers/sheets/toasts = shadow-2/3 + hairline. Drops the "no shadows" OVERRIDE rule except for flat table/list areas.
Shadows (layered, low-alpha, blue-grey tint like Stripe; use as `--shadow-*`):
```css
--shadow-1:0 0 0 1px rgb(15 23 42/.05),0 1px 1px rgb(15 23 42/.04),0 2px 4px -1px rgb(15 23 42/.05);
--shadow-2:0 0 0 1px rgb(15 23 42/.06),0 2px 4px rgb(15 23 42/.05),0 8px 16px -4px rgb(15 23 42/.08);
--shadow-3:0 0 0 1px rgb(15 23 42/.06),0 4px 8px rgb(15 23 42/.06),0 16px 32px -8px rgb(15 23 42/.14),0 32px 64px -16px rgb(15 23 42/.12);
--shadow-inset:inset 0 1px 0 rgb(255 255 255/.6);  /* top highlight on primary buttons */
```
Dark mode: replace shadows with `0 0 0 1px rgb(255 255 255/.08)` + `0 8px 24px rgb(0 0 0/.5)` only on overlays. Primary button: brand fill + `shadow-inset` + `0 1px 2px rgb(0 0 0/.2)`, hover brightens 4%, active scale .97.
Colour accents: keep indigo `brand` (#5B5BD6-ish) for focus/active/primary only; money-in a calmer green (#12915f / dark #3ecf8e), money-out/over a muted red (#d64545), warn amber (#c77d0a). Soft tag backgrounds at 10-12% of the hue with 100% text (Stripe "Succeeded/Failed" pills: https://mobbin.com/flows/c879c167-7f59-4b50-9275-20aa31c7e7be?tab=screens&utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp ). Category colours: 8 desaturated hues, used as 6px dots plus tinted tag, not full-bleed icon tiles. Optional single soft radial brand glow behind the dashboard hero (Copilot header gradient: https://mobbin.com/flows/a90d6aef-b871-4b5b-94b8-2e8797c90e5c?tab=screens&utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp ), 8% opacity, hero only.
Frosted bars: mobile tab bar + sticky headers `bg-background/80 backdrop-blur-md` + hairline top border (Apple Wallet/Todoist floating pill bar: https://mobbin.com/flows/75508f3a-1e8a-4c94-bdaf-2584f4e80f55?tab=screens&utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp ).
Dep verdict overall: zero new deps. Optional: `@number-flow/react` only if the 35-line roller proves fiddly; `sonner` only if not already present.
