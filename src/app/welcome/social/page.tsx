import type { Metadata } from "next";
import "@/components/landing/landing.css";
import { Logo } from "@/components/brand/logo";
import { IPhone } from "@/components/landing/iphone";

export const metadata: Metadata = {
  title: { absolute: "Budget Ortha social kit" },
  robots: { index: false, follow: false },
};

type Phone = { src: string; alt: string; left: number; top: number; width: number };
type Board = { w: number; h: number; pad: number; head: number; headWidth: number; top: number; phones: Phone[] };

const HOME = { src: "/landing/home.png", alt: "Budget Ortha home screen" };
const SUBS = { src: "/landing/subscriptions.png", alt: "Budget Ortha subscriptions screen" };

/**
 * Artboards in CSS px at half the exported size; scripts/social-kit.mjs shoots them at deviceScaleFactor 2.
 * Phones are listed back to front and run off the bottom edge on purpose.
 */
const BOARDS: Record<string, Board> = {
  linkedin: {
    w: 600, h: 313.5, pad: 32, head: 40, headWidth: 330, top: 76,
    phones: [
      { ...SUBS, left: 318, top: 70, width: 168 },
      { ...HOME, left: 410, top: 34, width: 168 },
    ],
  },
  square: {
    w: 540, h: 540, pad: 36, head: 46, headWidth: 330, top: 84,
    phones: [
      { ...SUBS, left: 96, top: 292, width: 196 },
      { ...HOME, left: 248, top: 252, width: 196 },
    ],
  },
  portrait: {
    w: 540, h: 675, pad: 36, head: 50, headWidth: 360, top: 88,
    phones: [
      { ...SUBS, left: 80, top: 336, width: 214 },
      { ...HOME, left: 246, top: 290, width: 214 },
    ],
  },
  story: {
    w: 540, h: 960, pad: 40, head: 54, headWidth: 380, top: 170,
    phones: [
      { ...SUBS, left: 36, top: 448, width: 282 },
      { ...HOME, left: 226, top: 392, width: 282 },
    ],
  },
};

export default async function SocialPage({ searchParams }: { searchParams: Promise<{ format?: string }> }) {
  const { format = "linkedin" } = await searchParams;
  const b = BOARDS[format] ?? BOARDS.linkedin;
  return (
    // theme-scope + light: the kit is always the light palette, whatever the viewer's theme.
    <div className="theme-scope light landing landing-field social-board" data-format={format} style={{ "--w": `${b.w}px`, "--h": `${b.h}px` } as React.CSSProperties}>
      <div className="absolute" style={{ left: b.pad, top: format === "story" ? 96 : b.pad }}>
        <Logo />
      </div>
      <div className="absolute" style={{ left: b.pad, top: b.top, width: b.headWidth }}>
        <h1 className="font-semibold tracking-[-0.04em] text-balance" style={{ fontSize: b.head, lineHeight: 1.02 }}>
          A pocket ledger for your agency.
        </h1>
        <p className="text-muted-foreground mt-4 text-[13px] leading-snug">Open source. Made by Ortha Studio.</p>
      </div>
      {b.phones.map((p) => (
        <div key={p.src} className="absolute" style={{ left: p.left, top: p.top, width: p.width }}>
          <IPhone src={p.src} alt={p.alt} sizes={`${Math.round(p.width * 0.93)}px`} hero className="w-full" />
        </div>
      ))}
    </div>
  );
}
