"use client";

// One category picker for every form (AddEntryDrawer, RecurringDrawer, BudgetDrawer).
// A compact trigger row opens a nested sub-sheet with the icon grid, so the + sheet stays short:
// Copilot shows the category as one chip in the add sheet; Klarna "Change category" is a 4-column icon grid;
// Facebook "Select category" ends the grid with a "Create your own" tile.

import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AppWindowIcon,
  BriefcaseIcon,
  Building2Icon,
  ChevronRightIcon,
  CircleEllipsisIcon,
  CirclePlusIcon,
  CreditCardIcon,
  EllipsisIcon,
  GraduationCapIcon,
  LandmarkIcon,
  LaptopIcon,
  MegaphoneIcon,
  PenToolIcon,
  PlaneIcon,
  PlusIcon,
  RepeatIcon,
  ScaleIcon,
  ServerIcon,
  ShoppingBagIcon,
  SparklesIcon,
  TagIcon,
  UsersIcon,
  UtensilsIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import { addCategory, deleteCategory } from "@/lib/actions";
import type { CategoryOption, Direction } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useCategoryOptions } from "@/components/categories/category-context";
import { useDesktop } from "@/components/entry/fx";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
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
} from "@/components/ui/alert-dialog";

/** lucide names used by CATEGORIES (src/lib/money.ts). A name missing here falls back to the neutral tag. */
const ICONS: Record<string, LucideIcon> = {
  "app-window": AppWindowIcon,
  server: ServerIcon,
  "pen-tool": PenToolIcon,
  sparkles: SparklesIcon,
  megaphone: MegaphoneIcon,
  users: UsersIcon,
  "building-2": Building2Icon,
  laptop: LaptopIcon,
  scale: ScaleIcon,
  landmark: LandmarkIcon,
  "credit-card": CreditCardIcon,
  plane: PlaneIcon,
  utensils: UtensilsIcon,
  "graduation-cap": GraduationCapIcon,
  "circle-ellipsis": CircleEllipsisIcon,
  briefcase: BriefcaseIcon,
  repeat: RepeatIcon,
  "shopping-bag": ShoppingBagIcon,
  "circle-plus": CirclePlusIcon,
};
function CategoryIcon({ icon, className }: { icon?: string | null; className?: string }) {
  const Icon = ICONS[icon ?? ""] ?? TagIcon;
  return <Icon className={className} aria-hidden />;
}

export function CategoryPicker({
  id,
  value,
  onChange,
  direction,
  className,
}: {
  /** For a FieldLabel htmlFor; clicking the label opens the picker. */
  id?: string;
  value: string;
  onChange: (name: string) => void;
  direction: Direction;
  className?: string;
}) {
  const all = useCategoryOptions();
  const [open, setOpen] = useState(false);
  const desktop = useDesktop();
  const current = all.find((o) => o.name === value);

  return (
    <>
      <button
        type="button"
        id={id}
        aria-label={`Category, ${value || "not set"}`}
        onClick={() => setOpen(true)}
        className={cn(
          "flex min-w-0 items-center gap-2 rounded-md text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          className,
        )}
      >
        <span className="flex size-7 flex-none items-center justify-center rounded-md bg-muted text-muted-foreground">
          <CategoryIcon icon={current?.icon} className="size-4" />
        </span>
        <span className={cn("min-w-0 truncate", !value && "text-muted-foreground")}>{value || "Choose"}</span>
        <ChevronRightIcon className="ml-auto size-4 flex-none text-muted-foreground" aria-hidden />
      </button>
      {/* Nested inside the parent drawer, so Base UI stacks it (parent scales back) and Esc closes only this one. */}
      <Drawer open={open} onOpenChange={setOpen} swipeDirection={desktop ? "right" : "down"} showSwipeHandle={!desktop}>
        <DrawerContent className="max-lg:max-h-[85dvh] lg:h-dvh lg:max-h-dvh lg:w-[440px] lg:border-l">
          <DrawerHeader className="flex-row items-center justify-between pt-2 pb-2 text-left">
            <DrawerTitle className="text-sm font-medium">Category</DrawerTitle>
            <DrawerClose render={<Button type="button" variant="ghost" size="icon-lg" aria-label="Close" />}>
              <XIcon />
            </DrawerClose>
          </DrawerHeader>
          <Grid
            all={all}
            value={value}
            direction={direction}
            pick={(name) => {
              onChange(name);
              setOpen(false);
            }}
          />
        </DrawerContent>
      </Drawer>
    </>
  );
}

