/** First-class tools. Repository perspectives live inside Canvas, not as duplicate tabs. */
export const VIEWS = [
  { id: "canvas", label: "Canvas" },
  { id: "editor", label: "Editor" },
  { id: "notepad", label: "Notepad" },
  { id: "library", label: "Library" },
  { id: "settings", label: "Settings" },
] as const;
export type CanvasView = (typeof VIEWS)[number]["id"];
export function isCanvasView(value: string): value is CanvasView {
  return VIEWS.some((item) => item.id === value);
}
export function viewFromRoute(route: string): CanvasView | null {
  const raw = route.split("?")[0].replace(/^\//, "");
  if (raw === "monaco") return "editor";
  if (["overview", "projects", "agents", "graph", "roadmap", "artifacts", "context"].includes(raw))
    return "canvas";
  return isCanvasView(raw) ? raw : null;
}
export function viewLabel(view: CanvasView): string {
  return VIEWS.find((item) => item.id === view)?.label ?? view;
}
