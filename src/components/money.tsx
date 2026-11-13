import { SecondaryLine } from "@/components/currency/secondary-currency";
import { cn } from "@/lib/utils";
import type { Direction } from "@/lib/types";

const SMALL = new Set(["currency", "fraction", "decimal"]);

/**
 * Money value with tabular numerals, symbol and cents at 60% (Monzo/Starling style).
 * Pass `direction` to get the "+" sign and green for money in; outflows stay ink (see docs/DESIGN-BRIEF.md).
 * `animate` rolls each digit to its value on first paint and on change (docs/MOTION-SPEC.md § 2.1).
 * Pure CSS (`.roll` in globals.css), so it works in Server Components; reduced motion snaps.
 */
export function Money({
  value,
  currency = "USD",
  direction,
  className,
  hideCents,
  animate,
  secondary,
}: {
  value: number;
  currency?: string;
  direction?: Direction;
  className?: string;
  hideCents?: boolean;
  animate?: boolean;
  /** Opt in to the small second-currency line underneath. Block-level, so only pass it where a line break fits. */
  secondary?: boolean;
}) {
  const tail = secondary ? <SecondaryLine value={value} /> : null;
  const parts = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: hideCents ? 0 : 2,
    maximumFractionDigits: hideCents ? 0 : 2,
  }).formatToParts(Math.abs(value));
  const sign = direction === "in" ? "+" : direction === "out" ? "−" : value < 0 ? "−" : "";
  const cls = cn("tabular-nums whitespace-nowrap", direction === "in" && "text-money-in", className);

  if (!animate) {
    return (
      <span className={cls}>
        {sign}
        {parts.map((p, i) =>
          SMALL.has(p.type) ? (
            <span key={i} className="text-[0.6em] align-[0.35em]">
              {p.value}
            </span>
          ) : (
            <span key={i}>{p.value}</span>
          ),
        )}
        {tail}
      </span>
    );
  }

  // One slot per character, keyed from the right so a new leading digit doesn't remount the rest.
  const chars = parts.flatMap((p) => [...p.value].map((c) => ({ c, small: SMALL.has(p.type) })));
  if (sign) chars.unshift({ c: sign, small: false });
  return (
    <span className={cls}>
      <span className="sr-only">{chars.map((x) => x.c).join("")}</span>
      <span aria-hidden>
        {chars.map(({ c, small }, i) => {
          const key = chars.length - i;
          const size = small ? "text-[0.6em] align-[0.35em]" : undefined;
          if (c < "0" || c > "9") {
            return (
              <span key={key} className={size}>
                {c}
              </span>
            );
          }
          return (
            <span key={key} className={cn("roll", size)} style={{ "--d": c } as React.CSSProperties}>
              <span className="roll-ghost">{c}</span>
              <span className="roll-col">
                {"0123456789".split("").map((n) => (
                  <span key={n}>{n}</span>
                ))}
              </span>
            </span>
          );
        })}
      </span>
      {tail}
    </span>
  );
}
