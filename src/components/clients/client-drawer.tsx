"use client";

import { useState, useTransition, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { createClientRecord, deleteClientRecord, updateClientRecord } from "@/lib/actions";
import type { Client } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Field, FieldContent, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Stored per client as #rrggbb (the action validates that shape), so these are data, not theme colours.
export const SWATCHES = [
  { name: "Indigo", hex: "#3d4bd6" },
  { name: "Teal", hex: "#0f9488" },
  { name: "Green", hex: "#3f9142" },
  { name: "Amber", hex: "#d98a0b" },
  { name: "Orange", hex: "#e05a1c" },
  { name: "Red", hex: "#d03b3b" },
  { name: "Pink", hex: "#c2418f" },
  { name: "Slate", hex: "#5b6678" },
];

/** Create (no `client`) or edit a client. `children` is the trigger. Delete lives inside the edit form. */
export function ClientDrawer({ client, children }: { client?: Client; children: ReactElement }) {
  const [open, setOpen] = useState(false);
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger render={children} />
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{client ? "Edit client" : "New client"}</DrawerTitle>
          <DrawerDescription className="sr-only">Client name, colour and archive status</DrawerDescription>
        </DrawerHeader>
        {/* The popup unmounts on close, so the form resets on every open. */}
        <Form client={client} onDone={() => setOpen(false)} />
      </DrawerContent>
    </Drawer>
  );
}

function Form({ client, onDone }: { client?: Client; onDone: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(client?.name ?? "");
  const [color, setColor] = useState(client?.color ?? SWATCHES[0].hex);
  const [archived, setArchived] = useState(client?.archived ?? false);

  function save() {
    start(async () => {
      const input = { name, color, archived };
      const r = client ? await updateClientRecord(client.id, input) : await createClientRecord(input);
      if (!r.ok) return void toast.error(r.error);
      toast.success(client ? "Saved" : "Client added");
      onDone();
    });
  }

  function remove() {
    if (!client) return;
    start(async () => {
      const r = await deleteClientRecord(client.id);
      if (!r.ok) return void toast.error(r.error);
      toast.success("Client deleted");
      onDone();
      router.replace("/clients");
    });
  }

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <Field>
          <FieldLabel htmlFor="client-name">Name</FieldLabel>
          <Input id="client-name" className="h-11" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} autoFocus={!client} />
        </Field>

        <FieldSet>
          <FieldLegend variant="label">Colour</FieldLegend>
          <ToggleGroup aria-label="Colour" value={[color]} onValueChange={(v) => v[0] && setColor(v[0] as string)} className="grid w-full grid-cols-8 gap-2">
            {SWATCHES.map((s) => (
              <ToggleGroupItem
                key={s.hex}
                value={s.hex}
                aria-label={s.name}
                style={{ background: s.hex }}
                className="ring-offset-popover data-pressed:ring-foreground aspect-square h-auto min-h-9 min-w-0 rounded-full p-0 data-pressed:ring-2 data-pressed:ring-offset-2"
              />
            ))}
          </ToggleGroup>
        </FieldSet>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="client-archived">Archived</FieldLabel>
            <FieldDescription className="text-xs">Moves the client out of the main list. Its numbers stay in reports.</FieldDescription>
          </FieldContent>
          <Switch id="client-archived" checked={archived} onCheckedChange={setArchived} />
        </Field>

        {client ? (
          <AlertDialog>
            <AlertDialogTrigger render={<Button type="button" variant="ghost" className="text-money-out h-11 w-full" disabled={pending} />}>
              <Trash2Icon /> Delete client
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {client.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Its transactions and plans are kept. They lose the client tag and stop counting toward any client&rsquo;s margin.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={remove} disabled={pending}>
                  Delete client
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>
      <div className="bg-popover sticky bottom-0 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button type="submit" size="lg" className="h-11 w-full" disabled={pending || !name.trim()}>
          {pending ? <Spinner aria-hidden /> : null}
          {client ? "Save changes" : "Add client"}
        </Button>
      </div>
    </form>
  );
}
