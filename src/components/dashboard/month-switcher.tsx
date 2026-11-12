import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthKey } from "@/lib/money";

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}

export function monthLabel(month: string, style: "short" | "long" = "long") {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: style, year: style === "long" ? "numeric" : undefined });
}

const btn =
  "text-muted-foreground hover:text-foreground hover:bg-muted grid size-10 place-items-center rounded-md border press transition-colors";

export function MonthSwitcher({ month }: { month: string }) {
  const now = monthKey();
  const href = (m: string) => (m === now ? "/" : `/?month=${m}`);
  return (
    <div className="flex items-center gap-1">
      <Link href={href(shiftMonth(month, -1))} aria-label="Previous month" className={btn}>
        <ChevronLeft className="size-4" />
      </Link>
      <span className="min-w-28 text-center text-sm font-medium">{monthLabel(month)}</span>
      {month < now ? (
        <Link href={href(shiftMonth(month, 1))} aria-label="Next month" className={btn}>
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span aria-hidden className={btn + " opacity-30"}>
          <ChevronRight className="size-4" />
        </span>
      )}
    </div>
  );
}
