---
status: active
---
# Exclusive repository test location

- Store **every** repository-owned test, fixture, mock, snapshot, support harness and test-only resource under `.github/tests/`. This includes unit, integration, end-to-end, smoke, contract, regression and functional suites.
- Organize freely under `.github/tests/`, but never place repository tests next to production code, under `.github/scripts/` or inside application directories.
- Write behavior-driven tests that exercise external outcomes and edge cases, not syntax assertions or mocks that replace the unit under test.
- Relocate existing tests with each relevant change. The generator and CI must reject tracked test paths outside `.github/tests/`.
- Update discovery and execution commands whenever structure changes. Report unexecuted tests or unavailable CI as blocked, not passing.
