---
status: accepted
---
# Native GitHub delivery and dual version modes

## Decision

`development` is the integration branch and `main` is the release branch. PRs into `main` must originate from this repository's `development`. All workflows are ordinary Git-tracked files under root `.github/workflows/`, making GitHub Actions discovery possible again.

`repo.versioning.mode` in root `repo.dfconfig` is one of `tags` (default) or `file`.

- **`tags` (default):** no `VERSION` file is tracked. On a push to `main`, the release workflow finds any SemVer tag already pointing at that commit, or calculates the next patch tag using the highest existing `vMAJOR.MINOR.PATCH` tag. It creates an immutable tag and a GitHub Release. Pull requests do not bump versions.
- **`file` (opt-in):** a `VERSION` file containing one strict `major.minor.patch` line is required. A same-repository PR gets exactly one automatic patch bump on its head (as in the previous file-driven release workflow); `main` releases must use that version. The proposed version must exceed all existing SemVer tags and may not reuse a tag on another commit.

The release workflow is serialized, idempotent against retry on the same commit, and never moves existing tags. Both modes require verifying the actual release and branch refs.

## Rationale

Tag-only mode avoids commits solely to update a version marker and prevents tag/file drift. Optional file mode supports projects that need a version visible in source, without imposing that requirement on templates.

## Consequences

Changing modes is an explicit source/configuration change. Switching to `file` requires adding `VERSION` with a non-colliding SemVer number; switching to `tags` removes it. PR workflow bumps occur only in `file` mode. Protect `main` in GitHub itself; the source-branch workflow is a supplemental guard.
