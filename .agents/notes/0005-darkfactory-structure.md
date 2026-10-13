---
status: published
---
# DarkFactory integration and test ownership

The repository's own agent guidance is in `.agents/` and GitHub automation is in `.github/`; neither is a symlink. The reusable DarkFactory project is pinned as a root submodule at `.darkfactory`. Update its commit pointer explicitly and keep the `.gitmodules` URL in sync.

All repository tests, fixtures, mocks, snapshots and test helpers are owned by `.github/tests/`. Do not put them in application packages, under the DarkFactory submodule or in separate root test folders.

The default release strategy uses Git tags as the sole version authority. The optional `VERSION` file belongs to opt-in `file` mode and is automatically maintained by the PR workflow. GitHub Actions workflows are discoverable under `.github/workflows/`.
