"use client";

import { useState, type ComponentProps } from "react";
import { Plus } from "lucide-react";
import { RecurringDrawer } from "@/components/recurring/recurring-drawer";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Client, Contractor } from "@/lib/types";

/** Self-contained trigger that opens RecurringDrawer in create mode. Pass `children` for a text button, omit for an icon button. */
export function NewRecurringButton({
  contractors,
  categories,
  clients,
  today,
  baseCurrency,
  children,
  ...props
}: {
  contractors: Contractor[];
  categories: string[];
  clients?: Client[];
  today: string;
  /** The user's base currency (settings); defaults to USD in the drawer. */
  baseCurrency?: string;
  children?: React.ReactNode;
} & Omit<ComponentProps<typeof Button>, "onClick" | "children">) {
  const [open, setOpen] = useState(false);
  const drawer = (
    <RecurringDrawer
      open={open}
      onOpenChange={setOpen}
      item={null}
      contractors={contractors}
      clients={clients?.filter((c) => !c.archived)}
      categories={categories}
      today={today}
      baseCurrency={baseCurrency}
    />
  );
  if (children) {
    return (
      <>
        <Button size="lg" className="focus-visible:ring-2 focus-visible:ring-ring/60" {...props} onClick={() => setOpen(true)}>
          {children}
        </Button>
        {drawer}
      </>
    );
  }
  return (
    <>
      <Tooltip>
        <TooltipTrigger render={<Button size="icon-lg" variant="brand" aria-label="Add recurring item" {...props} onClick={() => setOpen(true)} />}>
          <Plus />
        </TooltipTrigger>
        <TooltipContent>Add recurring item</TooltipContent>
      </Tooltip>
      {drawer}
    </>
  );
}
