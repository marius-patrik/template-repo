---
status: active
---
# Versioning and release discipline

- The root `VERSION` file is canonical. Use `major.minor.patch` without a `v` prefix; release tags use `v<version>`.
- A same-repository pull request receives one automatic patch bump. Never repeatedly bump a PR on synchronization; never silently overwrite tags.
- Publish releases only for merged `main` commits, and do not call a release successful until both its tag and GitHub Release are verified.
- `development` is the integration lane; `main` is the release lane. Required checks, review and protection must be configured on GitHub, not just described in Markdown.
