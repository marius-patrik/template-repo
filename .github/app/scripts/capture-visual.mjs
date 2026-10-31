import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdirSync } from "node:fs";

const require = createRequire(resolve("package.json"));
const { chromium } = require("playwright");
const app = pathToFileURL(resolve(process.argv[2] ?? "../../.canvas-dist/index.html")).href;
const root = resolve("review");
mkdirSync(root, { recursive: true });
const browser = await chromium.launch({ headless: true });

async function capture(name, width, height, open, pageAction) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(app, { waitUntil: "load" });
  await page.locator(".cx-shell").waitFor({ timeout: 20000 });
  if (pageAction) await pageAction(page);
  else if (open) {
    await page.locator(".dock-welcome-options").getByRole("button", { name: open, exact: true }).click();
    await page.locator(`[data-dock-view="${open.toLowerCase()}"]`).waitFor();
  }
  await page.waitForTimeout(800);
  if (errors.length) throw Error(name + ": " + errors.join("; "));
  await page.screenshot({ path: resolve(root, name + ".png"), animations: "disabled" });
  console.log(name, JSON.stringify({
    viewport: { width, height },
    overflowsX: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
    mainRect: await page.locator(".cx-dock").boundingBox(),
  }));
  await page.close();
}
try {
  await capture("desktop-welcome", 1440, 900);
  await capture("desktop-canvas", 1440, 900, "Canvas");
  await capture("desktop-editor", 1440, 900, "Editor");
  await capture("desktop-settings", 1440, 900, "Settings");
  await capture("laptop-canvas", 1024, 768, "Canvas");
  await capture("mobile-welcome", 390, 844);
  await capture("mobile-canvas", 390, 844, "Canvas");
  await capture("desktop-floating", 1440, 900, undefined, async (page) => {
    await page.locator(".dock-welcome-options").getByRole("button", { name: "Settings" }).click();
    await page.getByRole("combobox", { name: "Omnibar position" }).click();
    await page.getByRole("option", { name: "Floating" }).click();
    await page.getByRole("combobox", { name: "Do anything" }).click();
    await page.getByRole("listbox", { name: "Open navigation tree" }).waitFor();
  });
} finally { await browser.close(); }
