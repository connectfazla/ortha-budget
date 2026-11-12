"use client";

// Search + removable filter chips + filter drawer for /transactions.
// [CP-TX] search field, [VIVID-TL] removable chips, [MERC-FILTER] sheet with sections, Show results + Clear.

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import { KINDS, monthKey } from "@/lib/money";
import type { Direction, TxnKind } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/** Already validated by the page; never raw searchParams. */
export type Filters = { q?: string; month?: string; kind?: TxnKind; direction?: Direction };

export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

const LABEL = "text-muted-foreground text-[11px] font-medium tracking-[0.08em] uppercase";
const CHIP =
  "h-9 rounded-sm border px-3 text-[11px] tracking-[0.08em] uppercase data-pressed:border-foreground data-pressed:bg-foreground data-pressed:text-background";

export function TransactionFilters({ filters }: { filters: Filters }) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(filters.q ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Empty the box when q is cleared from outside (e.g. the empty state's "Clear filters" link).
  const [prevQ, setPrevQ] = useState(filters.q);
  if (filters.q !== prevQ) {
    setPrevQ(filters.q);
    if (!filters.q) setQ("");
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  function go(next: Filters) {
    clearTimeout(timer.current);
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    const s = p.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }

  function search(v: string) {
    setQ(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      // Read the live URL at fire time so filters changed meanwhile are kept.
      const cur = new URLSearchParams(window.location.search);
      const next = (k: string) => cur.get(k) || undefined;
      go({ month: next("month"), kind: next("kind") as TxnKind | undefined, direction: next("direction") as Direction | undefined, q: v.trim() || undefined });
    }, 300);
  }

  const chips: { key: keyof Filters; label: string }[] = [];
  if (filters.month) chips.push({ key: "month", label: monthLabel(filters.month) });
  if (filters.kind) chips.push({ key: "kind", label: KINDS[filters.kind].label });
  if (filters.direction) chips.push({ key: "direction", label: filters.direction === "in" ? "In" : "Out" });

  return (
    <div className="mb-3 flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            type="search"
            aria-label="Search transactions"
            placeholder="Search description, vendor, category"
            value={q}
            maxLength={80}
            onChange={(e) => search(e.target.value)}
            className="bg-muted h-11 rounded-md border-transparent pl-9"
          />
        </div>
        <FilterDrawer filters={filters} apply={go}>
          <Button variant="outline" aria-label="Filters" className="relative size-11 rounded-md">
            <SlidersHorizontalIcon />
            {chips.length ? (
              <span className="bg-brand absolute -top-1 -right-1 grid size-4 place-items-center rounded-sm text-background text-[10px] tabular-nums">
                {chips.length}
              </span>
            ) : null}
          </Button>
        </FilterDrawer>
      </div>

      {chips.length ? (
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => go({ ...filters, [c.key]: undefined })}
              aria-label={`Remove filter ${c.label}`}
              className="bg-foreground text-background flex h-9 shrink-0 items-center gap-1.5 rounded-sm px-3 text-[11px] tracking-[0.08em] uppercase"
            >
              {c.label}
              <XIcon className="size-3.5" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FilterDrawer({
  filters,
  apply,
  children,
}: {
  filters: Filters;
  apply: (f: Filters) => void;
  children: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
      <DrawerTrigger render={children} />
      <DrawerContent className="lg:mx-auto lg:max-w-[480px] lg:border-x">
        {/* Popup unmounts on close, so the draft resets to the URL state on every open. */}
        <FilterForm
          filters={filters}
          onApply={(f) => {
            apply(f);
            setOpen(false);
          }}
        />
      </DrawerContent>
    </Drawer>
  );
}

function FilterForm({ filters, onApply }: { filters: Filters; onApply: (f: Filters) => void }) {
  const [draft, setDraft] = useState(filters);
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  if (filters.month && !months.includes(filters.month)) months.push(filters.month);
  const set = (patch: Filters) => setDraft((d) => ({ ...d, ...patch }));
  const active = [draft.month, draft.kind, draft.direction].filter(Boolean).length;

  return (
    <>
      <DrawerHeader className="flex-row items-center justify-between pt-2 pb-2 text-left">
        <DrawerTitle className={LABEL}>Filters</DrawerTitle>
        <DrawerClose render={<Button variant="ghost" size="icon-lg" aria-label="Close" />}>
          <XIcon />
        </DrawerClose>
      </DrawerHeader>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4">
        <Section label="Month">
          <Pills
            label="Month"
            value={draft.month ?? ""}
            onChange={(v) => set({ month: v || undefined })}
            options={[{ value: "", label: "All" }, ...months.map((m) => ({ value: m, label: monthLabel(m) }))]}
          />
        </Section>
        <Section label="Type">
          <Pills
            label="Type"
            value={draft.kind ?? ""}
            onChange={(v) => set({ kind: (v || undefined) as TxnKind | undefined })}
            options={[
              { value: "", label: "All" },
              ...(Object.keys(KINDS) as TxnKind[]).map((k) => ({ value: k, label: KINDS[k].label })),
            ]}
          />
        </Section>
        <Section label="Direction">
          <Pills
            label="Direction"
            value={draft.direction ?? ""}
            onChange={(v) => set({ direction: (v || undefined) as Direction | undefined })}
            options={[
              { value: "", label: "Any" },
              { value: "in", label: "In" },
              { value: "out", label: "Out" },
            ]}
          />
        </Section>
      </div>
      <div className="flex shrink-0 gap-2 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button variant="outline" className="h-12 flex-1 rounded-md text-[11px] tracking-[0.08em] uppercase" onClick={() => onApply({ q: filters.q })}>
          Clear{active ? ` (${active})` : ""}
        </Button>
        <Button className="h-12 flex-[2] rounded-md text-[11px] tracking-[0.08em] uppercase" onClick={() => onApply(draft)}>
          Show results
        </Button>
      </div>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className={`${LABEL} mb-2`}>{label}</h3>
      {children}
    </section>
  );
}

function Pills({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <ToggleGroup
      aria-label={label}
      value={[value || "all"]}
      onValueChange={(v) => v.length && onChange(v[0] === "all" ? "" : (v[0] as string))}
      className="w-full flex-wrap gap-1.5"
    >
      {options.map((o) => (
        <ToggleGroupItem key={o.value || "all"} value={o.value || "all"} className={CHIP}>
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
