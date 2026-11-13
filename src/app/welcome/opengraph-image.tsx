import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Budget Ortha: a pocket ledger for your agency";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ImageResponse can't read CSS variables, so these mirror the light field tokens in src/components/landing/landing.css
// (--field, --field-ink, --field-muted, --field-signal). Keep them in step if the tokens move.
const FIELD = { paper: "#3236a6", ink: "#f7f7ff", muted: "#c9ccfa", signal: "#aab0ff" };
// The phone bezel mirrors iphone.tsx: black glass and the titanium rail.
const BEZEL = { glass: "#050505", rail: "#b3afa8" };

// Font: next/og bundles Geist Regular, which is the app's UI face.
export default async function Image() {
  const shot = await readFile(join(process.cwd(), "public/landing/home.png"));
  const src = `data:image/png;base64,${shot.toString("base64")}`;
  // The real home screen in a plain black bezel, rising out of the bottom edge (the landing hero's move).
  const phone = { w: 380, screenW: 356, top: 96 };
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: FIELD.paper, color: FIELD.ink, position: "relative" }}>
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
            <div style={{ fontSize: 84, lineHeight: 1.02, letterSpacing: "-0.045em" }}>A pocket ledger for your agency.</div>
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
    size,
  );
}
