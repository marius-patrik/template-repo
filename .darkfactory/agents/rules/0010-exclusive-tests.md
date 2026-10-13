---
status: active
---
# Exclusive test location

- Place **all tests** under `.darkfactory/tests/`. This includes unit, integration, end-to-end, functional, smoke, contract and regression tests, test fixtures, snapshots, mocks and shared test helpers.
- Organize subdirectories within `.darkfactory/tests/` by package or test type when useful; do not put tests next to production code, in `.darkfactory/github/scripts/`, in `.darkfactory/agents/`, in root `tests/`, or in any second test folder.
- Write behavior-driven tests that exercise observable outcomes, real interfaces and edge cases. Avoid tests that only restate implementation syntax or mock the behavior under test.
- Update and relocate existing tests as part of the same change that introduces this rule; test discovery, commands and CI configurations must point to `.darkfactory/tests/`.
- Verify the tracked repository tree for test files and test-only folders outside this location before proposing a merge. Report tests that could not execute instead of declaring success.
