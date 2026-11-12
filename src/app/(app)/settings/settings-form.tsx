"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveSettings } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SettingsForm({ taxRate, cash }: { taxRate: number; cash: number | null }) {
  const [tax, setTax] = useState(String(taxRate || ""));
  const [bal, setBal] = useState(cash === null ? "" : String(cash));
  const [pending, start] = useTransition();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await saveSettings({ tax_rate: tax.trim() === "" ? 0 : Number(tax), cash_on_hand_usd: bal.trim() === "" ? null : Number(bal.replace(/,/g, "")) });
      if (r.ok) toast.success("Saved");
      else toast.error(r.error);
    });
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Tax set-aside (%)</span>
        <Input inputMode="decimal" value={tax} onChange={(e) => setTax(e.target.value)} placeholder="0" className="mt-1.5 h-11" />
        <span className="text-muted-foreground mt-1 block text-xs">Share of each month&apos;s income to put aside. Leave at 0 to hide it.</span>
      </label>
      <label className="block">
        <span className="text-sm font-medium">Cash on hand (USD)</span>
        <Input inputMode="decimal" value={bal} onChange={(e) => setBal(e.target.value)} placeholder="0.00" className="mt-1.5 h-11" />
        <span className="text-muted-foreground mt-1 block text-xs">Used for runway. Update it when your balance changes.</span>
      </label>
      <Button type="submit" className="press h-11" disabled={pending}>{pending ? "Saving" : "Save"}</Button>
    </form>
  );
}
