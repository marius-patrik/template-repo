import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { z } from "zod";

export const POSITIONS = {
  navigation: ["sidebar", "titlebar", "omnibar", "statusbar", "hidden"],
  omnibar: ["titlebar", "sidebar", "statusbar", "floating", "hidden"],
  settings: ["titlebar", "activitybar", "statusbar", "tabbar"],
  activity: ["left", "right", "top", "bottom", "hidden"],
  sidebar: ["left", "right"],
} as const;

export const SCALES = {
  small: { fontSize: 12, iconSize: 15, radius: 4, spacing: 6 },
  normal: { fontSize: 14, iconSize: 18, radius: 8, spacing: 8 },
  large: { fontSize: 16, iconSize: 21, radius: 12, spacing: 11 },
} as const;
export type Scale = keyof typeof SCALES;
const color = z.string().regex(/^#[0-9a-f]{6}$/i);
export const COLOR_KEYS = [
  "bg",
  "surface",
  "raised",
  "border",
  "text",
  "muted",
  "subtle",
  "accent",
  "accentForeground",
  "hover",
  "shadow",
  "scrim",
  "danger",
] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];
const palette = z.object(
  Object.fromEntries(COLOR_KEYS.map((key) => [key, color])) as Record<ColorKey, typeof color>,
);
export const darkPalette = {
  bg: "#0b0b0d",
  surface: "#141416",
  raised: "#1a1a1d",
  border: "#2b2b30",
  text: "#ececef",
  muted: "#929299",
  subtle: "#6c6c76",
  accent: "#f4f4f5",
  accentForeground: "#111113",
  hover: "#232326",
  shadow: "#000000",
  scrim: "#000000",
  danger: "#eb8f85",
};
export const lightPalette = {
  bg: "#f9f9fa",
  surface: "#ffffff",
  raised: "#f2f2f4",
  border: "#dfdfe4",
  text: "#17171a",
  muted: "#60616a",
  subtle: "#777781",
  accent: "#222226",
  accentForeground: "#ffffff",
  hover: "#eeeeef",
  shadow: "#454550",
  scrim: "#17171a",
  danger: "#b32432",
};
/** Skin presets update the same editable tokens; no second palette authority. */
const skinPalette = {
  graphite: { dark: darkPalette, light: lightPalette },
  slate: {
    dark: {
      ...darkPalette,
      bg: "#0b111b",
      surface: "#141e2d",
      raised: "#1b2939",
      border: "#324257",
      text: "#e6eff9",
      muted: "#a3b4c8",
      subtle: "#8498b0",
      hover: "#203149",
    },
    light: {
      ...lightPalette,
      bg: "#f2f6fa",
      surface: "#ffffff",
      raised: "#e7eef6",
      border: "#c5d3e3",
      text: "#192c43",
      muted: "#4c647e",
      subtle: "#657d95",
      hover: "#e0ebf6",
    },
  },
  contrast: {
    dark: {
      ...darkPalette,
      bg: "#070707",
      surface: "#111111",
      raised: "#202020",
      border: "#858585",
      text: "#ffffff",
      muted: "#e0e0e0",
      subtle: "#bdbdbd",
      hover: "#303030",
    },
    light: {
      ...lightPalette,
      bg: "#ffffff",
      surface: "#ffffff",
      raised: "#f0f0f0",
      border: "#5b5b5b",
      text: "#111111",
      muted: "#333333",
      subtle: "#454545",
      hover: "#e6e6e6",
    },
  },
} as const;
const schema = z.object({
  theme: z.enum(["dark", "light", "system"]),
  skin: z.enum(["graphite", "slate", "contrast"]),
  density: z.enum(["comfortable", "compact"]),
  accent: z.string(),
  uiScale: z.enum(["small", "normal", "large"]),
  fontSize: z.number().int().min(10).max(26),
  iconSize: z.number().int().min(12).max(32),
  radius: z.number().int().min(0).max(24),
  spacing: z.number().int().min(2).max(20),
  sidebarWidth: z.number().int().min(180).max(480),
  sidebarPosition: z.enum(POSITIONS.sidebar),
  activityBarPosition: z.enum(POSITIONS.activity),
  activityBarDensity: z.enum(["compact", "comfortable"]),
  navigationPosition: z.enum(POSITIONS.navigation),
  omnibarPosition: z.enum(POSITIONS.omnibar),
  settingsPosition: z.enum(POSITIONS.settings),
  floatingX: z.number().finite().min(0).max(10000),
  floatingY: z.number().finite().min(0).max(10000),
  darkColors: palette,
  lightColors: palette,
});
export type CanvasPreferences = z.infer<typeof schema>;
export const defaults: CanvasPreferences = {
  theme: "dark",
  skin: "graphite",
  density: "comfortable",
  accent: "neutral",
  uiScale: "normal",
  ...SCALES.normal,
  sidebarWidth: 228,
  sidebarPosition: "left",
  activityBarPosition: "left",
  activityBarDensity: "comfortable",
  navigationPosition: "titlebar",
  omnibarPosition: "titlebar",
  settingsPosition: "titlebar",
  floatingX: 280,
  floatingY: 110,
  darkColors: darkPalette,
  lightColors: lightPalette,
};
function validate(source: unknown): CanvasPreferences {
  const record = source && typeof source === "object" ? (source as Partial<CanvasPreferences>) : {};
  const legacyWidth = (() => {
    try {
      const n = Number(localStorage.getItem("canvas-sidebar-width-v1"));
      return n >= 180 && n <= 480 ? n : defaults.sidebarWidth;
    } catch {
      return defaults.sidebarWidth;
    }
  })();
  const data = {
    ...defaults,
    sidebarWidth: legacyWidth,
    ...record,
    darkColors: {
      ...darkPalette,
      ...(record.darkColors && typeof record.darkColors === "object" ? record.darkColors : {}),
    },
    lightColors: {
      ...lightPalette,
      ...(record.lightColors && typeof record.lightColors === "object" ? record.lightColors : {}),
    },
  };
  const result = schema.safeParse(data);
  return result.success ? result.data : defaults;
}
function legacySettings() {
  try {
    return validate(JSON.parse(localStorage.getItem("canvas-preferences") ?? "{}"));
  } catch {
    return defaults;
  }
}
type ConfigState = {
  preferences: CanvasPreferences;
  setPreferences: (patch: Partial<CanvasPreferences>) => void;
  setScale: (scale: Scale) => void;
  setColor: (key: ColorKey, value: string, isDark: boolean) => void;
  resetPreferences: () => void;
};
export const useCanvasConfig = create<ConfigState>()(
  persist(
    (set, get) => ({
      preferences: legacySettings(),
      setPreferences: (patch) => {
        const prefs = get().preferences;
        const switchingSkin = patch.skin && patch.skin !== prefs.skin;
        const preset = switchingSkin ? skinPalette[patch.skin as keyof typeof skinPalette] : null;
        set({
          preferences: validate({
            ...prefs,
            ...patch,
            ...(preset ? { darkColors: preset.dark, lightColors: preset.light } : {}),
          }),
        });
      },
      setScale: (uiScale) =>
        set({ preferences: validate({ ...get().preferences, uiScale, ...SCALES[uiScale] }) }),
      setColor: (key, value, isDark) => {
        if (!color.safeParse(value).success) return;
        const property = isDark ? "darkColors" : "lightColors";
        const prefs = get().preferences;
        set({
          preferences: validate({ ...prefs, [property]: { ...prefs[property], [key]: value } }),
        });
      },
      resetPreferences: () => set({ preferences: defaults }),
    }),
    {
      name: "canvas-config",
      version: 3,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ preferences: state.preferences }),
      migrate: (saved) => saved,
      merge: (saved, current) => {
        const record =
          saved && typeof saved === "object" ? (saved as { preferences?: unknown }) : {};
        return { ...current, preferences: validate(record.preferences ?? saved) };
      },
    },
  ),
);
