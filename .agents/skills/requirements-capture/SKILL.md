---
name: requirements-capture
description: Turn owner requirements into durable approved request records and regenerate the PRD.
---
# Requirements Capture

## When to use

When scope, acceptance criteria, non-goals or user intent changes.

## Procedure

1. Record the request with enough original context to preserve intent in `.agents/requests/<sequence>-<topic>.md`.
2. Give each record a `status:` in front matter; only approved requests enter the PRD.
3. Specify observable outcomes, exclusions, affected actors and dependencies.
4. Identify conflicts with existing approved records; reconcile rather than keeping two contradictory active requirements.
5. Run the generator in `--write` mode and its `--check` validation.
6. Record any unresolved product question instead of inventing a decision.

## Evidence of completion

Approved source record(s), a current generated PRD and a traceable acceptance checklist.

Follow `.agents/AGENTS.md` and the owning role's boundaries. Adapt commands to the detected toolchain; this file is reusable guidance, not executable automation.
