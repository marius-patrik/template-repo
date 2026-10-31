---
name: generated-documents
description: Maintain README, PRD, ARCHITECTURE and AGENTS as deterministic projections of canonical Markdown sources.
---
# Generated Documents

## When to use

After editing published notes, approved requests, accepted decisions or active rules.

## Procedure

1. Edit `.agents/notes/*.md` (published) for README, with the worklist in `.agents/TODO.md`.
2. Edit approved `.agents/requests/*.md` for PRD, accepted `.agents/decisions/*.md` for ARCHITECTURE, and active `.agents/rules/*.md` for AGENTS.
3. Confirm `.agents/` and `.github/` are real directories; the Canvas app lives only in `.github/app/` and no DarkFactory submodule is required.
4. Run `python3 .github/scripts/generate_documents.py --write`.
5. Run `python3 .github/scripts/generate_documents.py --check` and inspect the generated diff.
6. Verify root symlinks: README -> `.agents/README.md`, CONTRIBUTING -> `.agents/AGENTS.md`.
7. Run tests in `.github/tests/`. For Canvas changes, also verify `cd .github/app && bun run check` and the Pages Chromium smoke workflow.
8. Never manually modify generated projections to silence failing checks.

## Evidence of completion

Generated documents are synchronized with source records, verification passes and no retired Canvas or submodule entries are tracked.

Follow `.agents/AGENTS.md` and the owning role's boundaries.
