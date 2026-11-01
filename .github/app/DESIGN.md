# Canvas interface v3 — rebuild plan and acceptance contract

Status: implemented candidate, unmerged. The implementation may still evolve during visual review.

## Diagnosis

- Three cascading stylesheets were mutating the same shell/tab/command selectors; the later overrides were a history of patches, not a coherent design system.
- The application shell mixed routing, appearance token mapping, pointer tracking, persistence and layout concerns in one component.
- Some interaction regressions came from per-pointer Zustand updates and an independently positioned command result portal.
- Page titles competed with Dockview tab titles; borders and cards multiplied without information hierarchy.

## Design direction

**Quiet Precision**: flat true-black/OLED work surface, graphite controls, restrained blue for _small_ active indicators and actual focus. No glow, tinted active slabs, nested cards or decorative dashboards.

The visual hierarchy is: application chrome → tab strip → content. One pixel dividers separate primary surfaces. Text sizes, gaps, radii, icons and colors are derived from the existing editable design-token preferences.

The interface is responsive, accessible, keyboard reachable, and usable without animations. Keep focus outlines visible, controls at least 24px wide or appropriately separated, and support pointer and keyboard resizing.

## Ownership boundaries

- `App.tsx`: application composition and routing.
- `useWorkspaceAppearance.ts`: preferences to CSS tokens; no second token writer.
- `useFloatingOmnibar.ts`: rAF drag movement, persistence on release.
- `SidebarResize.tsx`: isolated pointer and keyboard sidebar resizing.
- `Omnibar.tsx`: single input, command results, focus, and collision placement.
- `DockCanvas.tsx`: Dockview tabs, splits, persisted layouts, and the welcome view.
- `Canvas.tsx`: factual repository overview, document browser, and focused graph.
- `interface.css`: application shell, tabs, command surface and chrome.
- `canvas-content.css`: Canvas overview, source reader, graph, and inspector.
- `preferences-content.css`: settings navigation, controls, and token layout.
- `welcome-content.css`: new-tab launcher and responsive welcome styling.
- `styles.css`: legacy content primitives outside the rebuilt surfaces.

The former `layout-fixes.css` and `polish.css` files have been removed from
the application. New design changes should alter the owning component, never
add a last-in-cascade override file.

## Content hierarchy

1. A new tab offers a deliberate tool launcher rather than an empty dashboard.
2. Canvas initially displays the source-backed project goal and relevant source
   documents, then progressively exposes a document explorer or knowledge graph.
3. The graph shows a bounded neighborhood of selected source domains and real
   Markdown links. It must not shrink the entire repository into unreadable nodes.
4. Source documents render as readable text with a dedicated search/list region;
   the context inspector is factual and never displays invented live telemetry.
5. Settings has a discoverable section rail and retains editable global and
   per-component design tokens.
6. Mobile keeps navigable tool modes and footer breadcrumbs without horizontal
   viewport overflow.


## Must remain functional

- Four tools: Canvas, Monaco Editor, Library, Settings.
- Workspace switching with independent local browser state and no simulated backend.
- Dockview tab creation, close, splits, layouts, empty welcome.
- Dynamic omnibar with correct upward/downward collision handling; floating drag keeps the result list attached.
- Editable theme tokens, OLED mode, color picker, Ctrl/Command/System/Custom keyboard modifier, per-item status bar alignment, shell placements, width and size controls.
- GitHub Pages single-file build and source-backed read-only documents.

## Verification gates

1. TypeScript, Biome lint and format must pass without suppressing checks.
2. Chromium exercises tabs, source-backed Canvas, Editor, settings persistence, navigation, keyboard, pointer resize and floating omnibar.
3. Responsive screenshots at desktop (1440×900), laptop (1024×768), mobile (390×844), both light and dark; manually inspect for overflow, alignment, contrast and visual balance.
4. Keyboard focus cannot be obscured by the command list; reduced motion supported.
5. No release/merge until the owner explicitly accepts the interface.

## Deferred (not fabricated)

Remote agent execution, user data synchronization, GitHub write-back, real-time model operations. UI labels must not suggest these are live while only snapshot data exists.
