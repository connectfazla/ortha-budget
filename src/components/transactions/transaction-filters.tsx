"use client";

// Search + removable filter chips + filter drawer for /transactions.
// [CP-TX] search field, [VIVID-TL] removable chips, [MERC-FILTER] sheet with sections, Show results + Clear.

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import { isMonthKey, KINDS, monthKey } from "@/lib/money";
import type { Client, Direction, TxnKind } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/** Already validated by the page; never raw searchParams. */
export type Filters = { q?: string; month?: string; kind?: TxnKind; direction?: Direction; clientId?: string; from?: string; to?: string };

const URL_KEYS = ["month", "kind", "direction", "clientId", "from", "to"] as const;

export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function shortDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const LABEL = "text-muted-foreground text-xs font-medium";
const CHIP =
  "h-11 rounded-sm border px-3 text-sm data-pressed:border-foreground data-pressed:bg-foreground data-pressed:text-background";

/**
 * Filters from the live URL. The server-rendered props can lag a navigation behind (slow networks), and building the
 * next URL from stale props dropped or restored filters. Values are re-checked here the same way the page checks them.
 */
function readFilters(sp: URLSearchParams, clients: Client[]): Filters {
  const g = (k: string) => sp.get(k) || undefined;
  const date = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  const kind = g("kind");
  const direction = g("direction");
  const month = g("month");
  const clientId = g("clientId");
  return {
    q: g("q")?.slice(0, 80),
    month: month && isMonthKey(month) ? month : undefined,
    kind: kind && Object.hasOwn(KINDS, kind) ? (kind as TxnKind) : undefined,
    direction: direction === "in" || direction === "out" ? direction : undefined,
    clientId: clientId && clients.some((c) => c.id === clientId) ? clientId : undefined,
    from: date(g("from")),
    to: date(g("to")),
  };
}

export function TransactionFilters({ clients = [] }: { filters?: Filters; clients?: Client[] }) {
  const searchParams = useSearchParams();
  const filters = readFilters(searchParams, clients);
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
      const next: Filters = { q: v.trim() || undefined };
      for (const k of URL_KEYS) (next as Record<string, string | undefined>)[k] = cur.get(k) || undefined;
      go(next);
    }, 300);
  }

  const chips: { key: keyof Filters; label: string }[] = [];
  if (filters.month) chips.push({ key: "month", label: monthLabel(filters.month) });
  if (filters.kind) chips.push({ key: "kind", label: KINDS[filters.kind].label });
  if (filters.direction) chips.push({ key: "direction", label: filters.direction === "in" ? "In" : "Out" });
  if (filters.clientId) chips.push({ key: "clientId", label: clients.find((c) => c.id === filters.clientId)?.name ?? "Client" });
  if (filters.from) chips.push({ key: "from", label: `From ${shortDate(filters.from)}` });
  if (filters.to) chips.push({ key: "to", label: `To ${shortDate(filters.to)}` });

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
        <Tooltip>
          <FilterDrawer filters={filters} apply={go} clients={clients}>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  aria-label={chips.length ? `Filters, ${chips.length} on` : "Filters"}
                  className="relative size-11 rounded-md"
                />
              }
            >
              <SlidersHorizontalIcon />
              {chips.length ? (
                <Badge aria-hidden className="bg-brand text-background absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px] tabular-nums">
                  {chips.length}
                </Badge>
              ) : null}
            </TooltipTrigger>
          </FilterDrawer>
          <TooltipContent>Filters</TooltipContent>
        </Tooltip>
      </div>

      {chips.length ? (
        <ScrollArea className="-mx-4 lg:mx-0">
          <div className="flex w-max gap-1.5 px-4 pb-2.5 lg:px-0">
            {chips.map((c) => (
              <Button
                key={c.key}
                onClick={() => go({ ...filters, [c.key]: undefined })}
                aria-label={`Remove filter ${c.label}`}
                className="bg-foreground text-background hover:bg-foreground/90 h-11 rounded-sm px-3"
              >
                {c.label}
                <XIcon data-icon="inline-end" className="size-3.5" />
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      ) : null}
    </div>
  );
}

function FilterDrawer({
  filters,
  apply,
  clients,
  children,
}: {
  filters: Filters;
  apply: (f: Filters) => void;
  clients: Client[];
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
          clients={clients}
          onApply={(f) => {
            apply(f);
            setOpen(false);
          }}
        />
      </DrawerContent>
    </Drawer>
  );
}

function FilterForm({ filters, clients, onApply }: { filters: Filters; clients: Client[]; onApply: (f: Filters) => void }) {
  const [draft, setDraft] = useState(filters);
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  if (filters.month && !months.includes(filters.month)) months.push(filters.month);
  const set = (patch: Filters) => setDraft((d) => ({ ...d, ...patch }));
  const active = [draft.month, draft.kind, draft.direction, draft.clientId, draft.from, draft.to].filter(Boolean).length;
  const badRange = Boolean(draft.from && draft.to && draft.from > draft.to);

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
        <Section label="Date range">
          <div className="grid grid-cols-2 gap-3">
            {(["from", "to"] as const).map((k) => (
              <Field key={k} data-invalid={badRange} className="gap-1">
                <FieldLabel htmlFor={`filter-${k}`} className={LABEL}>
                  {k === "from" ? "From" : "To"}
                </FieldLabel>
                <Input
                  id={`filter-${k}`}
                  type="date"
                  value={draft[k] ?? ""}
                  aria-invalid={badRange}
                  onChange={(e) => set({ [k]: e.target.value || undefined })}
                  className="h-11 w-full"
                />
              </Field>
            ))}
          </div>
          <FieldError className="mt-2">{badRange ? "The start date is after the end date." : null}</FieldError>
        </Section>
        {clients.length ? (
          <Section label="Client">
            <Pills
              label="Client"
              value={draft.clientId ?? ""}
              onChange={(v) => set({ clientId: v || undefined })}
              options={[{ value: "", label: "All" }, ...clients.map((c) => ({ value: c.id, label: c.name }))]}
            />
          </Section>
        ) : null}
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
        <Button variant="outline" className="h-12 flex-1 rounded-md text-sm" onClick={() => onApply({ q: filters.q })}>
          Clear{active ? ` (${active})` : ""}
        </Button>
        <Button className="h-12 flex-[2] rounded-md text-sm" disabled={badRange} onClick={() => onApply(draft)}>
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
