"use client";

import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto mt-16 max-w-sm rounded-lg border border-dashed p-6 text-center">
      <p className="text-money-out text-[11px] font-medium tracking-[0.08em] uppercase">ERROR</p>
      <h1 className="mt-2 text-lg font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-muted-foreground mt-1 text-xs break-words">{error.message || "Unexpected error."}</p>
      <Button className="mt-4" onClick={reset}>
        Retry
      </Button>
    </div>
  );
}
