import { useMemo } from "react";
import { DockviewReact, themeDark, themeLight, type DockviewReadyEvent } from "dockview-react";
import Graph from "./Graph";
import context from "./generated/context.json";

function AboutPanel() {
  return <div className="dock-body">
    <p className="eyebrow">Repository overview</p>
    <h2>{context.name}</h2>
    <p className="muted">{context.repository}</p>
    <pre className="source-preview">{context.goal}</pre>
  </div>;
}
function DocumentsPanel() {
  return <div className="dock-body">
    <p className="eyebrow">Tracked documents</p>
    {context.documents.map(doc => <div key={doc.path} className="doc-row">
      <span>{doc.path}</span><small>{doc.content.split("\n").length} lines</small>
    </div>)}
  </div>;
}
export default function Workbench({dark}:{dark:boolean}) {
  const components = useMemo(() => ({
    summary: AboutPanel, graph: Graph, files: DocumentsPanel
  }), []);
  const onReady = (event: DockviewReadyEvent) => {
    if (event.api.panels.length) return;
    event.api.addPanel({id:"summary",component:"summary",title:"Overview"});
    event.api.addPanel({id:"graph",component:"graph",title:"Relationships",
      position:{referencePanel:"summary",direction:"right"}});
    event.api.addPanel({id:"files",component:"files",title:"Documents"});
  };
  return <div className="workbench-pane">
    <DockviewReact theme={dark ? themeDark : themeLight}
      components={components} onReady={onReady}/>
  </div>;
}
