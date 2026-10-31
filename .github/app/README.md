# Canvas Web — repository application

The first-class Canvas UI is authored in `.github/app`. A deterministic build step reads
only allowlisted, Git-tracked repository documents and generates `src/generated/context.json`;
this derived file is not edited manually. GitHub Actions compile a React application into
`.canvas-dist/index.html` and `canvas.html`, publishing the former as the repository's
GitHub Pages site. No browser fetch, backend, credential, or independent authoritative
project state is required.

Stack: Bun, TypeScript, React, Rsbuild, Wouter (hash routes), Tailwind CSS v4, shadcn-style
Radix primitives, Motion, lucide-animated, React Flow + Dagre, and Dockview.

Local commands from `.github/app`:

```sh
bun install
bun run dev
bun run typecheck
bun run build
```

Site publishing requires the repository administrator to configure
**Settings → Pages → Source: GitHub Actions**. No workflow can bypass missing
GitHub Pages authorization or organization policy.

**Privacy:** GitHub Pages is a public deployment for this repo. The builder uses an
explicit allowlist and does not publish raw private archives, credentials or all
repository files. Reusing the app in a private repo must involve a separate security
review, not automatically opt in to public publishing.

The existing `.agents/tools/canvas.py` CLI is retained as the historical
source inspector/exporter while CI validates the React replacement. Both are derived
views; tracked authoring records remain authoritative.

## Prototype delivery

Pages builds on the feature branch deploy through the `canvas-preview` environment; after a reviewed release, main deploys through `github-pages`. Source input is compiled at build time and navigation remains local/read-only. The design/prototyping phase does not end automatically with a successful deployment.

## Current prototype controls

- The application title bar owns the global sidebar toggle, omnibar and Settings.
- The project route tree lives in the omnibar; the redundant secondary header was retired.
- Shortcuts are registered centrally with TanStack Hotkeys, defaulting to Mod+B (sidebar) and Mod+K (omnibar), and are editable in Settings. Custom bindings persist only in the current browser.
- Accent color selection uses react-colorful inside a Radix Popover and validates contrast using colord. The theme state remains local and independent of repository authority.

## Dockview application shell (v0.8)

Dockview now renders every route within one application-level compositor, replacing the
old nested Workbench instance and fixed page-switching layout. The title bar, omnibar,
navigation and status bar remain global. The workspace toolbar supports tab navigation,
splitting the active view, opening the graph and resetting the layout. Drag-and-drop
rearrangement, group splitting and panel closing are native Dockview interactions.

Wouter hash routes and Dockview tab selection are synchronized. Local layout preferences
are persisted under `canvas-dockview-layout-v1` and can be reset without changing
repository data. The build remains a static, read-only repository snapshot.
