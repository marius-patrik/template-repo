import { useState } from "react";
import {
  formatForDisplay,
  useAppHotkeyList,
  useAppHotkeys,
  useCustomHotkeys,
  useHotkeyRecorder,
} from "@tanstack/react-hotkeys";
import type { AppHotkeyId } from "@tanstack/react-hotkeys";

function KeybindingRow({ id }: { id: AppHotkeyId }) {
  const hotkey = useAppHotkeys()[id];
  const { setCustomHotkey, resetCustomHotkey, findConflicts } = useCustomHotkeys();
  const [error, setError] = useState("");
  const recorder = useHotkeyRecorder({
    maxSteps: 1,
    validate: (binding) => {
      const collisions = findConflicts(id, binding);
      return collisions.length === 0 || `Already assigned to ${collisions[0]?.meta?.name ?? "another command"}`;
    },
    onRecord: (binding) => {
      setError("");
      setCustomHotkey(id, binding);
    },
    onClear: () => {
      setError("");
      setCustomHotkey(id, null);
    },
    onReject: ({ message }) => setError(message),
    onCancel: () => setError(""),
  });

  return (
    <div className="keybind-row" data-command={id}>
      <div className="keybind-description">
        <strong>{hotkey.meta?.name ?? id}</strong>
        <small>{id}</small>
        {error && <span className="keybind-error" role="alert">{error}</span>}
      </div>
      <div className="keybind-controls">
        <kbd>{hotkey.hotkey ? formatForDisplay(hotkey.hotkey) : "Unassigned"}</kbd>
        <button
          type="button"
          className={`keybind-edit ${recorder.isRecording ? "recording" : ""}`}
          onClick={() => {
            setError("");
            if (recorder.isRecording) recorder.cancelRecording();
            else recorder.startRecording();
          }}
          aria-label={`Change shortcut for ${hotkey.meta?.name ?? id}`}
        >
          {recorder.isRecording ? "Press keys…" : "Edit"}
        </button>
        <button
          type="button"
          className="keybind-reset"
          onClick={() => { recorder.cancelRecording(); resetCustomHotkey(id); setError(""); }}
          aria-label={`Reset shortcut for ${hotkey.meta?.name ?? id}`}
        >
          Reset
        </button>
        <button
          type="button"
          className="keybind-reset"
          onClick={() => { recorder.cancelRecording(); setCustomHotkey(id, null); setError(""); }}
          aria-label={`Clear shortcut for ${hotkey.meta?.name ?? id}`}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

export default function KeyboardSettings() {
  const [query, setQuery] = useState("");
  const items = useAppHotkeyList();
  const { resetCustomHotkeys } = useCustomHotkeys();
  const matching = items.filter(({ appHotkey }) =>
    [appHotkey.meta?.name ?? "", appHotkey.id, appHotkey.meta?.group ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  return (
    <section className="panel padded settings-panel keyboard-settings">
      <div className="keybind-heading">
        <div><h2>Keyboard shortcuts</h2><p className="muted">Shortcuts follow your system: ⌘ on macOS, Ctrl on Windows/Linux.</p></div>
        <button type="button" className="keybind-reset-all" onClick={resetCustomHotkeys}>Reset all</button>
      </div>
      <label className="keybind-search-label" htmlFor="canvas-shortcut-filter">Find a command</label>
      <input
        id="canvas-shortcut-filter"
        className="keybind-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search commands and shortcuts"
      />
      <div className="keybind-list">
        {matching.map(({ appHotkey }) => <KeybindingRow key={appHotkey.id} id={appHotkey.id} />)}
        {matching.length === 0 && <p className="muted">No matching commands.</p>}
      </div>
      <p className="keybind-hint">Click Edit and press a shortcut. Escape cancels; Delete clears. Conflicting bindings are rejected.</p>
    </section>
  );
}
