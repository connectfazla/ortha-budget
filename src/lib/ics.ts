// Pure RFC 5545 builder for the renewals feed. No imports so it runs under `node --experimental-strip-types`.

export type FeedRow = {
  id: string;
  name: string;
  vendor?: string | null;
  direction: "in" | "out";
  amount: number;
  currency: string;
  billing_interval: "weekly" | "monthly" | "quarterly" | "yearly";
  next_due: string; // YYYY-MM-DD
  trial_ends: string | null;
  cancel_by?: string | null; // YYYY-MM-DD
};

const RRULE: Record<FeedRow["billing_interval"], string> = {
  weekly: "FREQ=WEEKLY",
  monthly: "FREQ=MONTHLY",
  quarterly: "FREQ=MONTHLY;INTERVAL=3",
  yearly: "FREQ=YEARLY",
};

export const rruleFor = (i: FeedRow["billing_interval"]) => RRULE[i];

export function escapeText(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n");
}

/** Folds a content line at 75 octets (UTF-8), never inside a character. Continuations start with one space. */
export function fold(line: string) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > limit) {
      out.push(cur);
      cur = "";
      bytes = 0;
      limit = 74; // the leading space counts
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

const compact = (d: string) => d.replaceAll("-", "");
const nextDay = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
const money = (n: number, cur: string) => {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: cur, currencyDisplay: "narrowSymbol" }).format(n);
  } catch {
    return `${n.toFixed(2)} ${cur}`;
  }
};

function event(uid: string, stamp: string, date: string, summary: string, opts: { rrule?: string; alarm: string; description?: string; trigger?: string }) {
  return [
    "BEGIN:VEVENT",
    `UID:${uid}@ortha-budget`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${compact(date)}`,
    `DTEND;VALUE=DATE:${compact(nextDay(date))}`,
    ...(opts.rrule ? [`RRULE:${opts.rrule}`] : []),
    `SUMMARY:${escapeText(summary)}`,
    ...(opts.description ? [`DESCRIPTION:${escapeText(opts.description)}`] : []),
    "TRANSP:TRANSPARENT",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(opts.alarm)}`,
    `TRIGGER:${opts.trigger ?? "-P1D"}`,
    "END:VALARM",
    "END:VEVENT",
  ];
}

export function buildCalendar(rows: FeedRow[], now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ortha Budget//Renewals//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Ortha Budget renewals",
  ];
  for (const r of rows) {
    const amt = money(r.amount, r.currency);
    const summary = r.direction === "in" ? `${r.name} expected payment: ${amt}` : `${r.name} renews: ${amt}`;
    lines.push(...event(r.id, stamp, r.next_due, summary, { rrule: RRULE[r.billing_interval], alarm: summary, description: r.vendor ?? undefined }));
    if (r.trial_ends) {
      const t = `${r.name} trial ends`;
      lines.push(...event(`${r.id}-trial`, stamp, r.trial_ends, t, { alarm: t }));
    }
    if (r.cancel_by) {
      const c = `Cancel ${r.name}`;
      lines.push(...event(`${r.id}-cancel`, stamp, r.cancel_by, c, { alarm: c, trigger: "-P2D" }));
    }
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
