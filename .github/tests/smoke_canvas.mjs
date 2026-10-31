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
  await page.locator('.dock-grid [data-dock-view="overview"]').waitFor();
  const addTab = page.locator(".dock-grid .dv-groupview").first().getByRole("button", { name: "Add tab" });
  await addTab.waitFor();
  await addTab.click();
  const menu = page.locator(".dock-add-menu");
  await menu.waitFor();
  if ((await menu.getByRole("menuitem").count()) !== 10)
    throw new Error("Add-tab dropdown must contain every Canvas view");
  await menu.getByRole("menuitem", { name: "Projects" }).click();
  await page.locator('.dock-grid [data-dock-view="projects"]').waitFor();
  await page.waitForFunction(() => location.hash.includes("/projects"));
  await page.locator(".dock-grid .dv-groupview").first().getByRole("button", { name: "Add tab" }).click();
  await page.locator(".dock-add-menu").getByRole("menuitem", { name: "Overview" }).click();
  await page.waitForFunction(() => location.hash.includes("/overview"));
  if ((await page.locator(".dock-grid .dv-groupview").count()) !== 1)
    throw new Error("Adding a tab created a separate group instead of reusing the tab bar");
  if ((await page.locator(".dockview-theme-dark, .dockview-theme-light").count()) !== 1)
    throw new Error("Expected exactly one root Dockview compositor");
  await page.getByRole("button", { name: "Split active panel right" }).click();
  await page.waitForFunction(() => document.querySelectorAll(".dock-grid .dv-groupview").length >= 2);
  if (!(await page.evaluate(() => !!localStorage.getItem("canvas-dockview-layout-v1"))))
    throw new Error("Dockview layout was not saved");
  await page.reload({ waitUntil: "load" });
  await page.locator('.dock-grid [data-dock-view="overview"]').first().waitFor();
  await page.waitForFunction(() => document.querySelectorAll(".dock-grid .dv-groupview").length >= 2);
  await page.getByRole("button", { name: "Reset panel layout" }).click();
  await page.waitForFunction(() => document.querySelectorAll(".dock-grid .dv-groupview").length === 1);
  await page.getByRole("button", { name: "Open knowledge graph" }).click();
  await page.locator('.dock-grid [data-dock-view="graph"]').waitFor();
  await page.waitForFunction(() => location.hash.includes("/graph"));
  await page.locator('.sidebar .nav-link[title="Overview"]').click();
  await page.locator('.dock-grid [data-dock-view="overview"]').first().waitFor();
  await page.waitForFunction(() => location.hash.includes("/overview"));
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
  await page.locator(".palette-cover").waitFor({ state: "hidden" });

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
  console.log("Canvas Chromium smoke passed: one Dockview compositor, split/restore/reset, route panels, chrome, shortcuts, settings and mobile.");
} finally {
  await browser.close();
}
