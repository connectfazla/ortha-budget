import Image from "next/image";
import { useId } from "react";
import { cn } from "@/lib/utils";

/*
 * iPhone 16 Pro, front view, drawn in points on the 393 x 852 pt screen.
 * Body 71.5 x 149.6 mm: a uniform 13.6 pt border keeps that aspect around the screen.
 * Screen corners 55 pt, the outer corner concentric with it. Dynamic Island 126 x 37 pt, 11 pt from the top.
 * Buttons stand 2.4 pt proud of the rail: action and volume on the left, the side button on the right.
 */
const SCREEN_W = 393;
const SCREEN_H = 852;
const BORDER = 13.6;
const RIM = 3; // titanium rail seen from the front; the rest of the border is black glass
const NUB = 2.4;
const BODY_W = SCREEN_W + 2 * BORDER;
const BODY_H = SCREEN_H + 2 * BORDER;
const VW = BODY_W + 2 * NUB;
const R = 55 + BORDER;
const BUTTONS = [
  { side: "left", y: 170, h: 34 }, // action
  { side: "left", y: 236, h: 62 }, // volume up
  { side: "left", y: 312, h: 62 }, // volume down
  { side: "right", y: 250, h: 98 }, // side button
] as const;

const pct = (n: number, of: number) => `${(n / of) * 100}%`;

export function IPhone({
  src,
  alt,
  sizes,
  hero = false,
  className,
}: {
  src: string;
  alt: string;
  /** Rendered width of the screen (about 92.5% of the phone's width). */
  sizes: string;
  hero?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <figure
      data-kind="product"
      className={cn("landing-device relative self-start", className)}
      style={{ aspectRatio: `${VW} / ${BODY_H}` }}
    >
      <svg aria-hidden="true" viewBox={`0 0 ${VW} ${BODY_H}`} className="absolute inset-0 size-full">
        <defs>
          <linearGradient id={`${id}ti`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#8f8b85" />
            <stop offset="0.012" stopColor="#dcd8d2" />
            <stop offset="0.04" stopColor="#b3afa8" />
            <stop offset="0.5" stopColor="#c4c0ba" />
            <stop offset="0.96" stopColor="#b3afa8" />
            <stop offset="0.988" stopColor="#e3dfda" />
            <stop offset="1" stopColor="#8f8b85" />
          </linearGradient>
          <linearGradient id={`${id}btn`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#d6d2cc" />
            <stop offset="0.5" stopColor="#a29e98" />
            <stop offset="1" stopColor="#7f7b76" />
          </linearGradient>
        </defs>
        {BUTTONS.map((b) => (
          <rect
            key={`${b.side}${b.y}`}
            x={b.side === "left" ? 0 : VW - NUB - 2}
            y={b.y}
            width={NUB + 2}
            height={b.h}
            rx={1.4}
            fill={`url(#${id}btn)`}
          />
        ))}
        <rect x={NUB} y={0} width={BODY_W} height={BODY_H} rx={R} fill={`url(#${id}ti)`} />
        <rect x={NUB + 0.6} y={0.6} width={BODY_W - 1.2} height={BODY_H - 1.2} rx={R - 0.6} fill="none" stroke="#fff" strokeOpacity={0.55} strokeWidth={0.8} />
        <rect x={NUB + RIM} y={RIM} width={BODY_W - 2 * RIM} height={BODY_H - 2 * RIM} rx={R - RIM} fill="#050505" />
        <rect x={NUB + RIM + 0.5} y={RIM + 0.5} width={BODY_W - 2 * RIM - 1} height={BODY_H - 2 * RIM - 1} rx={R - RIM - 0.5} fill="none" stroke="#2c2c2e" strokeWidth={0.8} />
      </svg>
      <div
        className="absolute overflow-hidden bg-black"
        style={{
          left: pct(NUB + BORDER, VW),
          top: pct(BORDER, BODY_H),
          width: pct(SCREEN_W, VW),
          height: pct(SCREEN_H, BODY_H),
          borderRadius: `${pct(55, SCREEN_W)} / ${pct(55, SCREEN_H)}`,
        }}
      >
        <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" {...(hero ? { loading: "eager", fetchPriority: "high" } : {})} />
      </div>
      <div
        aria-hidden="true"
        className="absolute rounded-full bg-black"
        style={{
          left: pct(NUB + BORDER + (SCREEN_W - 126) / 2, VW),
          top: pct(BORDER + 11, BODY_H),
          width: pct(126, VW),
          height: pct(37, BODY_H),
        }}
      />
    </figure>
  );
}
