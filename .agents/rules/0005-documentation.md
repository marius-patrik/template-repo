---
status: active
---
# Documentation as part of the change

- Edit the canonical source records before regenerating projections: published `.agents/notes/*.md` own README; approved `.agents/requests/*.md` own PRD; accepted `.agents/decisions/*.md` own ARCHITECTURE; active `.agents/rules/*.md` own AGENTS.
- Never maintain root `README.md`, root `CONTRIBUTING.md`, `.agents/README.md`, `.agents/AGENTS.md`, `.agents/PRD.md` or `.agents/ARCHITECTURE.md` as competing independent copies.
- Run `python3 .github/scripts/generate_documents.py --write` after changing any source record, and `--check` before submission.
- Keep `.agents/GOAL.md`, `.agents/PLAN.md` and `.agents/TODO.md` aligned with current project state; they are not generated.
- Update code-facing documentation and architecture decisions in the same change that introduces the corresponding behavior.
- Describe what exists separately from what is planned. Keep generated documentation and release artifacts pinned to the actual source revision.
- Write code, public identifiers, comments and repository documentation in English unless approved requirements mandate another language.
