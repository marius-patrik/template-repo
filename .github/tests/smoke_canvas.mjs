import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(resolve("package.json"));
const { chromium } = require("playwright");
const url = pathToFileURL(resolve(process.argv[2] ?? ".canvas-dist/index.html")).href;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];

try {
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url, { waitUntil: "load" });
  await page.locator("#root .app-root").waitFor({ timeout: 15000 });
  await page.locator(".window-titlebar").waitFor();
  await page.locator(".window-statusbar").waitFor();
  if (await page.locator(".sidebar-footer").count()) throw new Error("Redundant sidebar snapshot footer remains");
  if (await page.locator(".sidebar").getByText("Repository snapshot").count()) throw new Error("Snapshot information duplicated in sidebar");
  if (await page.locator(".window-statusbar .snapshot-desktop").count() !== 1)
    throw new Error("Read-only snapshot status is missing");
  if (await page.locator(".window-statusbar").getByText("Canvas · Git snapshot").count())
    throw new Error("Duplicate snapshot label remains in status bar");

  if (await page.locator(".project-header").count()) throw new Error("Redundant project header remains");
  if (await page.locator(".sidebar-top").count()) throw new Error("Sidebar still reserves space for collapse control");
  if (await page.locator('.sidebar [href="/settings"]').count()) throw new Error("Settings still appears in sidebar");

  await page.keyboard.press("Control+b");
  await page.locator(".sidebar.collapsed").waitFor();
  await page.keyboard.press("Control+b");
  await page.locator(".sidebar:not(.collapsed)").waitFor();

  await page.getByRole("button", { name: "Open navigation tree" }).click();
  await page.getByRole("dialog", { name: "Omnibar navigation tree" }).waitFor();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Settings", exact: true }).first().click();
  await page.getByRole("heading", { name: "Settings", exact: true }).waitFor();
  await page.getByRole("heading", { name: "Keyboard shortcuts" }).waitFor();
  await page.getByRole("button", { name: "Choose custom accent color" }).click();
  await page.getByRole("textbox", { name: "Accent color hex value" }).fill("#dd66cc");
  await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() === "#dd66cc");
  await page.keyboard.press("Escape");

  const editSidebar = page.getByRole("button", { name: "Change shortcut for Toggle sidebar" });
  await editSidebar.click();
  await page.keyboard.press("Control+Shift+b");
  await page.waitForFunction(() => (document.querySelector('[data-command="canvas.sidebar.toggle"] kbd')?.textContent ?? "").includes("B"));
  await page.getByRole("button", { name: "Reset shortcut for Toggle sidebar" }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  if (!(await page.locator(".window-statusbar .snapshot-mobile").isVisible()))
    throw new Error("Condensed snapshot label is not visible on mobile");
  if (await page.locator(".window-statusbar .snapshot-desktop").isVisible())
    throw new Error("Desktop snapshot label overlaps the mobile status bar");

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  if (overflow) throw new Error("Canvas overflows the mobile viewport");

  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.locator(".sidebar.mobile-open").waitFor();

  if (errors.length) throw new Error(`Browser uncaught errors: ${errors.join("; ")}`);
  console.log("Canvas Chromium smoke passed: mount, chrome, Ctrl+B, settings, accent picker, keybinding recorder and mobile.");
} finally {
  await browser.close();
}
