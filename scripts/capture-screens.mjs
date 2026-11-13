// Captures the landing-page screenshots from the running dev server with a throwaway demo account.
// Usage: node scripts/capture-screens.mjs [baseURL]   (default http://localhost:3000)
// Signs up demo+<timestamp>@example.com, loads the sample data, captures, signs out. Credentials are never stored.
//
// Phone shots are assembled like a real iPhone 16 Pro screenshot (393 x 852 pt @3x): a 54 pt status bar,
// the app below it with a 34 pt bottom safe area, and the home indicator on top.
import { chromium } from "playwright";
import sharp from "sharp";
import { randomUUID } from "node:crypto";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = new URL("../public/landing/", import.meta.url);
const W = 393, H = 852, STATUS = 54, SAFE_BOTTOM = 34, DPR = 3;
// Dev indicator off; the account email (sidebar on desktop) hidden so no address reaches a capture.
const CSS = `nextjs-portal{display:none!important} [title*="@"]{visibility:hidden!important}`;

const browser = await chromium.launch();
const phone = await browser.newContext({
  viewport: { width: W, height: H - STATUS },
  deviceScaleFactor: DPR,
  hasTouch: true,
  isMobile: true,
  colorScheme: "dark",
  reducedMotion: "reduce",
});
const page = await phone.newPage();
const cdp = await phone.newCDPSession(page);
await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: { bottom: SAFE_BOTTOM } });

async function settle(p, path) {
  await p.goto(BASE + path, { waitUntil: "networkidle" });
  await p.addStyleTag({ content: CSS });
  await p.waitForTimeout(1500);
  if (await p.evaluate(() => /(demo|e2e)\+\d+@/.test(document.body.innerText))) throw new Error(`Account email visible on ${path}`);
}

const save = (img, file) =>
  img.png({ palette: true, quality: 92, compressionLevel: 9, effort: 10 }).toFile(new URL(file, OUT).pathname).then(() => console.log("saved", file));

// iOS status bar (9:41, signal, wi-fi, battery) rendered by Chromium in the system face, on the page's paper colour.
/** True when a CSS rgb() colour is dark, so the status bar glyphs should be white. */
function isDark(rgb) {
  const [r, g, b] = (rgb.match(/\d+(\.\d+)?/g) ?? ["255", "255", "255"]).map(Number);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
}

// paper = band colour, or null for a transparent band laid over a full-bleed screen (white glyphs).
async function statusBar(paper) {
  const ink = paper === null || isDark(paper) ? "#fff" : "#000";
  const p = await browser.newPage({ viewport: { width: W, height: STATUS }, deviceScaleFactor: DPR });
  await p.setContent(`<style>svg{fill:${ink}}</style><body style="margin:0;background:${paper ?? "transparent"};font:600 17px/1 -apple-system,system-ui,sans-serif;color:${ink}">
    <div style="display:flex;justify-content:space-between;align-items:center;height:${STATUS}px;padding:0 30px 0 52px;box-sizing:border-box">
      <span style="letter-spacing:-0.02em;padding-top:2px">9:41</span>
      <span style="display:flex;gap:7px;align-items:center">
        <svg width="19" height="12" viewBox="0 0 19 12"><rect x="0" y="7.5" width="3.2" height="4.5" rx="1"/><rect x="5.1" y="5" width="3.2" height="7" rx="1"/><rect x="10.2" y="2.5" width="3.2" height="9.5" rx="1"/><rect x="15.3" y="0" width="3.2" height="12" rx="1"/></svg>
        <svg width="17" height="12" viewBox="0 0 17 12"><path d="M8.5 2.6c2.4 0 4.6.9 6.2 2.5l1.2-1.2A10.4 10.4 0 0 0 8.5.9 10.4 10.4 0 0 0 1.1 3.9l1.2 1.2a8.7 8.7 0 0 1 6.2-2.5Zm0 3.4c1.5 0 2.8.6 3.8 1.5l1.2-1.2a7 7 0 0 0-10 0l1.2 1.2c1-.9 2.3-1.5 3.8-1.5Zm0 3.4c.6 0 1.1.2 1.5.6L8.5 11.5 7 10c.4-.4.9-.6 1.5-.6Z"/></svg>
        <svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.8" fill="none" stroke="${ink}" opacity=".35"/><rect x="2" y="2" width="20" height="9" rx="2.5"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" opacity=".4"/></svg>
      </span>
    </div></body>`);
  const buf = await p.screenshot({ omitBackground: paper === null });
  await p.close();
  return buf;
}

