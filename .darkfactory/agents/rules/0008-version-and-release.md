---
status: active
---
# Versioning and release discipline

- The root `VERSION` file is canonical. Use `major.minor.patch` without a `v` prefix; release tags use `v<version>`.
- Version automation may bump a same-repository pull request only when GitHub recognizes the workflow; otherwise flag the automation as unavailable and ensure the version is explicitly reviewed. Never repeatedly bump a PR on synchronization or silently overwrite tags.
- Publish releases only for merged `main` commits, and do not call a release successful until both its tag and GitHub Release are verified. A checked-in workflow under symlinked `.github` does not establish a successful automated release.
- `development` is the integration lane; `main` is the release lane. Required checks, review and protection must be configured on GitHub, not just described in Markdown.
