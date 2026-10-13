---
name: implementation-verification
description: Implement a bounded change with behavior-focused tests and current documentation.
---
# Implementation Verification

## When to use

During code changes and before opening a reviewable pull request.

## Procedure

1. Trace the requested behavior to one existing owner and affected consumers.
2. Write or update behavior-focused tests exclusively under `.github/tests/` (including integration tests, fixtures and helpers); move or delete test files elsewhere.
3. Make a minimal cohesive change and update affected inline docs or source records.
4. Run only relevant scoped checks during iteration, then full affected integration checks.
5. Inspect final Git diff, changes to lockfiles, links and generated artifacts.
6. Explicitly mark unavailable checks and remaining risks.

## Evidence of completion

A reproducible patch/commit, test commands and outcomes, documented scope and known gaps.

Follow `.agents/AGENTS.md` and the owning role's boundaries. Adapt commands to the detected toolchain; this file is reusable guidance, not executable automation.