/**
 * fullBleed: the page draws under the status bar itself (Home's gradient hero uses env(safe-area-inset-top)),
 * so capture the whole screen and lay transparent white glyphs on top, like iOS does.
 */
async function phoneShot(path, file, { fullBleed = false } = {}) {
  if (fullBleed) {
    await page.setViewportSize({ width: W, height: H });
    await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: { top: STATUS, bottom: SAFE_BOTTOM } });
  }
  await settle(page, path);
  const paper = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const app = await page.screenshot();
  const indicatorFill = isDark(paper) ? "#fff" : "#000";
  const indicator = Buffer.from(
    `<svg width="${W * DPR}" height="${SAFE_BOTTOM * DPR}"><rect x="${(W - 134) / 2 * DPR}" y="${(SAFE_BOTTOM - 8 - 5) * DPR}" width="${134 * DPR}" height="${5 * DPR}" rx="${2.5 * DPR}" fill="${indicatorFill}"/></svg>`,
  );
  const layers = fullBleed
    ? [
        { input: app, top: 0, left: 0 },
        { input: await statusBar(null), top: 0, left: 0 },
        { input: indicator, top: (H - SAFE_BOTTOM) * DPR, left: 0 },
      ]
    : [
        { input: await statusBar(paper), top: 0, left: 0 },
        { input: app, top: STATUS * DPR, left: 0 },
        { input: indicator, top: (H - SAFE_BOTTOM) * DPR, left: 0 },
      ];
  const img = sharp({ create: { width: W * DPR, height: H * DPR, channels: 3, background: "#000" } }).composite(layers);
  await save(sharp(await img.png().toBuffer()), file);
  if (fullBleed) {
    await page.setViewportSize({ width: W, height: H - STATUS });
    await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: { bottom: SAFE_BOTTOM } });
  }
}

await page.goto(BASE + "/sign-up");
await page.getByLabel("Email").fill(`demo+${Date.now()}@example.com`);
await page.getByLabel("Password", { exact: true }).fill(`Demo-${randomUUID()}`);
await page.getByRole("button", { name: "Create account" }).click();
await page.waitForURL((u) => !u.pathname.startsWith("/sign-") && u.pathname !== "/welcome");

// First run asks for the look first; dark matches the landing page default.
const look = page.getByRole("heading", { name: /How should Budget Ortha look/ });
const sampleBtn = page.getByRole("button", { name: "Load sample data" });
await look.or(sampleBtn).first().waitFor({ timeout: 30_000 });
if (await look.isVisible()) {
  await page.getByRole("radio", { name: /Dark/ }).or(page.getByRole("button", { name: /^Dark/ })).first().click();
  await page.getByRole("button", { name: "Continue" }).click();
}
await page.getByRole("button", { name: "Load sample data" }).click();
await page.getByRole("heading", { name: "Know what you owe before it is due." }).waitFor({ state: "detached", timeout: 30_000 });

await phoneShot("/", "home.png", { fullBleed: true });
await phoneShot("/subscriptions", "subscriptions.png");
await settle(page, "/clients");
const client = await page.locator('a[href^="/clients/"]').first().getAttribute("href");
await phoneShot(client, "clients.png");

// Desktop reports shot, same session.
const desk = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: "dark",
  reducedMotion: "reduce",
  storageState: await phone.storageState(),
});
const dp = await desk.newPage();
await settle(dp, "/reports");
// Cropped to the charts and the by-client table.
await save(sharp(await dp.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 788 } })), "reports-desktop.png");
await desk.close();

// Sign out through the settings form; the account and its sample rows stay.
await page.goto(BASE + "/settings");
await page.getByRole("button", { name: "Sign out" }).first().click();
await page.waitForURL((u) => u.pathname !== "/settings");
await browser.close();
