---
status: published
---
# Repository layout

| Path | Purpose |
| --- | --- |
| `.agents/GOAL.md` | Human-authored purpose and success criteria |
| `.agents/PRD.md` | Generated approved product requirements |
| `.agents/ARCHITECTURE.md` | Generated accepted architecture decisions |
| `.agents/AGENTS.md` | Generated active operating rules (also root `CONTRIBUTING.md`) |
| `.agents/README.md` | Generated public overview (also root `README.md`) |
| `.agents/PLAN.md` | Human-authored near-term plan and verification gates |
| `.agents/TODO.md` | Human-authored actionable worklist; not published in README |
| `.agents/SCRATCHPAD.md` | Non-normative temporary notes |
| `.agents/notes/` | Published README sections and supplemental project notes |
| `.agents/requests/` | Independently reviewable requirement records |
| `.agents/decisions/` | Independently reviewable architecture decisions |
| `.agents/rules/` | Independently reviewable mandatory rules |
| `.agents/agents/` | Portable agent role descriptions |
| `.agents/skills/` | Portable task procedures (`<name>/SKILL.md`) |
| `.github/` | GitHub CI, workflows and repo management scripts |
| `repo.dfconfig` | DarkFactory repository declaration and GitHub protection policy |
| `VERSION` | Canonical SemVer without a leading `v` |
| `LICENSE` | GPL-3.0 license text |

The source folders are independent. Edit source records, never their generated projections. Use Git links rather than copied root documentation.
