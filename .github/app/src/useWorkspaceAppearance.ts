import { useEffect, useState } from "react";
import { COMPONENTS, SCALES, useCanvasConfig } from "./config";

/** One direction for appearance state: validated preferences → DOM design tokens. */
export function useWorkspaceAppearance() {
  const prefs = useCanvasConfig((state) => state.preferences);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const dark = prefs.theme === "system" ? systemDark : prefs.theme === "dark";
  useEffect(() => {
    const root = document.documentElement;
    const palette = dark ? prefs.darkColors : prefs.lightColors;
    root.dataset.theme = dark ? "dark" : "light";
    root.dataset.skin = prefs.skin;
    root.dataset.density = prefs.density;
    root.dataset.accent = "custom";

    for (const [key, value] of Object.entries(palette)) {
      root.style.setProperty(
        key === "accentForeground" ? "--accent-foreground" : `--${key}`,
        value,
      );
    }

    const tokens = {
      "--app-font-size": `${prefs.fontSize}px`,
      "--app-icon-size": `${prefs.iconSize}px`,
      "--ui-radius": `${prefs.radius}px`,
      "--skin-radius": `${prefs.radius}px`,
      "--ui-spacing": `${prefs.spacing}px`,
      "--titlebar-height": `${prefs.titleBarHeight}px`,
      "--statusbar-height": `${prefs.statusBarHeight}px`,
    };
    for (const [key, value] of Object.entries(tokens)) root.style.setProperty(key, value);

    for (const component of COMPONENTS) {
      const map = prefs.componentThemes[component];
      const prefix = `--component-${component}-`;
      for (const [target, paletteKey] of Object.entries({
        bg: map.surface,
        text: map.text,
        border: map.border,
        accent: map.accent,
      })) {
        if (paletteKey === "inherit") root.style.removeProperty(prefix + target);
        else root.style.setProperty(prefix + target, palette[paletteKey as keyof typeof palette]);
      }
      for (const [target, scale, field] of [
        ["font", map.font, "fontSize"],
        ["icon", map.icon, "iconSize"],
        ["spacing", map.spacing, "spacing"],
      ] as const) {
        if (scale === "inherit") root.style.removeProperty(prefix + target);
        else root.style.setProperty(prefix + target, `${SCALES[scale][field]}px`);
      }
    }
  }, [prefs, dark]);
  return dark;
}
