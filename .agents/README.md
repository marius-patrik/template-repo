# Agent workspace

`.agents/AGENTS.md` is the generated contributor and agent guide. Edit individual active rules in `.agents/notes/rules/` instead of changing that generated file.

| Location | Purpose |
| --- | --- |
| `PLAN.md` | Current plan, milestones, dependencies and verification gates. |
| `SCRATCHPAD.md` | Ephemeral working notes; never authoritative. |
| `notes/GOAL.md` | Project goal and success criteria. |
| `notes/TODO.md` | Actionable, short-lived tasks. |
| `notes/requests/` | Requirement sources (approved requests generate `notes/PRD.md`). |
| `notes/decisions/` | Architecture decision sources (accepted decisions generate `notes/ARCHITECTURE.md`). |
| `notes/rules/` | Contribution rule sources (active rules generate `AGENTS.md`). |

Run `python3 .github/scripts/generate_documents.py --write` after editing source files. CI uses `--check` to reject stale generated documents.

Root `README.md` and `CONTRIBUTING.md` are symlinks to the generated PRD and agent guide respectively. Do not duplicate their content.
