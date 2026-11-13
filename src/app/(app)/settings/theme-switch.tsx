"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const OPTIONS = ["light", "dark", "system"] as const;

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  // The theme is only known in the browser; render nothing selected on the server to avoid a hydration mismatch.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const current = mounted && theme ? [theme] : [];
  return (
    <ToggleGroup
      aria-label="Theme"
      value={current}
      onValueChange={(v) => v[0] && setTheme(v[0] as string)}
      spacing={0}
      className="bg-muted grid w-full grid-cols-3 rounded-lg"
    >
      {OPTIONS.map((o) => (
        <ToggleGroupItem key={o} value={o} className="text-muted-foreground data-pressed:text-foreground h-11 capitalize">
          {o}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
