import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

/** [MERC-LOGIN] centred card on a muted page, wordmark top-left of the card. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="bg-muted grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6">
          <Logo />
        </div>
        {children}
      </div>
    </main>
  );
}
