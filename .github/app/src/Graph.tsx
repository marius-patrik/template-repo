import { useMemo, useState } from "react";
import { ReactFlow, Background, Controls, type Node, type Edge } from "@xyflow/react";
import dagre from "dagre";
import context from "./generated/context.json";

const labels: Record<string, string> = {
  "AGENTS.md": "Agent context",
  ".agents/GOAL.md": "Project goal",
  ".agents/PRD.md": "Requirements",
  ".agents/ARCHITECTURE.md": "Architecture",
  ".agents/AGENTS.md": "Agent rules",
  ".agents/README.md": "Documentation",
};

export default function Graph() {
  const [selected, setSelected] = useState<string | null>(null);
  const { nodes, edges } = useMemo(() => {
    const present = context.documents.map((doc) => doc.path);
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "LR", ranksep: 92, nodesep: 38, marginx: 35, marginy: 35 });
    g.setDefaultEdgeLabel(() => ({}));
    const links = [
      [".agents/GOAL.md", ".agents/PRD.md"],
      [".agents/PRD.md", ".agents/ARCHITECTURE.md"],
      [".agents/ARCHITECTURE.md", ".agents/AGENTS.md"],
      [".agents/AGENTS.md", ".agents/README.md"],
      ["AGENTS.md", ".agents/GOAL.md"],
    ].filter(([a, b]) => present.includes(a) && present.includes(b));
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
        data: { label: labels[id] ?? id },
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
    <div className="graph-pane" role="region" aria-label="Repository document relationships">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        onNodeClick={(_, node) => setSelected(node.id)}
        nodesConnectable={false}
        nodesDraggable={false}
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--border)" gap={22} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
      {selected && (
        <div className="graph-selected">
          <strong>{labels[selected] || selected}</strong>
          <span>{selected}</span>
          <button type="button" aria-label="Close selection" onClick={() => setSelected(null)}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}
