/** Static route descriptors are UI configuration, never simulated repository state. */
export const VIEWS = [
  { id: "overview", label: "Overview", group: "Workspace" },
  { id: "workspace", label: "Workspace", group: "Workspace" },
  { id: "projects", label: "Projects", group: "Workspace" },
  { id: "agents", label: "Agents", group: "Workspace" },
  { id: "graph", label: "Knowledge graph", group: "Workspace" },
  { id: "roadmap", label: "Roadmap", group: "Workspace" },
  { id: "artifacts", label: "Artifacts", group: "Workspace" },
  { id: "activity", label: "Activity", group: "Workspace" },
  { id: "monaco", label: "Monaco", group: "Workspace" },
  { id: "context", label: "Context", group: "System" },
  { id: "settings", label: "Settings", group: "System" },
] as const;

export type CanvasView = (typeof VIEWS)[number]["id"];
export type ViewGroup = (typeof VIEWS)[number]["group"];
export const VIEW_GROUPS = ["Workspace", "System"] as const;

export function isCanvasView(value: string): value is CanvasView {
  return VIEWS.some((item) => item.id === value);
}
export function viewFromRoute(route: string): CanvasView {
  const value = route.split("?")[0].replace(/^\//, "");
  return isCanvasView(value) ? value : "overview";
}
export function viewLabel(view: CanvasView): string {
  return VIEWS.find((item) => item.id === view)?.label ?? "Overview";
}
