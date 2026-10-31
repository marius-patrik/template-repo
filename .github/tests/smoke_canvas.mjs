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
  if (await choices.count() !== 4) throw new Error("Empty welcome must list every editor and view");

  // New tab must be a real Dockview tab displaying the reusable welcome choices.
  await page.locator(".activity-new-tab").click();
  await page.locator('[data-dock-view="new"]').waitFor();
  if (await page.getByTestId("new-tab-welcome").locator(".dock-welcome-options button").count() !== 4)
    throw new Error("New tab must list all tools");
  await page.getByTestId("new-tab-welcome").getByRole("button", { name: "Editor" }).click();
  await page.locator('[data-dock-view="editor"]').waitFor();
  const beforeClose = await page.evaluate(() => ({
    route: location.hash,
    panels: [...document.querySelectorAll("[data-dock-view]")].map((el) => el.getAttribute("data-dock-view")),
    tabCount: document.querySelectorAll(".dv-tab").length,
    tabs: [...document.querySelectorAll(".dv-tab")].map((tab) => ({
      text: tab.textContent, id: tab.getAttribute("data-id"), selected: tab.getAttribute("aria-selected"),
      html: tab.outerHTML.slice(0, 240),
    })),
    canvasTabs: [...document.querySelectorAll(".canvas-dock-tab")].map((tab) => tab.getAttribute("data-canvas-tab")),
  }));
  console.log("Pre-close snapshot:", JSON.stringify(beforeClose));
  await page.locator('.canvas-dock-tab[data-canvas-tab="editor"] .canvas-tab-close').last().click();
  await page.waitForTimeout(250);
  const afterClose = await page.evaluate(() => ({
    route: location.hash,
    panels: [...document.querySelectorAll("[data-dock-view]")].map((element) => element.getAttribute("data-dock-view")),
    tabs: [...document.querySelectorAll(".dv-tab")].map((element) => element.textContent),
    empty: !!document.querySelector('[data-testid="empty-workspace"]'),
  }));
  console.log("Post-new-tab-close snapshot:", JSON.stringify(afterClose));
  if (!afterClose.empty) throw new Error("Closing replacement editor did not restore empty workspace: " + JSON.stringify(afterClose));
  // OLED is the default dark skin, and selection uses the shared accent.
  await page.waitForFunction(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() === "#000000"
  );
  if (await page.locator(".activity-new-tab").count() !== 1)
    throw new Error("Activity bar must expose exactly one new-tab action");

  // Profile-first navigation, with independent layouts and notes.
  const profiles = page.getByTestId("profile-select");
  await profiles.click();
  for (const name of ["Global", "Study", "Health", "Code", "Design", "Finance"]) {
    if (!(await page.getByRole("menuitem", { name }).count()))
      throw new Error("Missing default profile: " + name);
  }
  await page.keyboard.press("Escape");

  await page.locator(".dock-welcome-options").getByRole("button", { name: "Editor" }).click();
  await page.locator('[data-dock-view="editor"]').waitFor();
  await page.getByTestId("monaco-editor").waitFor();
  if (!(await page.locator('.canvas-dock-tab[data-canvas-tab="editor"] .app-icon').count()))
    throw new Error("Editor tab icon missing");

  const tab = page.locator('.canvas-dock-tab[data-canvas-tab="editor"]').first();
  await tab.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Pin to activity bar" }).click();
  await page.locator('.activity-bar .activity-button[title="Editor"]').waitFor();

  await profiles.click();
  await page.getByRole("menuitem", { name: "Study" }).click();
  await page.getByTestId("empty-workspace").waitFor();
  await page.locator(".dock-welcome-options").getByRole("button", { name: "Library" }).click();
  await page.getByTestId("library-view").waitFor();
  await page.locator(".library-list button").first().click();
  await page.locator('[data-dock-view="canvas"]').waitFor();
  await profiles.click();
  await page.getByRole("menuitem", { name: "Global" }).click();
  await page.locator('[data-dock-view="editor"]').waitFor();
  if (!(await page.locator('[data-dock-view="editor"]').count()))
    throw new Error("Profile-specific Editor was not restored");

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
  await page.getByRole("option", { name: "Editor" }).click();
  await page.locator('[data-testid="monaco-editor"] .monaco-editor').waitFor({ timeout: 20000 });
  await page.locator('.canvas-dock-tab[data-canvas-tab="editor"] > .app-icon').first().waitFor();

  // Full-height editor regression: Dockview content fills the available panel.
  const editorHost = await page.locator(".monaco-editor-host").boundingBox();
  const editorPanel = await page.locator('[data-dock-view="editor"]').boundingBox();
  if (!editorHost || !editorPanel || editorHost.height < editorPanel.height * 0.72)
    throw new Error("Editor viewport does not fill the Dockview panel");
  if (await page.locator(".dock-welcome-options").count())
    throw new Error("Welcome should be hidden once tools are open");

  // Canvas now owns repository perspectives and the document inspector.
  await page.getByTestId("breadcrumb-view").click();
  await page.getByRole("option", { name: "Canvas" }).click();
  await page.getByTestId("canvas-studio").waitFor();
  await page.getByTestId("canvas-graph").waitFor();
  await page.locator(".canvas-perspectives").getByRole("button", { name: "Agents" }).click();
  await page.locator(".canvas-inspector").getByText("AGENTS.md").first().waitFor();
  await page.locator(".canvas-perspectives").getByRole("button", { name: "Artifacts" }).click();
  await page.getByTestId("canvas-source").waitFor();
  await page.locator(".canvas-perspectives").getByRole("button", { name: "Roadmap" }).click();
  await page.getByTestId("canvas-source").waitFor();
  await page.locator(".canvas-perspectives").getByRole("button", { name: "Overview" }).click();
  await page.locator(".canvas-inspector").getByText("Project identity").waitFor();

  // Settings expose all placement and unified scale controls.
  await page.locator(".title-actions").getByRole("button", { name: "Settings" }).click();
  await page.getByTestId("settings-page").waitFor();
  await page.getByRole("combobox", { name: "UI scale" }).click();
  await page.getByRole("option", { name: "Large" }).click();
  if (!(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--ui-spacing").trim().endsWith("11px"))))
    throw new Error("Scale preset did not synchronize spacing");
  await page.getByRole("combobox", { name: "Spacing" }).click();
  await page.getByRole("option", { name: "Small" }).click();
  await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue("--ui-spacing").trim() === "6px");
  await page.getByRole("combobox", { name: "Icon size" }).click();
  await page.getByRole("option", { name: "Large" }).click();
  await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue("--app-icon-size").trim() === "21px");
  await page.getByRole("spinbutton", { name: "Title bar height" }).fill("35");
  await page.getByRole("spinbutton", { name: "Status bar height" }).fill("30");
  await page.waitForFunction(() =>
    getComputedStyle(document.querySelector(".window-titlebar")).height === "35px" &&
    getComputedStyle(document.querySelector(".window-statusbar")).height === "30px"
  );
  await page.getByRole("spinbutton", { name: "Primary sidebar width" }).fill("260");
  await page.getByRole("combobox", { name: "Settings button position" }).click();
  await page.getByRole("option", { name: "Statusbar" }).click();
  await page.locator(".window-statusbar .status-settings").waitFor();
  await page.getByRole("combobox", { name: "Settings button position" }).click();
  await page.getByRole("option", { name: "Hidden" }).click();
  if (await page.locator(".window-statusbar .status-settings").count())
    throw new Error("Hidden settings button remains visible in the status bar");


  await page.getByRole("combobox", { name: "Navigation position" }).click();
  await page.getByRole("option", { name: "Sidebar" }).click();
  await page.locator(".desktop-toggle").click();
  await page.locator(".sidebar").waitFor();
  await page.locator(".navigation-tree").waitFor();
  if (await page.locator(".activity-bar").count())
    throw new Error("Expanded sidebar must replace the compact activity rail");
  const handle = page.getByRole("separator", { name: "Resize sidebar" });
  await handle.focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(() => Number(document.querySelector(".sidebar-resizer")?.getAttribute("aria-valuenow")) === 276);
  const before = await handle.boundingBox();
  if (!before || before.height < 50) throw new Error("Sidebar drag handle must occupy full height");
  const pointerX = before.x + before.width / 2;
  const pointerY = before.y + before.height / 2;
  await page.mouse.move(pointerX, pointerY);
  await page.mouse.down();
  await page.mouse.move(pointerX + 56, pointerY, { steps: 6 });
  await page.mouse.up();
  await page.waitForFunction(
    () => Number(document.querySelector(".sidebar-resizer")?.getAttribute("aria-valuenow")) >= 325,
  );
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

  // The live input itself expands into the contextual results panel; no duplicate dialog.
  await page.keyboard.press("Control+k");
  await page.getByRole("combobox", { name: "Do anything" }).focus();
  await page.getByRole("listbox", { name: "Open navigation tree" }).waitFor();
  if (await page.locator(".palette, .palette-cover").count())
    throw new Error("Legacy modal command centre is still mounted");
  await page.getByRole("combobox", { name: "Do anything" }).fill("canvas");
  await page.getByRole("option", { name: /Canvas/ }).first().waitFor();
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector(".omnibar-results"));

  await page.reload({ waitUntil: "load" });
  await page.getByTestId("settings-page").waitFor();
  if (await page.locator('select').count()) throw new Error("Native select remains");
  if (await page.getByRole("combobox", { name: "Spacing" }).textContent() === "")
    throw new Error("Spacing preference control was not restored");
  if (await page.getByRole("spinbutton", { name: "Title bar height" }).inputValue() !== "35")
    throw new Error("Title bar size preference was not retained");

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
