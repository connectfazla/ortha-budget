// Run: node --experimental-strip-types src/components/import/csv.check.ts
import assert from "node:assert/strict";
import { buildRows, guessMapping, isOwnFormat, OWN_HEADERS, parseAmount, parseCsv, parseDate } from "./csv.ts";

assert.deepEqual(parseCsv('a,b\r\n1,2\r\n'), [["a", "b"], ["1", "2"]]);
assert.deepEqual(parseCsv('a,"b,c","d ""q"""\n"x\ny",,z'), [["a", "b,c", 'd "q"'], ["x\ny", "", "z"]]);
assert.deepEqual(parseCsv("﻿a\n\n1"), [["a"], ["1"]]); // BOM and blank line
assert.deepEqual(parseCsv("a,b\n1,"), [["a", "b"], ["1", ""]]); // trailing empty cell, no final newline
assert.deepEqual(parseCsv(""), []);

assert.equal(parseDate("2026-03-09"), "2026-03-09");
assert.equal(parseDate("3/9/2026"), "2026-03-09");
assert.equal(parseDate("13/2/2026"), "2026-02-13");
assert.equal(parseDate("2026-02-30"), null);
assert.equal(parseAmount("$1,234.50"), 1234.5);
assert.equal(parseAmount("(12.00)"), -12);
assert.equal(parseAmount("-5"), -5);
assert.equal(parseAmount("abc"), null);

// our own export round-trips, including the formula-injection prefix
assert.ok(isOwnFormat(OWN_HEADERS));
const own = parseCsv(
  OWN_HEADERS.join(",") + "\r\n" + `2026-01-05,out,subscription,"'-Weird, name",Software,Acme,12.5,USD,1,12.5,\r\n` + `2026-01-06,in,income,Retainer,Client work,,100,EUR,1.1,110,"note"\r\n`,
);
const o = buildRows(own[0], own.slice(1), { own: true, mapping: guessMapping(own[0]), signed: false });
assert.equal(o.skipped.length, 0);
assert.equal(o.rows[0].description, "-Weird, name");
assert.equal(o.rows[0].kind, "subscription");
assert.equal(o.rows[1].fx_rate, 1.1);

// foreign file, signed amounts
const f = parseCsv("Posted,Payee,Amount\n2026-02-01,Figma,-15\n2026-02-02,Client,\"1,200.00\"\nbad,x,1\n2026-02-03,,5");
const m = guessMapping(f[0]);
assert.deepEqual([m.date, m.description, m.amount], [0, 1, 2]);
const b = buildRows(f[0], f.slice(1), { own: false, mapping: m, signed: true });
assert.deepEqual(b.rows.map((r) => [r.direction, r.amount]), [["out", 15], ["in", 1200]]);
assert.equal(b.skipped.length, 2);
console.log("csv ok");
