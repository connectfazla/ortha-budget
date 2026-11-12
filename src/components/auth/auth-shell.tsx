import type { ReactNode } from "react";

/** [MERC-LOGIN] centred card on a muted page, wordmark top-left of the card. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="bg-muted grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6">
          <div className="text-[13px] leading-4 font-semibold tracking-[0.2em]">ORTHA</div>
          <div className="text-muted-foreground text-[11px] leading-4 tracking-[0.2em]">/ BUDGET</div>
        </div>
        {children}
      </div>
    </main>
  );
}
