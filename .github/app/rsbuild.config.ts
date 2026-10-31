import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  plugins: [pluginReact()],
  source: { entry: { index: "./src/main.tsx" } },
  html: { template: "./index.html", title: "Canvas · Repository Workspace" },
  output: {
    distPath: { root: "../../.canvas-dist" },
    assetPrefix: "./",
    inlineScripts: true,
    inlineStyles: true,
  },
  performance: { chunkSplit: { strategy: "all-in-one" } },
});
