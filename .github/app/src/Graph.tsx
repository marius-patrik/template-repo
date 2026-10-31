import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCanvasConfig } from "./config";
import { ReactFlow, Background, Controls, type Node, type Edge } from "@xyflow/react";
import dagre from "dagre";
import context from "./generated/context.json";

/** Draw edges only when an authored Markdown hyperlink references a tracked path. */
function relationships() {
  const tracked = new Set(context.paths.concat(context.documents.map((doc) => doc.path)));
  return context.documents.flatMap((doc) =>
    Array.from(doc.content.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g))
      .map((match) => {
        try {
          if (/^[a-z]+:/i.test(match[1])) return null;
          const url = new URL(match[1], new URL(doc.path, "https://canvas.invalid/"));
          return decodeURIComponent(url.pathname.replace(/^\//, ""));
        } catch { return null; }
      })
      .filter((target): target is string => !!target && tracked.has(target))
      .map((target) => [doc.path, target] as const),
  );
}
const displayLabel = (path: string) => path.split("/").at(-1)?.replace(/\.md$/, "") ?? path;

export default function Graph() {
  const { t } = useTranslation();
  const theme = useCanvasConfig((state) => state.preferences.theme);
  const [selected, setSelected] = useState<string | null>(null);
  const { nodes, edges } = useMemo(() => {
    const present = [...new Set([...context.documents.map((doc) => doc.path), ...context.paths])];
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "LR", ranksep: 92, nodesep: 38, marginx: 35, marginy: 35 });
    g.setDefaultEdgeLabel(() => ({}));
    const links = relationships();
    present.forEach((id) => {
      g.setNode(id, { width: 170, height: 58 });
    });
    links.forEach(([a, b]) => {
      g.setEdge(a, b);
    });
    dagre.layout(g);
    const nodes: Node[] = present.map((id) => {
      const pos = g.node(id);
      return {
        id,
        position: { x: pos.x - 85, y: pos.y - 29 },
        data: { label: displayLabel(id) },
        type: "default",
        style: {
          width: 170,
          minHeight: 58,
          borderRadius: 10,
          fontFamily: "inherit",
          fontSize: 12,
          padding: 10,
          color: "var(--text)",
          background: "var(--surface)",
          border: "1px solid var(--border)",
        },
      };
    });
    const edges: Edge[] = links.map(([source, target], index) => ({
      id: "edge-" + index,
      source,
      target,
      type: "smoothstep",
      style: { stroke: "var(--muted)", strokeWidth: 1.1 },
    }));
    return { nodes, edges };
  }, []);
  return (
    <section className="graph-pane" aria-label={t("Repository document relationships")}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        onNodeClick={(_, node) => setSelected(node.id)}
        nodesConnectable={false}
        nodesDraggable={false}
        colorMode={
          theme === "light"
            ? "light"
            : theme === "dark"
              ? "dark"
              : window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light"
        }
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--border)" gap={22} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
      {selected && (
        <div className="graph-selected">
          <strong>{displayLabel(selected)}</strong>
          <span>{selected}</span>
          <button type="button" aria-label={t("Close selection")} onClick={() => setSelected(null)}>
            ×
          </button>
        </div>
      )}
    </section>
  );
}
