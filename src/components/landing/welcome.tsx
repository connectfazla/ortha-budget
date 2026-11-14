import "./landing.css";
import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Money } from "@/components/money";
import { IPhone } from "@/components/landing/iphone";
import { ThemeToggle } from "@/components/landing/theme-toggle";

const REPO = "https://github.com/connectfazla/ortha-budget";
const STUDIO = "https://ortha.studio";
const DEV = "https://fazla.dev";

const WRAP = "mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-10";
const BTN =
  "inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-6 text-[15px] font-medium transition-[transform,background-color,color] duration-150 ease-out landing-press motion-reduce:transition-none max-sm:w-full";
/** The one primary, and the page's one solid colour: Revolut blue (hero and closing band). */
const PRIMARY = `${BTN} bg-(--cta) text-white hover:bg-(--cta-hover)`;
/** Outline: hairline from --input and a --muted hover, which the black band re-declares. */
const SECONDARY = `${BTN} border border-input text-foreground hover:bg-muted`;
const TEXT_LINK = "shrink-0 whitespace-nowrap mr-4 rounded-sm text-muted-foreground transition-colors duration-150 hover:text-brand motion-reduce:transition-none";
const INK_LINK =
  "rounded-sm font-medium text-foreground underline decoration-foreground/25 decoration-1 underline-offset-4 transition-colors duration-150 hover:text-brand hover:decoration-brand motion-reduce:transition-none";
const H2 = "min-w-0 text-[clamp(2rem,4vw,3rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-balance [overflow-wrap:break-word]";
const LEDE = "text-muted-foreground text-lg leading-relaxed text-pretty";

/** The six transaction kinds the app stores, each with a sample entry. Amounts are samples, never claims. */
const KINDS = [
  { kind: "Subscription", example: "Hosting, monthly", value: 20, currency: "USD", note: "Next renewal date and yearly cost" },
  { kind: "Lifetime deal", example: "Icon library, paid once", value: 299, currency: "USD", note: "Months until it pays for itself" },
  { kind: "Contractor", example: "Developer, paid in euros", value: 1200, currency: "EUR", note: "Converted to your base currency at a rate you can edit" },
  { kind: "One-time", example: "Conference ticket", value: 400, currency: "USD", note: "Logged on the day, no schedule" },
  { kind: "Expense", example: "Coworking day pass", value: 25, currency: "GBP", note: "Counted against its category budget" },
  { kind: "Income", example: "Retainer from a client", value: 3000, currency: "USD", note: "Tagged to the client for profit", in: true },
];

/** The colophon, set as ledger rows: who made it and on what terms. */
const CREDITS = [
  { label: "License", href: `${REPO}/blob/main/LICENSE`, text: "MIT License", note: "Use it, change it and ship it. Keep the copyright notice." },
  { label: "Source code", href: REPO, text: "connectfazla/ortha-budget", mono: true, note: "Next.js, Supabase and Postgres row-level security." },
  { label: "Self-host", href: `${REPO}#self-host`, text: "Read the self-host guide", note: "Bring a Supabase project and a Vercel account, then follow the four steps in the README." },
  { label: "Made by", href: STUDIO, text: "Ortha Studio", note: "A design and engineering studio." },
  { label: "Developed by", href: DEV, text: "fazla.dev" },
];

