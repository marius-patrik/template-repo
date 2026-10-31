import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { z } from "zod";

const accentIds = ["neutral", "blue", "sage", "violet", "amber"] as const;
const schema = z.object({
  theme: z.enum(["dark", "light", "system"]),
  skin: z.enum(["graphite", "slate", "contrast"]),
  density: z.enum(["comfortable", "compact"]),
  accent: z
    .string()
    .refine(
      (value) => accentIds.some((id) => id === value) || /^#[0-9a-f]{6}$/i.test(value),
      "Invalid accent color",
    ),
  fontSize: z.number().int().min(13).max(16),
  iconSize: z.number().int().min(16).max(20),
});

export type CanvasPreferences = z.infer<typeof schema>;
export const defaults: CanvasPreferences = {
  theme: "dark",
  skin: "graphite",
  density: "comfortable",
  accent: "neutral",
  fontSize: 14,
  iconSize: 18,
};

function validated(input: unknown): CanvasPreferences {
  const value = input && typeof input === "object" ? input : {};
  const result = schema.safeParse({ ...defaults, ...value });
  return result.success ? result.data : defaults;
}

function legacySettings(): CanvasPreferences {
  try {
    const saved = localStorage.getItem("canvas-preferences");
    return validated(saved ? JSON.parse(saved) : {});
  } catch {
    return defaults;
  }
}

type ConfigState = {
  preferences: CanvasPreferences;
  setPreferences: (patch: Partial<CanvasPreferences>) => void;
  resetPreferences: () => void;
};

// Settings are intentionally separate from repository-authoritative data.
// Persisted records are schema-validated, versioned and safe to reset.
export const useCanvasConfig = create<ConfigState>()(
  persist(
    (set, get) => ({
      preferences: legacySettings(),
      setPreferences: (patch) =>
        set({ preferences: validated({ ...get().preferences, ...patch }) }),
      resetPreferences: () => set({ preferences: defaults }),
    }),
    {
      name: "canvas-config",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ preferences: state.preferences }),
      migrate: (saved) => saved,
      merge: (saved, current) => {
        const record = saved && typeof saved === "object" ? saved : {};
        const preferences = "preferences" in record ? record.preferences : record;
        return { ...current, preferences: validated(preferences) };
      },
    },
  ),
);
