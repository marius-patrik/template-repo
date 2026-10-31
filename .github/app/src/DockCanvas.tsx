import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  DockviewReact,
  DockviewDefaultTab,
  type IDockviewPanelHeaderProps,
  themeDark,
  themeLight,
  type DockviewApi,
  type DockviewReadyEvent,
  type IDockviewPanelProps,
  type IDockviewHeaderActionsProps,
} from "dockview-react";
import { AnimatedIcon } from "./components/AnimatedIcon";
import { useTranslation } from "react-i18next";
import i18n from "./i18n";
import { CanvasContextMenu } from "./components/ui/ContextMenu";
import { notify } from "./notifications";
import { VIEWS, VIEW_GROUPS, viewFromRoute, viewLabel, isCanvasView, type CanvasView } from "./views";

const LAYOUT_KEY = "canvas-dockview-layout-v1";
type PaneContext = {
  render: (view: CanvasView) => ReactNode;
  onNavigate: (route: string) => void;
  resetLayout: () => void;
  splitPanel: (view: CanvasView, groupId: string) => void;
};
const PaneContext = createContext<PaneContext | null>(null);
const localizedTitle = (view: CanvasView) => i18n.t(viewLabel(view));
const routeToView = viewFromRoute;

function CanvasTab(props: IDockviewPanelHeaderProps) {
  const workspace = useContext(PaneContext);
  const { t } = useTranslation();
  const raw: unknown = props.api.getParameters().view;
  const view: CanvasView = typeof raw === "string" && isCanvasView(raw) ? raw : "overview";
  return (
    <CanvasContextMenu actions={[
      { icon: "split", label: t("Split right"), action: () => workspace?.splitPanel(view, props.group.id) },
      { icon: "close", label: t("Close tab"), action: () => props.api.close() },
      { type: "separator" },
      { icon: "reset", label: t("Reset layout"), action: () => workspace?.resetLayout() },
    ]}>
      <div className="canvas-dock-tab" data-canvas-tab={view}>
        <AnimatedIcon name={view} size={14} />
        <DockviewDefaultTab {...props} />
      </div>
    </CanvasContextMenu>
  );
}
const tabComponents = { canvas: CanvasTab };

function DockedPage({ params }: IDockviewPanelProps) {
  const context = useContext(PaneContext);
  const candidate = (params as { view?: string }).view ?? "overview";
  const view: CanvasView = isCanvasView(candidate) ? candidate : "overview";
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
    tabComponent: "canvas",
    title: localizedTitle(view),
    params: { view },
  });
}

const TAB_GROUPS = VIEW_GROUPS.map((label) => ({
  label,
  views: VIEWS.filter((item) => item.group === label).map((item) => item.id),
}));

let tabSequence = 0;

