import { cn } from "@/lib/utils";

/** Ortha mark: an "O" split into two offset arcs, money in (currentColor) and money out (brand accent). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={3.25} aria-hidden className={cn("size-5 shrink-0", className)}>
      <path d="M12 18.25A7.5 7.5 0 0 1 12 3.25" stroke="currentColor" />
      <path d="M12 5.75A7.5 7.5 0 0 1 12 20.75" className="stroke-brand" />
    </svg>
  );
}

/** Lockup: mark + "Budget" (Geist Sans semibold) + "Ortha" (Geist Mono, muted). Text stays real text. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="flex items-baseline gap-1.5">
        <span className="font-sans text-[15px] leading-5 font-semibold tracking-tight">Budget</span>
        <span className="text-muted-foreground font-mono text-[13px] leading-5">Ortha</span>
      </span>
    </span>
  );
}
