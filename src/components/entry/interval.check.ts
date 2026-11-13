// Run: node --experimental-strip-types src/components/entry/interval.check.ts
import assert from "node:assert/strict";
import { addInterval, shortDay } from "./interval.ts";

assert.equal(addInterval("2026-11-13", "monthly"), "2026-12-13");
assert.equal(addInterval("2026-11-13", "weekly"), "2026-11-20");
assert.equal(addInterval("2026-12-28", "weekly"), "2027-01-04");
assert.equal(addInterval("2026-11-13", "quarterly"), "2027-02-13");
assert.equal(addInterval("2026-11-13", "yearly"), "2027-11-13");
assert.equal(addInterval("2027-01-31", "monthly"), "2027-02-28"); // clamps like Postgres
assert.equal(addInterval("2028-02-29", "yearly"), "2029-02-28");
assert.equal(addInterval("2026-12-13", "monthly", -1), "2026-11-13");
assert.equal(addInterval("2027-01-04", "weekly", -1), "2026-12-28");
assert.equal(shortDay("2026-12-13", 2026), "Dec 13");
assert.equal(shortDay("2027-01-04", 2026), "Jan 4, 2027");
console.log("interval ok");
