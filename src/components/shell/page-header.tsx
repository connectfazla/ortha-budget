import type { ReactNode } from "react";

/** Page title row: 22px title left, actions right (desktop puts the primary "Add" here). */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-3 pt-2 pb-4">
      <div className="min-w-0">
        <h1 className="truncate text-[22px] leading-7 font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-muted-foreground mt-0.5 text-sm">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
