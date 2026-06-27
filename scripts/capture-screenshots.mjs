/**
 * Capture README screenshots from a running dev server.
 * Usage: npm run dev (8080) + backend (8001), then:
 *   node scripts/capture-screenshots.mjs
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "docs", "screenshots");
const BASE = process.env.MW_BASE_URL || "http://localhost:8080";

const shots = [
  { name: "playground", path: "/playground", wait: 1500 },
  { name: "dashboard", path: "/dashboard", wait: 1500 },
  { name: "settings", path: "/settings", wait: 1500 },
  { name: "registry", path: "/playground", wait: 2000, action: "open-model-picker" },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  for (const shot of shots) {
    const url = `${BASE}${shot.path}`;
    console.log(`Capturing ${shot.name} → ${url}`);
    await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(shot.wait);

    if (shot.action === "open-model-picker") {
      const trigger = page.locator('[role="combobox"]').first();
      if (await trigger.count()) {
        await trigger.click();
        await page.waitForTimeout(600);
      }
    }

    await page.screenshot({
      path: path.join(OUT, `${shot.name}.png`),
      fullPage: false,
    });
  }

  await browser.close();
  console.log("Done → docs/screenshots/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
