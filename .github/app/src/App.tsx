import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useAppHotkeys, useHotkey } from "@tanstack/react-hotkeys";
import { useTranslation } from "react-i18next";
import { useCanvasConfig, POSITIONS } from "./config";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "motion/react";
import { AnimatedIcon } from "./components/AnimatedIcon";
import { Button } from "./components/ui/button";
import { CanvasContextMenu } from "./components/ui/ContextMenu";
import Monaco from "./Monaco";
import PreferencesPanel from "./PreferencesPanel";
import { useProfiles } from "./profiles";
import {
  Navigator,
  NavigationTree,
  OmnibarTrigger,
  ActivityBar,
  SidebarContents,
  Notepad,
  Library,
  SurfaceMenu,
} from "./ShellComponents";
import { NotificationCenter, Notifications } from "./notifications";
import { VIEWS as nav, viewFromRoute } from "./views";
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
  const [collapsed, setCollapsed] = useState(false);
  const resizing = useRef(false);
  const resizeOrigin = useRef({ x: 0, width: 228 });
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
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState(0);
  const input = useRef<HTMLInputElement>(null);
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
  const filtered = useMemo(
    () =>
      nav.filter((x) =>
        (context.name + " " + t(x.label)).toLowerCase().includes(search.toLowerCase()),
      ),
    [search, t],
  );
  useEffect(() => {
    if (paletteOpen) requestAnimationFrame(() => input.current?.focus());
  }, [paletteOpen]);
  useEffect(() => {
    if (!paletteOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", onEscape, true);
    return () => window.removeEventListener("keydown", onEscape, true);
  }, [paletteOpen]);
  const go = (dest: string) => {
    setRoute(dest);
    navigate(dest);
    setMobileOpen(false);
    setPaletteOpen(false);
    setSearch("");
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
  useHotkey(hotkeys["canvas.omnibar.toggle"], () => setPaletteOpen((v) => !v), {
    ignoreInputs: false,
  });
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
              <div>
                <OmnibarTrigger open={() => setPaletteOpen(true)} />
              </div>
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
          {prefs.activityBarPosition !== "hidden" && (
            <ActivityBar
              current={page}
              onNavigate={go}
              onNewTab={() => window.dispatchEvent(new Event("canvas:new-tab"))}
              showSettings={prefs.settingsPosition === "activitybar"}
            />
          )}
          <div className={`primary-content sidebar-${prefs.sidebarPosition}`}>
            {(prefs.navigationPosition === "sidebar" ||
              prefs.omnibarPosition === "sidebar" ||
              (page !== null && ["library", "editor"].includes(page))) && (
              <>
                <aside
                  className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}
                  aria-label="Main navigation"
                  style={{ "--sidebar-width": `${prefs.sidebarWidth}px` } as CSSProperties}
                >
                  {(!collapsed || mobileOpen) && (
                    <>
                      {prefs.omnibarPosition === "sidebar" && (
                        <SurfaceMenu kind="omnibar">
                          <div className="sidebar-omnibar">
                            <OmnibarTrigger open={() => setPaletteOpen(true)} />
                          </div>
                        </SurfaceMenu>
                      )}
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
                    if (view === "notepad") return <Notepad />;
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
        <span className="snapshot-state">
          <span className="snapshot-desktop">{t("Repository snapshot · read-only")}</span>
          <span className="snapshot-mobile">{t("Read-only snapshot")}</span>
        </span>
        {prefs.navigationPosition === "statusbar" && (
          <Navigator current={page} onNavigate={go} onProfile={switchProfile} />
        )}
        {prefs.omnibarPosition === "statusbar" && (
          <SurfaceMenu kind="omnibar">
            <div className="status-omnibar">
              <OmnibarTrigger open={() => setPaletteOpen(true)} />
            </div>
          </SurfaceMenu>
        )}
        {prefs.settingsPosition === "statusbar" && (
          <SurfaceMenu kind="settings">
            <button
              type="button"
              className="status-settings"
              aria-label={t("Settings")}
              onClick={() => go("/settings")}
            >
              <AnimatedIcon name="settings" size={15} />
            </button>
          </SurfaceMenu>
        )}
        <span className="version">
          {t("Version")}: {appVersion} · {t("Prototype")}
        </span>
        <span>
          {context.repository} / {context.revision}
        </span>
      </footer>
      {prefs.omnibarPosition === "floating" && (
        <div
          className={`floating-omnibar ${floatingDrag ? "dragging" : ""}`}
          style={{ left: prefs.floatingX, top: prefs.floatingY }}
        >
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
                  Math.max(0, floatOrigin.current.x + event.clientX - floatOrigin.current.pointerX),
                  window.innerWidth - 120,
                ),
                floatingY: Math.min(
                  Math.max(0, floatOrigin.current.y + event.clientY - floatOrigin.current.pointerY),
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
            <AnimatedIcon name="move" size={15} />
          </button>
          <SurfaceMenu kind="omnibar">
            <div>
              <OmnibarTrigger open={() => setPaletteOpen(true)} />
            </div>
          </SurfaceMenu>
        </div>
      )}
      <Notifications />
      <AnimatePresence>
        {paletteOpen && (
          <motion.div
            className="palette-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setPaletteOpen(false);
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={t("Open navigation tree")}
              className="palette"
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
            >
              <div className="palette-search">
                {icon("search", 18)}
                <input
                  ref={input}
                  value={search}
                  aria-label={t("Search pages and commands")}
                  placeholder={t("Search pages and commands")}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSelection(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setPaletteOpen(false);
                    }
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setSelection((s) => Math.min(s + 1, filtered.length - 1));
                    }
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setSelection((s) => Math.max(s - 1, 0));
                    }
                    if (e.key === "Enter" && filtered[selection]) go("/" + filtered[selection].id);
                  }}
                />
                <kbd>ESC</kbd>
              </div>
              <div className="palette-tree">
                {prefs.navigationPosition === "omnibar" && (
                  <NavigationTree current={page} onNavigate={go} />
                )}
                {filtered.map((n, i) => (
                  <button
                    type="button"
                    key={n.id}
                    className={"palette-result " + (i === selection ? "focused" : "")}
                    onMouseEnter={() => setSelection(i)}
                    onClick={() => go("/" + n.id)}
                  >
                    {icon(n.id)}
                    <span>{t(n.label)}</span>
                    <small>{context.name}</small>
                    {icon("right", 13)}
                  </button>
                ))}
                {!filtered.length && <p className="empty-state">{t("No matching routes.")}</p>}
              </div>
              <div className="palette-footer">{t("↑ ↓ navigate · ↵ open · Esc dismiss")}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
