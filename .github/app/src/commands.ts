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
  "canvas.settings.open": {
    hotkey: null,
    meta: { name: "Open settings", group: "Navigation" },
  },
  "canvas.overview.open": {
    hotkey: null,
    meta: { name: "Open overview", group: "Navigation" },
  },
  "canvas.workspace.open": {
    hotkey: null,
    meta: { name: "Open workspace", group: "Navigation" },
  },
  "canvas.projects.open": {
    hotkey: null,
    meta: { name: "Open projects", group: "Navigation" },
  },
  "canvas.graph.open": {
    hotkey: null,
    meta: { name: "Open knowledge graph", group: "Navigation" },
  },
});

declare module "@tanstack/react-hotkeys" {
  interface Register {
    appHotkeys: typeof appHotkeys;
  }
}
