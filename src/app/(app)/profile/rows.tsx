import type { ReactElement, ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "@/components/ui/item";

/**
 * One iOS grouped-list section [Neo Financial Profile][Wealthfront Profile]: sentence-case label, then a card of rows.
 * A one-row section skips the label, since the row already names itself.
 */
export function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      {title ? <h2 className="label px-1">{title}</h2> : null}
      <Card className="py-0">{children}</Card>
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

/** Rows inside a Group, with hairlines inset past the icon. Full-width rows highlight on press instead of shrinking. */
export function Rows({ rows }: { rows: RowProps[] }) {
  return (
    <ItemGroup className="gap-0">
      {rows.map((r, i) => (
        <div role="listitem" key={r.title}>
          {i > 0 ? <ItemSeparator className="my-0 ml-13 w-auto" /> : null}
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
      className={cn("focus-visible:ring-ring/60 hover:bg-muted/60 active:bg-muted min-h-14 rounded-none border-0 px-4 py-3 text-left focus-visible:ring-2 focus-visible:ring-inset", className)}
    >
      <ItemMedia variant="icon" className="text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </ItemMedia>
      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle className="text-[15px] font-normal">{title}</ItemTitle>
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
