// Renders the launch-post images from /welcome/social on the running dev server.
// Usage: node scripts/social-kit.mjs [baseURL]   (default http://localhost:3000)
// Each artboard is laid out at half the platform size in CSS px and shot at deviceScaleFactor 4, so every PNG is
// twice the platform's pixel size (sharp on retina; platforms downscale cleanly). Output: ~/Downloads/budget-ortha-social/
import { chromium } from "playwright";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const BASE = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "http://localhost:3000";
const OUT = join(homedir(), "Downloads", "budget-ortha-social");
const KIT = [
  { format: "linkedin", file: "linkedin-2400x1254.png", w: 1200, h: 627 },
  { format: "square", file: "instagram-square-2160.png", w: 1080, h: 1080 },
  { format: "portrait", file: "instagram-portrait-2160x2700.png", w: 1080, h: 1350 },
  { format: "story", file: "instagram-story-2160x3840.png", w: 1080, h: 1920 },
];

// --x adds the X thread images (1200 x 675 CSS px, so 2400 x 1350 at 4x).
if (process.argv.includes("--x")) KIT.length = 0;
for (let i = 1; i <= 4; i++) if (process.argv.includes("--x")) KIT.push({ format: `x${i}`, file: `x-post-${i}-2400x1350.png`, w: 2400, h: 1350, x: true });

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1200, height: 1000 }, deviceScaleFactor: 4, colorScheme: "dark", reducedMotion: "reduce" });
await ctx.addInitScript(() => localStorage.setItem("theme", "dark"));
const page = await ctx.newPage();

for (const { format, file, w, h, x } of KIT) {
  await page.goto(`${BASE}/welcome/social?format=${format}`, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }); // dev indicator
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
  });
  const png = await page.screenshot({ clip: { x: 0, y: 0, width: w / 2, height: h / 2 } });
  // Clip rounding can land a pixel off on odd sizes (627); pin the exact platform size.
  await sharp(png).resize(x ? w : w * 2, x ? h : h * 2, { fit: "cover", position: "top" }).png({ compressionLevel: 9 }).toFile(join(OUT, file));
  console.log("saved", join(OUT, file));
}
await browser.close();
