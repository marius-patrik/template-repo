# Canvas — React workspace prototype

Canvas is one React/TypeScript application in `.github/app`. Its GitHub Pages output
is the **single, self-contained** `.canvas-dist/index.html` (with
`.canvas-dist/canvas.html` compatibility copy). No legacy Python Canvas renderer,
root `canvas.html`, or DarkFactory submodule is part of this application.

## Authoritative data versus browser state

The build embeds a deterministic, allowlisted snapshot from Git-tracked Markdown
and repository metadata in `src/generated/context.json`. Repository records
are authoritative. The web application does not run agents, mutate repository
files, invent telemetry, or expose arbitrary files. Published Pages are public;
review the build's allowlist before expanding data access.

Profiles, tab layouts, navigation choices, UI scale and scratch drafts live
**only in the current browser** (versioned local storage). This is not a
cross-device synchronization service.

## Profile-first workspace

The first navigation step selects a **profile**. Defaults are Global, Study,
Health, Code, Design and Finance. Users can create, rename, delete and switch
profiles. Each profile has its own independent Dockview arrangement, selected
view, pinned activity-bar editors, notes and Monaco scratch documents. Closing
the last tab preserves an empty tab strip and shows a welcome page with every
available editor/view. Deleting a profile removes its saved workspace layout.

Tabs are not divided into artificial Workspace/System categories. The native
Dockview strip supports tab icons, closing, drag-and-drop, splitting, context
menus and a full editor picker. Monaco is a bundled local editor with bundled
inline workers; draft text is browser-local per profile and never writes Git data. Library is an
embedded, source-backed document browser. Notepad is a profile-local blank
editor.

### Configurable application surfaces

| Surface         | Allowed placements                                         |
| --------------- | ---------------------------------------------------------- |
| Navigation      | Sidebar, title bar, omnibar, status bar, hidden            |
| Omnibar trigger | Title bar, sidebar, status bar, floating draggable, hidden |
| Settings access | Title bar, activity bar, status bar, tab bar               |
| Activity bar    | Left, right, top, bottom, hidden                           |
| Primary sidebar | Left, right                                                |

The omnibar is still the **Mod+K command/search UI**, not a permanent breadcrumb.
The title-bar breadcrumb is independent. Context menus on interactive surfaces
allow repositioning without opening Settings. The activity bar contains default
view shortcuts, the Notepad/Library editors and profile-scoped pinned tabs.
The sidebar contains a navigation tree only when navigation is placed there;
otherwise its contents reflect source-aware editors. The primary sidebar
resizes using pointer-delta tracking or keyboard input, and its live width is directly editable in Settings.
Collapsed state does not discard expanded width.

### Unified appearance

Every semantic color is available as an editable token for dark and light
palettes, including the shared **border** color; Graphite, Slate and Contrast
are starting palettes. UI scale presets adjust **font size, icon size, border
radius and spacing together**:

| Preset |  Text |  Icon | Radius | Spacing |
| ------ | ----: | ----: | -----: | ------: |
| Small  | 12 px | 15 px |   4 px |    6 px |
| Normal | 14 px | 18 px |   8 px |    8 px |
| Large  | 16 px | 21 px |  12 px |   11 px |

Each dimension is separately editable after selecting a preset. Layout uses
`--ui-spacing`, `--ui-radius`, `--app-font-size` and the unified palette
variables. The same spacing token feeds application-level gaps and padding,
not a separate, independently configured density scale. The selected language
(English, Czech or Spanish), appearance and command shortcuts are stored
locally. The current Radix-based menus, selectors and notification center are
accessible without native HTML dropdown widgets. Notifications retain up to
40 genuine local UI events, not simulated execution activity.

## Development and build

The stack is React 19, TypeScript, Bun, Rsbuild 2, Tailwind CSS 4, Motion,
Dockview, Radix UI, lucide-animated, Monaco, React Flow, Zustand, Zod,
TanStack Hotkeys, i18next, Biome and Playwright.

```sh
cd .github/app
bun install --frozen-lockfile
bun run context
bun run typecheck
bun run lint
bun run format:check
bun run build
```

CI also validates the compiled standalone HTML, exact build order, allowlisted
source generation and browser interaction in Chromium. The `canvas-pages.yml`
pipeline deploys qualifying feature-branch pushes through `canvas-preview`
and main through `github-pages`, subject to GitHub Pages environment policy.

**Prototyping is open** until the user explicitly approves completion.
Successful CI or deployment is not design approval. Keep changes on
`feat/canvas-react-pages`; do not merge into development/main without
authorization.
