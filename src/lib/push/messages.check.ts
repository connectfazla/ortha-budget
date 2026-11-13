// Run: node --experimental-strip-types src/lib/push/messages.check.ts
import assert from "node:assert/strict";
import { buildMessage } from "./messages.ts";

assert.equal(buildMessage("digest", {}), null); // nothing to say, nothing sent
assert.equal(buildMessage("log", {})?.url, "/transactions?add=1");
const one = buildMessage("digest", { renewals: [{ name: "Figma", amount: 45, currency: "USD", direction: "out" }] })!;
assert.match(one.body, /Figma renews tomorrow: \$45\.00\./);
assert.equal(one.badge, 1);
const many = buildMessage("digest", {
  renewals: ["A", "B", "C"].map((name) => ({ name, amount: 1, currency: "USD", direction: "out" as const })),
  overdue: 2,
  over_budget: ["AI"],
})!;
assert.match(many.body, /3 renewals tomorrow: A, B and 1 more\. 2 payments are overdue\. Over budget: AI\./);
assert.equal(many.badge, 5);
assert.equal(buildMessage("digest", { over_budget: ["Ads"] })!.url, "/budgets");
assert.equal(buildMessage("nope", {}), null);
console.log("push messages ok");
