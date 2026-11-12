"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const OPTIONS = ["light", "dark", "system"] as const;

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  // The theme is only known in the browser; render nothing selected on the server to avoid a hydration mismatch.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const current = mounted ? theme : undefined;
  return (
    <div role="radiogroup" aria-label="Theme" className="bg-muted grid grid-cols-3 gap-1 rounded-md border p-1">
      {OPTIONS.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={current === o}
          onClick={() => setTheme(o)}
          className={cn(
            "press h-10 rounded-sm text-sm font-medium capitalize transition-colors",
            current === o ? "bg-card text-foreground border" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
