import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { isCanvasView, type CanvasView } from "./views";

export type Profile = {
  id: string;
  name: string;
  route: string;
  pinned: CanvasView[];
  note: string;
  selectedDocument: string;
  drafts: Record<string, string>;
};
const initialProfiles: Profile[] = ["Global", "Study", "Health", "Code", "Design", "Finance"].map(
  (name) => ({
    id: name.toLowerCase(),
    name,
    route: "/",
    pinned: [],
    note: "",
    selectedDocument: "",
    drafts: {},
  }),
);
type State = {
  profiles: Profile[];
  currentId: string;
  select: (id: string) => void;
  createProfile: (name: string) => string | null;
  renameProfile: (id: string, name: string) => void;
  removeProfile: (id: string) => void;
  setRoute: (path: string) => void;
  togglePin: (view: CanvasView) => void;
  setNote: (text: string) => void;
  setMonacoPath: (path: string) => void;
  setDraft: (path: string, content: string | null) => void;
};
export const useProfiles = create<State>()(
  persist(
    (set, get) => ({
      profiles: initialProfiles,
      currentId: "global",
      select: (id) => {
        if (get().profiles.some((profile) => profile.id === id)) set({ currentId: id });
      },
      createProfile: (value) => {
        const name = value.trim().slice(0, 48);
        if (!name || get().profiles.length >= 50) return null;
        const id = crypto.randomUUID();
        set((state) => ({
          profiles: [
            ...state.profiles,
            { id, name, route: "/", pinned: [], note: "", selectedDocument: "", drafts: {} },
          ],
          currentId: id,
        }));
        return id;
      },
      renameProfile: (id, value) => {
        const name = value.trim().slice(0, 48);
        if (name)
          set((state) => ({
            profiles: state.profiles.map((p) => (p.id === id ? { ...p, name } : p)),
          }));
      },
      removeProfile: (id) => {
        if (!get().profiles.some((p) => p.id === id) || get().profiles.length <= 1) return;
        set((state) => {
          const profiles = state.profiles.filter((p) => p.id !== id);
          return { profiles, currentId: state.currentId === id ? profiles[0].id : state.currentId };
        });
        try {
          localStorage.removeItem(`canvas-dockview-layout-v2-${id}`);
        } catch {
          /* Browsers may deny storage access. */
        }
      },
      setRoute: (route) =>
        set((state) => ({
          profiles: state.profiles.map((p) => (p.id === state.currentId ? { ...p, route } : p)),
        })),
      togglePin: (view) =>
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id !== state.currentId
              ? p
              : {
                  ...p,
                  pinned: p.pinned.includes(view)
                    ? p.pinned.filter((x) => x !== view)
                    : [...p.pinned, view],
                },
          ),
        })),
      setMonacoPath: (selectedDocument) =>
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === state.currentId ? { ...p, selectedDocument } : p,
          ),
        })),
      setDraft: (path, content) => {
        if (!path || path.length > 300) return;
        set((state) => ({
          profiles: state.profiles.map((p) => {
            if (p.id !== state.currentId) return p;
            const drafts = { ...p.drafts };
            if (content === null) delete drafts[path];
            else drafts[path] = content;
            return { ...p, drafts };
          }),
        }));
      },
      setNote: (note) =>
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === state.currentId ? { ...p, note: note.slice(0, 100000) } : p,
          ),
        })),
    }),
    {
      name: "canvas-profiles-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ profiles: state.profiles, currentId: state.currentId }),
      merge: (saved, current) => {
        if (!saved || typeof saved !== "object") return current;
        const record = saved as { profiles?: unknown; currentId?: unknown };
        const profiles: Profile[] = Array.isArray(record.profiles)
          ? record.profiles
              .filter(
                (value): value is Record<string, unknown> =>
                  value !== null &&
                  typeof value === "object" &&
                  typeof value.id === "string" &&
                  value.id.length < 100 &&
                  typeof value.name === "string" &&
                  value.name.length > 0 &&
                  value.name.length <= 48,
              )
              .slice(0, 50)
              .map((value) => ({
                id: value.id as string,
                name: value.name as string,
                route:
                  typeof value.route === "string" &&
                  (value.route === "/" || isCanvasView(value.route.slice(1).split("?")[0]))
                    ? value.route
                    : "/",
                pinned: Array.isArray(value.pinned)
                  ? [...new Set(value.pinned.flatMap((view): CanvasView[] => {
                      if (typeof view !== "string") return [];
                      if (view === "monaco") return ["editor"];
                      if (["overview", "projects", "agents", "graph", "roadmap", "artifacts", "context"].includes(view))
                        return ["canvas"];
                      return isCanvasView(view) ? [view] : [];
                    }))].slice(0, 20)
                  : [],
                note: typeof value.note === "string" ? value.note.slice(0, 100000) : "",
                selectedDocument:
                  typeof value.selectedDocument === "string"
                    ? value.selectedDocument.slice(0, 300)
                    : "",
                drafts:
                  value.drafts && typeof value.drafts === "object" && !Array.isArray(value.drafts)
                    ? Object.fromEntries(
                        Object.entries(value.drafts)
                          .filter(
                            ([path, content]) => path.length <= 300 && typeof content === "string",
                          )
                          .slice(0, 64),
                      )
                    : {},
              }))
          : [];
        if (!profiles.length) return current;
        return {
          ...current,
          profiles,
          currentId:
            typeof record.currentId === "string" && profiles.some((p) => p.id === record.currentId)
              ? record.currentId
              : profiles[0].id,
        };
      },
    },
  ),
);
