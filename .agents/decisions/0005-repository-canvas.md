---
status: accepted
---
# Single published React Canvas and agent-owned source changes

## Decision

The canonical Canvas frontend is the React/TypeScript project under `.github/app/`. Its `generate-context.mjs` script constructs an explicit, deterministic, allowlisted snapshot of Git-tracked context. Rsbuild compiles the application to `.canvas-dist/index.html`, which is the **only** GitHub Pages application entrypoint. The former root `canvas.html` generator and Python CLI are retired.

Repository content remains authoritative in its reviewed source records. Generated Markdown, build-time JSON and the compiled application are derived products, not competing writable models. Presentation-only browser preferences and Dockview layouts may persist locally without changing project truth.

Agent operations occur through explicitly authorized repository tools and host integrations. Optional local skill/hook conventions can invoke real documentation/build commands, but they do not provide automatic ChatGPT hooks, a live backend or a browser-side write path.

## Consequences

- Never introduce a second Canvas renderer, UI source tree or publication pipeline.
- Prevent arbitrary repository files, credentials and unpublished archives from entering public Pages assets; test the allowlist and actual browser behavior.
- Do not label simulated agent activity as telemetry or report unmerged prototypes as released.
- Keep generated-document tests, app build checks and Chromium smoke tests under the existing repository verification contract.
- Continue the user-controlled prototyping phase until explicitly approved; a successful Pages deployment alone is not completion.
