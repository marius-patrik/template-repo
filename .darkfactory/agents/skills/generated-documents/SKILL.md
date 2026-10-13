---
name: generated-documents
description: Maintain README, PRD, ARCHITECTURE and AGENTS as deterministic projections of canonical Markdown sources.
---
# Generated Documents

## When to use

After editing published notes, approved requests, accepted decisions or active rules.

## Procedure

1. Edit `.darkfactory/agents/notes/*.md` (front matter `status: published`) for the README overview. Keep the worklist in `.darkfactory/agents/TODO.md`.
2. Edit `.darkfactory/agents/requests/*.md` (approved) for PRD, `.darkfactory/agents/decisions/*.md` (accepted) for ARCHITECTURE, and `.darkfactory/agents/rules/*.md` (active) for AGENTS.
3. Verify root `.agents` and `.github` resolve to `.darkfactory/agents` and `.darkfactory/github`; change only canonical source files.
4. Run `python3 .darkfactory/github/scripts/generate_documents.py --write`.
5. Run `python3 .darkfactory/github/scripts/generate_documents.py --check` and inspect the generated diff.
6. Verify root symlinks: README -> `.agents/README.md`, CONTRIBUTING -> `.agents/AGENTS.md`.
7. Run tests from `.darkfactory/tests/`; do not claim CI execution until GitHub recognizes the `.github` symlink.
8. Never manually modify projections to silence failing checks.

## Evidence of completion

Deterministically regenerated documents with passing local validation, no stale references and no tests outside `.darkfactory/tests/`.

Follow `.darkfactory/agents/AGENTS.md` and the owning role's boundaries. This file is reusable guidance, not executable automation.
