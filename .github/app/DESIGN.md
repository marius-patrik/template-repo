# Canvas interface v2 — rebuild plan and acceptance contract

Status: implemented candidate, unmerged. The implementation may still evolve during visual review.

## Diagnosis
- Three cascading stylesheets were mutating the same shell/tab/command selectors; the later overrides were a history of patches, not a coherent design system.
- The application shell mixed routing, appearance token mapping, pointer tracking, persistence and layout concerns in one component.
- Some interaction regressions came from per-pointer Zustand updates and an independently positioned command result portal.
- Page titles competed with Dockview tab titles; borders and cards multiplied without information hierarchy.

## Design direction
**Quiet Precision**: flat true-black/OLED work surface, graphite controls, restrained blue for *small* active indicators and actual focus. No glow, tinted active slabs, nested cards or decorative dashboards.

The visual hierarchy is: application chrome → tab strip → content. One pixel dividers separate primary surfaces. Text sizes, gaps, radii, icons and colors are derived from the existing editable design-token preferences.

The interface is responsive, accessible, keyboard reachable, and usable without animations. Keep focus outlines visible, controls at least 24px wide or appropriately separated, and support pointer and keyboard resizing.

## Ownership boundaries
| Owner | Concern |
| --- | --- |
| `App.tsx` | composition and routing only |
| `useWorkspaceAppearance.ts` | preferences → CSS tokens, no other token writer |
| `useFloatingOmnibar.ts` | rAF pointer movement, persistence on release |
| `SidebarResize.tsx` | pointer/keyboard width interaction |
| `Omnibar.tsx` | a single input, result list, focus, collision placement |
| `DockCanvas.tsx` | actual tabs, splits, close and serialized layouts |
| `interface.css` | application shell, tabs, command surface and settings chrome |
| `polish.css` | Canvas document/graph content styles |
| `styles.css` | legacy content primitives until those views are migrated |

The obsolete `layout-fixes.css` is no longer imported by the application. Source can be deleted once content parity is visually accepted.

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
