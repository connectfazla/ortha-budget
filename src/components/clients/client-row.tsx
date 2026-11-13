import Link from "next/link";
import { initials } from "@/components/contractors/initials";
import { Money } from "@/components/money";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Item, ItemMedia, ItemTitle } from "@/components/ui/item";
import type { Client } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Client initials on a tint of the client's colour (stored #rrggbb data); ink text keeps contrast for every swatch. */
export function ClientAvatar({ client, size = "sm" }: { client: Pick<Client, "name" | "color">; size?: "sm" | "default" | "lg" }) {
  const c = client.color ?? "var(--muted-foreground)";
  return (
    <Avatar size={size} aria-hidden>
      <AvatarFallback className="text-foreground font-medium" style={{ background: `color-mix(in oklab, ${c} 22%, var(--card))` }}>
        {initials(client.name)}
      </AvatarFallback>
    </Avatar>
  );
}

export function Margin({ value, currency, className }: { value: number; currency: string; className?: string }) {
  return <Money value={value} currency={currency} className={cn(value < 0 ? "text-money-out" : value > 0 ? "text-money-in" : "", className)} />;
}

/** One client: name left, margin right, in and out underneath. A separate column set shows at lg. */
export function ClientRow({
  client,
  inUsd,
  outUsd,
  marginUsd,
  currency,
}: {
  client: Client;
  inUsd: number;
  outUsd: number;
  marginUsd: number;
  currency: string;
}) {
  return (
    <div role="listitem">
      <Item
        render={<Link href={`/clients/${client.id}`} />}
        className="hover:bg-muted/50 active:bg-muted grid min-h-14 grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 rounded-none px-3 py-2.5 focus-visible:ring-inset lg:grid-cols-[auto_minmax(0,1fr)_7rem_7rem_8rem]"
      >
        <ItemMedia className="row-span-2 lg:row-span-1">
          <ClientAvatar client={client} />
        </ItemMedia>
        <ItemTitle className="w-full truncate">{client.name}</ItemTitle>
        <Margin value={marginUsd} currency={currency} className="col-start-3 row-start-1 text-sm font-medium lg:col-start-5 lg:text-right" />
        <span className="text-muted-foreground col-span-2 col-start-2 flex gap-4 text-xs tabular-nums lg:contents">
          <span className="lg:col-start-3 lg:row-start-1 lg:text-right">
            <span className="lg:sr-only">In </span>
            <Money value={inUsd} currency={currency} hideCents />
          </span>
          <span className="lg:col-start-4 lg:row-start-1 lg:text-right">
            <span className="lg:sr-only">Out </span>
            <Money value={outUsd} currency={currency} hideCents />
          </span>
        </span>
      </Item>
    </div>
  );
}
