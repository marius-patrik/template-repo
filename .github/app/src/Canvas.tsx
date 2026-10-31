import { useEffect, useMemo, useState } from "react";
import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";
import dagre from "dagre";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { AnimatedIcon } from "./components/AnimatedIcon";
import { useCanvasConfig } from "./config";
import { notify } from "./notifications";
import context from "./generated/context.json";

type Perspective = "overview" | "artifacts" | "projects" | "agents" | "roadmap" | "context";
type Document = (typeof context.documents)[number];
const documents: Document[] = context.documents;
const byPath = new Map(documents.map((document) => [document.path, document]));
const allPaths = [...new Set([...documents.map((document) => document.path), ...context.paths])];
const pathSet = new Set(allPaths);
const title = (path: string) => path.split("/").at(-1)?.replace(/\.md$/i, "") ?? path;
const perspectives: { id: Perspective; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "overview" },
  { id: "artifacts", label: "Artifacts", icon: "artifacts" },
  { id: "projects", label: "Projects", icon: "projects" },
  { id: "agents", label: "Agents", icon: "agents" },
  { id: "roadmap", label: "Roadmap", icon: "roadmap" },
  { id: "context", label: "Context", icon: "context" },
];

function links(): Array<readonly [string, string]> {
  return documents.flatMap((document) =>
    [...document.content.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)]
      .map((match) => {
        try {
          if (/^[a-z]+:/i.test(match[1])) return null;
          const url = new URL(match[1], new URL(document.path, "https://canvas.invalid/"));
          const target = decodeURIComponent(url.pathname.replace(/^\//, ""));
          return pathSet.has(target) ? ([document.path, target] as const) : null;
        } catch {
          return null;
        }
      })
      .filter((edge): edge is readonly [string, string] => edge !== null),
  );
}

function Source({ document }: { document: Document | undefined }) {
  const { t } = useTranslation();
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify.success(t("Copied to clipboard"));
    } catch {
      notify.error(t("Clipboard unavailable"));
    }
  };
  if (!document) return <p className="canvas-empty-message">{t("No source documents available.")}</p>;
  return (
    <div className="canvas-source" data-testid="canvas-source">
      <div className="canvas-source-heading">
        <span title={document.path}>{document.path}</span>
        <div className="canvas-source-actions">
          <button type="button" aria-label={t("Copy source path")} title={t("Copy source path")} onClick={() => void copy(document.path)}>
            <AnimatedIcon name="copy" size={15} />
          </button>
          <button type="button" aria-label={t("Copy source content")} title={t("Copy source content")} onClick={() => void copy(document.content)}>
            <AnimatedIcon name="artifacts" size={15} />
          </button>
        </div>
      </div>
      <pre className="canvas-source-text">{document.content}</pre>
    </div>
  );
}

