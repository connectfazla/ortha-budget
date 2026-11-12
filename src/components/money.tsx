import { cn } from "@/lib/utils";
import type { Direction } from "@/lib/types";

/**
 * Money value with tabular numerals, symbol and cents at 60% (Monzo/Starling style).
 * Pass `direction` to get the "+" sign and green for money in; outflows stay ink (see docs/DESIGN-BRIEF.md).
 */
export function Money({
  value,
  currency = "USD",
  direction,
  className,
  hideCents,
}: {
  value: number;
  currency?: string;
  direction?: Direction;
  className?: string;
  hideCents?: boolean;
}) {
  const parts = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: hideCents ? 0 : 2,
    maximumFractionDigits: hideCents ? 0 : 2,
  }).formatToParts(Math.abs(value));
  const sign = direction === "in" ? "+" : direction === "out" ? "−" : value < 0 ? "−" : "";
  return (
    <span className={cn("tabular-nums whitespace-nowrap", direction === "in" && "text-money-in", className)}>
      {sign}
      {parts.map((p, i) =>
        p.type === "currency" || p.type === "fraction" || p.type === "decimal" ? (
          <span key={i} className="text-[0.6em] align-[0.35em]">
            {p.value}
          </span>
        ) : (
          <span key={i}>{p.value}</span>
        ),
      )}
    </span>
  );
}
