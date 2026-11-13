"use client";

import { useState } from "react";
import { Money } from "@/components/money";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

type Item = { id: string; name: string; date: string; direction: "in" | "out"; amountUsd: number };
const WINDOWS = [30, 60, 90] as const;

const fmt = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** Items cover the 90-day horizon; each window filters by its cutoff date, so no refetch. */
export function ForecastCard({
  items,
  today,
  cutoffs,
  currency,
}: {
  items: Item[];
  today: string;
  cutoffs: Record<number, string>;
  currency: string;
}) {
  const [days, setDays] = useState<(typeof WINDOWS)[number]>(30);
  const inWindow = items.filter((i) => i.date <= cutoffs[days]);
  const inUsd = inWindow.filter((i) => i.direction === "in").reduce((a, i) => a + i.amountUsd, 0);
  const outUsd = inWindow.filter((i) => i.direction === "out").reduce((a, i) => a + i.amountUsd, 0);
  const net = inUsd - outUsd;
  const next = inWindow.slice(0, 5);

  return (
    <Card>
      <CardHeader className="items-center">
        <CardTitle>
          <h2>Coming up</h2>
        </CardTitle>
        <CardAction>
          <ToggleGroup
            aria-label="Forecast window"
            value={[String(days)]}
            onValueChange={(v) => v[0] && setDays(Number(v[0]) as (typeof WINDOWS)[number])}
            spacing={0}
            className="bg-muted rounded-full"
          >
            {WINDOWS.map((w) => (
              <ToggleGroupItem key={w} value={String(w)} className="text-muted-foreground data-pressed:text-foreground h-8 min-w-14 text-xs font-semibold">
                {w} days
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-3 gap-3">
          <div className="min-w-0">
            <dt className="label">Money in</dt>
            <dd className="mt-1 text-base font-bold"><Money value={inUsd} currency={currency} direction="in" hideCents /></dd>
          </div>
          <div className="min-w-0">
            <dt className="label">Money out</dt>
            <dd className="mt-1 text-base font-bold"><Money value={outUsd} currency={currency} direction="out" hideCents /></dd>
          </div>
          <div className="min-w-0">
            <dt className="label">Net</dt>
            <dd className={cn("mt-1 text-base font-bold", net < 0 && "text-money-out")}><Money value={net} currency={currency} hideCents /></dd>
          </div>
        </dl>
        <Separator className="mt-4 mb-1" />
        {next.length === 0 ? (
          <Empty className="p-4">
            <EmptyDescription>Nothing scheduled in the next {days} days.</EmptyDescription>
          </Empty>
        ) : (
          <ItemGroup className="gap-0">
            {next.map((i, n) => (
              <Item key={`${i.id}-${n}`} role="listitem" size="sm" className="rounded-none border-0 px-0">
                <ItemMedia variant="circle" className={cn("text-[15px] font-bold", i.direction === "in" && "bg-money-in/12 text-money-in")} aria-hidden>
                  {i.name.slice(0, 1).toUpperCase()}
                </ItemMedia>
                <ItemContent className="min-w-0 gap-0">
                  <ItemTitle className="w-full truncate text-[15px]">{i.name}</ItemTitle>
                  <ItemDescription className={cn("text-[13px]", i.date <= today && "text-warn")}>
                    {i.date === today ? "Due today" : fmt(i.date)}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Money value={i.amountUsd} currency={currency} direction={i.direction} className="text-[15px] font-semibold" />
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        )}
      </CardContent>
    </Card>
  );
}
