"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatMoney } from "@/lib/money";

const flowConfig = {
  inUsd: { label: "In", color: "var(--chart-in)" },
  outUsd: { label: "Out", color: "var(--chart-out)" },
} satisfies ChartConfig;

const TICK = { fontSize: 10, fontFamily: "var(--font-mono)" };

export function CashflowChart({ data }: { data: { label: string; inUsd: number; outUsd: number }[] }) {
  return (
    <ChartContainer config={flowConfig} className="aspect-auto h-52 w-full">
      <BarChart data={data} barGap={2} margin={{ left: 0, right: 4, top: 4 }}>
        <CartesianGrid strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={TICK} />
        <YAxis tickLine={false} axisLine={false} width={40} tick={TICK} tickFormatter={(v: number) => formatMoney(v, "USD", { compact: true })} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatMoney(Number(v))} />} />
        <Bar dataKey="inUsd" fill="var(--color-inUsd)" radius={1} maxBarSize={10} />
        <Bar dataKey="outUsd" fill="var(--color-outUsd)" radius={1} maxBarSize={10} />
      </BarChart>
    </ChartContainer>
  );
}

export function DonutChart({ slices }: { slices: { name: string; value: number; fill: string }[] }) {
  return (
    <ChartContainer config={{}} className="mx-auto aspect-square h-44">
      <PieChart>
        <Pie data={slices} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="100%" stroke="var(--card)" strokeWidth={2} isAnimationActive={false}>
          {slices.map((s) => (
            <Cell key={s.name} fill={s.fill} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
