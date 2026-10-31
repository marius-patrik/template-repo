import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import { useAppHotkeys, useHotkey } from "@tanstack/react-hotkeys";
import { useTranslation } from "react-i18next";
import { useCanvasConfig, POSITIONS } from "./config";
import { useLocation } from "wouter";
import { SCALES, COMPONENTS } from "./config";
import Omnibar from "./Omnibar";
import { AnimatedIcon } from "./components/AnimatedIcon";
import { Button } from "./components/ui/button";
import { CanvasContextMenu } from "./components/ui/ContextMenu";
import Monaco from "./Monaco";
import PreferencesPanel from "./PreferencesPanel";
import { useProfiles } from "./profiles";
import { Navigator, ActivityBar, SidebarContents, Library, SurfaceMenu } from "./ShellComponents";
import { NotificationCenter, Notifications } from "./notifications";
import { viewFromRoute } from "./views";
import { version as appVersion } from "../package.json";
import Canvas from "./Canvas";
import DockCanvas from "./DockCanvas";
import context from "./generated/context.json";

export default function App() {
  const [path, navigate] = useLocation();
  const hotkeys = useAppHotkeys();
  const { t, i18n } = useTranslation();
  const prefs = useCanvasConfig((state) => state.preferences);
  const updatePreferences = useCanvasConfig((state) => state.setPreferences);

  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const [collapsed, setCollapsed] = useState(true);
  const resizing = useRef(false);
  const resizeOrigin = useRef({ x: 0, width: 228 });
  // Pointer capture can be interrupted when dock groups rerender during a resize;
  // an explicit document-level handler keeps mouse/touch resizing stable.
  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!resizing.current) return;
      const current = useCanvasConfig.getState().preferences;
      const delta = (event.clientX - resizeOrigin.current.x) * (current.sidebarPosition === "right" ? -1 : 1);
      updatePreferences({ sidebarWidth: Math.min(480, Math.max(180, Math.round(resizeOrigin.current.width + delta))) });
    };
    const finish = () => {
      resizing.current = false;
      document.body.classList.remove("resizing-sidebar");
    };
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", finish, true);
    window.addEventListener("pointercancel", finish, true);
    return () => {
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", finish, true);
      window.removeEventListener("pointercancel", finish, true);
    };
  }, [updatePreferences]);
  const currentProfileId = useProfiles((state) => state.currentId);
  const activeProfile = useProfiles((state) =>
    state.profiles.find((p) => p.id === state.currentId),
  );
  const setRoute = useProfiles((state) => state.setRoute);
  const togglePin = useProfiles((state) => state.togglePin);
  const [floatingDrag, setFloatingDrag] = useState(false);
  const floatOrigin = useRef({ pointerX: 0, pointerY: 0, x: 0, y: 0 });
  useEffect(
    () => () => {
      document.body.classList.remove("resizing-sidebar");
      document.body.classList.remove("dragging-omnibar");
    },
    [],
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const page = viewFromRoute(path);
  // Legacy deep links resolve to the consolidated views instead of recreating removed tabs.
  useEffect(() => {
    const old = path.split("?")[0].replace(/^\//, "");
    if (old === "monaco") navigate("/editor", { replace: true });
    else if (
      ["overview", "projects", "agents", "graph", "roadmap", "artifacts", "context"].includes(old)
    )
      navigate("/canvas" + (path.includes("?") ? "?" + path.split("?").slice(1).join("?") : ""), {
        replace: true,
      });
    else if (old === "notepad") navigate("/editor", { replace: true });
    else if (old === "activity" || old === "workspace") navigate("/", { replace: true });
  }, [path, navigate]);

  const didRestoreRoute = useRef(false);
  useEffect(() => {
    if (didRestoreRoute.current) return;
    didRestoreRoute.current = true;
    const state = useProfiles.getState();
    const profile = state.profiles.find((p) => p.id === state.currentId);
    if (path === "/" && profile?.route && profile.route !== "/")
      navigate(profile.route, { replace: true });
  }, [path, navigate]);
  const dark = prefs.theme === "system" ? systemDark : prefs.theme === "dark";
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = dark ? "dark" : "light";
    root.dataset.skin = prefs.skin;
    root.dataset.density = prefs.density;
    root.dataset.accent = "custom";
    const palette = dark ? prefs.darkColors : prefs.lightColors;
    const mapping = { accentForeground: "accent-foreground" } as Record<string, string>;
    for (const [key, value] of Object.entries(palette)) {
      root.style.setProperty("--" + (mapping[key] ?? key), value);
    }
    root.style.setProperty("--app-font-size", prefs.fontSize + "px");
    root.style.setProperty("--app-icon-size", prefs.iconSize + "px");
    root.style.setProperty("--ui-radius", prefs.radius + "px");
    root.style.setProperty("--skin-radius", prefs.radius + "px");
    root.style.setProperty("--ui-spacing", prefs.spacing + "px");
    root.style.setProperty("--titlebar-height", `${prefs.titleBarHeight}px`);
    root.style.setProperty("--statusbar-height", `${prefs.statusBarHeight}px`);
    for (const component of COMPONENTS) {
      const tokens = prefs.componentThemes[component];
      const prefix = `--component-${component}-`;
      for (const [target, key] of Object.entries({
        bg: tokens.surface,
        text: tokens.text,
        border: tokens.border,
        accent: tokens.accent,
      })) {
        if (key === "inherit") root.style.removeProperty(prefix + target);
        else root.style.setProperty(prefix + target, palette[key as keyof typeof palette]);
      }
      for (const [target, preset, field] of [
        ["font", tokens.font, "fontSize"],
        ["icon", tokens.icon, "iconSize"],
        ["spacing", tokens.spacing, "spacing"],
      ] as const) {
        if (preset === "inherit") root.style.removeProperty(prefix + target);
        else root.style.setProperty(prefix + target, SCALES[preset][field] + "px");
      }
    }
  }, [prefs, dark]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage?.split("-")[0] ?? "en";
  }, [i18n.resolvedLanguage]);
  const go = (dest: string) => {
    setRoute(dest);
    navigate(dest);
    setMobileOpen(false);
  };
  const switchProfile = (id: string) => {
    const profile = useProfiles.getState().profiles.find((p) => p.id === id);
    if (!profile) return;
    useProfiles.getState().select(id);
    navigate(profile.route);
    setMobileOpen(false);
  };
  useHotkey(
    hotkeys["canvas.sidebar.toggle"],
    () => {
      if (window.matchMedia("(max-width: 700px)").matches) setMobileOpen((v) => !v);
      else setCollapsed((v) => !v);
    },
    { ignoreInputs: true },
  );
  useHotkey(
    hotkeys["canvas.omnibar.toggle"],
    () => window.dispatchEvent(new Event("canvas:omnibar-focus")),
    { ignoreInputs: false },
  );
  useHotkey(hotkeys["canvas.settings.open"], () => go("/settings"));
  useHotkey(hotkeys["canvas.canvas.open"], () => go("/canvas"));
  useHotkey(hotkeys["canvas.editor.open"], () => go("/editor"));
  const icon = (name: string, size = 18) => <AnimatedIcon name={name} size={size} />;
  return (
    <div className="app-root">
      <div className="window-titlebar">
        <div className="title-left">
          <Button
            size="icon"
            className="mobile-toggle"
            aria-label={t("Toggle navigation")}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {icon("expand")}
          </Button>
          <Button
            size="icon"
            className="desktop-toggle"
            title={t(collapsed ? "Expand sidebar" : "Collapse sidebar")}
            aria-label={t(collapsed ? "Expand sidebar" : "Collapse sidebar")}
            onClick={() => setCollapsed((value) => !value)}
          >
            {icon(collapsed ? "expand" : "collapse")}
          </Button>
          {prefs.navigationPosition === "titlebar" && (
            <CanvasContextMenu
              actions={POSITIONS.navigation.map((position) => ({
                label: t("Navigation position") + " · " + t(position),
                icon: "move",
                action: () => updatePreferences({ navigationPosition: position }),
              }))}
            >
              <div>
                <Navigator current={page} onNavigate={go} onProfile={switchProfile} />
              </div>
            </CanvasContextMenu>
          )}
        </div>
        <div className="title-center">
          {prefs.omnibarPosition === "titlebar" ? (
            <SurfaceMenu kind="omnibar">
              <Omnibar onNavigate={go} />
            </SurfaceMenu>
          ) : (
            <strong>Canvas</strong>
          )}
        </div>
        <div className="title-actions">
          <NotificationCenter />
          {prefs.settingsPosition === "titlebar" && (
            <SurfaceMenu kind="settings">
              <Button
                size="icon"
                aria-label={t("Settings")}
                title={t("Settings")}
                onClick={() => go("/settings")}
              >
                {icon("settings")}
              </Button>
            </SurfaceMenu>
          )}
        </div>
      </div>
      <div className="window-main">
        {mobileOpen && (
          <button
            type="button"
            aria-label={t("Close navigation")}
            className="sidebar-scrim"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <div className={`work-area activity-position-${prefs.activityBarPosition}`}>
          {prefs.activityBarPosition !== "hidden" && collapsed && !mobileOpen && (
            <ActivityBar
              current={page}
              onNavigate={go}
              onNewTab={() => window.dispatchEvent(new Event("canvas:new-tab"))}
              showSettings={prefs.settingsPosition === "activitybar"}
            />
          )}
          <div className={`primary-content sidebar-${prefs.sidebarPosition}`}>
            {(!collapsed || mobileOpen) && (
              <>
                <aside
                  className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}
                  aria-label="Main navigation"
                  style={{ "--sidebar-width": `${prefs.sidebarWidth}px` } as CSSProperties}
                >
                  {(!collapsed || mobileOpen) && (
                    <>
                      {prefs.omnibarPosition === "sidebar" && (
                        <SurfaceMenu kind="omnibar">
                          <Omnibar onNavigate={go} />
                        </SurfaceMenu>
                      )}
                      <div className="sidebar-action-row">
                        <button
                          type="button"
                          className="sidebar-new-tab"
                          onClick={() => window.dispatchEvent(new Event("canvas:new-tab"))}
                        >
                          <AnimatedIcon name="plus" size={16} />
                          <span>{t("New tab")}</span>
                        </button>
                      </div>
                      <SidebarContents current={page} onNavigate={go} />
                    </>
                  )}
                </aside>
                <CanvasContextMenu
                  actions={[
                    {
                      label: t("Move sidebar left"),
                      icon: "move",
                      action: () => updatePreferences({ sidebarPosition: "left" }),
                    },
                    {
                      label: t("Move sidebar right"),
                      icon: "move",
                      action: () => updatePreferences({ sidebarPosition: "right" }),
                    },
                  ]}
                >
                  <hr
                    className={`sidebar-resizer ${collapsed ? "disabled" : ""}`}
                    aria-label={t("Resize sidebar")}
                    aria-orientation="vertical"
                    aria-valuenow={prefs.sidebarWidth}
                    aria-valuemin={180}
                    aria-valuemax={480}
                    tabIndex={collapsed ? -1 : 0}
                    onPointerDown={(event) => {
                      if (collapsed || event.button !== 0) return;
                      event.preventDefault();
                      resizing.current = true;
                      resizeOrigin.current = { x: event.clientX, width: prefs.sidebarWidth };
                      event.currentTarget.setPointerCapture(event.pointerId);
                      document.body.classList.add("resizing-sidebar");
                    }}
                    onPointerMove={(event) => {
                      if (!resizing.current) return;
                      const sign = prefs.sidebarPosition === "left" ? 1 : -1;
                      const delta = (event.clientX - resizeOrigin.current.x) * sign;
                      updatePreferences({
                        sidebarWidth: Math.min(
                          480,
                          Math.max(180, Math.round(resizeOrigin.current.width + delta)),
                        ),
                      });
                    }}
                    onLostPointerCapture={() => {
                      resizing.current = false;
                      document.body.classList.remove("resizing-sidebar");
                    }}
                    onPointerUp={(event) => {
                      if (event.currentTarget.hasPointerCapture(event.pointerId))
                        event.currentTarget.releasePointerCapture(event.pointerId);
                    }}
                    onPointerCancel={(event) => {
                      if (event.currentTarget.hasPointerCapture(event.pointerId))
                        event.currentTarget.releasePointerCapture(event.pointerId);
                    }}
                    onDoubleClick={() => updatePreferences({ sidebarWidth: 228 })}
                    onKeyDown={(event) => {
                      const direction =
                        event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
                      if (direction) {
                        event.preventDefault();
                        updatePreferences({
                          sidebarWidth: Math.min(
                            480,
                            Math.max(
                              180,
                              prefs.sidebarWidth +
                                direction * (prefs.sidebarPosition === "right" ? -16 : 16),
                            ),
                          ),
                        });
                      }
                      if (event.key === "Home") {
                        event.preventDefault();
                        updatePreferences({ sidebarWidth: 180 });
                      }
                      if (event.key === "End") {
                        event.preventDefault();
                        updatePreferences({ sidebarWidth: 480 });
                      }
                    }}
                  />
                </CanvasContextMenu>
              </>
            )}
            <div className="main-column">
              <main className="dock-content">
                <DockCanvas
                  key={currentProfileId}
                  profileId={currentProfileId}
                  route={path}
                  onNavigate={go}
                  dark={dark}
                  pinned={activeProfile?.pinned ?? []}
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
      <footer className="window-statusbar">
        {(["left", "center", "right"] as const).map((alignment) => {
          const segments = [
            {
              id: "snapshot",
              visible: true,
              node: <span className="snapshot-state">{t("Repository snapshot · read-only")}</span>,
            },
            {
              id: "navigation",
              visible: prefs.navigationPosition === "statusbar",
              node: <Navigator current={page} onNavigate={go} onProfile={switchProfile} />,
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
                    className="status-settings"
                    aria-label={t("Settings")}
                    title={t("Settings")}
                    onClick={() => go("/settings")}
                  >
                    <AnimatedIcon name="settings" size={16} />
                  </button>
                </SurfaceMenu>
              ),
            },
            {
              id: "version",
              visible: true,
              node: (
                <span>
                  {t("Version")}: {appVersion} · {t("Prototype")}
                </span>
              ),
            },
            {
              id: "revision",
              visible: true,
              node: (
                <span>
                  {context.repository} / {context.revision}
                </span>
              ),
            },
          ].filter(
            (segment) =>
              segment.visible &&
              prefs.statusAlignment[segment.id as keyof typeof prefs.statusAlignment] === alignment,
          );
          return (
            <div className={`status-group status-group-${alignment}`} key={alignment}>
              {segments.map((segment, index) => (
                <Fragment key={segment.id}>
                  {index > 0 && (
                    <span className="status-delimiter" aria-hidden="true">
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
              onPointerDown={(event) => {
                event.preventDefault();
                floatOrigin.current = {
                  pointerX: event.clientX,
                  pointerY: event.clientY,
                  x: prefs.floatingX,
                  y: prefs.floatingY,
                };
                event.currentTarget.setPointerCapture(event.pointerId);
                setFloatingDrag(true);
              }}
              onPointerMove={(event) => {
                if (!floatingDrag) return;
                updatePreferences({
                  floatingX: Math.min(
                    Math.max(
                      0,
                      floatOrigin.current.x + event.clientX - floatOrigin.current.pointerX,
                    ),
                    window.innerWidth - 120,
                  ),
                  floatingY: Math.min(
                    Math.max(
                      0,
                      floatOrigin.current.y + event.clientY - floatOrigin.current.pointerY,
                    ),
                    window.innerHeight - 35,
                  ),
                });
              }}
              onPointerUp={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId))
                  event.currentTarget.releasePointerCapture(event.pointerId);
              }}
              onLostPointerCapture={() => setFloatingDrag(false)}
            >
              <AnimatedIcon name="drag" size={15} />
            </button>
          }
        />
      )}
      {prefs.omnibarPosition === "hidden" && <Omnibar onNavigate={go} fallback />}
      <Notifications />
    </div>
  );
}
