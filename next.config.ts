import type { NextConfig } from "next";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // ponytail: frame-ancestors only; a full script/connect CSP needs Clerk's domains, add per Clerk's CSP guide if required.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // web-push is CommonJS; bundled by Turbopack it has no default export, which src/lib/push/send.ts imports.
  serverExternalPackages: ["web-push"],
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      // The browser must always fetch a fresh service worker, or push fixes never reach installed apps.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }, { key: "Content-Type", value: "application/javascript; charset=utf-8" }] },
    ];
  },
  // Every page is per-user and reads auth cookies, so Cache Components / static prerender buy nothing here.
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
