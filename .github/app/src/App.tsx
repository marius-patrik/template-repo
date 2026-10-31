import { useEffect, useMemo, useRef, useState } from "react";
import { colord, extend } from "colord";
import a11yPlugin from "colord/plugins/a11y";
import { formatForDisplay, useAppHotkeys, useHotkey } from "@tanstack/react-hotkeys";
import { AccentColorPicker, accentPresets } from "./AccentColorPicker";
import { useTranslation } from "react-i18next";
import { useCanvasConfig, type CanvasPreferences } from "./config";
import KeyboardSettings from "./KeyboardSettings";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "motion/react";
import { AnimatedIcon } from "./components/AnimatedIcon";
import { Button } from "./components/ui/button";
import Graph from "./Graph";
import DockCanvas from "./DockCanvas";
import context from "./generated/context.json";

type View =
  | "overview"
  | "workspace"
  | "projects"
  | "agents"
  | "graph"
  | "roadmap"
  | "artifacts"
  | "activity"
  | "context"
  | "settings";
type Preferences = CanvasPreferences;
extend([a11yPlugin]);
const nav: { id: View; label: string; group: string }[] = [
  { id: "overview", label: "Overview", group: "Workspace" },
  { id: "workspace", label: "Workspace", group: "Workspace" },
  { id: "projects", label: "Projects", group: "Workspace" },
  { id: "agents", label: "Agents", group: "Workspace" },
  { id: "graph", label: "Knowledge graph", group: "Workspace" },
  { id: "roadmap", label: "Roadmap", group: "Workspace" },
  { id: "artifacts", label: "Artifacts", group: "Workspace" },
  { id: "activity", label: "Activity", group: "Workspace" },
  { id: "context", label: "Context", group: "System" },
  { id: "settings", label: "Settings", group: "System" },
];

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
        <button type="button" key={d.path} className="doc-row" onClick={() => onOpen(d.path)}>
          <span>
            <AnimatedIcon name="artifacts" />
            {d.path}
          </span>
          <small>
            {t("Open document")} <AnimatedIcon name="right" size={13} />
          </small>
        </button>
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
  if (id === "workspace")
    return (
      <div className="page workspace-board">
        <PageIntro
          title="Workspace"
          detail="A configurable working surface. Open views with the sidebar or omnibar, then arrange their tabs with Dockview."
        />
        <div className="workspace-board-grid">
          <section className="panel padded">
            <p className="eyebrow">{t("Layout")}</p>
            <h2>{t("Arrange your workspace")}</h2>
            <p className="muted">
              {t(
                "Drag tabs to create groups, split panels, or float windows. Your arrangement is saved locally in this browser.",
              )}
            </p>
            <Button variant="subtle" onClick={() => to("/graph")}>
              {t("Open graph")} <AnimatedIcon name="right" size={15} />
            </Button>
          </section>
          <section className="panel padded">
            <p className="eyebrow">{t("Repository context")}</p>
            <h2>{context.name}</h2>
            <p className="muted">{context.repository}</p>
            <p className="muted">
              {t("{{documents}} authored source documents · revision {{revision}}", {
                documents: context.documents.length,
                revision: context.revision,
              })}
            </p>
            <Button variant="subtle" onClick={() => to("/artifacts")}>
              {t("Browse artifacts")} <AnimatedIcon name="right" size={15} />
            </Button>
          </section>
        </div>
      </div>
    );
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
function Settings({ prefs, setPrefs }: { prefs: Preferences; setPrefs: (p: Preferences) => void }) {
  const { t, i18n } = useTranslation();
  const resetPreferences = useCanvasConfig((state) => state.resetPreferences);
  const language = i18n.resolvedLanguage?.split("-")[0] ?? "en";
  const options = (
    key: keyof Preferences,
    values: readonly (string | number)[],
    label: string,
    valueLabel: (value: string | number) => string = (value) => String(value),
  ) => (
    <div className="setting-row">
      <strong>{t(label)}</strong>
      <fieldset className="segmented" aria-label={t(label)}>
        {values.map((value) => (
          <button
            type="button"
            key={String(value)}
            className={prefs[key] === value ? "selected" : ""}
            aria-pressed={prefs[key] === value}
            onClick={() => setPrefs({ ...prefs, [key]: value })}
          >
            {valueLabel(value)}
          </button>
        ))}
      </fieldset>
    </div>
  );

  return (
    <div className="page">
      <PageIntro
        title={t("Settings")}
        detail="Appearance, keyboard and language preferences are local to this browser."
      />
      <section className="panel padded settings-panel">
        <div className="settings-section-heading">
          <div>
            <h2>{t("Theme and skinning")}</h2>
            <p className="muted">
              {t("A preview of skin tokens and spacing, independent from accent color.")}
            </p>
          </div>
          <button className="keybind-reset-all" type="button" onClick={resetPreferences}>
            {t("Reset appearance")}
          </button>
        </div>
        {options("theme", ["dark", "light", "system"] as const, "Theme", (value) =>
          t(value === "system" ? "Use system" : value === "dark" ? "Dark" : "Light"),
        )}
        <div className="setting-row skin-setting">
          <strong>{t("Skin")}</strong>
          <fieldset className="skin-options" aria-label={t("Skin selection")}>
            {(["graphite", "slate", "contrast"] as const).map((skin) => (
              <button
                type="button"
                key={skin}
                className={`skin-choice ${prefs.skin === skin ? "selected" : ""}`}
                aria-pressed={prefs.skin === skin}
                onClick={() => setPrefs({ ...prefs, skin })}
              >
                <span className={`skin-preview skin-preview-${skin}`}>
                  <span />
                  <span />
                  <span />
                </span>
                <span>
                  {t(
                    skin === "graphite" ? "Graphite" : skin === "slate" ? "Slate" : "High contrast",
                  )}
                </span>
              </button>
            ))}
          </fieldset>
        </div>
        {options("density", ["comfortable", "compact"] as const, "Density", (value) =>
          t(value === "comfortable" ? "Comfortable" : "Compact"),
        )}
        <div className="setting-row accent-setting">
          <strong>{t("Accent color")}</strong>
          <AccentColorPicker
            value={prefs.accent}
            onChange={(accent) => setPrefs({ ...prefs, accent })}
          />
        </div>
        {options("fontSize", [13, 14, 15, 16] as const, "Text size")}
        {options("iconSize", [16, 18, 20] as const, "Icon size")}
      </section>
      <section className="panel padded settings-panel localization-settings">
        <h2>{t("Language")}</h2>
        <div className="setting-row">
          <label htmlFor="canvas-language">{t("Interface language")}</label>
          <select
            id="canvas-language"
            className="settings-language-select"
            aria-label={t("Interface language")}
            value={language}
            onChange={(event) => {
              void i18n.changeLanguage(event.target.value);
            }}
          >
            <option value="en">English</option>
            <option value="cs">Čeština</option>
            <option value="es">Español</option>
          </select>
        </div>
      </section>
      <KeyboardSettings />
      <p className="muted settings-note">
        Canvas v0.9.0 · {t("Prototype")}.{" "}
        {t("Local UI settings are not authoritative project data.")}
      </p>
    </div>
  );
}
export default function App() {
  const [path, navigate] = useLocation();
  const hotkeys = useAppHotkeys();
  const { t, i18n } = useTranslation();
  const prefs = useCanvasConfig((state) => state.preferences);
  const updatePreferences = useCanvasConfig((state) => state.setPreferences);
  const setPrefs = (next: Preferences) => updatePreferences(next);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const page: View = nav.find((x) => path.startsWith("/" + x.id))?.id ?? "overview";
  const title = t(nav.find((x) => x.id === page)?.label ?? "Overview");
  useEffect(() => {
    if (path === "/") navigate("/overview", { replace: true });
  }, [path, navigate]);
  useEffect(() => {
    const resolved = prefs.theme === "system" ? (systemDark ? "dark" : "light") : prefs.theme;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.skin = prefs.skin;
    document.documentElement.dataset.density = prefs.density;
    document.documentElement.dataset.accent = accentPresets.some(
      (preset) => preset.id === prefs.accent,
    )
      ? prefs.accent
      : "custom";
    if (/^#[0-9a-f]{6}$/i.test(prefs.accent) && colord(prefs.accent).isValid()) {
      const color = colord(prefs.accent);
      document.documentElement.style.setProperty("--accent", color.toHex());
      document.documentElement.style.setProperty(
        "--accent-foreground",
        color.contrast("#ffffff") >= color.contrast("#111113") ? "#ffffff" : "#111113",
      );
    } else {
      document.documentElement.style.removeProperty("--accent");
      document.documentElement.style.removeProperty("--accent-foreground");
    }
    document.documentElement.style.setProperty("--app-font-size", prefs.fontSize + "px");
    document.documentElement.style.setProperty("--app-icon-size", prefs.iconSize + "px");
  }, [prefs, systemDark]);
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
        (t(x.group) + " " + context.name + " " + t(x.label))
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
    navigate(dest);
    setMobileOpen(false);
    setPaletteOpen(false);
    setSearch("");
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
  useHotkey(hotkeys["canvas.workspace.open"], () => go("/workspace"));
  useHotkey(hotkeys["canvas.projects.open"], () => go("/projects"));
  useHotkey(hotkeys["canvas.graph.open"], () => go("/graph"));
  const icon = (name: string, size = prefs.iconSize) => <AnimatedIcon name={name} size={size} />;
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
          <strong>Canvas</strong>
        </div>
        <div className="omnibar-area">
          <button
            type="button"
            className="omnibar-trigger"
            aria-label={t("Open navigation tree")}
            onClick={() => setPaletteOpen(true)}
          >
            {icon("search", 14)}
            <span className="crumb">{t("Personal workspace")}</span>
            {icon("right", 12)}
            <span className="crumb">{context.name}</span>
            {icon("right", 12)}
            <strong>{title}</strong>
            <kbd>
              {hotkeys["canvas.omnibar.toggle"].hotkey
                ? formatForDisplay(hotkeys["canvas.omnibar.toggle"].hotkey)
                : "Unbound"}
            </kbd>
          </button>
        </div>
        <Button
          size="icon"
          aria-label={t("Settings")}
          title={t("Settings")}
          onClick={() => go("/settings")}
          className="title-settings"
        >
          {icon("settings")}
        </Button>
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
        <aside
          className={[
            "sidebar",
            collapsed ? "collapsed" : "",
            mobileOpen ? "mobile-open" : "",
          ].join(" ")}
          aria-label="Main navigation"
        >
          <nav className="sidebar-navigation">
            {["Workspace", "System"].map((group) => (
              <div className="nav-group" key={group}>
                {(!collapsed || mobileOpen) && <div className="nav-group-label">{t(group)}</div>}
                {nav
                  .filter((n) => n.group === group && n.id !== "settings")
                  .map((n) => (
                    <Link
                      href={"/" + n.id}
                      key={n.id}
                      className={"nav-link " + (page === n.id ? "active" : "")}
                      onClick={() => setMobileOpen(false)}
                      title={t(n.label)}
                      aria-current={page === n.id ? "page" : undefined}
                    >
                      {icon(n.id)}
                      {(!collapsed || mobileOpen) && <span>{t(n.label)}</span>}
                    </Link>
                  ))}
              </div>
            ))}
          </nav>
        </aside>
        <div className="main-column">
          <main className="dock-content">
            <DockCanvas
              route={path}
              onNavigate={go}
              dark={prefs.theme === "system" ? systemDark : prefs.theme === "dark"}
              renderView={(view) => {
                const id = view as View;
                if (id === "overview") return <Overview to={go} />;
                if (id === "settings") return <Settings prefs={prefs} setPrefs={setPrefs} />;
                return <SimplePage id={id} to={go} />;
              }}
            />
          </main>
        </div>
      </div>
      <footer className="window-statusbar">
        <span className="snapshot-state">
          <span className="snapshot-desktop">{t("Repository snapshot · read-only")}</span>
          <span className="snapshot-mobile">{t("Read-only snapshot")}</span>
        </span>
        <span className="version">
          {t("Version")}: 0.9.0 · {t("Prototype")}
        </span>
        <span>
          {context.repository} / {context.revision}
        </span>
      </footer>
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
                <div className="palette-root">
                  Personal workspace {icon("right", 13)} {context.name}
                </div>
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
