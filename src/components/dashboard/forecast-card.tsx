"use client";

import { useState } from "react";
import { Money } from "@/components/money";
import { cn } from "@/lib/utils";

type Item = { id: string; name: string; date: string; direction: "in" | "out"; amountUsd: number };
const WINDOWS = [30, 60, 90] as const;

const fmt = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** Items cover the 90-day horizon; each window filters by its cutoff date, so no refetch. */
export function ForecastCard({ items, today, cutoffs }: { items: Item[]; today: string; cutoffs: Record<number, string> }) {
  const [days, setDays] = useState<(typeof WINDOWS)[number]>(30);
  const inWindow = items.filter((i) => i.date <= cutoffs[days]);
  const inUsd = inWindow.filter((i) => i.direction === "in").reduce((a, i) => a + i.amountUsd, 0);
  const outUsd = inWindow.filter((i) => i.direction === "out").reduce((a, i) => a + i.amountUsd, 0);
  const net = inUsd - outUsd;
  const next = inWindow.slice(0, 5);

  return (
    <section className="bg-card shadow-card rounded-xl border p-4" aria-label="Forecast">
      <div className="flex items-center justify-between gap-3">
        <h2 className="label">Coming up</h2>
        <div role="radiogroup" aria-label="Forecast window" className="bg-muted grid grid-cols-3 gap-0.5 rounded-lg p-0.5">
          {WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              role="radio"
              aria-checked={days === w}
              onClick={() => setDays(w)}
              className={cn(
                "press focus-visible:ring-ring/50 h-8 min-w-12 rounded-md px-2 text-xs font-medium transition-colors focus-visible:ring-2 disabled:opacity-50 active:opacity-80",
                days === w ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {w} days
            </button>
          ))}
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-3">
        <div className="min-w-0">
          <dt className="label">Money in</dt>
          <dd className="mt-1 text-base font-medium"><Money value={inUsd} direction="in" hideCents /></dd>
        </div>
        <div className="min-w-0">
          <dt className="label">Money out</dt>
          <dd className="mt-1 text-base font-medium"><Money value={outUsd} direction="out" hideCents /></dd>
        </div>
        <div className="min-w-0">
          <dt className="label">Net</dt>
          <dd className={cn("mt-1 text-base font-medium", net < 0 && "text-money-out")}><Money value={net} hideCents /></dd>
        </div>
      </dl>
      {next.length === 0 ? (
        <p className="text-muted-foreground mt-4 rounded-lg border border-dashed p-4 text-center text-sm">Nothing scheduled in the next {days} days.</p>
      ) : (
        <ul className="mt-4 divide-y border-t">
          {next.map((i, n) => (
            <li key={`${i.id}-${n}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="truncate">{i.name}</p>
                <p className={cn("text-xs", i.date <= today ? "text-warn" : "text-muted-foreground")}>
                  {i.date === today ? "Due today" : fmt(i.date)}
                </p>
              </div>
              <Money value={i.amountUsd} direction={i.direction} className="shrink-0 text-[13px]" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
