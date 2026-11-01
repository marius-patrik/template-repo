# Plan

## Repository foundations

- [x] Preserve real `.agents/` and `.github/` roots, with repository tests exclusively under `.github/tests/`.
- [x] Maintain deterministic, status-gated generated Markdown documentation.
- [x] Default to Git-tag releases with optional file versioning.
- [x] Remove the obsolete root Canvas renderer and local DarkFactory submodule; keep supported external DarkFactory workflows.
- [ ] Apply and independently verify native `main` branch protection using administrator-authorized tooling.

## Canvas prototype — OPEN

- [x] Use `.github/app/` as the sole React/TypeScript application.
- [x] Build its public read-only Git-tracked context snapshot into the Pages entrypoint.
- [x] Provide Dockview, navigation, appearance preferences and localization as UI-only state.
- [x] Reconcile documentation, tests and hooks to the single implementation.
- [ ] Independently verify the newest published Pages revision and user-facing flow.
- [ ] Continue the UX, interaction and architecture exploration; obtain explicit user approval before ending prototyping.
- [ ] Only then plan production capability changes through review.

## Delivery protocol

Use focused feature changes against `development`; do not conflate a feature-branch Pages preview with a release on `main`. Verify the latest branch, CI, generated sources, browser behavior and Pages deployment. Preserve review gates.
