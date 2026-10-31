import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(resolve("package.json"));
const { chromium } = require("playwright");
const url = pathToFileURL(resolve(process.argv[2] ?? ".canvas-dist/index.html")).href;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

try {
  await page.goto(url, { waitUntil: "load" });
  await page.locator("#root .app-root").waitFor({ timeout: 15000 });
  await page.getByTestId("empty-workspace").waitFor();
  await page.locator(".dock-empty-tabbar").waitFor();
  const choices = page.locator(".dock-welcome-options button");
  if (await choices.count() !== 12) throw new Error("Empty welcome must list every editor and view");

  // Profile-first navigation, with independent layouts and notes.
  const profiles = page.getByTestId("profile-select");
  await profiles.click();
  for (const name of ["Global", "Study", "Health", "Code", "Design", "Finance"]) {
    if (!(await page.getByRole("menuitem", { name }).count()))
      throw new Error("Missing default profile: " + name);
  }
  await page.keyboard.press("Escape");

  await page.locator(".dock-welcome-options").getByRole("button", { name: "Notepad" }).click();
  await page.locator('[data-dock-view="notepad"]').waitFor();
  await page.getByTestId("notepad-editor").getByRole("textbox", { name: "Notepad" }).fill("Private Global note");
  if (!(await page.locator('.canvas-dock-tab[data-canvas-tab="notepad"] .app-icon').count()))
    throw new Error("Notepad tab icon missing");

  const tab = page.locator('.canvas-dock-tab[data-canvas-tab="notepad"]').first();
  await tab.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Pin to activity bar" }).click();
  await page.locator('.activity-bar .activity-button[title="Notepad"]').waitFor();

  await profiles.click();
  await page.getByRole("menuitem", { name: "Study" }).click();
  await page.getByTestId("empty-workspace").waitFor();
  await page.locator(".dock-welcome-options").getByRole("button", { name: "Library" }).click();
  await page.getByTestId("library-view").waitFor();
  await page.locator(".library-list button").first().click();
  await page.locator('[data-dock-view="artifacts"]').waitFor();
  await profiles.click();
  await page.getByRole("menuitem", { name: "Global" }).click();
  await page.locator('[data-dock-view="notepad"]').waitFor();
  if ((await page.getByTestId("notepad-editor").getByRole("textbox", { name: "Notepad" }).inputValue()) !== "Private Global note")
    throw new Error("Profile-specific note was not restored");

  // Workspace management.
  await profiles.click();
  await page.getByRole("menuitem", { name: "New profile" }).click();
  await page.getByRole("textbox", { name: "Profile name" }).fill("Research");
  await page.getByRole("button", { name: "Save profile" }).click();
  await page.getByTestId("empty-workspace").waitFor();
  await profiles.click();
  await page.getByRole("menuitem", { name: "Delete profile" }).click();
  await page.getByRole("button", { name: "Confirm delete" }).click();
  await profiles.click();
  await page.getByRole("menuitem", { name: "Global" }).click();

  // Monaco uses bundled workers, source-backed contents and a real editor.
  await page.getByTestId("breadcrumb-view").click();
  await page.getByRole("option", { name: "Monaco" }).click();
  await page.locator('[data-testid="monaco-editor"] .monaco-editor').waitFor({ timeout: 20000 });
  await page.locator('.canvas-dock-tab[data-canvas-tab="monaco"] > .app-icon').first().waitFor();

  // Settings expose all placement and unified scale controls.
  await page.locator(".title-actions").getByRole("button", { name: "Settings" }).click();
  await page.getByTestId("settings-page").waitFor();
  await page.getByRole("combobox", { name: "UI scale" }).click();
  await page.getByRole("option", { name: "Large" }).click();
  if (!(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--ui-spacing").trim().endsWith("11px"))))
    throw new Error("Scale preset did not synchronize spacing");
  await page.getByRole("spinbutton", { name: "Spacing" }).fill("12");
  await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue("--ui-spacing").trim() === "12px");
  await page.getByRole("spinbutton", { name: "Primary sidebar width" }).fill("260");

  await page.getByRole("combobox", { name: "Navigation position" }).click();
  await page.getByRole("option", { name: "Sidebar" }).click();
  await page.locator(".navigation-tree").waitFor();
  const handle = page.getByRole("separator", { name: "Resize sidebar" });
  await handle.focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(() => Number(document.querySelector(".sidebar-resizer")?.getAttribute("aria-valuenow")) === 276);
  const before = await handle.boundingBox();
  if (!before || before.height < 50) throw new Error("Sidebar drag handle must occupy full height");
  const center = { x: before.x + before.width / 2, y: before.y + before.height / 2 };
  const inspect = async (phase) => {
    const details = await page.evaluate(({ x, y }) => ({
      hit: document.elementFromPoint(x, y)?.outerHTML.slice(0, 350),
      resizing: document.body.classList.contains("resizing-sidebar"),
      attr: document.querySelector(".sidebar-resizer")?.getAttribute("aria-valuenow"),
      width: document.querySelector(".sidebar")?.getBoundingClientRect().width,
    }), center);
    console.log("sidebar diagnostic", phase, JSON.stringify({ before, ...details }));
  };
  await inspect("before");
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await inspect("down");
  await page.mouse.move(center.x + 56, center.y, { steps: 6 });
  await inspect("move");
  await page.mouse.up();
  const resized = Number(await handle.getAttribute("aria-valuenow"));
  if (resized < 310) throw new Error(`Sidebar pointer resize failed, expected >=310, received ${resized}`);

  await page.getByRole("combobox", { name: "Omnibar position" }).click();
  await page.getByRole("option", { name: "Floating" }).click();
  await page.locator(".floating-omnibar").waitFor();
  const floatingHandle = page.getByRole("button", { name: "Drag omnibar" });
  const floating = await floatingHandle.boundingBox();
  if (!floating) throw new Error("Floating omnibar handle missing");
  await page.mouse.move(floating.x + 5, floating.y + 5);
  await page.mouse.down();
  await page.mouse.move(floating.x + 95, floating.y + 65, { steps: 5 });
  await page.mouse.up();
  await page.waitForFunction(() => Number.parseFloat(document.querySelector(".floating-omnibar")?.style.left || "0") > 280);

  // Keep command palette/omnibar, but without breadcrumb path within it.
  await page.keyboard.press("Control+k");
  await page.getByRole("dialog", { name: "Open navigation tree" }).waitFor();
  if (await page.locator(".palette .palette-root").count())
    throw new Error("Omnibar still contains the old breadcrumb path");
  await page.keyboard.press("Escape");

  await page.reload({ waitUntil: "load" });
  await page.getByTestId("settings-page").waitFor();
  if (await page.locator('select').count()) throw new Error("Native select remains");
  if ((await page.getByRole("spinbutton", { name: "Spacing" }).inputValue()) !== "12")
    throw new Error("Spacing preference was not retained");

  // Notification history and context menus come from actual UI events.
  await page.getByTestId("notification-trigger").click();
  await page.getByTestId("notification-center").waitFor();
  if (await page.getByRole("menuitem", { name: "Clear notifications" }).count())
    await page.getByRole("menuitem", { name: "Clear notifications" }).click();
  else await page.keyboard.press("Escape");

  if (errors.length) throw new Error("Browser exception: " + errors.join("; "));
  console.log("Canvas profile-first prototype: Chromium acceptance passed");
} finally {
  await browser.close();
}
