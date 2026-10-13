---
status: active
---
# Documentation as part of the change

- Change an authoritative record before regenerating its derived view. Never maintain `README.md`, `CONTRIBUTING.md`, `AGENTS.md`, `PRD.md` or `ARCHITECTURE.md` as competing copies.
- Run `python3 .github/scripts/generate_documents.py --write` after changing requests, decisions or rules, and `--check` before submission.
- Update code-facing documentation and architecture decisions in the same change that introduces the corresponding behavior.
- Describe what exists separately from what is planned or proposed. Keep generated documentation and released artifacts pinned to the actual source revision.
- Write code, public identifiers, comments and repository documentation in English unless approved requirements mandate another language.
