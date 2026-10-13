---
status: published
---
# Repository layout

| Path | Purpose |
| --- | --- |
| `.agents/GOAL.md` | Authored project goal and acceptance criteria |
| `.agents/PLAN.md`, `.agents/TODO.md`, `.agents/SCRATCHPAD.md` | Authored execution and working state |
| `.agents/PRD.md` | Generated from approved `.agents/requests/` |
| `.agents/ARCHITECTURE.md` | Generated from accepted `.agents/decisions/` |
| `.agents/AGENTS.md` | Generated from active `.agents/rules/` |
| `.agents/README.md` | Generated from published `.agents/notes/` |
| `.agents/agents/`, `.agents/skills/` | Reusable agent roles and task-specific procedures |
| `.github/workflows/` | Native, discoverable GitHub Actions workflows |
| `.github/scripts/` | Repository automation implementation |
| `.github/tests/` | **Only** location for repository tests, fixtures, snapshots and helpers |
| `.darkfactory` | Git submodule pointing to `marius-patrik/DarkFactory` |
| `.gitmodules` | Submodule identity and URL |
| `repo.dfconfig` | Repository identity, protection and versioning mode |
| `VERSION` | Optional version file, present only in `file` mode |
| `LICENSE` | GPL-3.0 |

Root `README.md` and `CONTRIBUTING.md` are symlinks to generated files under `.agents/`; the `.agents/` and `.github/` directories themselves are real and tracked.
