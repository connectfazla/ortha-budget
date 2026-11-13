"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

/** Footer appearance switch: three icon segments with one sliding thumb [Lovart footer][Cursor footer]. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // Same as onboarding/theme-switch.tsx: the theme is only known in the browser, so the server renders none pressed.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  return (
    <ToggleGroup
      aria-label="Appearance"
      spacing={0}
      value={mounted && theme ? [theme] : []}
      onValueChange={(v) => v[0] && setTheme(v[0] as string)}
      className="bg-muted rounded-lg"
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <ToggleGroupItem
          key={value}
          value={value}
          aria-label={label}
          className="text-muted-foreground data-pressed:text-foreground h-11 w-12 hover:bg-transparent sm:h-9 sm:w-10"
        >
          <Icon aria-hidden />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
