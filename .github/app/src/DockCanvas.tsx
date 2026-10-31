import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DockviewReact,
  themeDark,
  themeLight,
  type DockviewApi,
  type DockviewReadyEvent,
  type IDockviewPanelProps,
  type IDockviewHeaderActionsProps,
} from "dockview-react";
import { AnimatedIcon } from "./components/AnimatedIcon";

const LAYOUT_KEY = "canvas-dockview-layout-v1";
const ROUTES = [
  "overview",
  "workspace",
  "projects",
  "agents",
  "graph",
  "roadmap",
  "artifacts",
  "activity",
  "context",
  "settings",
] as const;

type CanvasView = (typeof ROUTES)[number];
type PaneContext = {
  render: (view: CanvasView) => ReactNode;
  onNavigate: (route: string) => void;
};
const PaneContext = createContext<PaneContext | null>(null);
const TITLES: Record<CanvasView, string> = {
  overview: "Overview",
  workspace: "Workspace",
  projects: "Projects",
  agents: "Agents",
  graph: "Knowledge graph",
  roadmap: "Roadmap",
  artifacts: "Artifacts",
  activity: "Activity",
  context: "Context",
  settings: "Settings",
};
const isView = (name: string): name is CanvasView => ROUTES.some((view) => view === name);
const routeToView = (route: string): CanvasView => {
  const name = route.split("?")[0].replace(/^\//, "");
  return isView(name) ? name : "overview";
};

function DockedPage({ params }: IDockviewPanelProps) {
  const context = useContext(PaneContext);
  const candidate = (params as { view?: string }).view ?? "overview";
  const view: CanvasView = isView(candidate) ? candidate : "overview";
  return (
    <div className="dock-route-page" data-dock-view={view}>
      {context?.render(view)}
    </div>
  );
}
const components = { page: DockedPage };

function openRoute(api: DockviewApi, view: CanvasView) {
  const existing =
    api.getPanel(`route:${view}`) ??
    api.panels.find((panel) => panel.api.getParameters().view === view);
  if (existing) {
    existing.api.setActive();
    return;
  }
  api.addPanel({
    id: `route:${view}`,
    component: "page",
    title: TITLES[view],
    params: { view },
  });
}

const TAB_GROUPS: Array<{ label: string; views: CanvasView[] }> = [
  {
    label: "Workspace",
    views: [
      "overview",
      "workspace",
      "projects",
      "agents",
      "graph",
      "roadmap",
      "artifacts",
      "activity",
    ],
  },
  { label: "System", views: ["context", "settings"] },
];
let tabSequence = 0;

function AddTabHeader({ containerApi, group }: IDockviewHeaderActionsProps) {
  const workspace = useContext(PaneContext);

  const addTab = (view: CanvasView) => {
    // A new tab belongs to the group whose + was pressed, even when the same
    // view is already open elsewhere. URL navigation is intentionally explicit.
    const id = `tab:${view}:${Date.now().toString(36)}:${++tabSequence}`;
    containerApi.addPanel({
      id,
      component: "page",
      title: TITLES[view],
      params: { view },
      position: { referenceGroup: group.id },
    });
    workspace?.onNavigate(`/${view}`);
  };

  return (
    <div
      className="dock-tab-add"
      data-dock-group={group.id}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="dock-add-trigger"
            aria-label="Add tab"
            title="Add a tab to this group"
          >
            <AnimatedIcon name="plus" size={15} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="menu-content dock-add-menu"
            align="end"
            side="bottom"
            sideOffset={5}
            collisionPadding={10}
            aria-label="Available tabs"
          >
            {TAB_GROUPS.map((section, index) => (
              <DropdownMenu.Group key={section.label}>
                {index > 0 && <DropdownMenu.Separator className="dock-add-separator" />}
                <DropdownMenu.Label className="dock-add-group-label">
                  {section.label}
                </DropdownMenu.Label>
                {section.views.map((view) => (
                  <DropdownMenu.Item
                    key={view}
                    className="menu-item dock-add-item"
                    onSelect={() => addTab(view)}
                  >
                    <AnimatedIcon name={view} size={16} />
                    <span>{TITLES[view]}</span>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Group>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

function saveLayout(api: DockviewApi) {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify({ schema: 1, layout: api.toJSON() }));
  } catch {
    // Storage is optional in private browser sessions.
  }
}

type Props = {
  route: string;
  dark: boolean;
  onNavigate: (route: string) => void;
  renderView: (view: string) => ReactNode;
};

export default function DockCanvas({ route, dark, onNavigate, renderView }: Props) {
  const apiRef = useRef<DockviewApi | null>(null);
  const disposables = useRef<Array<{ dispose: () => void }>>([]);
  const latest = useRef({ route, onNavigate });
  latest.current = { route, onNavigate };
  const serial = useRef(0);
  const [count, setCount] = useState(0);
  const panelContext = useMemo(
    () => ({ render: renderView, onNavigate }),
    [renderView, onNavigate],
  );

  useEffect(() => {
    const api = apiRef.current;
    if (api) openRoute(api, routeToView(route));
  }, [route]);

  useEffect(
    () => () => {
      for (const listener of disposables.current) listener.dispose();
      disposables.current = [];
      apiRef.current = null;
    },
    [],
  );

  const onReady = ({ api }: DockviewReadyEvent) => {
    apiRef.current = api;
    let restored = false;
    try {
      const raw = localStorage.getItem(LAYOUT_KEY);
      if (raw) {
        const state: unknown = JSON.parse(raw);
        if (
          state &&
          typeof state === "object" &&
          "schema" in state &&
          state.schema === 1 &&
          "layout" in state
        ) {
          api.fromJSON(state.layout as Parameters<DockviewApi["fromJSON"]>[0]);
          restored = api.panels.length > 0;
        }
      }
    } catch {
      try {
        localStorage.removeItem(LAYOUT_KEY);
      } catch {
        /* unavailable */
      }
    }

    disposables.current.forEach((listener) => {
      listener.dispose();
    });
    disposables.current = [
      api.onDidActivePanelChange(({ panel, origin }) => {
        if (origin !== "user" || !panel) return;
        const name: unknown = panel.api.getParameters().view;
        if (typeof name !== "string" || !isView(name)) return;
        if (routeToView(latest.current.route) !== name) {
          latest.current.onNavigate(`/${name}`);
        }
      }),
      api.onDidLayoutChange(() => {
        setCount(api.panels.length);
        saveLayout(api);
      }),
    ];

    if (!restored) {
      api.addPanel({
        id: "route:overview",
        component: "page",
        title: "Overview",
        params: { view: "overview" },
      });
    }
    openRoute(api, routeToView(latest.current.route));
    setCount(api.panels.length);
    saveLayout(api);
  };

  const splitRight = () => {
    const api = apiRef.current;
    if (!api) return;
    const active = api.activePanel;
    const candidate: unknown = active?.api.getParameters().view;
    const view =
      typeof candidate === "string" && isView(candidate) ? candidate : routeToView(route);
    const id = `split:${view}:${++serial.current}:${Date.now()}`;
    api.addPanel({
      id,
      component: "page",
      title: TITLES[view],
      params: { view },
      position: active ? { referencePanel: active.id, direction: "right" } : { direction: "right" },
    });
    latest.current.onNavigate(`/${view}`);
  };

  const resetLayout = () => {
    const api = apiRef.current;
    if (!api) return;
    api.clear();
    try {
      localStorage.removeItem(LAYOUT_KEY);
    } catch {
      /* unavailable */
    }
    openRoute(api, "overview");
    latest.current.onNavigate("/overview");
  };

  return (
    <PaneContext.Provider value={panelContext}>
      <div className="dock-workspace" data-testid="dockview-workspace">
        <div className="dock-toolbar">
          <div className="dock-toolbar-title">
            <span className="dock-eyebrow">WORKSPACE</span>
            <span className="dock-toolbar-divider" aria-hidden="true">
              /
            </span>
            <span>Panels</span>
            <span className="dock-panel-count">{count}</span>
          </div>
          <div className="dock-toolbar-actions">
            <button
              type="button"
              className="dock-toolbar-button"
              onClick={() => latest.current.onNavigate("/graph")}
              aria-label="Open knowledge graph"
              title="Open knowledge graph"
            >
              <AnimatedIcon name="graph" size={15} />
              <span>Graph</span>
            </button>
            <button
              type="button"
              className="dock-toolbar-button"
              onClick={splitRight}
              aria-label="Split active panel right"
              title="Split active panel right"
            >
              <AnimatedIcon name="workspace" size={15} />
              <span>Split right</span>
            </button>
            <button
              type="button"
              className="dock-toolbar-button"
              onClick={resetLayout}
              aria-label="Reset panel layout"
              title="Reset panel layout"
            >
              Reset layout
            </button>
          </div>
        </div>
        <section className="dock-grid" aria-label="Dockview panels">
          <DockviewReact
            theme={dark ? themeDark : themeLight}
            components={components}
            rightHeaderActionsComponent={AddTabHeader}
            onReady={onReady}
          />
        </section>
      </div>
    </PaneContext.Provider>
  );
}
