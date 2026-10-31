import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution";
import "monaco-editor/esm/vs/language/json/monaco.contribution";
import "monaco-editor/esm/vs/language/typescript/monaco.contribution";
import EditorWorker from "./workers/editor.worker.ts?worker&inline";
import JsonWorker from "./workers/json.worker.ts?worker&inline";
import TypeScriptWorker from "./workers/typescript.worker.ts?worker&inline";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatedIcon } from "./components/AnimatedIcon";
import { CanvasSelect } from "./components/ui/CanvasSelect";
import context from "./generated/context.json";
import { notify } from "./notifications";
import { useCanvasConfig } from "./config";
import { useProfiles } from "./profiles";

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
  const theme = useCanvasConfig((state) => state.preferences.theme);
  const fontSize = useCanvasConfig((state) => state.preferences.fontSize);
  const profile = useProfiles((state) => state.profiles.find((p) => p.id === state.currentId));
  const setPath = useProfiles((state) => state.setMonacoPath);
  const setDraft = useProfiles((state) => state.setDraft);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const change = () => setSystemDark(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  const docs = context.documents;
  const path = docs.some((d) => d.path === profile?.selectedDocument)
    ? (profile?.selectedDocument ?? "")
    : (docs[0]?.path ?? "");
  const drafts = profile?.drafts ?? {};
  const original = docs.find((doc) => doc.path === path)?.content ?? "";
  const value = drafts[path] ?? original;
  const dark = theme === "system" ? systemDark : theme === "dark";
  return (
    <div className="monaco-pane">
      <div className="monaco-toolbar">
        <div className="monaco-source-select">
          <AnimatedIcon name="editor" size={18} />
          <strong>{t("Editor")}</strong>
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
              setDraft(path, null);
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
            height="100%"
            width="100%"
            path={path}
            language={languageFor(path)}
            value={value}
            theme={dark ? "vs-dark" : "light"}
            onChange={(next) => setDraft(path, next ?? "")}
            options={{
              automaticLayout: true,
              minimap: { enabled: true },
              fontSize,
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
