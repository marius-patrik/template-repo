---
name: repository-orientation
description: Inspect the real repository, consumers and project evidence before proposing changes.
---
# Repository Orientation

## When to use

At the start of a new task, after branch changes, or when past notes may be stale.

## Procedure

1. Inspect Git status, current branch and default/integration refs; preserve any existing uncommitted work.
2. Read `.agents/GOAL.md`, `.agents/PRD.md`, `.agents/ARCHITECTURE.md` and `.agents/AGENTS.md`.
3. Discover package/workspace manifests and actually wired runtime entrypoints.
4. Inspect open PRs, tracked defects and current CI, without conflating branch content and released content.
5. State confirmed facts, assumptions and unanswered questions before modifying behavior.

## Evidence of completion

A concise state map: canonical files/owners, entrypoints, verified refs, open dependencies and immediate risks.

Follow `.agents/AGENTS.md` and the owning role's boundaries. Adapt commands to the detected toolchain; this file is reusable guidance, not executable automation.
