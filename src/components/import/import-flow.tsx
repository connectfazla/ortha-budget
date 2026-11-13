"use client";

// CSV import. Mobbin refs: Unify "Map fields" (auto-mapped banner + header/example columns)
// https://mobbin.com/screens/1bead55e-604f-489b-a039-5315df0678c5 , Square "Assign fields" (Do Not Import option)
// https://mobbin.com/screens/5b630bf4-06eb-4eb4-be45-ea7c3a250763 , Snowflake preview + status
// https://mobbin.com/screens/311a5418-1a4c-4ceb-9fe7-c302350be911
// Cells are always rendered as text nodes and never evaluated.

import { useRef, useState } from "react";
import Link from "next/link";
import { CheckIcon, FileUpIcon, TriangleAlertIcon } from "lucide-react";
import { importTransactions } from "@/lib/actions";
import { useCategoryOptions } from "@/components/categories/category-context";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { buildRows, guessMapping, isOwnFormat, parseCsv, type Field as CsvField, type Mapping } from "./csv";

const MAX_BYTES = 5 * 1024 * 1024;
const CHUNK = 2000;

const FIELDS: { key: CsvField; label: string; required?: boolean }[] = [
  { key: "date", label: "Date", required: true },
  { key: "description", label: "Description", required: true },
  { key: "amount", label: "Amount", required: true },
  { key: "direction", label: "Direction (in or out)" },
  { key: "currency", label: "Currency" },
  { key: "category", label: "Category" },
];

type Parsed = { name: string; headers: string[]; data: string[][]; own: boolean };
type Done = { count: number; skipped: number; error?: string };

