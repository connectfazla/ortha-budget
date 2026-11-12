import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/brand/logo";
import { Money } from "@/components/money";
import { cn } from "@/lib/utils";

/**
 * A product picture slot. Drop a capture at public/landing/<name>.png and it replaces the built stand-in
 * on the next build (the page is static, so the file check runs once at build time).
 */
function Shot({
  name,
  alt,
  width,
  height,
  sizes,
  className,
  children,
}: {
  name: string;
  alt: string;
  width: number;
  height: number;
  sizes: string;
  className?: string;
  children: ReactNode;
}) {
  const src = `/landing/${name}.png`;
  const captured = fs.existsSync(path.join(process.cwd(), "public", src));
  return (
    <figure
      data-slot={name}
      data-alt={alt}
      data-kind="product"
      className={cn("landing-shot bg-card overflow-hidden rounded-2xl", className)}
      {...(captured ? {} : { role: "img", "aria-label": alt })}
    >
      {captured ? (
        <Image src={src} alt={alt} width={width} height={height} sizes={sizes} className="h-auto w-full" />
      ) : (
        children
      )}
    </figure>
  );
}

const ROW = "flex items-center justify-between gap-3 py-2.5";
const SUB = "text-muted-foreground text-[11px] leading-4";

/** Home at 390 x 844: this month's net, the 30-day forecast and what renews next. Sample values only. */
export function HomeShot({ className }: { className?: string }) {
  return (
    <Shot
      name="home-phone"
      alt="Ortha Budget home screen on a phone: net for the month, the next 30 days and upcoming renewals"
      width={780}
      height={1688}
      sizes="(min-width: 1024px) 300px, 80vw"
      className={cn("aspect-[390/844] w-[300px]", className)}
    >
      <div className="flex h-full flex-col gap-3 p-4 text-[13px] leading-5">
        <div className="flex items-center justify-between pt-1">
          <LogoMark className="size-4" />
          <span className="text-[12px] font-medium">November</span>
          <span className="size-4" />
        </div>
        <div className="pt-2">
          <p className="text-muted-foreground text-[12px]">Net this month</p>
          <Money value={4250} direction="in" className="text-[30px] leading-9 font-medium tracking-tight" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-background rounded-lg p-2.5">
            <p className={SUB}>In</p>
            <Money value={6500} className="text-[14px]" hideCents />
          </div>
          <div className="bg-background rounded-lg p-2.5">
            <p className={SUB}>Out</p>
            <Money value={2250} className="text-[14px]" hideCents />
          </div>
        </div>
        <div className="bg-background rounded-lg p-2.5">
          <div className="flex items-baseline justify-between">
            <p className="text-[12px] font-medium">Next 30 days</p>
            <Money value={2316} direction="in" className="text-[13px]" hideCents />
          </div>
          <div className="bg-border mt-2 flex h-1.5 overflow-hidden rounded-full">
            <span className="bg-money-in w-[72%]" />
            <span className="bg-foreground/70 w-[28%]" />
          </div>
        </div>
        <div>
          <p className="text-[12px] font-medium">Upcoming</p>
          <ul className="divide-border divide-y">
            {[
              { name: "Hosting", when: "Renews Nov 18", v: 20 },
              { name: "Design suite", when: "Renews Nov 20", v: 54.99 },
              { name: "Example Co. retainer", when: "Due Dec 1", v: 3000, in: true },
              { name: "Email platform", when: "Renews Dec 3", v: 29 },
            ].map((r) => (
              <li key={r.name} className={ROW}>
                <span className="min-w-0">
                  <span className="block truncate">{r.name}</span>
                  <span className={SUB}>{r.when}</span>
                </span>
                <Money value={r.v} direction={r.in ? "in" : "out"} className="text-[13px]" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Shot>
  );
}

/** Subscriptions at 390 x 844, yearly view. */
export function PlansShot({ className }: { className?: string }) {
  return (
    <Shot
      name="subscriptions-phone"
      alt="Subscriptions screen on a phone: yearly total and each plan with its next renewal date"
      width={780}
      height={1688}
      sizes="(min-width: 1024px) 300px, 80vw"
      className={cn("aspect-[390/844] w-[300px]", className)}
    >
      <div className="flex h-full flex-col gap-3 p-4 text-[13px] leading-5">
        <p className="pt-1 text-[17px] font-semibold tracking-tight">Subscriptions</p>
        <div className="bg-background grid grid-cols-2 rounded-lg p-0.5 text-center text-[12px]">
          <span className="text-muted-foreground py-1">Monthly</span>
          <span className="bg-card rounded-md py-1 font-medium shadow-sm">Yearly</span>
        </div>
        <div>
          <p className="text-muted-foreground text-[12px]">Tools, per year</p>
          <Money value={1631.88} className="text-[26px] leading-8 font-medium tracking-tight" />
        </div>
        <ul className="divide-border divide-y">
          {[
            { name: "Hosting", when: "Next Nov 18", v: 240 },
            { name: "Design suite", when: "Next Nov 20", v: 659.88 },
            { name: "Email platform", when: "Next Dec 3", v: 348 },
            { name: "Analytics", when: "Next Jan 9", v: 228 },
            { name: "Domain", when: "Next Mar 2", v: 156 },
          ].map((r) => (
            <li key={r.name} className={ROW}>
              <span className="min-w-0">
                <span className="block truncate">{r.name}</span>
                <span className={SUB}>{r.when}</span>
              </span>
              <Money value={r.v} className="text-[13px]" />
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground mt-auto text-[11px]">Calendar feed on</p>
      </div>
    </Shot>
  );
}

/** Reports at 1440 x 900, cropped to profit by client and the forecast. */
export function ClientsShot({ className }: { className?: string }) {
  const rows = [
    { name: "Example Co.", inc: 9000, cost: 2400 },
    { name: "Sample Studio", inc: 4500, cost: 3100 },
    { name: "Demo Labs", inc: 2000, cost: 2600 },
  ];
  return (
    <Shot
      name="clients-desktop"
      alt="Reports screen: income, costs and margin for each client, with the 30, 60 and 90 day forecast"
      width={2880}
      height={1800}
      sizes="(min-width: 1200px) 1120px, 100vw"
      className={cn("w-full", className)}
    >
      <div className="grid gap-6 p-5 text-[14px] leading-5 sm:p-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <div className="flex items-baseline justify-between">
            <p className="font-semibold">Profit by client</p>
            <p className="text-muted-foreground text-[13px]">Last 90 days</p>
          </div>
          <table className="mt-4 w-full text-left">
            <thead className="text-muted-foreground text-[13px]">
              <tr>
                <th className="pb-2 font-normal">Client</th>
                <th className="pb-2 text-right font-normal">Income</th>
                <th className="pb-2 text-right font-normal max-sm:hidden">Costs</th>
                <th className="pb-2 text-right font-normal">Margin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const margin = Math.round(((r.inc - r.cost) / r.inc) * 100);
                return (
                  <tr key={r.name} className="border-t">
                    <td className="py-3">{r.name}</td>
                    <td className="py-3 text-right">
                      <Money value={r.inc} direction="in" hideCents />
                    </td>
                    <td className="py-3 text-right max-sm:hidden">
                      <Money value={r.cost} direction="out" hideCents />
                    </td>
                    <td className={cn("py-3 text-right tabular-nums", margin < 0 && "text-money-out")}>
                      {margin < 0 ? "−" : ""}
                      {Math.abs(margin)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="bg-background min-w-0 rounded-xl p-4">
          <p className="font-semibold">Forecast</p>
          <dl className="mt-3 grid gap-2">
            {[
              { d: "Next 30 days", v: 2316 },
              { d: "Next 60 days", v: 4980 },
              { d: "Next 90 days", v: 7410 },
            ].map((f) => (
              <div key={f.d} className="flex items-baseline justify-between border-t pt-2 first:border-t-0 first:pt-0">
                <dt className="text-muted-foreground">{f.d}</dt>
                <dd>
                  <Money value={f.v} direction="in" hideCents />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Shot>
  );
}
