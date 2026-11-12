"use client";

import { useState, type ComponentProps } from "react";
import { Plus } from "lucide-react";
import { RecurringDrawer } from "@/components/recurring/recurring-drawer";
import { Button } from "@/components/ui/button";
import type { Client, Contractor } from "@/lib/types";

/** Self-contained trigger that opens RecurringDrawer in create mode. Pass `children` for a text button, omit for an icon button. */
export function NewRecurringButton({
  contractors,
  categories,
  clients,
  today,
  children,
  ...props
}: {
  contractors: Contractor[];
  categories: string[];
  clients?: Client[];
  today: string;
  children?: React.ReactNode;
} & Omit<ComponentProps<typeof Button>, "onClick" | "children">) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        {...(children ? { size: "lg" as const } : { size: "icon-lg" as const, "aria-label": "Add recurring item" })}
        {...props}
        onClick={() => setOpen(true)}
      >
        {children ?? <Plus />}
      </Button>
      <RecurringDrawer
        open={open}
        onOpenChange={setOpen}
        item={null}
        contractors={contractors}
        clients={clients?.filter((c) => !c.archived)}
        categories={categories}
        today={today}
      />
    </>
  );
}
