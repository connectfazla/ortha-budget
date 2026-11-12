"use client";

// CSV import. Mobbin refs: Unify "Map fields" (auto-mapped banner + header/example columns)
// https://mobbin.com/screens/1bead55e-604f-489b-a039-5315df0678c5 , Square "Assign fields" (Do Not Import option)
// https://mobbin.com/screens/5b630bf4-06eb-4eb4-be45-ea7c3a250763 , Snowflake preview + status
// https://mobbin.com/screens/311a5418-1a4c-4ceb-9fe7-c302350be911
// Cells are always rendered as text nodes and never evaluated.

import { useRef, useState } from "react";
import Link from "next/link";
import { CheckIcon, FileUpIcon } from "lucide-react";
import { importTransactions } from "@/lib/actions";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { buildRows, guessMapping, isOwnFormat, parseCsv, type Field, type Mapping } from "./csv";

const MAX_BYTES = 5 * 1024 * 1024;
const CHUNK = 2000;

const FIELDS: { key: Field; label: string; required?: boolean }[] = [
  { key: "date", label: "Date", required: true },
  { key: "description", label: "Description", required: true },
  { key: "amount", label: "Amount", required: true },
  { key: "direction", label: "Direction (in or out)" },
  { key: "currency", label: "Currency" },
  { key: "category", label: "Category" },
];

type Parsed = { name: string; headers: string[]; data: string[][]; own: boolean };
type Done = { count: number; skipped: number; error?: string };

export function ImportFlow() {
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

  const built = file && mapping ? buildRows(file.headers, file.data, { own: file.own, mapping, signed }) : null;
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
      <div className="bg-card rounded-lg border p-6" role="status">
        <div className="bg-money-in/10 text-money-in mb-3 grid size-10 place-items-center rounded-md">
          <CheckIcon aria-hidden />
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
      </div>
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
          A file exported from Ortha Budget imports as is. Any other file gets a column mapping step before anything is saved.
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
        <p className="bg-muted rounded-md px-3 py-2 text-sm">This is an Ortha Budget export, so the columns are matched automatically.</p>
      ) : (
        <section aria-labelledby="map-h" className="space-y-3">
          <h2 id="map-h" className="text-sm font-medium">Match your columns</h2>
          <div className="bg-card divide-y rounded-lg border">
            {FIELDS.map((f) => (
              <label key={f.key} className="grid min-h-14 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 px-4 py-2">
                <span className="text-sm">
                  {f.label}
                  {f.required ? <span className="text-muted-foreground block text-xs">Required</span> : null}
                </span>
                <select
                  value={mapping[f.key]}
                  onChange={(e) => setMapping({ ...mapping, [f.key]: Number(e.target.value) })}
                  className="bg-background focus-visible:ring-ring/50 h-11 w-full min-w-0 rounded-md border px-2 text-sm outline-none focus-visible:ring-3"
                >
                  <option value={-1}>{f.required ? "Choose a column" : "Do not import"}</option>
                  {file.headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Column ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          {mapping.direction < 0 ? (
            <p className="text-muted-foreground text-sm">With no direction column, negative amounts count as money out and positive as money in.</p>
          ) : (
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" checked={signed} onChange={(e) => setSigned(e.target.checked)} className="size-4" />
              Use the sign of the amount instead of the direction column
            </label>
          )}
        </section>
      )}

      <section aria-labelledby="prev-h" className="space-y-2">
        <h2 id="prev-h" className="text-sm font-medium">
          Preview <span className="text-muted-foreground font-normal">first {Math.min(10, built.rows.length)} of {built.rows.length} valid rows</span>
        </h2>
        {built.rows.length ? (
          <ul className="bg-card divide-y rounded-lg border">
            {built.rows.slice(0, 10).map((r, i) => (
              <li key={i} className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{r.description}</span>
                  <span className="text-muted-foreground block truncate text-xs tabular-nums">{r.date}</span>
                  <span className="text-muted-foreground block truncate text-xs">{r.category}</span>
                </span>
                <Money value={r.amount} currency={r.currency} direction={r.direction} className="text-sm font-medium" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">No valid rows with this mapping.</p>
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
