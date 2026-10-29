---
status: accepted
---
# Static repository Canvas and agent-owned interaction

## Decision

A single root `canvas.html` is generated from `git ls-files` and the local worktree. It is the **human view**, not a writable data source. Ordinary UTF-8 files are represented in full, while gitlinks, symlinks and binary files are described without dereferencing external sources. The renderer is deterministic and excludes its own output from source traversal.

The agent interface is implemented through repo-local procedures and tools in `.agents/`, not custom runtime JavaScript in HTML. A repository-specific context hook offers a compact turn snapshot; no automatic ChatGPT hook is assumed.

## Consequences

- Actual data must already exist in Git-tracked files before Canvas displays it. External facts and user reports require evidence-aware repository updates first.
- Generated-document projections stay derived from canonical notes, requests, decisions and rules, and the Canvas includes their checked-in projections.
- Source edits require Canvas regeneration and an automated check. The template retains no project-specific vehicle facts.
- The plugin manifest is opt-in for agent hosts that support its explicit command/skill/hook convention, not a generally installed ChatGPT connector.
