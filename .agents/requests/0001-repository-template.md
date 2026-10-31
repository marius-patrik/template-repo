---
status: approved
---
# Repository template requirements

## Purpose

Provide a reusable, technology-neutral GitHub repository template with first-class guidance for humans and coding agents. The template also hosts **one** React Canvas application for viewing repository context; the app remains a prototype rather than an autonomous runtime.

## Repository layout

- Keep independent, physical root `.agents/` and `.github/` directories; neither may be a symlink or duplicated as an alternative source.
- Keep `.agents/{GOAL,PLAN,TODO,SCRATCHPAD}.md` at its root; derive `.agents/{README,PRD,ARCHITECTURE,AGENTS}.md` exclusively from the status-gated records in `.agents/{notes,requests,decisions,rules}/`.
- Keep portable agent role profiles in `.agents/agents/` and reusable skills in `.agents/skills/<name>/SKILL.md`.
- Keep workflows, scripts, PR template, and the **entire repository test suite** under `.github/`; tests, fixtures, mocks, snapshots and E2E assets live exclusively in `.github/tests/`.
- Keep root `README.md` and `CONTRIBUTING.md` as Git symlinks to `.agents/README.md` and `.agents/AGENTS.md`.
- Do **not** install or require a root `.darkfactory` Git submodule or `.gitmodules`. External DarkFactory workflows and pinned released artifacts may remain available through explicit configuration.
- Keep the Bun/React frontend toolchain scoped to `.github/app/`; do not impose it on downstream projects that do not use Canvas.

## Versioning and releases

- Default to `tags`: no tracked `VERSION` file; derive the next `vMAJOR.MINOR.PATCH` on a `main` release from existing tags, then publish an immutable GitHub Release.
- Support optional `file` mode via `repo.versioning.mode` in `repo.dfconfig`, with a strict version file and automatic patch bump on same-repository PRs. Reject tag/version divergence.
- Do not auto-bump versions in `tags` mode, move existing tags or release unmerged changes.

## Delivery and governance

- Use `development` for integration and `main` for releases. Only a same-repository PR from `development` may target `main`.
- Maintain deterministic generated Markdown and native GitHub Actions workflows under `.github/workflows/`.
- Verify live branch protection rather than assuming configuration alone enforces it.
- Use GPL-3.0. Keep Canvas prototyping distinct from approving a production release.
