"use client";

import { createContext, useContext } from "react";
import { formatMoney } from "@/lib/money";

type Secondary = { currency: string; rate: number } | null;

const Ctx = createContext<Secondary>(null);

export function SecondaryCurrencyProvider({ value, children }: { value: Secondary; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSecondary = () => useContext(Ctx);

/** Tiny muted line under a <Money>. Sized from the parent (0.6em), no sign colour. Renders nothing without a rate. */
export function SecondaryLine({ value }: { value: number }) {
  const s = useSecondary();
  if (!s) return null;
  return (
    <span className="text-muted-foreground block text-[0.6em] leading-tight font-medium tabular-nums">
      {formatMoney(value * s.rate, s.currency)}
    </span>
  );
}
