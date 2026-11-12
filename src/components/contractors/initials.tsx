import { cn } from "@/lib/utils";

export function Initials({ name, className }: { name: string; className?: string }) {
  const text = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className={cn("bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-md border text-xs font-medium tracking-[0.08em]", className)}
    >
      {text || "?"}
    </span>
  );
}

export const LABEL = "text-muted-foreground text-[11px] font-medium tracking-[0.08em] uppercase";
export const dateLabel = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
