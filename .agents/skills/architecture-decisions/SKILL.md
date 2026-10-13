---
name: architecture-decisions
description: Record durable engineering choices and regenerate the architecture document.
---
# Architecture Decisions

## When to use

Before material structural changes, ownership changes or irreversible technology decisions.

## Procedure

1. Establish current constraints and alternatives based on existing code.
2. Describe the specific choice, trade-offs, rejected options and migration impact.
3. Write an independently reviewable `.agents/decisions/<sequence>-<slug>.md` record with `status: accepted` only after approval.
4. Reconcile superseded decisions; preserve history and avoid contradictory active architecture.
5. Regenerate `.agents/ARCHITECTURE.md` and validate links and generated output.

## Evidence of completion

Accepted decision record, updated architecture projection and a list of consumers/contracts affected.

Follow `.agents/AGENTS.md` and the owning role's boundaries. Adapt commands to the detected toolchain; this file is reusable guidance, not executable automation.
