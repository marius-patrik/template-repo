---
status: published
---
# Repository layout

| Path | Purpose |
| --- | --- |
| `.darkfactory/agents/GOAL.md` | Human-authored purpose and success criteria |
| `.darkfactory/agents/PRD.md` | Generated approved product requirements |
| `.darkfactory/agents/ARCHITECTURE.md` | Generated accepted architecture decisions |
| `.darkfactory/agents/AGENTS.md` | Generated active operating rules (also root `CONTRIBUTING.md`) |
| `.darkfactory/agents/README.md` | Generated public overview (also root `README.md`) |
| `.darkfactory/agents/PLAN.md` | Human-authored near-term plan and verification gates |
| `.darkfactory/agents/TODO.md` | Human-authored actionable worklist; not published in README |
| `.darkfactory/agents/SCRATCHPAD.md` | Non-normative temporary notes |
| `.darkfactory/agents/notes/` | Published README sections and supplemental project notes |
| `.darkfactory/agents/requests/` | Independently reviewable requirement records |
| `.darkfactory/agents/decisions/` | Independently reviewable architecture decisions |
| `.darkfactory/agents/rules/` | Independently reviewable mandatory rules |
| `.darkfactory/agents/agents/` | Portable agent role descriptions |
| `.darkfactory/agents/skills/` | Portable task procedures (`<name>/SKILL.md`) |
| `.darkfactory/github/` | GitHub workflow definitions and repository-management scripts |
| `.darkfactory/tests/` | The sole canonical directory for all tests, fixtures and test support |
| `.agents` | Root Git symlink to `.darkfactory/agents` |
| `.github` | Root Git symlink to `.darkfactory/github`; GitHub Actions does not reliably discover workflows through this alias |
| `repo.dfconfig` | DarkFactory repository declaration and GitHub protection policy |
| `VERSION` | Canonical SemVer without a leading `v` |
| `LICENSE` | GPL-3.0 license text |

Canonical files live under `.darkfactory/`; the root `.agents` and `.github` paths are Git symlinks. Edit source records, never their generated projections. GitHub may not execute workflows when `.github` is a symlink; validate the actual Actions registry before relying on CI, version bumps or automatic releases.