export default function Canvas() {
  const { t } = useTranslation();
  const [route] = useLocation();
  const [perspective, setPerspective] = useState<Perspective>("overview");
  const [mode, setMode] = useState<"graph" | "documents">("graph");
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const theme = useCanvasConfig((state) => state.preferences.theme);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setSystemDark(media.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);
  useEffect(() => {
    const file = new URLSearchParams(route.split("?").slice(1).join("?")).get("file");
    if (file && pathSet.has(file)) {
      setSelected(file);
      setPerspective("artifacts");
    }
  }, [route]);
  const graph = useMemo(() => {
    const layout = new dagre.graphlib.Graph();
    layout.setGraph({ rankdir: "LR", ranksep: 100, nodesep: 35, marginx: 40, marginy: 40 });
    layout.setDefaultEdgeLabel(() => ({}));
    for (const path of allPaths) layout.setNode(path, { width: 170, height: 52 });
    const relationships = links();
    for (const [from, to] of relationships) layout.setEdge(from, to);
    dagre.layout(layout);
    const nodes: Node[] = allPaths.map((path) => {
      const position = layout.node(path);
      return {
        id: path,
        position: { x: position.x - 85, y: position.y - 26 },
        data: { label: title(path) },
        style: {
          width: 170, minHeight: 52, display: "flex", alignItems: "center",
          borderRadius: "var(--ui-radius)", border: "1px solid var(--border)",
          background: selected === path ? "var(--raised)" : "var(--surface)",
          color: "var(--text)", boxShadow: "none", fontFamily: "inherit",
          fontSize: "calc(var(--app-font-size) * .85)",
        },
      };
    });
    const edges: Edge[] = relationships.map(([source, target], i) => ({
      id: "relation-" + i, source, target, type: "smoothstep",
      style: { stroke: "var(--muted)", strokeWidth: 1.1 },
    }));
    return { nodes, edges };
  }, [selected]);
  const filtered = documents.filter((document) => document.path.toLowerCase().includes(filter.toLowerCase()));
  const chosen = byPath.get(selected ?? "");
  const first = (...paths: string[]) => paths.map((path) => byPath.get(path)).find(Boolean);
  const roadmaps = [".agents/PLAN.md", ".agents/PRD.md", ".agents/TODO.md"];
  const roadmap = chosen && roadmaps.includes(chosen.path) ? chosen : first(...roadmaps);
  const currentDoc =
    perspective === "artifacts" ? (chosen ?? documents[0]) :
    perspective === "agents" ? first(".agents/AGENTS.md", "AGENTS.md") :
    perspective === "context" ? first("AGENTS.md", ".agents/AGENTS.md", ".agents/ARCHITECTURE.md") :
    perspective === "roadmap" ? roadmap : undefined;
  const showDocument = (path: string) => {
    setSelected(path);
    setPerspective("artifacts");
  };
  return (
    <div className="canvas-studio" data-testid="canvas-studio">
      <header className="canvas-studio-header">
        <div className="canvas-studio-title">
          <AnimatedIcon name="canvas" size={19} />
          <div><strong>Canvas</strong><span>{context.repository}</span></div>
        </div>
        <span className="canvas-studio-revision">{context.revision} · {t("Read-only snapshot")}</span>
      </header>
      <nav className="canvas-perspectives" aria-label={t("Canvas") + " · " + t("Navigation")}>
        {perspectives.map((item) => (
          <button key={item.id} type="button"
            className={perspective === item.id ? "active" : ""}
            aria-current={perspective === item.id ? "page" : undefined}
            onClick={() => setPerspective(item.id)}>
            <AnimatedIcon name={item.icon} size={15} /><span>{t(item.label)}</span>
          </button>
        ))}
      </nav>
      <div className="canvas-work-area">
        <section className="canvas-primary" aria-label={t("Repository document relationships")}>
          <div className="canvas-primary-toolbar">
            <div><strong>{t("Documentation relationships")}</strong><span>{context.paths.length} {t("Source documents").toLowerCase()}</span></div>
            <div className="canvas-mode-switch" role="group" aria-label={t("View")}>
              <button type="button" className={mode === "graph" ? "active" : ""} aria-label={t("Knowledge graph")} aria-pressed={mode === "graph"} onClick={() => setMode("graph")}><AnimatedIcon name="canvas" size={15} /></button>
              <button type="button" className={mode === "documents" ? "active" : ""} aria-label={t("Source documents")} aria-pressed={mode === "documents"} onClick={() => setMode("documents")}><AnimatedIcon name="library" size={15} /></button>
            </div>
          </div>
          {mode === "graph" ? (
            <div className="canvas-flow" data-testid="canvas-graph">
              <ReactFlow nodes={graph.nodes} edges={graph.edges} fitView fitViewOptions={{ padding: 0.18 }}
                onNodeClick={(_, node) => showDocument(node.id)} nodesConnectable={false} nodesDraggable={false}
                colorMode={theme === "system" ? (systemDark ? "dark" : "light") : theme}
                proOptions={{ hideAttribution: true }}>
                <Background color="var(--border)" gap={24} size={1} />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>
          ) : (
            <div className="canvas-sources">
              <label className="canvas-search"><AnimatedIcon name="search" size={15} /><input type="search" placeholder={t("Search documents")} aria-label={t("Search documents")} value={filter} onChange={(event) => setFilter(event.target.value)} /></label>
              {filtered.map((document) => (
                <button type="button" key={document.path} className={"canvas-source-row " + (selected === document.path ? "active" : "")} onClick={() => showDocument(document.path)}>
                  <AnimatedIcon name="artifacts" size={16} /><span>{document.path}</span><AnimatedIcon name="right" size={13} />
                </button>
              ))}
            </div>
          )}
        </section>
        <aside className="canvas-inspector" aria-label={t("Repository context")}>
          <header className="canvas-inspector-heading">
            <strong>{t(perspectives.find((p) => p.id === perspective)?.label ?? "Overview")}</strong>
            <small>{t("Repository snapshot")}</small>
          </header>
          <div className="canvas-inspector-body">
            {perspective === "overview" && (
              <>
                <div className="canvas-detail"><small>{t("Project identity")}</small><strong>{context.name}</strong><span>{context.repository}</span></div>
                <div className="canvas-detail"><small>{t("Authoritative goal")}</small><p>{context.goal.replace(/^#.*\n/, "").trim()}</p></div>
                <div className="canvas-detail"><small>{t("Build provenance")}</small><dl><dt>{t("Current branch")}</dt><dd>{context.branch}</dd><dt>{t("Source revision")}</dt><dd>{context.revision}</dd><dt>{t("Publication")}</dt><dd>{t("Static · read-only")}</dd></dl></div>
              </>
            )}
            {perspective === "projects" && (
              <>
                <div className="canvas-detail"><small>{t("Source repository")}</small><strong>{context.name}</strong><span>{context.repository}</span><p>{context.goal.replace(/^#.*\n/, "").trim()}</p></div>
                <div className="canvas-detail"><small>{t("Available source documents")}</small><span>{documents.length} documents · {context.paths.length} records</span></div>
              </>
            )}
            {perspective === "artifacts" && (
              <>
                <label className="canvas-search"><AnimatedIcon name="search" size={15} /><input type="search" placeholder={t("Filter documents")} aria-label={t("Filter documents")} value={filter} onChange={(event) => setFilter(event.target.value)} /></label>
                <div className="canvas-doc-picker">
                  {filtered.map((document) => (
                    <button type="button" key={document.path} title={document.path}
                      className={document.path === (chosen?.path ?? documents[0]?.path) ? "active" : ""}
                      onClick={() => setSelected(document.path)}>
                      <AnimatedIcon name="artifacts" size={14} /><span>{title(document.path)}</span>
                    </button>
                  ))}
                </div>
                <Source document={currentDoc} />
              </>
            )}
            {perspective === "roadmap" && (
              <>
                <div className="canvas-doc-picker">
                  {roadmaps.filter((path) => byPath.has(path)).map((path) => (
                    <button type="button" key={path} className={roadmap?.path === path ? "active" : ""}
                      onClick={() => setSelected(path)}>{title(path)}</button>
                  ))}
                </div>
                <Source document={currentDoc} />
              </>
            )}
            {(perspective === "context" || perspective === "agents") && <Source document={currentDoc} />}
          </div>
        </aside>
      </div>
    </div>
  );
}
