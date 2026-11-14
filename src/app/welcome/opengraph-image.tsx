import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Budget Ortha: a pocket ledger for your agency";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ImageResponse can't read CSS variables, so these mirror the dark tokens the landing page opens in:
// paper from src/components/landing/landing.css, ink, muted and --brand from globals.css, and the glow from
// --hero-from/--hero-via/--hero-to (dark). Keep them in step if the tokens move.
const FIELD = { paper: "#08090b", ink: "#f1f2f4", muted: "#9ba1aa", signal: "#4d94ff" };
// Centred on the phone (x 950), on the root so it is never clipped.
const GLOW = "radial-gradient(circle at 950px 330px, rgba(31,77,255,1) 0px, rgba(31,77,255,0.8) 200px, rgba(31,77,255,0.42) 330px, rgba(26,42,158,0.2) 450px, rgba(8,9,11,0) 620px)";
// The phone bezel mirrors iphone.tsx: black glass and the titanium rail.
const BEZEL = { glass: "#050505", rail: "#b3afa8" };

// Headline font: Inter Regular (OFL), vendored next to this file so the image renders the same everywhere.
export default async function Image() {
  const [shot, inter] = await Promise.all([
    readFile(join(process.cwd(), "public/landing/home.png")),
    readFile(join(process.cwd(), "src/app/welcome/Inter-Regular.ttf")),
  ]);
  const src = `data:image/png;base64,${shot.toString("base64")}`;
  // The real home screen in a plain black bezel, rising out of the bottom edge, with the hero's one glow behind it.
  const phone = { w: 380, screenW: 356, top: 96 };
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", backgroundColor: FIELD.paper, backgroundImage: GLOW, color: FIELD.ink, position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, width: 720 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg aria-hidden="true" width="48" height="48" viewBox="0 0 24 24" fill="none" strokeWidth={3.25}>
              <path d="M12 18.25A7.5 7.5 0 0 1 12 3.25" stroke={FIELD.ink} />
              <path d="M12 5.75A7.5 7.5 0 0 1 12 20.75" stroke={FIELD.signal} />
            </svg>
            <div style={{ display: "flex", gap: 10, fontSize: 32, letterSpacing: "-0.02em" }}>
              <span>Budget</span>
              <span style={{ color: FIELD.muted }}>Ortha</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div style={{ fontFamily: "Inter", fontWeight: 400, fontSize: 84, lineHeight: 1.04, letterSpacing: "-0.035em" }}>A pocket ledger for your agency.</div>
            <div style={{ fontSize: 28, color: FIELD.muted }}>Open source. Made by Ortha Studio.</div>
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 760,
            top: phone.top,
            width: phone.w,
            height: 780,
            display: "flex",
            justifyContent: "center",
            paddingTop: 12,
            background: BEZEL.glass,
            borderRadius: 64,
            border: `3px solid ${BEZEL.rail}`,
          }}
        >
          <div style={{ display: "flex", width: phone.screenW, height: 772, borderRadius: 52, overflow: "hidden" }}>
            <img src={src} width={phone.screenW} height={Math.round((phone.screenW * 2556) / 1179)} alt="" />
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Inter", data: inter, weight: 400, style: "normal" }] },
  );
}
