---
status: approved
---
# Repository Canvas and interactive agent interface

- Maintain **one** Canvas app in `.github/app/` using React/TypeScript and Rsbuild. Its compiled `.canvas-dist/index.html` is the GitHub Pages artifact. Do not maintain a root `canvas.html`, Python HTML renderer, second frontend or duplicate publishing pipeline.
- Produce a deterministic build-time `src/generated/context.json` from allowlisted, Git-tracked repository documents and structural paths. Do not expose arbitrary files, binary archives, credentials, private data or unverified third-party facts in public Pages output.
- Represent repository identity, available documents, authoring relationships and source-backed views without inventing agent telemetry, task completion, external repositories or project-specific facts.
- Browser-local appearance, language, hotkeys and Dockview layouts are allowed as **presentation state**, never an independent source of project truth.
- Preserve the agent-side interaction boundary: authorized agents edit canonical source with review/approval, regenerate Markdown projections, and rebuild the React app. The public compiled UI stays read-only until an explicit approved design changes that contract.
- Retain optional repository-local agent conventions and hooks only where they invoke real supported build/documentation commands. Do not claim automatic ChatGPT hooks or a remote agent backend.
- Keep tests under `.github/tests/` and require build/typecheck/Biome plus Chromium interaction acceptance for Pages publication.
- Keep the application in the **user-controlled prototyping phase** until its completion is expressly approved. A passing deployment does not close the phase.
