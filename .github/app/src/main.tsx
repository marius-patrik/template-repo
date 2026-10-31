import React from "react";
import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import App from "./App";
import "./styles.css";
import "@xyflow/react/dist/style.css";
import "dockview-react/dist/styles/dockview.css";

const root = document.getElementById("root");
if (!root) throw new Error("Canvas root is missing");
createRoot(root).render(
  <React.StrictMode>
    <Router hook={useHashLocation}>
      <App />
    </Router>
  </React.StrictMode>,
);
