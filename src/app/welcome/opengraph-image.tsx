import { ImageResponse } from "next/og";

export const alt = "Ortha Budget: a pocket ledger for your agency";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ImageResponse can't read CSS variables, so these mirror the light tokens in src/app/globals.css
// (--background, --foreground, --muted-foreground, --brand). Keep them in step if the tokens move.
const TOKENS = { paper: "#f5f6f8", ink: "#15171a", muted: "#5f6368", brand: "#3d4bd6" };

// Font: next/og bundles Geist Regular, which is the app's UI face.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: TOKENS.paper,
          color: TOKENS.ink,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg aria-hidden="true" width="56" height="56" viewBox="0 0 24 24" fill="none" strokeWidth={3.25}>
            <path d="M12 18.25A7.5 7.5 0 0 1 12 3.25" stroke={TOKENS.ink} />
            <path d="M12 5.75A7.5 7.5 0 0 1 12 20.75" stroke={TOKENS.brand} />
          </svg>
          <div style={{ display: "flex", gap: 12, fontSize: 36, letterSpacing: "-0.02em" }}>
            <span>Ortha</span>
            <span style={{ color: TOKENS.muted }}>Budget</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 92, lineHeight: 1.02, letterSpacing: "-0.045em", maxWidth: 900 }}>
            A pocket ledger for your agency.
          </div>
          <div style={{ fontSize: 32, color: TOKENS.muted, letterSpacing: "-0.01em" }}>
            Subscriptions, lifetime deals, contractors and client profit.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
