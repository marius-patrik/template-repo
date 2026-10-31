import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution";
import "monaco-editor/esm/vs/language/json/monaco.contribution";
import "monaco-editor/esm/vs/language/typescript/monaco.contribution";
import EditorWorker from "./workers/editor.worker.ts?worker&inline";
import JsonWorker from "./workers/json.worker.ts?worker&inline";
import TypeScriptWorker from "./workers/typescript.worker.ts?worker&inline";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatedIcon } from "./components/AnimatedIcon";
import { CanvasSelect } from "./components/ui/CanvasSelect";
import context from "./generated/context.json";
import { notify } from "./notifications";

self.MonacoEnvironment = {
  getWorker(_moduleId: string, label: string) {
    if (label === "json") return new JsonWorker();
    if (label === "typescript" || label === "javascript") return new TypeScriptWorker();
    return new EditorWorker();
  },
};
loader.config({ monaco });

const languageFor = (path: string) =>
  path.endsWith(".json")
    ? "json"
    : path.endsWith(".ts") || path.endsWith(".tsx")
      ? "typescript"
      : "markdown";

export default function Monaco() {
  const { t } = useTranslation();
  const docs = context.documents;
  const [path, setPath] = useState(docs[0]?.path ?? "");
  // Scratch edits are scoped to the current tab instance, not persisted to Git or browser storage.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const original = docs.find((doc) => doc.path === path)?.content ?? "";
  const value = drafts[path] ?? original;
  const dark = document.documentElement.dataset.theme !== "light";
  return (
    <div className="monaco-pane">
      <div className="monaco-toolbar">
        <div className="monaco-source-select">
          <AnimatedIcon name="code" size={18} />
          <strong>Monaco</strong>
          <CanvasSelect
            label={t("Source document")}
            value={path}
            options={docs.map((doc) => ({ value: doc.path, label: doc.path }))}
            onValueChange={setPath}
            className="monaco-file-select"
          />
          {path in drafts && (
            <span className="monaco-dirty" title={t("Unsaved scratch changes")}>
              ●
            </span>
          )}
        </div>
        <div className="monaco-actions">
          <span className="monaco-disclaimer">
            {t("Local scratch · does not modify the repository")}
          </span>
          <button
            type="button"
            className="canvas-button canvas-button-ghost"
            onClick={() => {
              if (!path) return;
              setDrafts((prev) => {
                const next = { ...prev };
                delete next[path];
                return next;
              });
              notify.info(t("Scratch changes reverted"));
            }}
            disabled={!(path in drafts)}
          >
            <AnimatedIcon name="reset" size={16} />
            {t("Revert")}
          </button>
          <button
            type="button"
            className="canvas-button canvas-button-subtle"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(value);
                notify.success(t("Copied to clipboard"));
              } catch {
                notify.error(t("Clipboard unavailable"));
              }
            }}
            disabled={!path}
          >
            <AnimatedIcon name="copy" size={16} />
            {t("Copy")}
          </button>
        </div>
      </div>
      {docs.length ? (
        <div className="monaco-editor-host" data-testid="monaco-editor">
          <Editor
            path={path}
            language={languageFor(path)}
            value={value}
            theme={dark ? "vs-dark" : "light"}
            onChange={(next) => setDrafts((prev) => ({ ...prev, [path]: next ?? "" }))}
            options={{
              automaticLayout: true,
              minimap: { enabled: true },
              fontSize: 13,
              scrollBeyondLastLine: false,
              wordWrap: "on",
              tabSize: 2,
              accessibilitySupport: "auto",
            }}
          />
        </div>
      ) : (
        <div className="monaco-empty">{t("No source documents available.")}</div>
      )}
    </div>
  );
}
