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

/** Prev / month / next. `base` is the page path the `?month=` param goes on; the current month drops the param. */
export function MonthSwitcher({ month, base = "/", allowFuture = false }: { month: string; base?: string; allowFuture?: boolean }) {
  const now = monthKey();
  const href = (m: string) => (m === now ? base : `${base}?month=${m}`);
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
