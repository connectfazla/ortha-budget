import "./landing.css";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Money } from "@/components/money";
import { ClientsShot, HomeShot, PlansShot } from "@/components/landing/product";

const REPO = "https://github.com/connectfazla/ortha-budget";

const WRAP = "mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-10";
const BTN =
  "inline-flex h-12 items-center justify-center whitespace-nowrap rounded-lg px-6 text-[15px] font-medium transition-[transform,background-color,color] duration-150 ease-out landing-press motion-reduce:transition-none max-sm:w-full";
const PRIMARY = `${BTN} bg-brand text-primary-foreground hover:bg-brand/90`;
const SECONDARY = `${BTN} border bg-card text-foreground hover:bg-muted`;
const TEXT_LINK = "rounded-sm text-muted-foreground transition-colors duration-150 hover:text-foreground motion-reduce:transition-none";
const H2 = "min-w-0 text-[clamp(2rem,4vw,3rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-balance [overflow-wrap:break-word]";
const LEDE = "text-muted-foreground text-lg leading-relaxed text-pretty";

/** The six transaction kinds the app stores, each with a sample entry. Amounts are samples, never claims. */
const KINDS = [
  { kind: "Subscription", example: "Hosting, monthly", value: 20, currency: "USD", note: "Next renewal date and yearly cost" },
  { kind: "Lifetime deal", example: "Icon library, paid once", value: 299, currency: "USD", note: "Months until it pays for itself" },
  { kind: "Contractor", example: "Developer, paid in euros", value: 1200, currency: "EUR", note: "Converted to USD at a rate you can edit" },
  { kind: "One-time", example: "Conference ticket", value: 400, currency: "USD", note: "Logged on the day, no schedule" },
  { kind: "Expense", example: "Coworking day pass", value: 25, currency: "GBP", note: "Counted against its category budget" },
  { kind: "Income", example: "Retainer from a client", value: 3000, currency: "USD", note: "Tagged to the client for profit", in: true },
];

