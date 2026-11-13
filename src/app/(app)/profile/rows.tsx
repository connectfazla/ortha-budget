import type { ReactElement, ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";

/**
 * One grouped-list section [Revolut iOS Profile]: bold section title, then a white card of rows with round icons, no hairlines.
 * A one-row section skips the label, since the row already names itself.
 */
export function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      {title ? <h2 className="px-1 text-[17px] font-bold tracking-tight">{title}</h2> : null}
      <Card className="py-1.5">{children}</Card>
    </section>
  );
}

export type RowProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Current value shown before the chevron, e.g. "USD" or "On". */
  value?: string;
  /** Link, anchor or submit button the row renders as. */
  render: ReactElement;
  chevron?: boolean;
  className?: string;
};

/** Rows inside a Group. Full-width rows highlight on press instead of shrinking. */
export function Rows({ rows }: { rows: RowProps[] }) {
  return (
    <ItemGroup className="gap-0">
      {rows.map((r) => (
        <div role="listitem" key={r.title}>
          <Row {...r} />
        </div>
      ))}
    </ItemGroup>
  );
}

export function Row({ icon: Icon, title, description, value, render, chevron = true, className }: RowProps) {
  return (
    <Item
      render={render}
      className={cn("focus-visible:ring-ring/60 hover:bg-muted/60 active:bg-muted min-h-16 rounded-none border-0 px-4 py-3 text-left focus-visible:ring-2 focus-visible:ring-inset", className)}
    >
      <ItemMedia variant="circle">
        <Icon aria-hidden />
      </ItemMedia>
      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle className="text-[15px]">{title}</ItemTitle>
        {description ? <ItemDescription className="text-[13px] leading-snug">{description}</ItemDescription> : null}
      </ItemContent>
      {value || chevron ? (
        <ItemActions className="text-muted-foreground gap-1 text-sm">
          {value ? <span className="tabular-nums">{value}</span> : null}
          {chevron ? <ChevronRight className="size-4 opacity-60" aria-hidden /> : null}
        </ItemActions>
      ) : null}
    </Item>
  );
}
