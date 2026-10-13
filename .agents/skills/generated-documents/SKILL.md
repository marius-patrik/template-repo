---
name: generated-documents
description: Maintain README, PRD, ARCHITECTURE and AGENTS as deterministic projections of canonical Markdown sources.
---
# Generated Documents

## When to use

After editing published notes, approved requests, accepted decisions or active rules.

## Procedure

1. Edit `.agents/notes/*.md` (front matter `status: published`) for README overview; keep the task list in `.agents/TODO.md`, outside the published notes directory.
2. Edit `.agents/requests/*.md` (approved) for PRD; `.agents/decisions/*.md` (accepted) for ARCHITECTURE; `.agents/rules/*.md` (active) for AGENTS.
3. Run `python3 .github/scripts/generate_documents.py --write`.
4. Run `python3 .github/scripts/generate_documents.py --check` and inspect the generated diff.
5. Verify root symlinks: README -> `.agents/README.md`, CONTRIBUTING -> `.agents/AGENTS.md`.
6. Do not change projections manually to silence failing checks.

## Evidence of completion

Deterministically regenerated documents with a clean --check and no stale legacy paths.

Follow `.agents/AGENTS.md` and the owning role's boundaries. Adapt commands to the detected toolchain; this file is reusable guidance, not executable automation.
