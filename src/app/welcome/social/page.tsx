import type { Metadata } from "next";
import "@/components/landing/landing.css";
import { Logo } from "@/components/brand/logo";
import { IPhone } from "@/components/landing/iphone";
import { Inter } from "next/font/google";
import Image from "next/image";

// Social posts set the headline in Inter Regular (owner preference); the rest of the page keeps the app fonts.
const inter = Inter({ subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: { absolute: "Budget Ortha social kit" },
  robots: { index: false, follow: false },
};

type Phone = { src: string; alt: string; left: number; top: number; width: number };
type Board = { w: number; h: number; pad: number; head: number; headWidth: number; top: number; phones: Phone[]; sub?: number };

const HOME = { src: "/landing/home.png", alt: "Budget Ortha home screen" };
const SUBS = { src: "/landing/subscriptions.png", alt: "Budget Ortha subscriptions screen" };

/**
 * Artboards in CSS px at half the exported size; scripts/social-kit.mjs shoots them at deviceScaleFactor 2.
 * Phones are listed back to front and run off the bottom edge on purpose.
 */
const BOARDS: Record<string, Board> = {
  linkedin: {
    w: 600, h: 313.5, pad: 32, head: 36, headWidth: 280, top: 80,
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
  // X thread images: 1200 x 675 CSS px, shot at 4x (2400 x 1350).
  x1: {
    w: 1200, h: 675, pad: 56, head: 76, headWidth: 540, top: 190, sub: 22,
    phones: [
      { ...SUBS, left: 690, top: 170, width: 300 },
      { ...HOME, left: 880, top: 100, width: 300 },
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

const SHOT = { w: 1179, h: 2556 };
const mono = "font-mono";
const heading = `${inter.className} font-normal tracking-[-0.035em] text-balance`;

/** A crop of a 1179 x 2556 phone screenshot: (x, y, w) in source px, drawn dw px wide, clipped to dh px tall. */
function Crop({ src, alt, x, y, w, dw, dh }: { src: string; alt: string; x: number; y: number; w: number; dw: number; dh: number }) {
  const k = dw / w;
  return (
    <div className="relative overflow-hidden" style={{ width: dw, height: dh }}>
      <Image src={src} alt={alt} width={SHOT.w} height={SHOT.h} unoptimized className="absolute max-w-none" style={{ width: SHOT.w * k, height: SHOT.h * k, left: -x * k, top: -y * k }} />
    </div>
  );
}

const Tile = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ width: 352 }}>
    <p className="text-foreground mb-4 text-[20px] font-medium">{label}</p>
    <div className="border-border overflow-hidden rounded-2xl border" style={{ height: 206 }}>{children}</div>
  </div>
);

function Notification() {
  return (
    <div className="flex h-full items-center px-5" style={{ background: "linear-gradient(160deg, #1f2a44, #0e1322)" }}>
      <div className="flex w-full items-start gap-3 rounded-[22px] p-3.5" style={{ background: "rgba(120,124,140,0.38)", backdropFilter: "blur(20px)", boxShadow: "0 8px 30px rgba(0,0,0,.35)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" width={40} height={40} className="rounded-[9px]" />
        <div className="min-w-0 flex-1 leading-snug">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[15px] font-semibold text-white">Anything to log today?</p>
            <p className="text-[12.5px] text-white/60">now</p>
          </div>
          <p className="mt-0.5 text-[14px] text-white/85">Add today&apos;s expenses and income while you remember them.</p>
        </div>
      </div>
    </div>
  );
}

function Frame({ children, glow }: { children: React.ReactNode; glow: { left: number; top: number; width: number } }) {
  return (
    <div className="dark landing social-board bg-background text-foreground isolate" style={{ "--w": "1200px", "--h": "675px" } as React.CSSProperties}>
      <div aria-hidden className="landing-glow" style={{ ...glow, filter: `blur(${Math.round(glow.width / 14)}px)` }} />
      <div className="absolute" style={{ left: 56, top: 48 }}><Logo /></div>
      {children}
    </div>
  );
}

const K = ({ c, children }: { c: string; children: React.ReactNode }) => <span style={{ color: c }}>{children}</span>;

function X2() {
  return (
    <Frame glow={{ left: 600, top: 640, width: 1000 }}>
      <h1 className={heading} style={{ position: "absolute", left: 56, top: 120, fontSize: 68, lineHeight: 1.02 }}>The details that matter</h1>
      <div className="absolute flex gap-6" style={{ left: 56, top: 270 }}>
        <Tile label="Lifetime deals show their payback">
          <Crop src="/landing/lifetime.png" alt="Lifetime deals" x={49} y={1040} w={1084} dw={350} dh={206} />
        </Tile>
        <Tile label="Cancel by dates">
          <Crop src="/landing/subscriptions.png" alt="Subscription with a cancel by tag" x={49} y={1620} w={1084} dw={350} dh={206} />
        </Tile>
        <Tile label="An evening reminder"><Notification /></Tile>
      </div>
    </Frame>
  );
}

function X3() {
  const chips = ["Next.js 16", "Supabase", "shadcn/ui", "Vercel"];
  const kw = "#c4a8ff", id = "#8cc2ff", str = "#7fdca4";
  return (
    <Frame glow={{ left: 860, top: 360, width: 1100 }}>
      <div className="absolute" style={{ left: 56, top: 128, width: 460 }}>
        <h1 className={heading} style={{ fontSize: 68, lineHeight: 1.02 }}>Your rows are yours</h1>
        <p className="text-muted-foreground mt-5 text-balance text-[22px] leading-snug">Row-level security on every table. No admin key in the app.</p>
      </div>
      <div className="absolute flex gap-2.5" style={{ left: 56, bottom: 56 }}>
        {chips.map((c) => <span key={c} className="border-border text-foreground rounded-full border px-4 py-2 text-[17px]">{c}</span>)}
      </div>
      <div className={`${mono} absolute rounded-2xl border border-white/10 p-8 text-[21px] leading-[1.65]`} style={{ left: 548, top: 150, width: 604, background: "#0b0f19", boxShadow: "0 30px 80px rgba(0,0,0,.5)" }}>
        <div className="mb-5 flex gap-2">{[0, 1, 2].map((i) => <span key={i} className="size-3 rounded-full bg-white/15" />)}</div>
        <pre className="font-[inherit] whitespace-pre text-white/90">
          <K c={kw}>create policy</K> <K c={id}>own_transactions</K>{"\n"}
          {"  "}<K c={kw}>on</K> transactions{"\n"}
          {"  "}<K c={kw}>for all to</K> authenticated{"\n"}
          {"  "}<K c={kw}>using</K> (user_id ={"\n"}
          {"    "}((<K c={kw}>select</K> auth.jwt()) -&gt;&gt; <K c={str}>&apos;sub&apos;</K>)){"\n"}
          {"  "}<K c={kw}>with check</K> (user_id ={"\n"}
          {"    "}((<K c={kw}>select</K> auth.jwt()) -&gt;&gt; <K c={str}>&apos;sub&apos;</K>));
        </pre>
      </div>
    </Frame>
  );
}

function X4() {
  return (
    <Frame glow={{ left: 960, top: 520, width: 1000 }}>
      <h1 className={heading} style={{ position: "absolute", left: 56, top: 120, fontSize: 80, lineHeight: 1 }}>Try the demo</h1>
      <div className="border-border bg-card/60 absolute rounded-2xl border p-6" style={{ left: 56, top: 236, width: 480 }}>
        <div className="flex items-baseline justify-between"><span className="text-muted-foreground text-[18px]">Email</span><span className={`${mono} text-[22px]`}>demo@example.com</span></div>
        <div className="bg-border my-4 h-px" />
        <div className="flex items-baseline justify-between"><span className="text-muted-foreground text-[18px]">Password</span><span className={`${mono} text-[22px]`}>demo1234</span></div>
        <p className="text-muted-foreground mt-5 text-[15px]">Resets every 6 hours</p>
      </div>
      <div className="absolute" style={{ left: 56, top: 462 }}>
        <p className={`${mono} text-[22px]`}>github.com/connectfazla/ortha-budget</p>
        <p className="text-muted-foreground mt-2 text-[17px]">MIT licensed</p>
      </div>
      <p className="text-muted-foreground absolute text-[15px]" style={{ left: 56, bottom: 40 }}>Made by Ortha Studio. Developed by fazla.dev.</p>
      <div className="absolute" style={{ left: 810, top: 80, width: 300 }}>
        <IPhone src="/landing/sign-in.png" alt="Budget Ortha sign-in screen" sizes="280px" unoptimized className="w-full" />
      </div>
    </Frame>
  );
}

export default async function SocialPage({ searchParams }: { searchParams: Promise<{ format?: string }> }) {
  const { format = "linkedin" } = await searchParams;
  if (format === "x2") return <X2 />;
  if (format === "x3") return <X3 />;
  if (format === "x4") return <X4 />;
  const b = BOARDS[format] ?? BOARDS.linkedin;
  // The landing hero's one glow, centred on the phone pair and sized to its spread.
  const left = Math.min(...b.phones.map((p) => p.left));
  const right = Math.max(...b.phones.map((p) => p.left + p.width));
  const top = Math.min(...b.phones.map((p) => p.top));
  const glow = { left: (left + right) / 2, top: top + b.phones[0].width * 0.9, width: (right - left) * 1.9 };
  return (
    // dark: the kit leads with the landing page's default dark palette, whatever the viewer's theme.
    <div className="dark landing social-board bg-background text-foreground isolate" data-format={format} style={{ "--w": `${b.w}px`, "--h": `${b.h}px` } as React.CSSProperties}>
      <div aria-hidden className="landing-glow" style={{ left: glow.left, top: glow.top, width: glow.width, filter: `blur(${Math.round(glow.width / 14)}px)` }} />
      <div className="absolute" style={{ left: b.pad, top: format === "story" ? 96 : b.pad }}>
        <Logo />
      </div>
      <div className="absolute" style={{ left: b.pad, top: b.top, width: b.headWidth }}>
        <h1 className={`${inter.className} font-normal tracking-[-0.035em] text-balance`} style={{ fontSize: b.head, lineHeight: 1.02 }}>
          A pocket ledger for your agency.
        </h1>
        <p className="text-muted-foreground mt-4 leading-snug" style={{ fontSize: b.sub ?? 13 }}>Open source. Made by Ortha Studio.</p>
      </div>
      {b.phones.map((p) => (
        <div key={p.src} className="absolute" style={{ left: p.left, top: p.top, width: p.width }}>
          <IPhone src={p.src} alt={p.alt} sizes={`${Math.round(p.width * 0.93)}px`} hero unoptimized className="w-full" />
        </div>
      ))}
    </div>
  );
}
