# Agent workspace

This directory holds project-level guidance, planning, and the source material for generated documents. It is independent of the code ecosystem.

| File or directory | Role |
| --- | --- |
| `AGENTS.md` | Generated rules for agents and contributors; do not edit directly. |
| `PLAN.md` | Execution plan and verification gates. |
| `SCRATCHPAD.md` | Temporary notes, never normative. |
| `notes/GOAL.md` | Durable project goal and success criteria. |
| `notes/TODO.md` | Small actionable items. |
| `notes/requests/` | Approved requirement sources, generating `notes/PRD.md`. |
| `notes/decisions/` | Accepted architectural decisions, generating `notes/ARCHITECTURE.md`. |
| `notes/rules/` | Active development rules, generating `AGENTS.md`. |

To regenerate documents, run `python3 .github/scripts/generate_documents.py --write` from the repository root. CI checks the same outputs with `--check`. Change source files, not generated projections.

The root `README.md` links to `.agents/notes/PRD.md`. The root `CONTRIBUTING.md` links to `.agents/AGENTS.md`. Git symlinks are intentional.
