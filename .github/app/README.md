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

## Dockview application shell (v0.9)

Dockview now renders every route within one application-level compositor, replacing the
old nested Workbench instance and fixed page-switching layout. The title bar, omnibar,
navigation and status bar remain global. The Dockview tab strip provides a `+` dropdown and a three-dot menu. The latter
splits the clicked group to the right or resets the complete layout. The redundant
secondary workspace toolbar has been removed. Drag-and-drop
rearrangement, group splitting and panel closing are native Dockview interactions.

Wouter hash routes and Dockview tab selection are synchronized. Local layout preferences
are persisted under `canvas-dockview-layout-v1` and can be reset without changing
repository data. The build remains a static, read-only repository snapshot.

The Dockview compositor uses the official dockview-react panel API and keeps layout
state as UI-only local data; no authored repository file is modified through drag/drop.

Dockview layout acceptance is checked in Chromium before every Pages publication.

### Dockview tab creation

Every Dockview group header has a `+` action with a Radix dropdown listing all ten route views, grouped as Workspace and System. Selecting an option creates a new tab in that group, including when the same view is already open in another tab. Wouter follows the new active tab. Keyboard and touch access use Radix's built-in menu behavior.

The browser smoke test selects the Radix dropdown portal via its stable `.dock-add-menu` class rather than relying on an implementation-specific ARIA wrapper; it still verifies all ten accessible menu items.

In the per-group three-dot menu, **Split right** duplicates that group's visible tab in a new group; **Reset layout** clears the saved local Dockview layout and returns to Overview. The global title bar and status bar remain outside Dockview.

## Skinning and localization (prototype v0.9)

The appearance implementation deliberately uses the existing Tailwind CSS v4 token
contract rather than adding a second CSS-in-JS framework. `@theme inline` provides
the Tailwind-facing semantic token names and plain CSS variables remain the runtime
bridge to native Dockview group/tab styling and shadcn-style UI primitives.
`data-theme`, `data-skin` and `data-density` control orthogonal visual properties:

- Mode: dark, light, or system preference (reacts to OS changes).
- Skin: Graphite (existing), Slate (cool neutral), and Contrast (stronger boundaries).
- Density: comfortable or compact spacing, including Dockview tab strip height.
- Accent: previous presets or validated custom HEX colors; text contrast checked with colord.
- Typography: existing bounded font/icon size preferences.

`zustand` `persist` stores versioned local configuration. `zod` validates rehydrated
values, with legacy migration from `canvas-preferences`. No config is sent to a
remote service, and no state is written to repository records. Reset restores
defaults without clearing Dockview layout or custom keybindings.

`i18next`, `react-i18next`, and `i18next-browser-languagedetector` provide
English, Czech, and Spanish UI dictionaries compiled into the standalone HTML.
The detector prioritizes `canvas-language` in local storage, then the browser
language, with English as fallback. Switching in Settings updates the HTML
`lang` attribute, route labels and Dockview tabs without a reload; the setting
persists across reloads. Repository-authored Markdown remains in its original
language and is never machine-translated or rewritten.

### Dependency research and architecture decision

- **Tailwind v4 token variables** — selected for runtime styling compatibility,
  zero second styling system and existing CSS/shadcn integration.
- **Zustand + Zod** — selected for typed runtime settings, storage versioning,
  migrations and validation of untrusted browser data.
- **i18next + react-i18next** — selected for runtime language selection,
  interpolation, browser language detection, fallbacks and static resources.
- **next-themes** — evaluated, not adopted. It specializes in system/theme
  switching, but not the multidimensional skin/density/configuration contract.
- **Panda CSS / vanilla-extract** — evaluated, not adopted. Both offer typed
  theming, but would duplicate/replace the existing Tailwind v4 pipeline.
- **Tolgee** — future translation-management option, not installed; initial
  prototype remains static/offline and does not need translation servers.

Keep user-facing display strings as i18n keys; retain stable canonical IDs for
routes, commands and source files. New languages should add a resource dictionary,
not fork the UI.

Build checks now verify localized Czech/English labels, the locale persisted across reload, and visual density/skin configuration while retaining existing Dockview and keyboard acceptance tests.
