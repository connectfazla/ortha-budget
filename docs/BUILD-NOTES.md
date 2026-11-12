# Build notes for agents (read fully before coding)

App: Ortha Budget. A mobile-first budget tracker for an agency. Next.js 16.4 (App Router, `src/`), React 19.3, Tailwind v4, shadcn v4 on **Base UI** (not Radix), Supabase.

## Must-read
- `docs/DESIGN-BRIEF.md`: the Mobbin-grounded layout per screen, plus the **OVERRIDE section at the bottom (tech-ish, mono), which wins on visuals**. Cite the brief's ref keys (e.g. [CP-TX]) in your final report for every screen you build.
- `AGENTS.md`: Next 16 has breaking changes. Check `node_modules/next/dist/docs/` before using any Next API you're unsure of. For example, `middleware` is now `src/proxy.ts`, and `params`/`searchParams` are Promises (`await props.searchParams`).
- `src/lib/types.ts`, `src/lib/money.ts`, `src/lib/data.ts` (server queries), `src/lib/actions.ts` (server actions, return `{ok:true}|{ok:false,error}`) and `supabase/schema.sql`. **Do not edit these files.** If you truly need a new query or action, put it in your own file (e.g. `src/lib/<area>-data.ts`) and mention it in your report.

## Conventions
- Pages are async Server Components. Call `await requireUser()` first, fetch with `src/lib/data.ts`, and pass plain data to client components. Mutations call server actions from client components via `useTransition`, then `toast.success`/`toast.error` (sonner, `import { toast } from "sonner"`). Actions already call `revalidatePath`.
- Base UI API: there is no `asChild`. Use the `render` prop, e.g. `<Button render={<Link href="/x" />}>Go</Button>` and `<DrawerTrigger render={children} />`. Read the component file in `src/components/ui/` before using it.
- Mobile-first at 390px with a 16px gutter. Desktop from `lg:` (1024px). Drawers: `src/components/ui/drawer.tsx` (Base UI Drawer, swipe down) on mobile. On desktop either the same drawer or `Sheet side="right"`. Keep it simple: the same Drawer on both is fine.
- Use the shared components: `<Money value currency direction />` (`src/components/money.tsx`), `<PageHeader title subtitle actions />` (`src/components/shell/page-header.tsx`), `<PlansNav />` (`src/components/shell/plans-nav.tsx`) at the top of /subscriptions, /lifetime and /contractors. Use `<AddEntryDrawer contractors categories defaultKind? transaction?>{trigger}</AddEntryDrawer>` (`src/components/entry/add-entry-drawer.tsx`) for creating or editing any transaction, including lifetime deals and contractor payouts.
- Colours: tokens only (`text-money-in`, `text-money-out`, `text-warn`, `text-brand`, `bg-card`, `border-border`, `text-muted-foreground`). No hex in components. Every amount gets a sign or text label, never colour alone.
- Inputs: amounts use `inputMode="decimal"`, dates use native `<input type="date">`. Hit targets ≥44px on mobile. Every icon-only button needs an `aria-label`.
- Empty states matter: the DB starts empty. Every list needs a dashed-border empty state with one clear CTA.
- Icons: `lucide-react`.
- Lazy and correct: no new dependencies, no abstractions with one user, no speculative props. A `ponytail:` comment marks a deliberate corner cut.
- Never run `next build` and never start `next dev` (the coordinator runs it). Never commit. Check with `npx tsc --noEmit` and `npm run lint`. Both must pass for your files before you report.
- Stay inside the files you own (listed in your task). If you need a change in someone else's file, say so in your report instead of editing it.

## Routes
Mobile bottom bar: Home `/` · Activity `/transactions` · [Add] · Plans `/subscriptions` (with PlansNav to `/lifetime` and `/contractors`) · Reports `/reports` (with a link or tab to `/budgets`).
Desktop sidebar: Home, Transactions, Subscriptions, Lifetime deals, Contractors, Reports, Budgets, then Settings at the bottom.
All app pages live in `src/app/(app)/…`. `src/app/(app)/layout.tsx` (the shell) wraps them. `/login` sits outside the group.
