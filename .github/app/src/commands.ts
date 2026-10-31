import { defineAppHotkeys, type Hotkey } from "@tanstack/react-hotkeys";
import type { CanvasPreferences } from "./config";
export const appHotkeys = defineAppHotkeys({
  "canvas.sidebar.toggle": {
    hotkey: "Mod+B",
    meta: { name: "Toggle sidebar", group: "Navigation" },
  },
  "canvas.omnibar.toggle": {
    hotkey: "Mod+K",
    meta: { name: "Open navigation", group: "Navigation" },
  },
  "canvas.settings.open": { hotkey: null, meta: { name: "Open settings", group: "Navigation" } },
  "canvas.canvas.open": { hotkey: null, meta: { name: "Open Canvas", group: "Navigation" } },
  "canvas.editor.open": { hotkey: null, meta: { name: "Open Editor", group: "Navigation" } },
  "canvas.tab.new": { hotkey: "Mod+T", meta: { name: "Open new tab", group: "Tabs" } },
  "canvas.tab.close": { hotkey: "Mod+W", meta: { name: "Close active tab", group: "Tabs" } },
});
declare module "@tanstack/react-hotkeys" {
  interface Register {
    appHotkeys: typeof appHotkeys;
  }
}

/** Replace only semantic Mod shortcuts. Per-command user overrides remain separate. */
export function hotkeysForModifier(
  mode: CanvasPreferences["modifierKey"],
  custom: CanvasPreferences["customModifier"],
) {
  const prefix =
    mode === "control" ? "Ctrl" : mode === "command" ? "Meta" : mode === "custom" ? custom : "Mod";
  return defineAppHotkeys({
    "canvas.sidebar.toggle": {
      ...appHotkeys["canvas.sidebar.toggle"],
      hotkey: `${prefix}+B` as Hotkey,
    },
    "canvas.omnibar.toggle": {
      ...appHotkeys["canvas.omnibar.toggle"],
      hotkey: `${prefix}+K` as Hotkey,
    },
    "canvas.settings.open": appHotkeys["canvas.settings.open"],
    "canvas.canvas.open": appHotkeys["canvas.canvas.open"],
    "canvas.editor.open": appHotkeys["canvas.editor.open"],
    "canvas.tab.new": { ...appHotkeys["canvas.tab.new"], hotkey: `${prefix}+T` as Hotkey },
    "canvas.tab.close": { ...appHotkeys["canvas.tab.close"], hotkey: `${prefix}+W` as Hotkey },
  });
}