/** `baseCurrency`: the user's base currency (settings). Rows in it import without a rate. */
export function ImportFlow({ baseCurrency: base = "USD" }: { baseCurrency?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<Parsed | null>(null);
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const [signed, setSigned] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<Done | null>(null);

  async function pick(f: File | undefined) {
    setError(null);
    if (!f) return;
    if (f.size > MAX_BYTES) return setError("That file is over 5 MB. Split it and import the parts.");
    if (!/\.csv$/i.test(f.name) && f.type !== "text/csv") return setError("Choose a .csv file.");
    const table = parseCsv(await f.text());
    if (table.length < 2) return setError("The file has no data rows.");
    const [headers, ...data] = table;
    const own = isOwnFormat(headers);
    const m = guessMapping(headers);
    setFile({ name: f.name, headers, data, own });
    setMapping(m);
    setSigned(m.direction < 0);
  }

  const options = useCategoryOptions();
  const built = file && mapping ? buildRows(file.headers, file.data, { own: file.own, mapping, signed, base }) : null;
  // Category column: snap "software" to the picker's "Software" so imports group with entries made in the app,
  // and give money in "Other income" instead of the outflow "Other". Unknown names import as written.
  if (built) {
    const byName = new Map(options.map((o) => [o.name.toLowerCase(), o.name]));
    for (const r of built.rows) {
      r.category = byName.get(r.category.trim().toLowerCase()) ?? r.category;
      if (r.direction === "in" && r.category === "Other") r.category = "Other income";
    }
  }
  const ready = file && built && (file.own || (mapping!.date >= 0 && mapping!.description >= 0 && mapping!.amount >= 0));

  async function run() {
    if (!built) return;
    setError(null);
    let count = 0;
    try {
      for (let i = 0; i < built.rows.length; i += CHUNK) {
        setProgress({ done: i, total: built.rows.length });
        const res = await importTransactions(built.rows.slice(i, i + CHUNK));
        if (!res.ok) {
          setProgress(null);
          return setResult({ count, skipped: built.skipped.length, error: res.error });
        }
        count += res.count ?? 0;
      }
      setResult({ count, skipped: built.skipped.length });
    } catch {
      setResult({ count, skipped: built.skipped.length, error: "The connection dropped." });
    }
    setProgress(null);
  }

  if (result) {
    return (
      <Card role="status">
        <CardContent className="py-2">
          <div
            className={
              result.error
                ? "bg-destructive/10 text-destructive mb-3 grid size-10 place-items-center rounded-md"
                : "bg-money-in/10 text-money-in mb-3 grid size-10 place-items-center rounded-md"
            }
          >
            {result.error ? <TriangleAlertIcon aria-hidden /> : <CheckIcon aria-hidden />}
          </div>
          <h2 className="text-lg font-semibold">
            {result.error ? `Imported ${result.count} before it stopped` : `Imported ${result.count} ${result.count === 1 ? "transaction" : "transactions"}`}
          </h2>
          {result.error ? <p className="text-destructive mt-1 text-sm">{result.error} Rows already imported stay saved, so do not re-run the whole file.</p> : null}
          {result.skipped ? <p className="text-muted-foreground mt-1 text-sm">{result.skipped} rows skipped as invalid.</p> : null}
          <div className="mt-5 flex gap-2">
            <Button className="h-11 rounded-md" nativeButton={false} render={<Link href="/transactions" />}>
              View transactions
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-md"
              onClick={() => {
                setResult(null);
                setFile(null);
                setMapping(null);
              }}
            >
              Import another file
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!file || !mapping || !built) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void pick(e.dataTransfer.files[0]);
          }}
          className="hover:bg-muted/50 active:bg-muted focus-visible:ring-ring/50 flex min-h-48 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center transition-colors outline-none focus-visible:ring-3"
        >
          <FileUpIcon className="text-muted-foreground size-6" aria-hidden />
          <span className="font-medium">Choose a CSV file</span>
          <span className="text-muted-foreground text-sm">or drop it here. Up to 5 MB.</span>
        </button>
        <input ref={input} type="file" accept=".csv,text/csv" className="sr-only" tabIndex={-1} aria-label="CSV file" onChange={(e) => void pick(e.target.files?.[0])} />
        {error ? <p role="alert" className="text-destructive text-sm">{error}</p> : null}
        <p className="text-muted-foreground text-sm">
          A file exported from Budget Ortha imports as is. Any other file gets a column mapping step before anything is saved.
          Amounts in {base} import as they are. Other currencies need an exchange rate, which only an Budget Ortha export
          carries, so those rows are skipped.
        </p>
      </div>
    );
  }

  const busy = progress !== null;
  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-medium">{file.name}</p>
        <button type="button" disabled={busy} onClick={() => { setFile(null); setMapping(null); }} className="text-muted-foreground hover:text-foreground min-h-11 text-sm underline-offset-4 hover:underline">
          Choose another file
        </button>
      </div>

      {file.own ? (
        <p className="bg-muted rounded-md px-3 py-2 text-sm">This is an Budget Ortha export, so the columns are matched automatically.</p>
      ) : (
        <section aria-labelledby="map-h" className="space-y-3">
          <h2 id="map-h" className="text-sm font-medium">Match your columns</h2>
          <Card className="gap-0 divide-y py-0">
            {FIELDS.map((f) => (
              <Field key={f.key} orientation="horizontal" className="grid min-h-14 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 px-4 py-2">
                <FieldContent>
                  <FieldLabel htmlFor={`map-${f.key}`} className="font-normal">
                    {f.label}
                  </FieldLabel>
                  {f.required ? <FieldDescription className="text-xs">Required</FieldDescription> : null}
                </FieldContent>
                <NativeSelect
                  id={`map-${f.key}`}
                  value={mapping[f.key]}
                  onChange={(e) => setMapping({ ...mapping, [f.key]: Number(e.target.value) })}
                  className="w-full min-w-0 *:data-[slot=native-select]:h-11"
                >
                  <NativeSelectOption value={-1}>{f.required ? "Choose a column" : "Do not import"}</NativeSelectOption>
                  {file.headers.map((h, i) => (
                    <NativeSelectOption key={i} value={i}>
                      {h || `Column ${i + 1}`}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            ))}
          </Card>
          {mapping.direction < 0 ? (
            <p className="text-muted-foreground text-sm">With no direction column, negative amounts count as money out and positive as money in.</p>
          ) : (
            <Field orientation="horizontal" className="min-h-11">
              <Checkbox id="import-signed" checked={signed} onCheckedChange={(v) => setSigned(v === true)} />
              <FieldLabel htmlFor="import-signed" className="font-normal">
                Use the sign of the amount instead of the direction column
              </FieldLabel>
            </Field>
          )}
        </section>
      )}

      <section aria-labelledby="prev-h" className="space-y-2">
        <h2 id="prev-h" className="text-sm font-medium">
          Preview <span className="text-muted-foreground font-normal">first {Math.min(10, built.rows.length)} of {built.rows.length} valid rows</span>
        </h2>
        {built.rows.length ? (
          <Card className="gap-0 py-0">
            <ul className="divide-y">
              {built.rows.slice(0, 10).map((r, i) => (
                <li key={i}>
                  <Item className="min-h-14 flex-nowrap rounded-none border-0 px-4 py-2">
                    <ItemContent className="min-w-0 gap-0">
                      <ItemTitle className="w-full">
                        <span className="truncate">{r.description}</span>
                      </ItemTitle>
                      <ItemDescription className="truncate text-xs tabular-nums">{r.date}</ItemDescription>
                      <ItemDescription className="truncate text-xs">{r.category}</ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Money value={r.amount} currency={r.currency} direction={r.direction} className="text-sm font-medium" />
                    </ItemActions>
                  </Item>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <Empty className="border p-4">
            <EmptyHeader>
              <EmptyDescription>No valid rows with this mapping. Check the date, description and amount columns.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        {built.skipped.length ? (
          <details className="text-sm">
            <summary className="text-muted-foreground min-h-11 cursor-pointer py-2">{built.skipped.length} rows will be skipped</summary>
            <ul className="text-muted-foreground space-y-1 pb-2 text-xs">
              {built.skipped.slice(0, 20).map((s) => (
                <li key={s.line}>Line {s.line}: {s.reason}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      {error ? <p role="alert" className="text-destructive text-sm">{error}</p> : null}

      {busy ? (
        <div role="status" aria-live="polite" className="space-y-2">
          <div className="bg-muted h-2 overflow-hidden rounded-full" role="progressbar" aria-valuemin={0} aria-valuemax={built.rows.length} aria-valuenow={progress.done}>
            <div className="bg-brand h-full origin-left transition-transform duration-[var(--dur-base,220ms)] motion-reduce:transition-none" style={{ transform: `scaleX(${progress.done / progress.total})` }} />
          </div>
          <p className="text-muted-foreground text-sm tabular-nums">Importing {progress.done} of {progress.total}</p>
        </div>
      ) : (
        <Button className="h-12 w-full rounded-md" disabled={!ready || built.rows.length === 0} onClick={run}>
          Import {built.rows.length} {built.rows.length === 1 ? "transaction" : "transactions"}
        </Button>
      )}
    </div>
  );
}
