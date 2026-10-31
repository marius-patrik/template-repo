---
status: published
---
# Single published React Canvas

The **sole Canvas application** is the React/TypeScript workspace in `.github/app/`. Rsbuild compiles its code, styles, and allowlisted Git-tracked repository documentation into `.canvas-dist/index.html`. GitHub Pages publishes that artifact. There is no separately maintained root HTML renderer, Python Canvas CLI, or competing generated application.

The build-time `.github/app/scripts/generate-context.mjs` produces the untracked `src/generated/context.json`; only explicitly allowlisted source documents and structural paths are embedded. The published UI is a read-only repository snapshot, not an agent backend or a live repository editor. Browser-local theme, locale, keyboard and Dockview layout settings are UI preferences, never authoritative project state.

Authorized agents operate on tracked source via the repository host and follow the existing review policy. Canonical Markdown projections are updated with `python3 .github/scripts/generate_documents.py --write`. To build and verify Canvas, use `bun run check` within `.github/app/`; GitHub Actions additionally runs Chromium smoke coverage.

The repository-local `.agents/plugin.json`, skill and optional hooks describe supported build-time interaction conventions. They do not register universal ChatGPT hooks or silently grant write authority. **Prototype design remains open until explicitly approved.**
