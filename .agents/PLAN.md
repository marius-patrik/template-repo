# Plan

## Template customization

- [ ] Replace the starter project goal and requests with product-specific scope.
- [ ] Add accepted architectural decisions and adjust repository rules for actual consumers.
- [x] Keep generated documentation validated from canonical source records.
- [x] Restore the native `.agents/` and `.github/` trees and tests in `.github/tests/`.
- [x] Pin the DarkFactory repository as the root `.darkfactory` submodule.
- [x] Use Git tags by default, with optional auto-maintained file versioning.
- [ ] Apply and verify native `main` branch protection using `python3 .github/scripts/apply_branch_protection.py --apply` from an administrator's GitHub CLI session.

## Delivery protocol

Keep this plan, approved requirements, architectural decisions and test evidence synchronized with changes. Verify branch refs, CI results and immutable release tags before reporting completion.
