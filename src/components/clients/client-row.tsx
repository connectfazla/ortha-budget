import Link from "next/link";
import { Money } from "@/components/money";
import type { Client } from "@/lib/types";
import { cn } from "@/lib/utils";

export const CLIENT_FALLBACK = "var(--muted-foreground)";

export function Swatch({ color, className }: { color: string | null; className?: string }) {
  return <span aria-hidden className={cn("size-3 shrink-0 rounded-full", className)} style={{ background: color ?? CLIENT_FALLBACK }} />;
}

export function Margin({ value, className }: { value: number; className?: string }) {
  return <Money value={value} className={cn(value < 0 ? "text-money-out" : value > 0 ? "text-money-in" : "", className)} />;
}

/** One client: name left, margin right, in and out underneath. A separate column set shows at lg. */
export function ClientRow({ client, inUsd, outUsd, marginUsd }: { client: Client; inUsd: number; outUsd: number; marginUsd: number }) {
  return (
    <li>
      <Link
        href={`/clients/${client.id}`}
        className="press hover:bg-muted/50 focus-visible:ring-ring/50 grid min-h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-3 py-2.5 outline-none focus-visible:ring-3 focus-visible:ring-inset lg:grid-cols-[auto_minmax(0,1fr)_7rem_7rem_8rem]"
      >
        <Swatch color={client.color} />
        <span className="truncate text-sm font-medium">{client.name}</span>
        <Margin value={marginUsd} className="col-start-3 row-start-1 text-sm font-medium lg:col-start-5 lg:text-right" />
        <span className="text-muted-foreground col-span-2 col-start-2 flex gap-4 text-xs tabular-nums lg:contents">
          <span className="lg:col-start-3 lg:row-start-1 lg:text-right">
            <span className="lg:sr-only">In </span>
            <Money value={inUsd} hideCents />
          </span>
          <span className="lg:col-start-4 lg:row-start-1 lg:text-right">
            <span className="lg:sr-only">Out </span>
            <Money value={outUsd} hideCents />
          </span>
        </span>
      </Link>
    </li>
  );
}
