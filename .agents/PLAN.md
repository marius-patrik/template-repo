# Plan

## Current objective

- [ ] Replace the template goal and initial request with project-specific scope.
- [ ] Add accepted architecture decisions and refine the rules where the project differs.
- [x] Generate and verify documentation: `python3 .github/scripts/generate_documents.py --write && python3 .github/scripts/generate_documents.py --check`.
- [ ] Apply and verify native `main` branch protection with `python3 .github/scripts/apply_branch_protection.py --apply` using a GitHub administrator's CLI session; the current connected app cannot grant Administration:write.
- [x] Verify the development-to-main pull request, automatic version bump, tagging and release workflow (initial release verified at v0.1.1; follow-up release pending).

## Delivery protocol

Use small reviewable changes, connect work to approved requirements, verify before claiming completion, and record any blockers with evidence. Update this plan when work starts, finishes or is deliberately deferred.
