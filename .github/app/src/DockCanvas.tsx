import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DockviewReact,
  DockviewDefaultTab,
  themeDark,
  themeLight,
  type DockviewApi,
  type DockviewReadyEvent,
  type IDockviewPanelProps,
  type IDockviewPanelHeaderProps,
  type IDockviewHeaderActionsProps,
} from "dockview-react";
import { useTranslation } from "react-i18next";
import { useAppHotkeys, useHotkey } from "@tanstack/react-hotkeys";
import i18n from "./i18n";
import { AnimatedIcon } from "./components/AnimatedIcon";
import { CanvasContextMenu } from "./components/ui/ContextMenu";
import { notify } from "./notifications";
import { VIEWS, viewLabel, viewFromRoute, isCanvasView, type CanvasView } from "./views";

const keyFor = (profileId: string) => `canvas-dockview-layout-v2-${profileId}`;
let sequence = 0;
type PaneContextValue = {
  render: (view: CanvasView) => ReactNode;
  navigate: (route: string) => void;
  add: (view: CanvasView, groupId?: string) => void;
  split: (view: CanvasView, panelId: string) => void;
  reset: () => void;
  newTab: () => void;
  close: (panelId: string) => void;
  choose: (view: CanvasView, panelId: string) => void;
  pin: (view: CanvasView) => void;
  pinned: CanvasView[];
  showSettings: boolean;
};
const PaneContext = createContext<PaneContextValue | null>(null);

function viewFromId(id: string): CanvasView {
  const candidate = id.split(":")[1] ?? "";
  return isCanvasView(candidate) ? candidate : "canvas";
}
function title(view: CanvasView) {
  return i18n.t(viewLabel(view));
}

function CanvasTab(props: IDockviewPanelHeaderProps) {
  const shell = useContext(PaneContext);
  const { t } = useTranslation();
  const view = viewFromId(props.api.id);
  const isNew = props.api.getParameters().view === "new";
  const pinned = !isNew && (shell?.pinned.includes(view) ?? false);
  return (
    <CanvasContextMenu
      actions={[
        ...(!isNew
          ? [
              {
                label: t(pinned ? "Unpin from activity bar" : "Pin to activity bar"),
                icon: "pin",
                action: () => shell?.pin(view),
              },
              {
                label: t("Split right"),
                icon: "split",
                action: () => shell?.split(view, props.api.id),
              },
            ]
          : []),
        { label: t("Close tab"), icon: "close", action: () => shell?.close(props.api.id) },
        { type: "separator" },
        { label: t("Reset layout"), icon: "reset", action: () => shell?.reset() },
      ]}
    >
      <div
        className="canvas-dock-tab"
        data-canvas-tab={isNew ? "new" : view}
        data-animated-icon-trigger
      >
        <AnimatedIcon name={isNew ? "plus" : view} size={14} />
        <DockviewDefaultTab {...props} hideClose />
        <button
          type="button"
          className="canvas-tab-close"
          title={t("Close tab")}
          aria-label={t("Close tab")}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            shell?.close(props.api.id);
          }}
        >
          <AnimatedIcon name="close" size={14} />
        </button>
      </div>
    </CanvasContextMenu>
  );
}
function Panel({ params, api }: IDockviewPanelProps) {
  const shell = useContext(PaneContext);
  const requested = (params as { view?: string }).view ?? "canvas";
  if (requested === "new") {
    return (
      <div className="dock-route-page dock-new-tab" data-dock-view="new">
        <WelcomeView onChoose={(view) => shell?.choose(view, api.id)} />
      </div>
    );
  }
  const view = isCanvasView(requested) ? requested : "canvas";
  return (
    <div className="dock-route-page" data-dock-view={view}>
      {shell?.render(view)}
    </div>
  );
}

function WelcomeView({ onChoose }: { onChoose: (view: CanvasView) => void }) {
  const { t } = useTranslation();
  return (
    <div className="dock-welcome" data-testid="new-tab-welcome">
      <p className="eyebrow">{t("Your workspace")}</p>
      <h1>{t("Start with a tab")}</h1>
      <p className="muted">{t("Select an editor or a repository view to begin.")}</p>
      <div className="dock-welcome-options">
        {VIEWS.map((item) => (
          <button type="button" key={item.id} onClick={() => onChoose(item.id)}>
            <AnimatedIcon name={item.id} size={19} />
            <span>{t(item.label)}</span>
            <AnimatedIcon name="right" size={14} />
          </button>
        ))}
      </div>
    </div>
  );
}
const components = { page: Panel };
const tabComponents = { canvas: CanvasTab };

