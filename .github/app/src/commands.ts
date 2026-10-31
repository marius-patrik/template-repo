import { defineAppHotkeys } from "@tanstack/react-hotkeys";
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
});
declare module "@tanstack/react-hotkeys" {
  interface Register {
    appHotkeys: typeof appHotkeys;
  }
}
