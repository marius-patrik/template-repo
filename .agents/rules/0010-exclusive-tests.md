---
status: active
---
# Exclusive repository test location

- Store **every** repository-owned test, fixture, mock, snapshot, support harness and test-only resource under `.github/tests/`. This includes unit, integration, end-to-end, smoke, contract, regression and functional suites.
- Organize freely under `.github/tests/`, but never place repository tests next to production code, under `.github/scripts/`, in application directories or inside the pinned `.darkfactory` submodule.
- Write behavior-driven tests that exercise external outcomes and edge cases, not syntax assertions or mocks that replace the unit under test.
- Relocate existing tests with every relevant change. The generator and CI must reject any tracked test paths outside `.github/tests/`.
- Update test discovery and execution commands whenever structure changes. Report unexecuted tests or unavailable CI as blocked, not passing.
