// Run: node --experimental-strip-types src/lib/ics.check.ts
import assert from "node:assert/strict";
import { buildCalendar, escapeText, fold, rruleFor, type FeedRow } from "./ics.ts";

assert.equal(escapeText("a;b,c\\d\ne"), "a\\;b\\,c\\\\d\\ne");

const long = "SUMMARY:" + "é".repeat(100);
const folded = fold(long).split("\r\n");
assert.ok(folded.length > 1);
for (const [i, l] of folded.entries()) {
  assert.ok(new TextEncoder().encode(l).length <= 75, "line over 75 octets");
  if (i) assert.ok(l.startsWith(" "));
}
assert.equal(folded.map((l, i) => (i ? l.slice(1) : l)).join(""), long);

assert.equal(rruleFor("weekly"), "FREQ=WEEKLY");
assert.equal(rruleFor("monthly"), "FREQ=MONTHLY");
assert.equal(rruleFor("quarterly"), "FREQ=MONTHLY;INTERVAL=3");
assert.equal(rruleFor("yearly"), "FREQ=YEARLY");

const rows: FeedRow[] = [
  { id: "abc", name: "Figma Professional", direction: "out", amount: 45, currency: "USD", billing_interval: "monthly", next_due: "2026-11-20", trial_ends: null },
  { id: "def", name: "Notion Plus", direction: "out", amount: 10, currency: "USD", billing_interval: "monthly", next_due: "2026-11-25", trial_ends: "2026-11-20", cancel_by: "2026-11-22" },
  { id: "ghi", name: "Acme retainer", direction: "in", amount: 2400, currency: "USD", billing_interval: "quarterly", next_due: "2026-12-01", trial_ends: null },
];
const a = buildCalendar(rows, new Date("2026-11-13T00:00:00Z"));
const b = buildCalendar(rows, new Date("2027-01-01T00:00:00Z"));
assert.ok(a.startsWith("BEGIN:VCALENDAR\r\n") && a.endsWith("END:VCALENDAR\r\n"));
assert.ok(!/[^\r]\n/.test(a), "bare LF");
assert.ok(a.includes("X-WR-CALNAME:Ortha Budget renewals"));
assert.ok(a.includes("SUMMARY:Figma Professional renews: $45.00"));
assert.ok(a.includes("SUMMARY:Acme retainer expected payment: $2\\,400.00"));
assert.ok(a.includes("SUMMARY:Notion Plus trial ends"));
assert.ok(a.includes("DTSTART;VALUE=DATE:20261120") && a.includes("DTEND;VALUE=DATE:20261121"));
assert.ok(a.includes("RRULE:FREQ=MONTHLY;INTERVAL=3"));
assert.ok(a.includes("TRIGGER:-P1D"));
assert.ok(a.includes("SUMMARY:Cancel Notion Plus") && a.includes("DTSTART;VALUE=DATE:20261122"));
assert.ok(a.includes("TRIGGER:-P2D"));
assert.equal(a.match(/TRIGGER:-P2D/g)?.length, 1);
const uids = (s: string) => s.match(/^UID:.*$/gm);
assert.deepEqual(uids(a), uids(b));
assert.deepEqual(uids(a), ["UID:abc@ortha-budget", "UID:def@ortha-budget", "UID:def-trial@ortha-budget", "UID:def-cancel@ortha-budget", "UID:ghi@ortha-budget"]);
assert.equal(buildCalendar([]).includes("BEGIN:VEVENT"), false);
console.log("ics ok");
