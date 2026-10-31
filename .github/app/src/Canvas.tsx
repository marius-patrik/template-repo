import { useEffect, useMemo, useState } from "react";
import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";
import dagre from "dagre";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { AnimatedIcon } from "./components/AnimatedIcon";
import { useCanvasConfig } from "./config";
import { notify } from "./notifications";
import context from "./generated/context.json";

type Document = (typeof context.documents)[number];
type Perspective = "overview" | "artifacts" | "projects" | "agents" | "roadmap" | "context";
type MainMode = "overview" | "documents" | "graph";
type Category = "Guidance" | "Planning" | "Architecture" | "Operations" | "Other";
const documents: Document[] = context.documents;
const byPath = new Map(documents.map((document) => [document.path, document]));
const allPaths = [...new Set([...documents.map((d) => d.path), ...context.paths])];
const knownPaths = new Set(allPaths);
const categories: Category[] = ["Guidance", "Planning", "Architecture", "Operations", "Other"];
const panes: { id: Perspective; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "overview" },
  { id: "artifacts", label: "Artifacts", icon: "artifacts" },
  { id: "projects", label: "Projects", icon: "projects" },
  { id: "agents", label: "Agents", icon: "agents" },
  { id: "roadmap", label: "Roadmap", icon: "roadmap" },
  { id: "context", label: "Context", icon: "context" },
];
const basename = (path: string) => path.split("/").at(-1)?.replace(/\.md$/i, "") ?? path;
const categoryOf = (path: string): Category => {
  const name = basename(path).toLowerCase();
  if (/architecture|adr|design|decision|system/.test(name)) return "Architecture";
  if (/plan|roadmap|prd|todo|milestone|backlog/.test(name)) return "Planning";
  if (/agents|goal|instruction|readme|context|guide/.test(name)) return "Guidance";
  if (/security|release|verification|delivery|workflow|check|test|ci|governance/.test(name))
    return "Operations";
  return "Other";
};
const human = (text: string) =>
  text
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
const extractSummary = (text: string, max = 245) => {
  const content = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^(#|[-*]\s|>|\||```|<!--)/.test(line))
    .join(" ");
  const summary = human(content);
  return summary.length > max ? summary.slice(0, max).replace(/\s+\S*$/, "") + "…" : summary;
};
function sourceLinks(): Array<readonly [string, string]> {
  return documents.flatMap((document) =>
    [...document.content.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)]
      .map((match) => {
        try {
          if (/^[a-z]+:/i.test(match[1])) return null;
          const url = new URL(match[1], new URL(document.path, "https://canvas.invalid/"));
          const target = decodeURIComponent(url.pathname.replace(/^\//, ""));
          return knownPaths.has(target) ? ([document.path, target] as const) : null;
        } catch {
          return null;
        }
      })
      .filter((pair): pair is readonly [string, string] => pair !== null),
  );
}
const edgesOfDocuments = sourceLinks();
const groupCounts = categories.map((name) => ({
  name,
  count: documents.filter((doc) => categoryOf(doc.path) === name).length,
}));
const relevant = (perspective: Perspective) => {
  if (perspective === "agents")
    return documents
      .filter((doc) => /agents|instructions|governance/i.test(doc.path))
      .sort(
        (a, b) =>
          Number(b.path.toLowerCase().endsWith("agents.md")) -
          Number(a.path.toLowerCase().endsWith("agents.md")),
      );
  if (perspective === "roadmap")
    return documents.filter((doc) => /plan|roadmap|prd|todo|milestone/i.test(doc.path));
  if (perspective === "context")
    return documents.filter((doc) => /agents\.md|architecture|context|goal/i.test(doc.path));
  if (perspective === "projects")
    return documents.filter((doc) => /goal|readme|prd|architecture|project/i.test(doc.path));
  return documents;
};

function MarkdownPreview({ content }: { content: string }) {
  const blocks = useMemo(() => {
    const chunks: {
      id: string;
      kind: "heading" | "body" | "list" | "code";
      value: string;
      level?: number;
    }[] = [];
    let kind: "body" | "list" | "code" = "body";
    let pending: string[] = [];
    let fence = false;
    const flush = () => {
      if (pending.length)
        chunks.push({
          id: `block-${chunks.length}`,
          kind,
          value: pending.join(kind === "code" ? "\n" : " "),
        });
      pending = [];
    };
    for (const line of content.split("\n")) {
      const raw = line.trimEnd();
      if (/^\s*```/.test(raw)) {
        flush();
        fence = !fence;
        kind = fence ? "code" : "body";
        continue;
      }
      if (fence) {
        pending.push(raw);
        continue;
      }
      const heading = raw.match(/^(#{1,4})\s+(.+)/);
      if (heading) {
        flush();
        chunks.push({
          id: `block-${chunks.length}`,
          kind: "heading",
          value: human(heading[2]),
          level: heading[1].length,
        });
        continue;
      }
      if (!raw.trim()) {
        flush();
        kind = "body";
        continue;
      }
      if (/^\s*(?:[-*+]\s+|\d+\.\s+)/.test(raw)) {
        if (kind !== "list") flush();
        kind = "list";
        pending.push(raw.trim().replace(/^(?:[-*+]\s+|\d+\.\s+)/, "• "));
      } else {
        if (kind === "list") flush();
        kind = "body";
        pending.push(human(raw));
      }
    }
    flush();
    return chunks;
  }, [content]);
  return (
    <div className="cx-readable-markdown">
      {blocks.map((block) => {
        if (block.kind === "heading") {
          if (block.level === 1) return <h2 key={block.id}>{block.value}</h2>;
          return <h3 key={block.id}>{block.value}</h3>;
        }
        if (block.kind === "code") return <pre key={block.id}>{block.value}</pre>;
        if (block.kind === "list")
          return (
            <p className="cx-md-list" key={block.id}>
              {block.value}
            </p>
          );
        return <p key={block.id}>{block.value}</p>;
      })}
    </div>
  );
}
function FileRow({
  path,
  active,
  onClick,
}: {
  path: string;
  active?: boolean;
  onClick: () => void;
}) {
  const group = categoryOf(path);
  return (
    <button
      type="button"
      className={`cx-file-row ${active ? "active" : ""}`}
      onClick={onClick}
      title={path}
      aria-current={active ? "true" : undefined}
    >
      <span className="cx-file-icon">
        <AnimatedIcon name="artifacts" size={16} />
      </span>
      <span className="cx-file-info">
        <strong>{basename(path)}</strong>
        <small>{path}</small>
      </span>
      <span className="cx-file-group">{group}</span>
      <AnimatedIcon name="right" size={14} />
    </button>
  );
}

export default function Canvas() {
  const { t } = useTranslation();
  const [route] = useLocation();
  const [perspective, setPerspective] = useState<Perspective>("overview");
  const [mode, setMode] = useState<MainMode>("overview");
  const [graphGroup, setGraphGroup] = useState<Category>("Guidance");
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const theme = useCanvasConfig((state) => state.preferences.theme);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => setSystemDark(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);
  useEffect(() => {
    const file = new URLSearchParams(route.split("?").slice(1).join("?")).get("file");
    if (file && knownPaths.has(file)) {
      setSelected(file);
      setPerspective("artifacts");
      setMode("documents");
    }
  }, [route]);
  const available = relevant(perspective);
  const filtered = available.filter(
    (doc) =>
      doc.path.toLowerCase().includes(filter.trim().toLowerCase()) ||
      basename(doc.path).toLowerCase().includes(filter.trim().toLowerCase()),
  );
  const focus = byPath.get(selected ?? "") ?? available[0] ?? documents[0];
  const graph = useMemo(() => {
    // Keep graph legible: show a focused, source-backed subgraph rather than
    // shrinking the entire repository into an unreadable vertical hairline.
    const members = allPaths.filter((path) => categoryOf(path) === graphGroup);
    const included = new Set(members);
    const layout = new dagre.graphlib.Graph();
    layout.setGraph({ rankdir: "TB", ranksep: 74, nodesep: 32, marginx: 42, marginy: 42 });
    layout.setDefaultEdgeLabel(() => ({}));
    for (const path of members) layout.setNode(path, { width: 220, height: 58 });
    const relationships = edgesOfDocuments.filter(
      ([from, to]) => included.has(from) && included.has(to),
    );
    for (const [from, to] of relationships) layout.setEdge(from, to);
    if (members.length) dagre.layout(layout);
    const nodes: Node[] = members.map((path) => {
      const point = layout.node(path) ?? { x: 110, y: 29 };
      return {
        id: path,
        position: { x: point.x - 110, y: point.y - 29 },
        data: { label: basename(path) },
        className: "cx-flow-node",
        style: {
          width: 220,
          height: 58,
          background: "var(--raised)",
          border: "1px solid var(--border)",
          color: "var(--text)",
          borderRadius: "var(--ui-radius)",
          fontSize: "calc(var(--app-font-size) * .86)",
          fontFamily: "inherit",
          boxShadow: selected === path ? "inset 3px 0 var(--accent)" : "none",
        },
      };
    });
    const edges: Edge[] = relationships.map(([source, target], index) => ({
      id: `relation-${index}`,
      source,
      target,
      type: "smoothstep",
      style: { stroke: "var(--subtle)", strokeWidth: 1.2 },
    }));
    return { nodes, edges, members };
  }, [graphGroup, selected]);
  const choose = (path: string) => {
    setSelected(path);
    setPerspective("artifacts");
    setMode("documents");
  };
  const activate = (target: Perspective) => {
    setPerspective(target);
    setMode(target === "overview" ? "overview" : "documents");
    setSelected(null);
    setFilter("");
  };
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      notify.success(t("Copied to clipboard"));
    } catch {
      notify.error(t("Clipboard unavailable"));
    }
  };
  const goalText = extractSummary(context.goal, 340);
  const firstGuidance = documents.filter((doc) => categoryOf(doc.path) === "Guidance").slice(0, 5);
  const suggested = firstGuidance.length ? firstGuidance : documents.slice(0, 5);
  return (
    <div className="canvas-studio cx-repository" data-testid="canvas-studio">
      <nav
        className="canvas-perspectives cx-repo-nav"
        aria-label={`${t("Canvas")} · ${t("Navigation")}`}
      >
        <div className="cx-repo-nav-links">
          {panes.map((item) => (
            <button
              key={item.id}
              type="button"
              className={perspective === item.id ? "active" : ""}
              aria-current={perspective === item.id ? "page" : undefined}
              onClick={() => activate(item.id)}
            >
              <AnimatedIcon name={item.icon} size={15} />
              <span>{t(item.label)}</span>
            </button>
          ))}
        </div>
        <div className="cx-repo-nav-meta">
          <span className="cx-live-dot" aria-hidden="true" />
          {t("Repository snapshot")} <span className="cx-meta-divider">/</span> {documents.length}{" "}
          {t("Source documents").toLowerCase()}
        </div>
      </nav>
      <div className="canvas-work-area cx-repo-work">
        <section
          className="canvas-primary cx-repo-main"
          aria-label={t("Repository document relationships")}
        >
          <div className="canvas-primary-toolbar cx-viewbar">
            <div className="cx-viewbar-title">
              <span className="cx-overline">
                {mode === "graph"
                  ? "RELATIONSHIPS"
                  : mode === "documents"
                    ? "SOURCE EXPLORER"
                    : "REPOSITORY OVERVIEW"}
              </span>
              <strong>
                {mode === "graph"
                  ? t("Knowledge graph")
                  : mode === "documents"
                    ? t("Source documents")
                    : context.name}
              </strong>
            </div>
            <fieldset
              className="canvas-mode-switch cx-viewbar-modes"
              aria-label={t("Display mode")}
            >
              <button
                type="button"
                className={mode === "overview" ? "active" : ""}
                aria-label={t("Overview")}
                aria-pressed={mode === "overview"}
                onClick={() => setMode("overview")}
              >
                <AnimatedIcon name="overview" size={15} />
                <span>{t("Overview")}</span>
              </button>
              <button
                type="button"
                className={mode === "documents" ? "active" : ""}
                aria-label={t("Source documents")}
                aria-pressed={mode === "documents"}
                onClick={() => setMode("documents")}
              >
                <AnimatedIcon name="library" size={15} />
                <span>{t("Files")}</span>
              </button>
              <button
                type="button"
                className={mode === "graph" ? "active" : ""}
                aria-label={t("Knowledge graph")}
                aria-pressed={mode === "graph"}
                onClick={() => setMode("graph")}
              >
                <AnimatedIcon name="canvas" size={15} />
                <span>{t("Graph")}</span>
              </button>
            </fieldset>
          </div>
          {mode === "overview" && (
            <div className="cx-overview-scroll">
              <div className="cx-overview-hero">
                <div className="cx-section-caption">
                  <span className="cx-caption-line" /> SOURCE-BACKED WORKSPACE
                </div>
                <h2>{context.name}</h2>
                <p className="cx-goal">
                  {goalText || t("No project goal found in the repository snapshot.")}
                </p>
                <div className="cx-overview-actions">
                  <button
                    type="button"
                    className="cx-primary-action"
                    onClick={() => setMode("documents")}
                  >
                    <AnimatedIcon name="library" size={16} /> {t("Explore documents")}{" "}
                    <AnimatedIcon name="right" size={15} />
                  </button>
                  <button
                    type="button"
                    className="cx-secondary-action"
                    onClick={() => setMode("graph")}
                  >
                    <AnimatedIcon name="canvas" size={16} /> {t("Knowledge graph")}
                  </button>
                </div>
              </div>
              <div className="cx-overview-metrics">
                <div>
                  <span>{t("Source documents")}</span>
                  <strong>{documents.length.toString().padStart(2, "0")}</strong>
                  <small>ALLOWLISTED</small>
                </div>
                <div>
                  <span>{t("Indexed paths")}</span>
                  <strong>{context.paths.length.toString().padStart(2, "0")}</strong>
                  <small>TRACKED</small>
                </div>
                <div>
                  <span>{t("Document links")}</span>
                  <strong>{edgesOfDocuments.length.toString().padStart(2, "0")}</strong>
                  <small>RESOLVED</small>
                </div>
              </div>
              <div className="cx-overview-section-head">
                <div>
                  <span className="cx-section-caption">EXPLORE</span>
                  <h3>{t("Start with the source")}</h3>
                </div>
                <button
                  type="button"
                  className="cx-text-action"
                  onClick={() => setMode("documents")}
                >
                  {t("View all")} <AnimatedIcon name="right" size={15} />
                </button>
              </div>
              <div className="cx-featured-docs">
                {suggested.map((doc) => (
                  <FileRow key={doc.path} path={doc.path} onClick={() => choose(doc.path)} />
                ))}
                {!suggested.length && (
                  <p className="cx-muted-message">{t("No source documents available.")}</p>
                )}
              </div>
              <div className="cx-overview-section-head">
                <div>
                  <span className="cx-section-caption">INDEX</span>
                  <h3>{t("Explore by domain")}</h3>
                </div>
              </div>
              <div className="cx-category-grid">
                {groupCounts
                  .filter((entry) => entry.count)
                  .map((entry) => (
                    <button
                      type="button"
                      key={entry.name}
                      onClick={() => {
                        setGraphGroup(entry.name);
                        setMode("graph");
                      }}
                    >
                      <span className="cx-category-name">{entry.name}</span>
                      <strong>{entry.count.toString().padStart(2, "0")}</strong>
                      <AnimatedIcon name="right" size={15} />
                    </button>
                  ))}
              </div>
            </div>
          )}
          {mode === "documents" && (
            <div className="cx-explorer">
              <div className="cx-explorer-list">
                <label className="canvas-search cx-file-search">
                  <AnimatedIcon name="search" size={16} />
                  <input
                    type="search"
                    aria-label={t("Search documents")}
                    placeholder={t("Search documents")}
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                  />
                </label>
                <div className="cx-explorer-count">
                  {filtered.length} {t("Source documents").toLowerCase()}
                </div>
                {filtered.map((doc) => (
                  <FileRow
                    key={doc.path}
                    path={doc.path}
                    active={focus?.path === doc.path}
                    onClick={() => setSelected(doc.path)}
                  />
                ))}
                {!filtered.length && <p className="cx-muted-message">{t("No matching routes.")}</p>}
              </div>
              <article className="cx-document-reader">
                {focus ? (
                  <>
                    <div className="cx-doc-heading">
                      <span className="cx-section-caption">
                        {categoryOf(focus.path)} / MARKDOWN
                      </span>
                      <h2>{basename(focus.path)}</h2>
                      <p>{focus.path}</p>
                      <div className="cx-doc-actions">
                        <button type="button" onClick={() => void copy(focus.path)}>
                          <AnimatedIcon name="copy" size={15} /> {t("Copy source path")}
                        </button>
                        <button type="button" onClick={() => void copy(focus.content)}>
                          <AnimatedIcon name="artifacts" size={15} /> {t("Copy source content")}
                        </button>
                      </div>
                    </div>
                    <div className="canvas-source" data-testid="canvas-source">
                      <MarkdownPreview content={focus.content} />
                    </div>
                  </>
                ) : (
                  <p className="cx-muted-message">{t("No source documents available.")}</p>
                )}
              </article>
            </div>
          )}
          {mode === "graph" && (
            <div className="cx-graph-layout">
              <div className="cx-graph-filter">
                <span>{t("Scope")}</span>
                {groupCounts
                  .filter((g) => g.count)
                  .map((entry) => (
                    <button
                      type="button"
                      key={entry.name}
                      className={entry.name === graphGroup ? "active" : ""}
                      onClick={() => setGraphGroup(entry.name)}
                    >
                      {entry.name} <small>{entry.count}</small>
                    </button>
                  ))}
              </div>
              <div className="canvas-flow cx-graph-canvas" data-testid="canvas-graph">
                {graph.nodes.length ? (
                  <ReactFlow
                    key={graphGroup}
                    nodes={graph.nodes}
                    edges={graph.edges}
                    fitView
                    fitViewOptions={{ padding: 0.23, maxZoom: 1.15 }}
                    minZoom={0.22}
                    maxZoom={1.8}
                    onNodeClick={(_, node) => choose(node.id)}
                    nodesConnectable={false}
                    nodesDraggable={false}
                    colorMode={theme === "system" ? (systemDark ? "dark" : "light") : theme}
                    proOptions={{ hideAttribution: true }}
                  >
                    <Background color="var(--border)" gap={30} size={1} />
                    <Controls
                      showInteractive={false}
                      fitViewOptions={{ padding: 0.23, maxZoom: 1.15 }}
                    />
                  </ReactFlow>
                ) : (
                  <p className="cx-muted-message">{t("No source documents available.")}</p>
                )}
                <div className="cx-graph-legend">
                  {graph.members.length} {t("Indexed paths").toLowerCase()} <span>·</span>{" "}
                  {graph.edges.length} {t("Document links").toLowerCase()}
                </div>
              </div>
            </div>
          )}
        </section>
        <aside className="canvas-inspector cx-repo-aside" aria-label={t("Repository context")}>
          <header className="canvas-inspector-heading cx-inspector-head">
            <span className="cx-overline">CONTEXT PANEL</span>
            <strong>
              {perspective === "overview"
                ? t("Overview")
                : t(panes.find((p) => p.id === perspective)?.label ?? "Overview")}
            </strong>
          </header>
          <div className="canvas-inspector-body cx-inspector-body">
            <div className="cx-fact">
              <span className="cx-fact-label">{t("Project identity")}</span>
              <strong>{context.name}</strong>
              <span>{context.repository}</span>
            </div>
            <div className="cx-fact">
              <span className="cx-fact-label">{t("Source revision")}</span>
              <div className="cx-mono">{context.revision}</div>
              <span>{context.branch}</span>
            </div>
            {focus && perspective !== "overview" && (
              <div className="cx-fact">
                <span className="cx-fact-label">{t("Current source")}</span>
                <strong>{basename(focus.path)}</strong>
                <span>{focus.path}</span>
                <p>{extractSummary(focus.content, 190) || t("No source documents available.")}</p>
                <button type="button" className="cx-text-action" onClick={() => choose(focus.path)}>
                  {t("Open source")} <AnimatedIcon name="right" size={14} />
                </button>
              </div>
            )}
            <div className="cx-fact">
              <span className="cx-fact-label">{t("Publication")}</span>
              <div className="cx-readonly">
                <span className="cx-live-dot" /> {t("Static · read-only")}
              </div>
              <p>
                {t(
                  "Built from allowlisted Git-tracked documents. Local changes do not modify the repository.",
                )}
              </p>
            </div>
            <div className="cx-inspector-footer">
              {documents.length} {t("Source documents").toLowerCase()} <span>·</span>{" "}
              {context.paths.length} {t("Indexed paths").toLowerCase()}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
