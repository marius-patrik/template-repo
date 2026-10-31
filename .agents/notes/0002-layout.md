---
status: published
---
# Repository layout

| Path | Purpose |
| --- | --- |
| `.agents/GOAL.md` | Authored project goal and acceptance criteria |
| `.agents/PLAN.md`, `.agents/TODO.md`, `.agents/SCRATCHPAD.md` | Authored planning and working state |
| `.agents/PRD.md` | Generated from approved `.agents/requests/` |
| `.agents/ARCHITECTURE.md` | Generated from accepted `.agents/decisions/` |
| `.agents/AGENTS.md` | Generated from active `.agents/rules/` |
| `.agents/README.md` | Generated from published `.agents/notes/` |
| `.agents/agents/`, `.agents/skills/` | Agent roles and reusable procedures |
| `.github/app/` | Sole React/TypeScript Canvas implementation |
| `.github/app/scripts/generate-context.mjs` | Allowlisted repository-to-UI build snapshot |
| `.github/workflows/canvas-pages.yml` | Build, browser verification and GitHub Pages publication |
| `.github/scripts/`, `.github/workflows/` | Native repository automation |
| `.github/tests/` | Sole location for tests, fixtures, snapshots and helpers |
| `repo.dfconfig` | Repository identity, external integrations, protection and versioning |
| `VERSION` | Optional version file, only in `file` mode |
| `LICENSE` | GPL-3.0 |

The compiled Pages entrypoint is `.canvas-dist/index.html`, an untracked build output. There is no root `canvas.html` renderer and no local DarkFactory Git submodule. External DarkFactory workflow integration is independent of a submodule.

Root `README.md` and `CONTRIBUTING.md` are Git symlinks to generated documents in `.agents/`. The `.agents/` and `.github/` directories are real, tracked directories.
