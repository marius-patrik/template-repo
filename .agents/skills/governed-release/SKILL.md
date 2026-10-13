---
name: governed-release
description: Validate current review, integration and GitHub release evidence without bypassing native protection.
---
# Governed Release

## When to use

When promoting development into main, publishing tags or auditing release state.

## Procedure

1. Confirm the candidate code, approved scope and current integration branch.
2. In `tags` mode, ensure no VERSION file is tracked; in `file` mode, verify VERSION was bumped by the PR policy. Require document checks and relevant tests green.
3. For a main PR, verify the head is this repository's `development` branch.
4. Require actual native branch protection/reviewer approval before merge; do not call workflow policy equivalent to protection.
5. After main merge, confirm immutable tag, release URL, source commit and retained integration branch.
6. If protection is missing, invoke the admin bootstrap procedure using an authorized account, or report that gate as blocked.

## Evidence of completion

Verified commit SHA, version, tag, release, check results, review state and any remaining administrative blocker.

Follow `.agents/AGENTS.md` and the owning role's boundaries. Adapt commands to the detected toolchain; this file is reusable guidance, not executable automation.
