---
status: accepted
---
# Development integration and release

## Decision

The `development` branch is the integration branch; `main` is the release branch. Feature work targets `development`. A merge into `main` must originate from `development` and pass required checks and review. Release versions use the root `VERSION` file as their sole source.

For a same-repository pull request, automation creates one version-bump commit on its head branch, using the next patch version greater than either the base or head version. A distinct `v<version>` tag and GitHub Release are created by automation for each new commit landing on `main`. Existing tags must never be moved.

## Rationale

Separate integration and release lanes prevent ordinary feature PRs from directly entering the release branch. Version commits in the PR branch keep the chosen release number reviewable; tagging on `main` avoids releasing unmerged code.

## Consequences

GitHub branch protection must be configured in repository settings to make workflow checks genuinely mandatory. The workflow source-branch guard is an additional check, not a replacement for protection. Fork pull requests cannot receive automatic head-branch commits with the repository token, and must update their version manually.
