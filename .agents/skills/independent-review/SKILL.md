---
name: independent-review
description: Review a proposed change separately from its author and verify issue/PR readiness.
---
# Independent Review

## When to use

When a candidate is ready for independent inspection or after review fixes.

## Procedure

1. Read the request and accepted decisions without trusting the author's summary.
2. Verify each acceptance criterion against actual code paths or executed tests.
3. Check security boundaries, concurrency/data changes, backward compatibility and architecture drift.
4. Identify untracked scope and missing verification; distinguish defects from optional improvements.
5. Report findings by severity with concrete file references and reproduction steps.
6. Re-review changed code; never substitute the report for required native GitHub approvals.

## Evidence of completion

Review result with severity-ranked findings, supporting evidence and clean/blocked disposition.

Follow `.agents/AGENTS.md` and the owning role's boundaries. Adapt commands to the detected toolchain; this file is reusable guidance, not executable automation.
