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
import { Navigator, NavigationTree, OmnibarTrigger, ActivityBar, SidebarContents, Notepad, Library, SurfaceMenu } from "./ShellComponents";
import { NotificationCenter, Notifications, notify } from "./notifications";
import { VIEWS as nav, type CanvasView as View, viewFromRoute } from "./views";
import { version as appVersion } from "../package.json";
import Graph from "./Graph";
import DockCanvas from "./DockCanvas";
import context from "./generated/context.json";

function MarkdownSource({ value }: { value: string }) {
  return <pre className="source-preview">{value}</pre>;
}
function PageIntro({ title, detail }: { title: string; detail: string }) {
  const { t } = useTranslation();
  return (
    <header className="page-intro">
      <p className="eyebrow">{t("Repository / {{name}}", { name: context.name })}</p>
      <h1>{t(title)}</h1>
      <p className="muted">{t(detail)}</p>
    </header>
  );
}
function SourceIndex({ onOpen }: { onOpen: (id: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="source-index">
      {context.documents.map((d) => (
        <CanvasContextMenu
          key={d.path}
          actions={[
            { icon: "artifacts", label: t("Open document"), action: () => onOpen(d.path) },
            {
              icon: "copy",
              label: t("Copy source path"),
              action: () => {
                void navigator.clipboard.writeText(d.path).then(
                  () => notify.success(t("Copied to clipboard")),
                  () => notify.error(t("Clipboard unavailable")),
                );
              },
            },
            {
              icon: "copy",
              label: t("Copy source content"),
              action: () => {
                void navigator.clipboard.writeText(d.content).then(
                  () => notify.success(t("Copied to clipboard")),
                  () => notify.error(t("Clipboard unavailable")),
                );
              },
            },
          ]}
        >
          <div className="source-context-row">
            <button type="button" className="doc-row" onClick={() => onOpen(d.path)}>
              <span>
                <AnimatedIcon name="artifacts" />
                {d.path}
              </span>
              <small>
                {t("Open document")} <AnimatedIcon name="right" size={13} />
              </small>
            </button>
          </div>
        </CanvasContextMenu>
      ))}
    </div>
  );
}
function Overview({ to }: { to: (p: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="page">
      <PageIntro
        title={context.name}
        detail="A repository-authored workspace. This view is generated from tracked source at build time, not a live service."
      />
      <div className="overview-grid">
        <section className="panel overview-primary">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{t("Workspace map")}</p>
              <h2>{t("Documentation relationships")}</h2>
            </div>
            <Button onClick={() => to("/graph")} variant="subtle">
              {t("Expand")} <AnimatedIcon name="arrow" size={15} />
            </Button>
          </div>
          <div className="map-viewport">
            <Graph />
          </div>
          <div className="panel-footnote">
            {t("{{documents}} source documents · {{records}} documented records", {
              documents: context.documents.length,
              records: context.paths.length,
            })}
          </div>
        </section>
        <div className="stack">
          <section className="panel padded">
            <p className="eyebrow">{t("Project identity")}</p>
            <h2>{context.repository}</h2>
            <p className="muted">
              {t("Build source: Git-tracked documents. Revision {{revision}}.", {
                revision: context.revision,
              })}
            </p>
            <div className="meta-list">
              <span>{t("Current branch")}</span>
              <strong>{context.branch}</strong>
              <span>{t("Publication")}</span>
              <strong>{t("Static · read-only")}</strong>
            </div>
          </section>
          <section className="panel padded">
            <p className="eyebrow">{t("Authoritative goal")}</p>
            <p className="goal-text">{context.goal.replace(/^#.*\n/, "").trim()}</p>
            <Button variant="subtle" onClick={() => to("/context")}>
              {t("View original source")} <AnimatedIcon name="right" size={15} />
            </Button>
          </section>
        </div>
      </div>
      <div className="section-header">
        <h2>{t("Repository source")}</h2>
        <span>{t("Generated from tracked records")}</span>
      </div>
      <div className="panel">
        <SourceIndex onOpen={(id) => to("/artifacts?file=" + encodeURIComponent(id))} />
      </div>
    </div>
  );
}
function SimplePage({ id, to }: { id: View; to: (p: string) => void }) {
  const { t } = useTranslation();
  const docs = context.documents;
  const prd = docs.find((x) => x.path === ".agents/PRD.md");
  const agents = docs.find((x) => x.path === ".agents/AGENTS.md");
  const ctx = docs.find((x) => x.path === "AGENTS.md");
  if (id === "graph")
    return (
      <div className="workbench-page">
        <PageIntro
          title="Knowledge graph"
          detail="Document links derived from the repository's existing authoring structure."
        />
        <div className="full-graph">
          <Graph />
        </div>
      </div>
    );
  if (id === "projects")
    return (
      <div className="page">
        <PageIntro title="Projects" detail="Repositories available in this compiled snapshot." />
        <div className="panel padded project-card">
          <p className="eyebrow">{t("Source repository")}</p>
          <h2>{context.name}</h2>
          <p className="muted">{context.repository}</p>
          <p>{context.goal.replace(/^#.*\n/, "").trim()}</p>
          <Button variant="subtle" onClick={() => to("/overview")}>
            {t("Open workspace")} <AnimatedIcon name="right" size={15} />
          </Button>
        </div>
      </div>
    );
  if (id === "roadmap")
    return (
      <div className="page">
        <PageIntro
          title="Roadmap"
          detail="Requirements and plans are sourced from the repository rather than simulated task statuses."
        />
        <div className="panel padded">
          <h2>{t("Requirements source")}</h2>
          {prd ? (
            <MarkdownSource value={prd.content} />
          ) : (
            <p className="muted">{t("No generated PRD is available in this snapshot.")}</p>
          )}
        </div>
      </div>
    );
  if (id === "agents")
    return (
      <div className="page">
        <PageIntro
          title="Agents"
          detail="Agent rules are sourced from the generated repository guidance."
        />
        <div className="panel padded">
          <h2>{t("Current agent guidance")}</h2>
          {agents ? (
            <MarkdownSource value={agents.content} />
          ) : (
            <p className="muted">{t("No agent-rule document is available.")}</p>
          )}
        </div>
      </div>
    );
  if (id === "context")
    return (
      <div className="page">
        <PageIntro title="Context" detail="Context authority and repository-authored Markdown." />
        <div className="panel padded">
          <h2>{ctx ? "AGENTS.md" : t("Root AGENTS.md is not configured")}</h2>
          {ctx ? (
            <MarkdownSource value={ctx.content} />
          ) : (
            <p className="muted">
              {t(
                "The template currently generates .agents/AGENTS.md from its agent rules. A separate root context file has not been assumed or fabricated.",
              )}
            </p>
          )}
          <h3>{t("Available source documents")}</h3>
          <SourceIndex onOpen={(p) => to("/artifacts?file=" + encodeURIComponent(p))} />
        </div>
      </div>
    );
  if (id === "activity")
    return (
      <div className="page">
        <PageIntro
          title="Activity"
          detail="The published snapshot does not represent live execution telemetry."
        />
        <div className="panel padded">
          <p className="eyebrow">{t("Build provenance")}</p>
          <h2>
            {t("Source revision")} {context.revision}
          </h2>
          <p className="muted">
            {t(
              "Built from tracked repository documents. No agent activity or task completion is inferred.",
            )}
          </p>
        </div>
      </div>
    );
  if (id === "artifacts") return <Artifacts />;
  if (id === "monaco") return <Monaco />;
  if (id === "notepad") return <Notepad />;
  if (id === "library") return <Library onNavigate={to} />;
  return (
    <div className="page">
      <PageIntro title="Page" detail="Source-backed view." />
    </div>
  );
}
function Artifacts() {
  const { t } = useTranslation();
  const requested = decodeURIComponent(
    new URLSearchParams(window.location.hash.split("?")[1] || "").get("file") || "",
  );
  const [active, setActive] = useState(requested);
  useEffect(() => {
    setActive(requested);
  }, [requested]);
  const doc = context.documents.find((d) => d.path === active) ?? context.documents[0];
  return (
    <div className="page">
      <PageIntro
        title="Artifacts"
        detail="Source documents embedded during the GitHub Actions build."
      />
      <div className="artifact-layout">
        <div className="panel artifact-list">
          <SourceIndex onOpen={setActive} />
        </div>
        <article className="panel padded artifact-content">
          <h2>{doc?.path ?? t("No documents")}</h2>
          {doc ? (
            <MarkdownSource value={doc.content} />
          ) : (
            <p className="muted">{t("No source documents available.")}</p>
          )}
        </article>
      </div>
    </div>
  );
}
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
  const currentProfileId = useProfiles((state) => state.currentId);
  const activeProfile = useProfiles((state) => state.profiles.find((p) => p.id === state.currentId));
  const setRoute = useProfiles((state) => state.setRoute);
  const togglePin = useProfiles((state) => state.togglePin);
  const [floatingDrag, setFloatingDrag] = useState(false);
  const floatOrigin = useRef({ pointerX: 0, pointerY: 0, x: 0, y: 0 });
  useEffect(() => () => {
    document.body.classList.remove("resizing-sidebar");
    document.body.classList.remove("dragging-omnibar");
  }, []);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const page = viewFromRoute(path);

  useEffect(() => {
    const profile = useProfiles.getState().profiles.find((p) => p.id === useProfiles.getState().currentId);
    if (path === "/" && profile?.route && profile.route !== "/") navigate(profile.route, { replace: true });
  }, []);
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
    root.style.setProperty("--ui-spacing", prefs.spacing + "px");
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
        (context.name + " " + t(x.label))
          .toLowerCase()
          .includes(search.toLowerCase()),
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
  useHotkey(hotkeys["canvas.overview.open"], () => go("/overview"));
  useHotkey(hotkeys["canvas.workspace.open"], () => go("/"));
  useHotkey(hotkeys["canvas.projects.open"], () => go("/projects"));
  useHotkey(hotkeys["canvas.graph.open"], () => go("/graph"));
  const icon = (name: string, size = prefs.iconSize) => <AnimatedIcon name={name} size={size} />;
  return (
    <div className="app-root">
      <div className="window-titlebar">
        <div className="title-left">
          <Button size="icon" className="mobile-toggle" aria-label={t("Toggle navigation")}
            onClick={() => setMobileOpen((v) => !v)}>{icon("expand")}</Button>
          <Button size="icon" className="desktop-toggle"
            title={t(collapsed ? "Expand sidebar" : "Collapse sidebar")}
            aria-label={t(collapsed ? "Expand sidebar" : "Collapse sidebar")}
            onClick={() => setCollapsed((value) => !value)}>{icon(collapsed ? "expand" : "collapse")}</Button>
          {prefs.navigationPosition === "titlebar" &&
            <CanvasContextMenu actions={POSITIONS.navigation.map((position) => ({
              label: t("Navigation position") + " · " + t(position),
              icon: "move", action: () => updatePreferences({ navigationPosition: position }),
            }))}>
              <div><Navigator current={page} onNavigate={go} onProfile={switchProfile} /></div>
            </CanvasContextMenu>}
        </div>
        <div className="title-center">
          {prefs.omnibarPosition === "titlebar" ?
            <SurfaceMenu kind="omnibar"><div><OmnibarTrigger open={() => setPaletteOpen(true)} /></div></SurfaceMenu> :
            <strong>Canvas</strong>}
        </div>
        <div className="title-actions">
          <NotificationCenter />
          {prefs.settingsPosition === "titlebar" &&
            <SurfaceMenu kind="settings">
              <Button size="icon" aria-label={t("Settings")} title={t("Settings")}
                onClick={() => go("/settings")}>{icon("settings")}</Button>
            </SurfaceMenu>}
        </div>
      </div>
      <div className="window-main">
        {mobileOpen && <button type="button" aria-label={t("Close navigation")}
          className="sidebar-scrim" onClick={() => setMobileOpen(false)} />}
        <div className={`work-area activity-position-${prefs.activityBarPosition}`}>
          {prefs.activityBarPosition !== "hidden" &&
            <ActivityBar current={page} onNavigate={go} showSettings={prefs.settingsPosition === "activitybar"} />}
          <div className={`primary-content sidebar-${prefs.sidebarPosition}`}>
            {(prefs.navigationPosition === "sidebar" || (
              page !== null && ["library", "monaco", "artifacts", "context", "agents", "roadmap"].includes(page)
            )) && <>
              <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}
                aria-label="Main navigation"
                style={{ "--sidebar-width": `${prefs.sidebarWidth}px` } as CSSProperties}>
                {(!collapsed || mobileOpen) && <>
                  {prefs.omnibarPosition === "sidebar" &&
                    <SurfaceMenu kind="omnibar"><div className="sidebar-omnibar">
                      <OmnibarTrigger open={() => setPaletteOpen(true)} />
                    </div></SurfaceMenu>}
                  <SidebarContents current={page} onNavigate={go} />
                </>}
              </aside>
              <div className={`sidebar-resizer ${collapsed ? "disabled" : ""}`}
                role="separator" aria-label={t("Resize sidebar")} aria-orientation="vertical"
                aria-valuenow={prefs.sidebarWidth} aria-valuemin={180} aria-valuemax={480}
                tabIndex={collapsed ? -1 : 0}
                onPointerDown={(event) => {
                  if (collapsed || event.button !== 0) return;
                  event.preventDefault();
                  resizing.current = true;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  document.body.classList.add("resizing-sidebar");
                }}
                onPointerMove={(event) => {
                  if (resizing.current) updatePreferences({ sidebarWidth: Math.min(480, Math.max(180,
                    Math.round(prefs.sidebarPosition === "left" ? event.clientX : window.innerWidth - event.clientX))) });
                }}
                onLostPointerCapture={() => {
                  resizing.current = false;
                  document.body.classList.remove("resizing-sidebar");
                }}
                onPointerUp={(event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                }}
                onPointerCancel={(event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                }}
                onDoubleClick={() => updatePreferences({ sidebarWidth: 228 })}
                onKeyDown={(event) => {
                  const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
                  if (direction) {
                    event.preventDefault();
                    updatePreferences({ sidebarWidth: Math.min(480, Math.max(180, prefs.sidebarWidth +
                      direction * (prefs.sidebarPosition === "right" ? -16 : 16))) });
                  }
                  if (event.key === "Home") { event.preventDefault(); updatePreferences({ sidebarWidth: 180 }); }
                  if (event.key === "End") { event.preventDefault(); updatePreferences({ sidebarWidth: 480 }); }
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  updatePreferences({ sidebarPosition: prefs.sidebarPosition === "left" ? "right" : "left" });
                  notify.info(t("Primary sidebar position updated"));
                }}
              />
            </>}
            <div className="main-column">
              <main className="dock-content">
                <DockCanvas key={currentProfileId} profileId={currentProfileId} route={path}
                  onNavigate={go} dark={dark}
                  pinned={activeProfile?.pinned ?? []} onPin={togglePin}
                  showSettings={prefs.settingsPosition === "tabbar"}
                  renderView={(view) => {
                    if (view === "overview") return <Overview to={go} />;
                    if (view === "settings") return <PreferencesPanel />;
                    return <SimplePage id={view} to={go} />;
                  }} />
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
        {prefs.navigationPosition === "statusbar" &&
          <Navigator current={page} onNavigate={go} onProfile={switchProfile} />}
        {prefs.omnibarPosition === "statusbar" &&
          <SurfaceMenu kind="omnibar"><div className="status-omnibar">
            <OmnibarTrigger open={() => setPaletteOpen(true)} />
          </div></SurfaceMenu>}
        {prefs.settingsPosition === "statusbar" &&
          <SurfaceMenu kind="settings">
            <button type="button" className="status-settings" aria-label={t("Settings")}
              onClick={() => go("/settings")}><AnimatedIcon name="settings" size={15} /></button>
          </SurfaceMenu>}
        <span className="version">{t("Version")}: {appVersion} · {t("Prototype")}</span>
        <span>{context.repository} / {context.revision}</span>
      </footer>
      {prefs.omnibarPosition === "floating" && (
        <div className={`floating-omnibar ${floatingDrag ? "dragging" : ""}`}
          style={{ left: prefs.floatingX, top: prefs.floatingY }}>
          <button type="button" className="floating-handle" title={t("Drag omnibar")}
            aria-label={t("Drag omnibar")}
            onPointerDown={(event) => {
              event.preventDefault();
              floatOrigin.current = { pointerX: event.clientX, pointerY: event.clientY, x: prefs.floatingX, y: prefs.floatingY };
              event.currentTarget.setPointerCapture(event.pointerId);
              setFloatingDrag(true);
            }}
            onPointerMove={(event) => {
              if (!floatingDrag) return;
              updatePreferences({
                floatingX: Math.min(Math.max(0, floatOrigin.current.x + event.clientX - floatOrigin.current.pointerX), window.innerWidth - 120),
                floatingY: Math.min(Math.max(0, floatOrigin.current.y + event.clientY - floatOrigin.current.pointerY), window.innerHeight - 35),
              });
            }}
            onPointerUp={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onLostPointerCapture={() => setFloatingDrag(false)}>
            <AnimatedIcon name="move" size={15} />
          </button>
          <SurfaceMenu kind="omnibar"><div><OmnibarTrigger open={() => setPaletteOpen(true)} /></div></SurfaceMenu>
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
                {prefs.navigationPosition === "omnibar" &&
                  <NavigationTree current={page} onNavigate={go} />}
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
                    <small>{t(n.group)}</small>
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
