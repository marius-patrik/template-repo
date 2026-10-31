/** Tab definitions are UI configuration, not synthetic user data. */
export const VIEWS = [
  { id: "overview", label: "Overview" },
  { id: "projects", label: "Projects" },
  { id: "agents", label: "Agents" },
  { id: "graph", label: "Knowledge graph" },
  { id: "roadmap", label: "Roadmap" },
  { id: "artifacts", label: "Artifacts" },
  { id: "activity", label: "Activity" },
  { id: "context", label: "Context" },
  { id: "monaco", label: "Monaco" },
  { id: "notepad", label: "Notepad" },
  { id: "library", label: "Library" },
  { id: "settings", label: "Settings" },
] as const;
export type CanvasView = (typeof VIEWS)[number]["id"];
export function isCanvasView(value: string): value is CanvasView {
  return VIEWS.some((item) => item.id === value);
}
export function viewFromRoute(route: string): CanvasView | null {
  const view = route.split("?")[0].replace(/^\//, "");
  return isCanvasView(view) ? view : null;
}
export function viewLabel(view: CanvasView): string {
  return VIEWS.find((item) => item.id === view)?.label ?? view;
}