function Grid({
  all,
  value,
  direction,
  pick,
}: {
  all: CategoryOption[];
  value: string;
  direction: Direction;
  pick: (name: string) => void;
}) {
  const id = useId();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<CategoryOption | null>(null);

  const mine = all.filter((o) => o.direction === direction);
  const fixed = mine.filter((o) => !o.custom);
  const custom = mine.filter((o) => o.custom);
  // Legacy free text (or a category of the other direction) stays visible and selected, so nothing is lost on edit.
  const legacy = value && !mine.some((o) => o.name === value) ? value : null;

  function add() {
    const n = name.trim();
    if (!n) return setError("Enter a name");
    const existing = all.find((o) => o.name.toLowerCase() === n.toLowerCase());
    if (existing) return pick(existing.name);
    start(async () => {
      const r = await addCategory(n, direction);
      if (!r.ok) return setError(r.error);
      pick(n);
    });
  }

  function remove(o: CategoryOption) {
    if (!o.id) return;
    start(async () => {
      const r = await deleteCategory(o.id!);
      if (!r.ok) return void toast.error(r.error);
      toast.success(`Removed ${o.name}. Entries keep it.`);
      setRemoving(null);
    });
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <ToggleGroup
        aria-label="Categories"
        value={value ? [value] : []}
        onValueChange={(v) => v[0] && pick(v[0])}
        className="grid w-full grid-cols-4 items-start gap-x-1 gap-y-3"
      >
        {fixed.map((o) => (
          <Tile key={o.name} option={o} />
        ))}
        {custom.length || legacy ? (
          <p className="col-span-4 pt-2 text-xs font-medium text-muted-foreground">Your categories</p>
        ) : null}
        {legacy ? <Tile option={{ name: legacy, direction, icon: null, custom: false }} /> : null}
        {custom.map((o) => (
          <div key={o.name} className="relative">
            <Tile option={o} />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-xs"
                    aria-label={`Options for ${o.name}`}
                    className="absolute top-0 right-1 rounded-full shadow-button"
                  />
                }
              >
                <EllipsisIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem variant="destructive" onClick={() => setRemoving(o)}>
                  Delete category
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </ToggleGroup>

      {adding ? (
        <form
          className="mt-4 flex items-start gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation(); // this form sits inside the entry form's portal tree; keep its submit local
            add();
          }}
        >
          <Field data-invalid={!!error} className="min-w-0 flex-1 gap-1">
            <FieldLabel htmlFor={`${id}-new`} className="sr-only">
              New category name
            </FieldLabel>
            <Input
              id={`${id}-new`}
              autoFocus
              maxLength={40}
              placeholder="New category name"
              value={name}
              aria-invalid={!!error}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              className="h-11"
            />
            <FieldError>{error}</FieldError>
          </Field>
          <Button type="submit" className="h-11" disabled={pending}>
            {pending ? <Spinner aria-hidden /> : null}
            Add
          </Button>
        </form>
      ) : (
        <Button type="button" variant="outline" className="mt-4 h-11 w-full border-dashed" onClick={() => setAdding(true)}>
          <PlusIcon aria-hidden /> Custom category
        </Button>
      )}

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {removing?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              It leaves the picker. Entries and plans that use it keep the name.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={pending} onClick={() => removing && remove(removing)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Tile({ option }: { option: CategoryOption }) {
  return (
    <ToggleGroupItem
      value={option.name}
      className="group/tile press h-auto w-full flex-col gap-1.5 rounded-lg px-0.5 py-1.5 text-center text-xs font-normal whitespace-normal hover:bg-transparent aria-pressed:bg-transparent data-pressed:bg-transparent"
    >
      <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors duration-(--dur-fast) group-data-pressed/tile:bg-foreground group-data-pressed/tile:text-background">
        <CategoryIcon icon={option.icon} className="size-5" />
      </span>
      <span className="line-clamp-2 leading-tight group-data-pressed/tile:font-medium">{option.name}</span>
    </ToggleGroupItem>
  );
}
