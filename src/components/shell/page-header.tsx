import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * Page title row: 28px bold title left (Revolut large title), actions right (desktop puts the primary "Add" here).
 * `back` adds an iOS-style "‹ Parent" link above the title for drill-in pages.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="pt-2 pb-4">
      {back ? (
        <Button variant="ghost" className="text-brand -ml-2.5 mb-1 h-11 gap-0.5 px-1.5" nativeButton={false} render={<Link href={back.href} />}>
          <ChevronLeft className="size-5" aria-hidden />
          {back.label}
        </Button>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-[28px] leading-9 font-bold tracking-tight">{title}</h1>
          {subtitle ? <p className="text-muted-foreground mt-0.5 text-[15px]">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
