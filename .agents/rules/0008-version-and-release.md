---
status: active
---
# Versioning and release discipline

- The default `repo.versioning.mode` is `tags`: derive the release version from existing SemVer `vX.Y.Z` Git tags, never require or maintain a `VERSION` file and never bump versions on pull requests.
- `file` mode is explicit opt-in. It requires `VERSION` at the repository root with one strict `major.minor.patch` line, and an automated once-per-PR version bump. Do not mix version authorities or reuse a tag assigned to another commit.
- Create tags and GitHub Releases only from merged `main` commits; never move an existing tag. Verify the published release before claiming completion.
- `development` is the integration branch and `main` the release branch. Keep native GitHub Actions workflows at `.github/workflows/`; code-defined policy never substitutes for native GitHub branch protection.