export function Welcome() {
  return (
    <div className="landing bg-background text-foreground min-h-dvh">
      {/* Nav and hero on plain paper. The only colour is the glow behind the phone [Revolut iOS Home]. */}
      <div className="relative isolate overflow-x-clip">
        <header className={`${WRAP} flex h-14 items-center justify-between pt-[env(safe-area-inset-top)] box-content lg:h-16`}>
          <Link href="/welcome" aria-label="Budget Ortha home" className="rounded-sm">
            <Logo />
          </Link>
          <nav className="flex items-center gap-6 text-[15px]">
            <a href={REPO} rel="noopener" className={`${TEXT_LINK} max-sm:hidden`}>
              GitHub
            </a>
            <Link href="/sign-in" className={TEXT_LINK}>
              Sign in
            </Link>
          </nav>
        </header>

        {/* Hero. Phones: the home screen on top, cropped by the fold, then the head and the actions, like an app's welcome screen. */}
        <section className={`${WRAP} flex h-[calc(100svh-3.5rem)] min-h-[560px] flex-col pb-8 lg:grid lg:h-auto lg:min-h-0 lg:grid-cols-12 lg:items-center lg:gap-10 lg:pt-10 lg:pb-0`}>
          <div className="relative flex min-h-40 flex-1 lg:order-last lg:col-span-5 lg:col-start-8 lg:-mb-40">
            <div aria-hidden className="landing-glow" />
            <div className="landing-peek landing-rise flex flex-1 justify-center overflow-hidden pt-2 lg:overflow-visible lg:pt-0" style={{ "--i": 2 } as React.CSSProperties}>
              <IPhone
                hero
                src="/landing/home.png"
                alt="Budget Ortha home screen on an iPhone: $487 net in November, money in and out, and the payments coming up in the next 30 days"
                sizes="(min-width: 1024px) 315px, 278px"
                className="w-[300px] shrink-0 lg:w-[340px]"
              />
            </div>
          </div>
          <div className="pt-4 lg:col-span-6 lg:pt-0 lg:pb-40">
            <h1 className="landing-rise max-w-[13ch] min-w-0 text-[clamp(2.25rem,6vw,4.75rem)] leading-[1.02] font-semibold tracking-[-0.04em] text-balance [overflow-wrap:break-word]">
              A pocket ledger for your agency.
            </h1>
            <p className={`landing-rise mt-4 max-w-[36ch] lg:mt-6 ${LEDE}`} style={{ "--i": 1 } as React.CSSProperties}>
              Track tools, retainers, contractor pay and profit per client, in any currency.
            </p>
            <div className="landing-rise mt-6 flex flex-col gap-3 sm:flex-row lg:mt-10" style={{ "--i": 1 } as React.CSSProperties}>
              <Link href="/sign-up" className={PRIMARY}>
                Create account
              </Link>
              <a href={REPO} rel="noopener" className={SECONDARY}>
                View on GitHub
              </a>
            </div>
          </div>
        </section>
      </div>

      <main>
        {/* Renewals and the calendar feed. Phone left, so it doesn't stack under the hero's. */}
        <section className={`${WRAP} grid items-center gap-12 py-24 lg:grid-cols-12 lg:gap-10 lg:pt-56 lg:pb-32`}>
          <div className="lg:col-span-5 lg:col-start-8">
            <h2 className={`${H2} max-w-[16ch]`}>Every renewal, before it bills you</h2>
            <p className={`mt-5 max-w-[42ch] ${LEDE}`}>
              Each subscription keeps its next due date and its yearly cost. Turn on the calendar feed and renewals sit in
              your calendar beside your meetings.
            </p>
          </div>
          <div className="flex justify-center lg:order-first lg:col-span-6">
            <IPhone
              src="/landing/subscriptions.png"
              alt="Subscriptions screen on an iPhone: $89 a month in tools, a Notion trial ending Nov 18 and Figma due in 3 days"
              sizes="278px"
              className="w-[300px]"
            />
          </div>
        </section>

        {/* The ledger itself: one row per kind of entry. */}
        <section className="border-t">
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
          <IPhone
            src="/landing/clients.png"
            alt="A client's page on an iPhone: Acme Co with a $4,300 margin this year, its monthly retainer and its transactions"
            sizes="278px"
            className="mx-auto mt-12 w-[300px] lg:hidden"
          />
          <figure className="landing-shot mt-16 overflow-hidden rounded-2xl max-lg:hidden">
            <Image
              src="/landing/reports-desktop.png"
              alt="Reports screen on a desktop: cash flow for six months, spending by category, and income, costs and margin by client"
              width={2880}
              height={1576}
              sizes="(min-width: 1200px) 1120px, calc(100vw - 80px)"
              className="h-auto w-full"
            />
          </figure>
        </section>

        {/* Private by design. The real policy from supabase/schema.sql. */}
        <section className="border-t">
          <div className={`${WRAP} grid gap-12 py-24 lg:grid-cols-12 lg:items-center lg:gap-10 lg:py-32`}>
            <div className="lg:col-span-5">
              <h2 className={`${H2} max-w-[14ch]`}>Only you can read your rows</h2>
              <p className={`mt-5 max-w-[42ch] ${LEDE}`}>
                Postgres row-level security checks every query against your session. The app holds no admin key, so a
                bug in its code can’t reach another account.
              </p>
            </div>
            <figure className="bg-card min-w-0 overflow-hidden rounded-xl border lg:col-span-6 lg:col-start-7">
              <figcaption className="text-muted-foreground border-b px-4 py-2.5 text-sm">supabase/schema.sql</figcaption>
              <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-6">
                <code>{`create policy own_transactions on transactions
  for all to authenticated
  using (user_id = ((select auth.jwt()) ->> 'sub'));`}</code>
              </pre>
            </figure>
          </div>
        </section>

        {/* Open source and credits: the colophon as ledger rows. */}
        <section id="open-source" aria-labelledby="open-source-title" className="border-t">
          <div className={`${WRAP} grid gap-12 py-24 lg:grid-cols-12 lg:gap-10 lg:py-32`}>
            <div className="lg:col-span-5">
              <h2 id="open-source-title" className={`${H2} max-w-[12ch]`}>
                Open source under MIT
              </h2>
              <p className={`mt-5 max-w-[40ch] ${LEDE}`}>
                The code is public on GitHub. Read how it works, run it on your own accounts, or send a fix.
              </p>
              <a href={REPO} rel="noopener" className={`${SECONDARY} mt-8`}>
                <Star aria-hidden className="size-4" />
                Star on GitHub
              </a>
              <p className="text-muted-foreground mt-3 text-sm">A star helps other agencies find it.</p>
            </div>
            <dl className="min-w-0 lg:col-span-6 lg:col-start-7">
              {CREDITS.map((c) => (
                <div key={c.label} className="grid gap-1 border-t py-5 first:border-t-0 first:pt-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6 lg:first:pt-2">
                  <dt className="text-muted-foreground text-[15px]">{c.label}</dt>
                  <dd className="min-w-0">
                    <a href={c.href} rel="noopener" className={`${INK_LINK} text-[17px] ${c.mono ? "font-mono text-[15px] break-all" : ""}`}>
                      {c.text}
                    </a>
                    {c.note ? <p className="text-muted-foreground mt-1.5 text-[15px] leading-relaxed text-pretty">{c.note}</p> : null}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Close: the hero's action again, on the black band. */}
        <section className="landing-close">
          <div className={`${WRAP} flex flex-col items-start gap-8 py-20 lg:flex-row lg:items-center lg:justify-between lg:py-28`}>
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

      <footer className={`${WRAP} py-10 text-[15px]`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <a href={REPO} rel="noopener" className={TEXT_LINK}>
              GitHub
            </a>
            <a href={`${REPO}/blob/main/LICENSE`} rel="noopener" className={TEXT_LINK}>
              MIT License
            </a>
            <Link href="/sign-in" className={TEXT_LINK}>
              Sign in
            </Link>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-5 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground leading-relaxed">
            Made by{" "}
            <a href={STUDIO} rel="noopener" className={INK_LINK}>
              Ortha Studio
            </a>
            . Developed by{" "}
            <a href={DEV} rel="noopener" className={INK_LINK}>
              fazla.dev
            </a>
            .
          </p>
          <div className="flex items-center gap-3">
            <span aria-hidden className="text-muted-foreground text-sm">
              Appearance
            </span>
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </div>
  );
}
