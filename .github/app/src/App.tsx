import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { useAppHotkeys, useHotkey } from "@tanstack/react-hotkeys";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { POSITIONS, useCanvasConfig, type StatusPart } from "./config";
import { useWorkspaceAppearance } from "./useWorkspaceAppearance";
import { useFloatingOmnibar } from "./useFloatingOmnibar";
import SidebarResize from "./SidebarResize";
import { AnimatedIcon } from "./components/AnimatedIcon";
import { CanvasContextMenu } from "./components/ui/ContextMenu";
import Omnibar from "./Omnibar";
import { Navigator, ActivityBar, SidebarContents, Library, SurfaceMenu } from "./ShellComponents";
import Monaco from "./Monaco";
import Canvas from "./Canvas";
import PreferencesPanel from "./PreferencesPanel";
import DockCanvas from "./DockCanvas";
import { useProfiles } from "./profiles";
import { NotificationCenter, Notifications } from "./notifications";
import { viewFromRoute } from "./views";
import context from "./generated/context.json";
import { version as appVersion } from "../package.json";

type Alignment = "left" | "center" | "right";
type Segment = { id: StatusPart; visible: boolean; node: ReactNode };

export default function App() {
  const [path, navigate] = useLocation();
  const { t, i18n } = useTranslation();
  const hotkeys = useAppHotkeys();
  const prefs = useCanvasConfig((s) => s.preferences);
  const update = useCanvasConfig((s) => s.setPreferences);
  const dark = useWorkspaceAppearance();
  const floating = useFloatingOmnibar();
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const profileId = useProfiles((s) => s.currentId);
  const profile = useProfiles((s) => s.profiles.find((p) => p.id === s.currentId));
  const setRoute = useProfiles((s) => s.setRoute);
  const togglePin = useProfiles((s) => s.togglePin);
  const route = viewFromRoute(path);
  const firstVisit = useRef(true);

  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage?.split("-")[0] ?? "en";
  }, [i18n.resolvedLanguage]);

  useEffect(() => {
    const slug = path.split("?")[0].replace(/^\//, "");
    const merged = ["overview", "projects", "agents", "graph", "roadmap", "artifacts", "context"];
    if (merged.includes(slug)) navigate("/canvas", { replace: true });
    else if (slug === "monaco" || slug === "notepad") navigate("/editor", { replace: true });
    else if (slug === "activity" || slug === "workspace") navigate("/", { replace: true });
  }, [navigate, path]);

  useEffect(() => {
    if (!firstVisit.current) return;
    firstVisit.current = false;
    if (path === "/" && profile?.route && profile.route !== "/")
      navigate(profile.route, { replace: true });
  }, [navigate, path, profile?.route]);

  const go = (destination: string) => {
    setRoute(destination);
    navigate(destination);
    setMobileOpen(false);
  };
  const selectProfile = (id: string) => {
    const target = useProfiles.getState().profiles.find((item) => item.id === id);
    if (!target) return;
    useProfiles.getState().select(id);
    navigate(target.route);
    setMobileOpen(false);
  };
  const newTab = () => window.dispatchEvent(new Event("canvas:new-tab"));
  const toggleSidebar = () => {
    if (window.matchMedia("(max-width: 700px)").matches) setMobileOpen((value) => !value);
    else setExpanded((value) => !value);
  };
  useHotkey(hotkeys["canvas.sidebar.toggle"], toggleSidebar, { ignoreInputs: true });
  useHotkey(
    hotkeys["canvas.omnibar.toggle"],
    () => window.dispatchEvent(new Event("canvas:omnibar-focus")),
    { ignoreInputs: false },
  );
  useHotkey(hotkeys["canvas.settings.open"], () => go("/settings"));
  useHotkey(hotkeys["canvas.canvas.open"], () => go("/canvas"));
  useHotkey(hotkeys["canvas.editor.open"], () => go("/editor"));

  const icon = (name: string, size = 18) => <AnimatedIcon name={name} size={size} />;
  const nav = () => <Navigator current={route} onNavigate={go} onProfile={selectProfile} />;
  const sidebarVisible = expanded || mobileOpen;
  const platformMod = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";
  const modifierLabel =
    prefs.modifierKey === "control"
      ? "Ctrl"
      : prefs.modifierKey === "command"
        ? "⌘"
        : prefs.modifierKey === "custom"
          ? prefs.customModifier
              .replaceAll("Meta", "⌘")
              .replaceAll("Alt", "⌥")
              .replaceAll("Shift", "⇧")
          : platformMod;

  const navActions = POSITIONS.navigation.map((position) => ({
    label: `${t("Navigation position")} · ${t(position)}`,
    icon: "move",
    action: () => update({ navigationPosition: position }),
  }));

  const statusItems: Segment[] = [
    { id: "navigation", visible: prefs.navigationPosition === "statusbar", node: nav() },
    {
      id: "snapshot",
      visible: true,
      node: <span className="cx-snapshot">{t("Repository snapshot · read-only")}</span>,
    },
    {
      id: "omnibar",
      visible: prefs.omnibarPosition === "statusbar",
      node: <Omnibar onNavigate={go} />,
    },
    {
      id: "settings",
      visible: prefs.settingsPosition === "statusbar",
      node: (
        <SurfaceMenu kind="settings">
          <button
            type="button"
            className="cx-status-control status-settings"
            aria-label={t("Settings")}
            title={t("Settings")}
            onClick={() => go("/settings")}
          >
            {icon("settings", 15)}
          </button>
        </SurfaceMenu>
      ),
    },
    {
      id: "version",
      visible: true,
      node: (
        <span className="cx-status-version">
          v{appVersion} · {t("Prototype")}
        </span>
      ),
    },
    {
      id: "revision",
      visible: true,
      node: <span className="cx-revision">{context.revision}</span>,
    },
  ];

  return (
    <div className="cx-shell app-root" data-shell="v2">
      <header className="cx-topbar window-titlebar">
        <div className="cx-topbar-start title-left">
          <button
            className="cx-icon-button cx-rail-toggle desktop-toggle"
            type="button"
            title={t(expanded ? "Collapse sidebar" : "Expand sidebar")}
            aria-label={t(expanded ? "Collapse sidebar" : "Expand sidebar")}
            onClick={toggleSidebar}
          >
            {icon(expanded ? "collapse" : "expand", 17)}
          </button>
          <button
            className="cx-icon-button mobile-toggle"
            type="button"
            aria-label={t("Toggle navigation")}
            onClick={toggleSidebar}
          >
            {icon("expand", 17)}
          </button>
          <span className="cx-brand-mark" aria-hidden="true">
            C
          </span>
          <span className="cx-brand-label">Canvas</span>
          <span className="cx-header-rule" aria-hidden="true" />
          {prefs.navigationPosition === "titlebar" && (
            <CanvasContextMenu actions={navActions}>
              <div className="cx-navigation-slot">{nav()}</div>
            </CanvasContextMenu>
          )}
        </div>

        <div className="cx-topbar-center title-center">
          {prefs.omnibarPosition === "titlebar" ? (
            <SurfaceMenu kind="omnibar">
              <Omnibar onNavigate={go} />
            </SurfaceMenu>
          ) : (
            <span className="cx-center-label">{context.name}</span>
          )}
        </div>

        <div className="cx-topbar-end title-actions">
          <NotificationCenter />
          {prefs.settingsPosition === "titlebar" && (
            <SurfaceMenu kind="settings">
              <button
                type="button"
                className="cx-icon-button"
                title={t("Settings")}
                aria-label={t("Settings")}
                onClick={() => go("/settings")}
              >
                {icon("settings", 17)}
              </button>
            </SurfaceMenu>
          )}
        </div>
      </header>

      <div className={`cx-body window-main activity-position-${prefs.activityBarPosition}`}>
        {mobileOpen && (
          <button
            type="button"
            className="cx-mobile-scrim sidebar-scrim"
            aria-label={t("Close navigation")}
            onClick={() => setMobileOpen(false)}
          />
        )}
        <div className={`cx-workarea work-area activity-position-${prefs.activityBarPosition}`}>
          {!sidebarVisible && prefs.activityBarPosition !== "hidden" && (
            <ActivityBar
              current={route}
              onNavigate={go}
              onNewTab={newTab}
              showSettings={prefs.settingsPosition === "activitybar"}
            />
          )}
          <div className={`cx-workspace-row primary-content sidebar-${prefs.sidebarPosition}`}>
            {sidebarVisible && (
              <div className="cx-sidebar-wrap">
                <aside
                  className={`cx-sidebar sidebar ${mobileOpen ? "mobile-open" : ""}`}
                  aria-label={t("Main navigation")}
                >
                  <div className="cx-sidebar-head">
                    <span className="cx-sidebar-overline">{t("Workspace navigation")}</span>
                    <button
                      type="button"
                      className="cx-icon-button cx-sidebar-dismiss"
                      title={t("Collapse sidebar")}
                      aria-label={t("Collapse sidebar")}
                      onClick={toggleSidebar}
                    >
                      {icon("collapse", 16)}
                    </button>
                  </div>
                  {prefs.omnibarPosition === "sidebar" && <Omnibar onNavigate={go} />}
                  <button type="button" className="cx-add-tab sidebar-new-tab" onClick={newTab}>
                    {icon("plus", 16)}
                    <span>{t("New tab")}</span>
                    <span className="cx-add-shortcut">{modifierLabel}+T</span>
                  </button>
                  <SidebarContents current={route} onNavigate={go} />
                  <div className="cx-sidebar-foot">{context.repository}</div>
                </aside>
                {!mobileOpen && (
                  <CanvasContextMenu
                    actions={[
                      {
                        label: t("Move sidebar left"),
                        icon: "move",
                        action: () => update({ sidebarPosition: "left" }),
                      },
                      {
                        label: t("Move sidebar right"),
                        icon: "move",
                        action: () => update({ sidebarPosition: "right" }),
                      },
                    ]}
                  >
                    <SidebarResize />
                  </CanvasContextMenu>
                )}
              </div>
            )}
            <div className="cx-dock main-column">
              <main className="dock-content" aria-label={t("Workspace")}>
                <DockCanvas
                  key={profileId}
                  profileId={profileId}
                  route={path}
                  onNavigate={go}
                  dark={dark}
                  pinned={profile?.pinned ?? []}
                  onPin={togglePin}
                  showSettings={prefs.settingsPosition === "tabbar"}
                  renderView={(view) => {
                    if (view === "canvas") return <Canvas />;
                    if (view === "editor") return <Monaco />;
                    if (view === "library") return <Library onNavigate={go} />;
                    if (view === "settings") return <PreferencesPanel />;
                    return null;
                  }}
                />
              </main>
            </div>
          </div>
        </div>
      </div>

      <footer className="cx-statusbar window-statusbar">
        {(["left", "center", "right"] as Alignment[]).map((alignment) => {
          const segments = statusItems.filter(
            (item) => item.visible && prefs.statusAlignment[item.id] === alignment,
          );
          return (
            <div
              className={`cx-status-group status-group status-group-${alignment}`}
              key={alignment}
            >
              {segments.map((segment, index) => (
                <Fragment key={segment.id}>
                  {index > 0 && (
                    <span className="cx-status-divider status-delimiter" aria-hidden="true">
                      |
                    </span>
                  )}
                  {segment.node}
                </Fragment>
              ))}
            </div>
          );
        })}
      </footer>

      {prefs.omnibarPosition === "floating" && (
        <Omnibar
          onNavigate={go}
          floating={{ left: prefs.floatingX, top: prefs.floatingY }}
          dragHandle={
            <button
              type="button"
              className="floating-handle"
              title={t("Drag omnibar")}
              aria-label={t("Drag omnibar")}
              onPointerDown={floating.start}
              onPointerMove={floating.update}
              onPointerUp={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId))
                  event.currentTarget.releasePointerCapture(event.pointerId);
              }}
              onLostPointerCapture={floating.end}
            >
              {icon("drag", 16)}
            </button>
          }
        />
      )}
      {prefs.omnibarPosition === "hidden" && <Omnibar onNavigate={go} fallback />}
      <Notifications />
    </div>
  );
}
