"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteContractor } from "@/lib/actions";
import type { Contractor } from "@/lib/types";
import { ContractorDrawer } from "./contractor-drawer";

export function ContractorMenu({ contractor }: { contractor: Contractor }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function remove() {
    start(async () => {
      const r = await deleteContractor(contractor.id);
      if (r.ok) {
        toast.success("Contractor deleted");
        router.replace("/contractors");
      } else toast.error(r.error);
    });
  }

  return (
    <>
      <ContractorDrawer contractor={contractor}>
        <Button variant="outline" size="lg" className="h-11 flex-1">
          <Pencil /> Edit
        </Button>
      </ContractorDrawer>
      <Tooltip>
        <TooltipTrigger render={<Button variant="destructive" size="lg" className="h-11" onClick={() => setOpen(true)} aria-label="Delete contractor" />}>
          <Trash2 />
        </TooltipTrigger>
        <TooltipContent>Delete contractor</TooltipContent>
      </Tooltip>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {contractor.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Past payouts stay in your transactions but are unlinked from this contractor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={pending} onClick={remove}>
              {pending ? <Spinner /> : null} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
