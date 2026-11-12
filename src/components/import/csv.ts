// Client-side CSV helpers: RFC4180 parser, column guessing and row building. No dependencies, no eval.
import { CURRENCIES, KINDS } from "../../lib/money.ts";
import type { TransactionInput } from "../../lib/actions.ts";
import type { TxnKind } from "../../lib/types.ts";

/** Header row written by src/app/api/export/route.ts. Keep in sync. */
export const OWN_HEADERS = ["date", "direction", "kind", "description", "category", "vendor", "amount", "currency", "fx_rate", "amount_usd", "notes"];

/** RFC4180: quoted fields, "" escapes, commas and newlines inside quotes, CRLF or LF, optional BOM. */
export function parseCsv(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const endRow = () => {
    row.push(cell);
    cell = "";
    if (row.length > 1 || row[0] !== "") rows.push(row); // skip blank lines
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"' && cell === "") quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") endRow();
    else if (c === "\r") {
      if (text[i + 1] === "\n") i++;
      endRow();
    } else cell += c;
  }
  if (cell !== "" || row.length) endRow();
  return rows;
}

export function isOwnFormat(headers: string[]) {
  const h = headers.map((x) => x.trim().toLowerCase());
  return OWN_HEADERS.every((c) => h.includes(c));
}

export type Field = "date" | "description" | "amount" | "direction" | "currency" | "category";
/** Column index per field, -1 when unmapped. */
export type Mapping = Record<Field, number>;

const GUESS: Record<Field, RegExp> = {
  date: /date|posted|time/i,
  description: /desc|memo|name|payee|merchant|detail|narrat/i,
  amount: /amount|value|total|sum/i,
  direction: /direction|type|credit|debit|dr\/cr/i,
  currency: /currenc/i,
  category: /categor/i,
};

export function guessMapping(headers: string[]): Mapping {
  const m: Mapping = { date: -1, description: -1, amount: -1, direction: -1, currency: -1, category: -1 };
  const used = new Set<number>();
  for (const f of Object.keys(GUESS) as Field[]) {
    const i = headers.findIndex((h, idx) => !used.has(idx) && GUESS[f].test(h));
    if (i >= 0) {
      m[f] = i;
      used.add(i);
    }
  }
  return m;
}

/** Accepts YYYY-MM-DD, YYYY/MM/DD, and M/D/YYYY (read as month first, unless the first number is over 12). */
// ponytail: no per-file date-order choice; day-first files with all days <= 12 read as month-first. Add a toggle if reported.
export function parseDate(s: string): string | null {
  const t = s.trim().slice(0, 10);
  let y: number, m: number, d: number;
  let r = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(t);
  if (r) [y, m, d] = [+r[1], +r[2], +r[3]];
  else if ((r = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t))) {
    [y, m, d] = [+r[3], +r[1], +r[2]];
    if (m > 12) [m, d] = [d, m];
  } else return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}

/** "$1,234.50", "(12.00)", "-5" -> signed number; null if not a number. */
export function parseAmount(s: string): number | null {
  let t = s.trim();
  if (!t) return null;
  let neg = false;
  if (/^\(.*\)$/.test(t)) {
    neg = true;
    t = t.slice(1, -1);
  }
  if (t.startsWith("-")) neg = !neg;
  t = t.replace(/[^\d.]/g, "");
  if (!/^\d*\.?\d+$|^\d+\.$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? (neg ? -n : n) : null;
}

const IN = /^(in|income|credit|cr|deposit|received|payment received)$/i;
const OUT = /^(out|expense|debit|dr|withdrawal|spent|payment)$/i;

/** Own export prefixes formula-looking cells with ' ; undo that. */
const unquote = (s: string) => (/^'[=+\-@\t\r]/.test(s) ? s.slice(1) : s);

export type Built = { rows: TransactionInput[]; skipped: { line: number; reason: string }[] };

/** `signed`: direction comes from the amount's sign. Otherwise from the direction column. */
export function buildRows(headers: string[], data: string[][], opts: { own: boolean; mapping: Mapping; signed: boolean }): Built {
  const rows: TransactionInput[] = [];
  const skipped: Built["skipped"] = [];
  const h = headers.map((x) => x.trim().toLowerCase());
  const own = (r: string[], name: string) => unquote((r[h.indexOf(name)] ?? "").trim());
  const map = (r: string[], f: Field) => (opts.mapping[f] >= 0 ? (r[opts.mapping[f]] ?? "").trim() : "");

  data.forEach((r, idx) => {
    const line = idx + 2; // header is line 1
    const get = (f: Field) => (opts.own ? own(r, f === "direction" ? "direction" : f) : map(r, f));
    const fail = (reason: string) => skipped.push({ line, reason });

    const date = parseDate(get("date"));
    if (!date) return fail("Date not recognised");
    const description = get("description");
    if (!description) return fail("Description is empty");
    const raw = parseAmount(get("amount"));
    if (raw === null || raw === 0) return fail("Amount is not a number");

    let direction: "in" | "out";
    if (opts.own || !opts.signed) {
      const d = get("direction");
      if (IN.test(d)) direction = "in";
      else if (OUT.test(d)) direction = "out";
      else if (!opts.own && opts.mapping.direction < 0) direction = raw < 0 ? "out" : "in";
      else return fail("Direction is not in or out");
    } else direction = raw < 0 ? "out" : "in";

    const currency = (get("currency") || "USD").toUpperCase();
    if (!(CURRENCIES as readonly string[]).includes(currency)) return fail(`Currency ${currency.slice(0, 8)} is not supported`);
    let fx_rate = 1;
    if (currency !== "USD") {
      fx_rate = opts.own ? Number(own(r, "fx_rate")) : 0;
      if (!(fx_rate > 0)) return fail(`${currency} needs an exchange rate`);
    }

    let kind: TxnKind = direction === "in" ? "income" : "expense";
    if (opts.own) {
      const k = own(r, "kind");
      if (Object.hasOwn(KINDS, k) && KINDS[k as TxnKind].direction === direction) kind = k as TxnKind;
    }
    rows.push({
      date,
      direction,
      kind,
      amount: Math.abs(raw),
      currency,
      fx_rate,
      description: description.slice(0, 200),
      category: get("category").slice(0, 60) || "Other",
      ...(opts.own ? { vendor: own(r, "vendor") || null, notes: own(r, "notes") || null } : {}),
    });
  });
  return { rows, skipped };
}
