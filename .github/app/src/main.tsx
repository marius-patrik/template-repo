import React from "react";
import { HotkeysProvider } from "@tanstack/react-hotkeys";
import type { CustomHotkeys } from "@tanstack/react-hotkeys";
import { appHotkeys } from "./commands";
import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import "./i18n";
import App from "./App";
import "./styles.css";
import "@xyflow/react/dist/style.css";
import "dockview-react/dist/styles/dockview.css";
import "./polish.css";

const root = document.getElementById("root");
if (!root) throw new Error("Canvas root is missing");
function loadHotkeys(): CustomHotkeys {
  try {
    const saved = JSON.parse(localStorage.getItem("canvas-hotkeys") ?? "{}");
    return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  } catch {
    return {};
  }
}

createRoot(root).render(
  <React.StrictMode>
    <HotkeysProvider
      appHotkeys={appHotkeys}
      customHotkeys={loadHotkeys()}
      onCustomHotkeysChange={(hotkeys) => {
        try {
          localStorage.setItem("canvas-hotkeys", JSON.stringify(hotkeys));
        } catch {
          /* private mode */
        }
      }}
    >
      <Router hook={useHashLocation}>
        <App />
      </Router>
    </HotkeysProvider>
  </React.StrictMode>,
);