function AddTabHeader({ containerApi, group }: IDockviewHeaderActionsProps) {
  const workspace = useContext(PaneContext);
  const { t } = useTranslation();

  const addTab = (view: CanvasView) => {
    // A new tab belongs to the group whose + was pressed, even when the same
    // view is already open elsewhere. URL navigation is intentionally explicit.
    const id = `tab:${view}:${Date.now().toString(36)}:${++tabSequence}`;
    containerApi.addPanel({
      id,
      component: "page",
      tabComponent: "canvas",
      title: localizedTitle(view),
      params: { view },
      position: { referenceGroup: group.id },
    });
    workspace?.onNavigate(`/${view}`);
    notify.success(t("Tab opened"));
  };

  const splitRight = () => {
    const selected =
      containerApi.panels.find((panel) => panel.group.id === group.id && panel.api.isVisible) ??
      containerApi.panels.find((panel) => panel.group.id === group.id);
    const candidate: unknown = selected?.api.getParameters().view;
    const view: CanvasView =
      typeof candidate === "string" && isCanvasView(candidate) ? candidate : "overview";
    const id = `split:${view}:${Date.now().toString(36)}:${++tabSequence}`;
    containerApi.addPanel({
      id,
      component: "page",
      tabComponent: "canvas",
      title: localizedTitle(view),
      params: { view },
      position: { referenceGroup: group.id, direction: "right" },
    });
    workspace?.onNavigate(`/${view}`);
    notify.info(t("Panel split to the right"));
  };

  return (
    <div
      className="dock-header-actions"
      data-dock-group={group.id}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="dock-add-trigger"
            aria-label={t("Add tab")}
            title={t("Add tab")}
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
            aria-label={t("Available tabs")}
          >
            {TAB_GROUPS.map((section, index) => (
              <DropdownMenu.Group key={t(section.label)}>
                {index > 0 && <DropdownMenu.Separator className="dock-add-separator" />}
                <DropdownMenu.Label className="dock-add-group-label">
                  {t(section.label)}
                </DropdownMenu.Label>
                {section.views.map((view) => (
                  <DropdownMenu.Item
                    key={view}
                    className="menu-item dock-add-item"
                    onSelect={() => addTab(view)}
                  >
                    <AnimatedIcon name={view} size={16} />
                    <span>{t(viewLabel(view))}</span>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Group>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="dock-more-trigger"
            aria-label={t("More tab actions")}
            title={t("More tab actions")}
          >
            <AnimatedIcon name="more" size={17} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="menu-content dock-more-menu"
            align="end"
            side="bottom"
            sideOffset={5}
            collisionPadding={10}
            aria-label={t("More tab actions")}
          >
            <DropdownMenu.Item className="menu-item dock-action-item" onSelect={splitRight}>
              <AnimatedIcon name="split" size={16} />
              <span>{t("Split right")}</span>
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="dock-add-separator" />
            <DropdownMenu.Item
              className="menu-item dock-action-item"
              onSelect={() => workspace?.resetLayout()}
            >
              <AnimatedIcon name="reset" size={16} />
              <span>{t("Reset layout")}</span>
            </DropdownMenu.Item>
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
  const { t } = useTranslation();
  const apiRef = useRef<DockviewApi | null>(null);
  const disposables = useRef<Array<{ dispose: () => void }>>([]);
  const latest = useRef({ route, onNavigate });
  latest.current = { route, onNavigate };
  const resetLayout = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    api.clear();
    try {
      localStorage.removeItem(LAYOUT_KEY);
    } catch {
      /* Browser storage is optional. */
    }
    openRoute(api, "overview");
    latest.current.onNavigate("/overview");
    notify.success(i18n.t("Layout reset"));
  }, []);
  const splitPanel = useCallback((view: CanvasView, groupId: string) => {
    const api = apiRef.current;
    if (!api) return;
    api.addPanel({
      id: `split:${view}:${Date.now().toString(36)}:${++tabSequence}`,
      component: "page",
      tabComponent: "canvas",
      title: localizedTitle(view),
      params: { view },
      position: { referenceGroup: groupId, direction: "right" },
    });
    latest.current.onNavigate(`/${view}`);
    notify.info(i18n.t("Panel split to the right"));
  }, []);
  const panelContext = useMemo(
    () => ({ render: renderView, onNavigate, resetLayout, splitPanel }),
    [renderView, onNavigate, resetLayout, splitPanel],
  );

  useEffect(() => {
    const api = apiRef.current;
    if (api) openRoute(api, routeToView(route));
  }, [route]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    for (const panel of api.panels) {
      const candidate: unknown = panel.api.getParameters().view;
      if (typeof candidate === "string" && isCanvasView(candidate)) {
        panel.api.setTitle(t(viewLabel(candidate)));
      }
    }
  }, [t]);

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
        if (typeof name !== "string" || !isCanvasView(name)) return;
        if (routeToView(latest.current.route) !== name) {
          latest.current.onNavigate(`/${name}`);
        }
      }),
      api.onDidLayoutChange(() => {
        saveLayout(api);
      }),
    ];

    if (!restored) {
      api.addPanel({
        id: "route:overview",
        component: "page",
        tabComponent: "canvas",
        title: localizedTitle("overview"),
        params: { view: "overview" },
      });
    }
    openRoute(api, routeToView(latest.current.route));
    saveLayout(api);
  };

  return (
    <PaneContext.Provider value={panelContext}>
      <div className="dock-workspace" data-testid="dockview-workspace">
        <section className="dock-grid" aria-label="Dockview panels">
          <DockviewReact
            theme={dark ? themeDark : themeLight}
            components={components}
            tabComponents={tabComponents}
            defaultTabComponent="canvas"
            rightHeaderActionsComponent={AddTabHeader}
            onReady={onReady}
          />
        </section>
      </div>
    </PaneContext.Provider>
  );
}
