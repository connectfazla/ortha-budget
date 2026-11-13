// Turns a push_due() row into the notification text. Pure, so it is checked by messages.check.ts.

export type DuePayload = {
  base?: string;
  renewals?: { name: string; amount: number; currency: string; direction: "in" | "out" }[];
  overdue?: number;
  trials?: { name: string; kind: "trial" | "cancel" }[];
  over_budget?: string[];
};

export type PushMessage = { title: string; body: string; url: string; tag: string; badge: number };

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function list(names: string[]) {
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
}

/** null means there is nothing worth sending for this row. */
export function buildMessage(kind: string, p: DuePayload): PushMessage | null {
  if (kind === "log") {
    return { title: "Anything to log today?", body: "Add today's expenses and income while you remember them.", url: "/transactions?add=1", tag: "daily-log", badge: 0 };
  }
  if (kind !== "digest") return null;

  const lines: string[] = [];
  const renewals = p.renewals ?? [];
  const outs = renewals.filter((r) => r.direction === "out");
  const ins = renewals.filter((r) => r.direction === "in");
  if (outs.length === 1) lines.push(`${outs[0].name} renews tomorrow: ${money(outs[0].amount, outs[0].currency)}.`);
  else if (outs.length > 1) lines.push(`${outs.length} renewals tomorrow: ${list(outs.map((r) => r.name))}.`);
  if (ins.length) lines.push(`Expected tomorrow: ${list(ins.map((r) => r.name))}.`);
  for (const t of p.trials ?? []) lines.push(t.kind === "trial" ? `${t.name} trial ends tomorrow.` : `Cancel ${t.name} soon if you don't need it.`);
  if (p.overdue) lines.push(p.overdue === 1 ? "1 payment is overdue." : `${p.overdue} payments are overdue.`);
  if (p.over_budget?.length) lines.push(`Over budget: ${list(p.over_budget)}.`);
  if (!lines.length) return null;

  const badge = outs.length + (p.overdue ?? 0) + (p.trials?.length ?? 0);
  const title = outs.length || p.overdue ? "Coming up" : p.trials?.length ? "Trials and cancellations" : "Budget check";
  return { title, body: lines.join(" "), url: p.over_budget?.length && !outs.length ? "/budgets" : "/subscriptions", tag: "digest", badge };
}