export function Welcome() {
  return (
    <div className="landing bg-background text-foreground min-h-dvh">
      <header className={`${WRAP} flex h-14 items-center justify-between lg:h-16`}>
        <Link href="/welcome" aria-label="Ortha Budget home" className="rounded-sm">
          <Logo />
        </Link>
        <nav className="flex items-center gap-6 text-[15px]">
          <a href={REPO} className={`${TEXT_LINK} max-sm:hidden`}>
            GitHub
          </a>
          <Link href="/sign-in" className={TEXT_LINK}>
            Sign in
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero. Phones: the home screen on top, cropped by the fold, then the head and the actions, like an app's welcome screen. */}
        <section className={`${WRAP} flex min-h-[calc(100svh-3.5rem)] flex-col pb-6 lg:grid lg:min-h-0 lg:grid-cols-12 lg:items-center lg:gap-10 lg:pt-10 lg:pb-24`}>
          <div className="landing-peek landing-rise flex min-h-40 flex-1 justify-center overflow-hidden pt-2 lg:order-last lg:col-span-5 lg:col-start-8 lg:overflow-visible lg:pt-0" style={{ "--i": 2 } as React.CSSProperties}>
            <HomeShot className="shrink-0 shadow-sm" />
          </div>
          <div className="pt-6 lg:col-span-6 lg:pt-0">
            <h1 className="landing-rise max-w-[13ch] min-w-0 text-[clamp(2.5rem,6vw,4.75rem)] leading-[1.02] font-semibold tracking-[-0.04em] text-balance [overflow-wrap:break-word]">
              A pocket ledger for your agency.
            </h1>
            <p className={`landing-rise mt-4 max-w-[36ch] lg:mt-6 ${LEDE}`} style={{ "--i": 1 } as React.CSSProperties}>
              Track tools, retainers, contractor pay and profit per client, in any currency.
            </p>
            <div className="landing-rise mt-6 flex flex-col gap-3 sm:flex-row lg:mt-10" style={{ "--i": 1 } as React.CSSProperties}>
              <Link href="/sign-up" className={PRIMARY}>
                Create account
              </Link>
              <a href={REPO} className={SECONDARY}>
                View on GitHub
              </a>
            </div>
          </div>
        </section>

        {/* Renewals and the calendar feed. */}
        <section className={`${WRAP} grid items-center gap-12 py-24 lg:grid-cols-12 lg:gap-10 lg:py-32`}>
          <div className="lg:col-span-5">
            <h2 className={`${H2} max-w-[16ch]`}>Every renewal, before it bills you</h2>
            <p className={`mt-5 max-w-[42ch] ${LEDE}`}>
              Each subscription keeps its next due date and its yearly cost. Turn on the calendar feed and renewals sit in
              your calendar beside your meetings.
            </p>
          </div>
          <div className="flex justify-center lg:col-span-6 lg:col-start-7">
            <PlansShot className="shadow-sm" />
          </div>
        </section>

        {/* The ledger itself: one row per kind of entry. Change of paper marks the seam. */}
        <section className="bg-card border-y">
          <div className={`${WRAP} grid gap-10 py-24 lg:grid-cols-12 lg:py-32`}>
            <div className="lg:col-span-4">
              <h2 className={`${H2} max-w-[12ch]`}>Six kinds of entry, one ledger</h2>
              <p className={`mt-5 max-w-[34ch] ${LEDE}`}>Each entry keeps its own currency.</p>
            </div>
            <table className="w-full min-w-0 text-left text-[15px] lg:col-span-8">
              <thead className="text-muted-foreground text-sm max-sm:sr-only">
                <tr>
                  <th className="pr-6 pb-3 font-normal">Kind</th>
                  <th className="pr-6 pb-3 font-normal">Example</th>
                  <th className="pr-6 pb-3 text-right font-normal">Amount</th>
                  <th className="pb-3 font-normal">What you see</th>
                </tr>
              </thead>
              <tbody>
                {KINDS.map((k) => (
                  <tr key={k.kind} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 border-t py-4 sm:table-row sm:py-0">
                    <th scope="row" className="font-medium sm:py-4 sm:pr-6">
                      {k.kind}
                    </th>
                    <td className="text-muted-foreground col-start-1 sm:py-4 sm:pr-6">{k.example}</td>
                    <td className="col-start-2 row-start-1 text-right sm:py-4 sm:pr-6">
                      <Money value={k.value} currency={k.currency} direction={k.in ? "in" : "out"} />
                    </td>
                    <td className="text-muted-foreground col-span-2 sm:py-4">{k.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Profit per client and the forecast. Head left, line right, the report across. */}
        <section className={`${WRAP} py-24 lg:py-32`}>
          <div className="grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-10">
            <h2 className={`${H2} max-w-[14ch] lg:col-span-6`}>Which clients make you money</h2>
            <p className={`max-w-[44ch] lg:col-span-6 ${LEDE}`}>
              Tag income and costs with a client to see the margin on each. The forecast adds up renewals and retainers due
              in the next 30, 60 and 90 days.
            </p>
          </div>
          <ClientsShot className="mt-12 shadow-sm lg:mt-16" />
        </section>

        {/* Private by design, open source. The real policy from supabase/schema.sql. */}
        <section className="border-t">
          <div className={`${WRAP} grid gap-12 py-24 lg:grid-cols-12 lg:gap-10 lg:py-32`}>
            <div className="lg:col-span-5">
              <h2 className={`${H2} max-w-[14ch]`}>Only you can read your rows</h2>
              <p className={`mt-5 max-w-[42ch] ${LEDE}`}>
                Postgres row-level security checks every query against your session. The app holds no admin key, so a
                bug in its code can’t reach another account.
              </p>
            </div>
            <div className="grid min-w-0 gap-10 lg:col-span-6 lg:col-start-7">
              <figure className="bg-card min-w-0 overflow-hidden rounded-xl border">
                <figcaption className="text-muted-foreground border-b px-4 py-2.5 text-sm">supabase/schema.sql</figcaption>
                <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-6">
                  <code>{`create policy own_transactions on transactions
  for all to authenticated
  using (user_id = ((select auth.jwt()) ->> 'sub'));`}</code>
                </pre>
              </figure>
              <div>
                <h3 className="text-xl font-semibold tracking-tight">Run it on your own accounts</h3>
                <p className="text-muted-foreground mt-2 max-w-[48ch] leading-relaxed text-pretty">
                  MIT licensed. Bring a Clerk app, a Supabase project and a Vercel account, then follow the four steps in
                  the README.
                </p>
                <a href={`${REPO}#self-host`} className={`${TEXT_LINK} text-foreground mt-4 inline-block underline underline-offset-4`}>
                  Read the self-host guide
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Close: the hero's action again. */}
        <section className="bg-card border-y">
          <div className={`${WRAP} flex flex-col items-start gap-8 py-20 lg:flex-row lg:items-center lg:justify-between lg:py-24`}>
            <h2 className={H2}>Start with one subscription.</h2>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link href="/sign-up" className={PRIMARY}>
                Create account
              </Link>
              <Link href="/sign-in" className={SECONDARY}>
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className={`${WRAP} flex flex-col gap-4 py-10 text-[15px] sm:flex-row sm:items-center sm:justify-between`}>
        <Logo />
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <a href={REPO} className={TEXT_LINK}>
            GitHub
          </a>
          <a href={`${REPO}/blob/main/LICENSE`} className={TEXT_LINK}>
            MIT License
          </a>
          <Link href="/sign-in" className={TEXT_LINK}>
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
