---
status: accepted
---
# Native repository directories and a pinned DarkFactory submodule

## Decision

Root `.agents/` and `.github/` are independent physical Git directories, not symlinks. `.agents/` owns project documentation, source records, role instructions and portable skills. `.github/` owns native GitHub Actions workflows, scripts, PR templates and the **sole test directory** `.github/tests/`.

The root path `.darkfactory` is reserved exclusively for the pinned Git submodule `https://github.com/marius-patrik/DarkFactory.git`. It is a Git tree entry with mode `160000`, not a locally authored metadata directory. Project tests and GitHub workflows are not stored in the submodule.

## Rationale

GitHub workflow discovery requires an actual `.github/workflows/` tree. A symlinked `.github` broke CI dispatch, releases and automatic preservation of the `development` branch. Restoring native directories fixes the discovery contract. A submodule retains reusable DarkFactory code without conflating external and local repository ownership.

## Consequences

Do not put test files outside `.github/tests/`. Ensure all internal workflow/script paths use native root locations. Advance the pinned submodule commit explicitly and reviewably, and use `git submodule update --init --recursive` if local tooling needs its content.
