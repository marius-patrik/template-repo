---
status: published
---
# External DarkFactory integration and test ownership

The repository's agent guidance is maintained in `.agents/`, while native GitHub automation belongs in `.github/`. Both are independent physical directories. **No DarkFactory Git submodule is installed or required.**

Managed DarkFactory workflows and pinned external artifacts may remain configured in `.github/workflows/`, `.github/darkfactory-installation.json`, and `repo.dfconfig`; these are external integrations rather than a second local copy of the project.

All repository tests, fixtures, mocks, snapshots and helpers belong exclusively under `.github/tests/`, including Canvas browser smoke tests. GitHub Actions workflows are discoverable under `.github/workflows/`.

The default release strategy uses Git tags. The optional `VERSION` file is maintained only when explicitly configured in `file` mode.
