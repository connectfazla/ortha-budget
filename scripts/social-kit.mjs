// Renders the launch-post images from /welcome/social on the running dev server.
// Usage: node scripts/social-kit.mjs [baseURL]   (default http://localhost:3000)
// Each artboard is laid out at half size in CSS px and shot at deviceScaleFactor 2, so every PNG is exactly
// the platform's pixel size with 2x-sharp type and phone screens. Output: ~/Downloads/budget-ortha-social/
import { chromium } from "playwright";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = join(homedir(), "Downloads", "budget-ortha-social");
const KIT = [
  { format: "linkedin", file: "linkedin-1200x627.png", w: 1200, h: 627 },
  { format: "square", file: "instagram-square-1080.png", w: 1080, h: 1080 },
  { format: "portrait", file: "instagram-portrait-1080x1350.png", w: 1080, h: 1350 },
  { format: "story", file: "instagram-story-1080x1920.png", w: 1080, h: 1920 },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1200, height: 1000 }, deviceScaleFactor: 2, colorScheme: "light", reducedMotion: "reduce" });
await ctx.addInitScript(() => localStorage.setItem("theme", "light"));
const page = await ctx.newPage();

for (const { format, file, w, h } of KIT) {
  await page.goto(`${BASE}/welcome/social?format=${format}`, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }); // dev indicator
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
  });
  const png = await page.screenshot({ clip: { x: 0, y: 0, width: w / 2, height: h / 2 } });
  // Clip rounding can land a pixel off on odd sizes (627); pin the exact platform size.
  await sharp(png).resize(w, h, { fit: "cover", position: "top" }).png({ compressionLevel: 9 }).toFile(join(OUT, file));
  console.log("saved", join(OUT, file));
}
await browser.close();