function HeaderActions({ containerApi, group }: IDockviewHeaderActionsProps) {
  const shell = useContext(PaneContext);
  const { t } = useTranslation();
  const active =
    containerApi.panels.find((p) => p.group.id === group.id && p.api.isVisible) ??
    containerApi.panels.find((p) => p.group.id === group.id);
  const current = active ? viewFromId(active.id) : "canvas";
  return (
    <div className="dock-header-actions" onPointerDown={(event) => event.stopPropagation()}>
      <button
        className="dock-add-trigger"
        type="button"
        aria-label={t("New tab")}
        title={t("New tab")}
        onClick={() => shell?.newTab()}
      >
        <AnimatedIcon name="plus" size={16} />
      </button>
      {shell?.showSettings && (
        <button
          className="dock-add-trigger"
          type="button"
          aria-label={t("Settings")}
          title={t("Settings")}
          onClick={() => shell.navigate("/settings")}
        >
          <AnimatedIcon name="settings" size={16} />
        </button>
      )}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            className="dock-more-trigger"
            type="button"
            title={t("More tab actions")}
            aria-label={t("More tab actions")}
          >
            <AnimatedIcon name="more" size={17} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="menu-content dock-more-menu" align="end" sideOffset={5}>
            <DropdownMenu.Item
              className="menu-item dock-action-item"
              onSelect={() => {
                if (active) shell?.split(current, active.id);
              }}
            >
              <AnimatedIcon name="split" size={16} />
              <span>{t("Split right")}</span>
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="dock-add-separator" />
            {VIEWS.map((item) => (
              <DropdownMenu.Item
                className="menu-item dock-action-item"
                key={item.id}
                onSelect={() => shell?.add(item.id, group.id)}
              >
                <AnimatedIcon name={item.id} size={16} />
                <span>{t(item.label)}</span>
              </DropdownMenu.Item>
            ))}
            <DropdownMenu.Separator className="dock-add-separator" />
            <DropdownMenu.Item
              className="menu-item dock-action-item"
              onSelect={() => shell?.reset()}
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

type Props = {
  profileId: string;
  route: string;
  dark: boolean;
  pinned: CanvasView[];
  showSettings: boolean;
  onPin: (view: CanvasView) => void;
  onNavigate: (route: string) => void;
  renderView: (view: CanvasView) => ReactNode;
};

export default function DockCanvas({
  profileId,
  route,
  dark,
  pinned,
  showSettings,
  onPin,
  onNavigate,
  renderView,
}: Props) {
  const { t } = useTranslation();
  const hotkeys = useAppHotkeys();
  const apiRef = useRef<DockviewApi | null>(null);
  const suppressedRoute = useRef<string | null>(null);
  const alreadyOpenedRoute = useRef<string | null>(null);
  const disposables = useRef<Array<{ dispose: () => void }>>([]);
  const [empty, setEmpty] = useState(true);
  const latest = useRef({ route, onNavigate });
  latest.current = { route, onNavigate };
  const save = useCallback(
    (api: DockviewApi) => {
      try {
        localStorage.setItem(
          keyFor(profileId),
          JSON.stringify({ schema: 2, layout: api.toJSON() }),
        );
      } catch {
        /* Storage may be disabled. */
      }
      setEmpty(api.panels.length === 0);
    },
    [profileId],
  );
  const add = useCallback((view: CanvasView, groupId?: string) => {
    const api = apiRef.current;
    if (!api) return;
    alreadyOpenedRoute.current = `/${view}`;
    api.addPanel({
      id: `tab:${view}:${++sequence}`,
      component: "page",
      tabComponent: "canvas",
      title: title(view),
      params: { view },
      ...(groupId ? { position: { referenceGroup: groupId } } : {}),
    });
    latest.current.onNavigate(`/${view}`);
    notify.info(i18n.t("Tab opened"));
  }, []);
  const split = useCallback((view: CanvasView, panelId: string) => {
    const api = apiRef.current,
      panel = api?.getPanel(panelId);
    if (!api || !panel) return;
    alreadyOpenedRoute.current = `/${view}`;
    api.addPanel({
      id: `split:${view}:${++sequence}`,
      component: "page",
      tabComponent: "canvas",
      title: title(view),
      params: { view },
      position: { referenceGroup: panel.group.id, direction: "right" },
    });
    latest.current.onNavigate(`/${view}`);
    notify.info(i18n.t("Panel split to the right"));
  }, []);
  const newTab = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    api.addPanel({
      id: `tab:new:${++sequence}`,
      component: "page",
      tabComponent: "canvas",
      title: i18n.t("New tab"),
      params: { view: "new" },
    });
    latest.current.onNavigate("/");
  }, []);
  const choose = useCallback((view: CanvasView, panelId: string) => {
    const api = apiRef.current;
    const placeholder = api?.getPanel(panelId);
    if (!api || !placeholder) return;
    // Remove the placeholder before publishing a routed panel. Adding first
    // can trigger a route synchronization update while both panels are visible,
    // creating an unintended duplicate Editor tab.
    placeholder.api.close();
    alreadyOpenedRoute.current = `/${view}`;
    api.addPanel({
      id: `tab:${view}:${++sequence}`,
      component: "page",
      tabComponent: "canvas",
      title: title(view),
      params: { view },
    });
    latest.current.onNavigate(`/${view}`);
    notify.info(i18n.t("Tab opened"));
  }, []);
  const closePanel = useCallback((panelId: string) => {
    const api = apiRef.current;
    const panel = api?.getPanel(panelId);
    if (!api || !panel) return;
    // Invalidate the old route before closing; a pending effect for the previously
    // selected tab must not resurrect a panel that the user explicitly closed.
    const remaining = api.panels.filter((item) => item.id !== panelId);
    const selected = remaining.find((item) => item.api.isActive) ?? remaining.at(-1);
    const view = selected?.api.getParameters().view;
    const nextRoute = typeof view === "string" && isCanvasView(view) ? `/${view}` : "/";
    if (latest.current.route !== nextRoute) suppressedRoute.current = latest.current.route;
    latest.current.route = nextRoute;
    panel.api.close();
    latest.current.onNavigate(nextRoute);
  }, []);
  const closeActive = useCallback(() => {
    const active = apiRef.current?.activePanel;
    if (active) closePanel(active.id);
  }, [closePanel]);
  useHotkey(hotkeys["canvas.tab.new"], newTab, { ignoreInputs: true });
  useHotkey(hotkeys["canvas.tab.close"], closeActive, { ignoreInputs: true });
  useEffect(() => {
    window.addEventListener("canvas:new-tab", newTab);
    return () => window.removeEventListener("canvas:new-tab", newTab);
  }, [newTab]);
  const reset = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    api.clear();
    save(api);
    latest.current.onNavigate("/");
    notify.success(i18n.t("Layout reset"));
  }, [save]);
  const shell = useMemo(
    () => ({
      render: renderView,
      navigate: onNavigate,
      add,
      split,
      reset,
      newTab,
      close: closePanel,
      choose,
      pin: onPin,
      pinned,
      showSettings,
    }),
    [
      renderView,
      onNavigate,
      add,
      split,
      reset,
      newTab,
      closePanel,
      choose,
      onPin,
      pinned,
      showSettings,
    ],
  );

  useEffect(() => {
    const api = apiRef.current;
    // Dockview already created this tab; route changes must not duplicate it.
    if (alreadyOpenedRoute.current === route) {
      alreadyOpenedRoute.current = null;
      if (api?.panels.some((panel) => panel.api.getParameters().view === viewFromRoute(route)))
        return;
    } else if (alreadyOpenedRoute.current) {
      alreadyOpenedRoute.current = null;
    }
    // A Dockview state update can render with the old route before wouter commits
    // the close action. Never resurrect that explicitly closed pane.
    if (suppressedRoute.current === route) return;
    if (suppressedRoute.current && suppressedRoute.current !== route)
      suppressedRoute.current = null;
    if (latest.current.route !== route) return;
    const view = viewFromRoute(route);
    if (!api || !view) return;
    const existing = api.panels.find((panel) => panel.api.getParameters().view === view);
    if (existing) {
      existing.api.setActive();
      return;
    }
    api.addPanel({
      id: `route:${view}:${++sequence}`,
      component: "page",
      tabComponent: "canvas",
      title: title(view),
      params: { view },
    });
  }, [route]);
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    for (const panel of api.panels) {
      const view = panel.api.getParameters().view;
      if (typeof view === "string" && isCanvasView(view)) panel.api.setTitle(t(viewLabel(view)));
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
    try {
      const raw =
        localStorage.getItem(keyFor(profileId)) ??
        (profileId === "global" ? localStorage.getItem("canvas-dockview-layout-v1") : null);
      if (raw) {
        const state: unknown = JSON.parse(raw);
        if (state && typeof state === "object" && "layout" in state)
          api.fromJSON(state.layout as Parameters<DockviewApi["fromJSON"]>[0]);
      }
    } catch {
      try {
        localStorage.removeItem(keyFor(profileId));
      } catch {
        /* no-op */
      }
    }
    // Normalize older saved panels while retaining active editor, notes, library and split groups.
    const legacyRepositoryViews = new Set([
      "overview",
      "projects",
      "agents",
      "graph",
      "roadmap",
      "artifacts",
      "context",
    ]);
    let migrateCanvas = false;
    let migrateEditor = false;
    for (const panel of [...api.panels]) {
      const oldView: unknown = panel.api.getParameters().view;
      if (oldView === "monaco" || oldView === "notepad") {
        migrateEditor = true;
        panel.api.close();
      } else if (typeof oldView === "string" && legacyRepositoryViews.has(oldView)) {
        migrateCanvas = true;
        panel.api.close();
      } else if (oldView === "activity" || oldView === "workspace") {
        panel.api.close();
      }
    }
    for (const view of ["canvas", "editor"] as const) {
      if (
        (view === "canvas" ? migrateCanvas : migrateEditor) &&
        !api.panels.some((panel) => panel.api.getParameters().view === view)
      ) {
        api.addPanel({
          id: `migrated:${view}:${++sequence}`,
          component: "page",
          tabComponent: "canvas",
          title: title(view),
          params: { view },
        });
      }
    }
    for (const listener of disposables.current) listener.dispose();
    disposables.current = [
      api.onDidActivePanelChange(({ panel, origin }) => {
        if (origin !== "user") return;
        if (!panel && api.panels.length === 0) latest.current.onNavigate("/");
        const view: unknown = panel?.api.getParameters().view;
        if (
          typeof view === "string" &&
          isCanvasView(view) &&
          viewFromRoute(latest.current.route) !== view
        )
          latest.current.onNavigate(`/${view}`);
      }),
      api.onDidLayoutChange(() => {
        save(api);
        if (api.panels.length === 0 && latest.current.route !== "/") latest.current.onNavigate("/");
      }),
    ];
    const view = viewFromRoute(latest.current.route);
    if (view && !api.panels.some((panel) => panel.api.getParameters().view === view)) {
      api.addPanel({
        id: `route:${view}:${++sequence}`,
        component: "page",
        tabComponent: "canvas",
        title: title(view),
        params: { view },
      });
    }
    save(api);
  };

  return (
    <PaneContext.Provider value={shell}>
      <div className="dock-workspace" data-testid="dockview-workspace">
        <section
          className={`dock-grid ${empty ? "dock-grid-empty" : ""}`}
          aria-label="Dockview panels"
        >
          <DockviewReact
            theme={dark ? themeDark : themeLight}
            components={components}
            tabComponents={tabComponents}
            defaultTabComponent={CanvasTab}
            rightHeaderActionsComponent={HeaderActions}
            onReady={onReady}
          />
          {empty && (
            <div className="dock-empty-shell" data-testid="empty-workspace">
              <div className="dock-empty-tabbar">
                <span>{t("No open tabs")}</span>
                <button
                  className="dock-add-trigger"
                  type="button"
                  aria-label={t("New tab")}
                  title={t("New tab")}
                  onClick={newTab}
                >
                  <AnimatedIcon name="plus" size={16} />
                </button>
                {showSettings && (
                  <button
                    type="button"
                    className="dock-add-trigger"
                    onClick={() => onNavigate("/settings")}
                    aria-label={t("Settings")}
                  >
                    <AnimatedIcon name="settings" size={16} />
                  </button>
                )}
              </div>
              <WelcomeView onChoose={add} />
            </div>
          )}
        </section>
      </div>
    </PaneContext.Provider>
  );
}
