"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

/**
 * A tiny Home screen drawn in one theme. `theme-scope` re-declares the colour tokens on this element and
 * `light`/`dark` picks the side, so it shows the real palette whatever the page is using.
 */
function Mock({ scheme, className }: { scheme: "light" | "dark"; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("theme-scope bg-background text-foreground absolute inset-0 flex flex-col gap-1 p-1.5", scheme, className)}
    >
      <span className="bg-foreground/70 block h-1 w-7 rounded-full" />
      <span className="bg-card shadow-card mt-0.5 flex flex-col gap-1 rounded-[3px] p-1.5">
        <span className="bg-foreground block h-2 w-9 rounded-[2px]" />
        <span className="flex gap-1">
          <span className="bg-money-in block h-1 w-4 rounded-full" />
          <span className="bg-money-out block h-1 w-4 rounded-full" />
        </span>
      </span>
      <span className="bg-muted block h-1.5 w-full rounded-[2px]" />
      <span className="bg-muted block h-1.5 w-3/4 rounded-[2px]" />
      <span className="bg-card absolute inset-x-0 bottom-0 flex h-3.5 items-center justify-center border-t">
        <span className="bg-brand block size-2 rounded-[2px]" />
      </span>
    </span>
  );
}

/**
 * Light / Dark / System as three preview tiles [Starling App Theme][Mercury Appearance].
 * The choice applies at once through next-themes, which stores it in this browser.
 */
export function ThemeSwitch({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  // The theme is only known in the browser; render nothing selected on the server to avoid a hydration mismatch.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const current = mounted && theme ? [theme] : [];
  return (
    <ToggleGroup
      aria-label="Appearance"
      value={current}
      onValueChange={(v) => v[0] && setTheme(v[0] as string)}
      className={cn("grid w-full grid-cols-3 gap-3", className)}
    >
      {OPTIONS.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className="text-muted-foreground aria-pressed:text-foreground h-auto min-w-0 flex-col gap-2 rounded-lg p-1 hover:bg-transparent aria-pressed:bg-transparent"
        >
          <span className="group-aria-pressed/toggle:ring-brand group-aria-pressed/toggle:border-brand relative block aspect-[4/5] w-full overflow-hidden rounded-md border ring-1 ring-transparent">
            <Mock scheme={o.value === "dark" ? "dark" : "light"} />
            {/* System: the right half shows the dark theme, like iOS's own Automatic tile. */}
            {o.value === "system" ? <Mock scheme="dark" className="[clip-path:inset(0_0_0_50%)]" /> : null}
          </span>
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
