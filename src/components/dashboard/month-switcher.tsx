import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { monthKey } from "@/lib/money";

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}

export function monthLabel(month: string, style: "short" | "long" = "long") {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: style, year: style === "long" ? "numeric" : undefined });
}

/**
 * Prev / month / next. `base` is the page path the `?month=` param goes on; the current month drops the param.
 * `hero` renders the frosted pill that sits under the Home balance [Revolut iOS Home "Accounts" pill].
 */
export function MonthSwitcher({ month, base = "/", allowFuture = false, hero = false }: { month: string; base?: string; allowFuture?: boolean; hero?: boolean }) {
  const now = monthKey();
  const href = (m: string) => (m === now ? base : `${base}?month=${m}`);
  if (hero) {
    const canNext = allowFuture || month < now;
    const arrow = "press-strong focus-visible:ring-on-hero/70 grid size-11 place-items-center rounded-full outline-none focus-visible:ring-2 aria-disabled:opacity-40";
    return (
      <div className="hero-glass flex h-11 items-center rounded-full px-0.5 text-sm font-semibold">
        <Link href={href(shiftMonth(month, -1))} aria-label="Previous month" className={arrow}>
          <ChevronLeft className="size-[18px]" aria-hidden />
        </Link>
        <span className="min-w-28 text-center">{monthLabel(month)}</span>
        {canNext ? (
          <Link href={href(shiftMonth(month, 1))} aria-label="Next month" className={arrow}>
            <ChevronRight className="size-[18px]" aria-hidden />
          </Link>
        ) : (
          <span role="link" aria-disabled="true" aria-label="Next month" className={arrow}>
            <ChevronRight className="size-[18px]" aria-hidden />
          </span>
        )}
      </div>
    );
  }
  const step = (delta: -1 | 1, label: string, Icon: typeof ChevronLeft) => (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant="outline" size="icon-lg" className="size-11 lg:size-9" aria-label={label} nativeButton={false} render={<Link href={href(shiftMonth(month, delta))} />} />}
      >
        <Icon aria-hidden />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
  return (
    <div className="flex items-center gap-1">
      {step(-1, "Previous month", ChevronLeft)}
      <span className="min-w-28 text-center text-sm font-medium">{monthLabel(month)}</span>
      {allowFuture || month < now ? (
        step(1, "Next month", ChevronRight)
      ) : (
        <Button variant="outline" size="icon-lg" className="size-11 lg:size-9" aria-label="Next month" disabled>
          <ChevronRight aria-hidden />
        </Button>
      )}
    </div>
  );
}
