"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const config = {
  inUsd: { label: "In", color: "var(--chart-in)" },
  outUsd: { label: "Out", color: "var(--chart-out)" },
} satisfies ChartConfig;

const tick = { fontSize: 10, fontFamily: "var(--font-mono)", fill: "var(--muted-foreground)" };

export function CashChart({ data }: { data: { month: string; label: string; inUsd: number; outUsd: number }[] }) {
  return (
    <ChartContainer config={config} className="h-52 w-full">
      <BarChart data={data} barGap={2} margin={{ left: 0, right: 4, top: 4 }}>
        <CartesianGrid vertical={false} strokeDasharray="2 4" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={tick} tickMargin={8} />
        <YAxis
          width={40}
          tickLine={false}
          axisLine={false}
          tick={tick}
          tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v))}
        />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        <Bar dataKey="inUsd" fill="var(--color-inUsd)" radius={2} maxBarSize={14} />
        <Bar dataKey="outUsd" fill="var(--color-outUsd)" radius={2} maxBarSize={14} />
      </BarChart>
    </ChartContainer>
  );
}
