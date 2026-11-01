---
name: repository-canvas
description: Inspect and verify the single repository-backed React Canvas prototype built and published by GitHub Pages.
---
# React Canvas repository skill

## Source and publication contract

1. Inspect the active branch, PR and actual source under `.github/app/`, along with `repo.dfconfig`, `.agents/GOAL.md` and canonical records. The UI code and compiled output are not sources of authority for project facts.
2. Use only the React/TypeScript app under `.github/app/`. Its build-time `scripts/generate-context.mjs` emits `src/generated/context.json` from allowlisted Git-tracked documents. Rsbuild emits the sole site entrypoint `.canvas-dist/index.html`.
3. Agents with appropriate host permissions may edit tracked records or UI source, regenerate the four Markdown projections, run tests, and submit a reviewed PR. The public Pages app is read-only; local preference state affects appearance and layout only.
4. Never create a root HTML generator, second Canvas app or local DarkFactory submodule. Do not embed unapproved repository files or private information in a public build.
5. Execute `python3 .github/scripts/generate_documents.py --write` when changing canonical records, then `--check`. For frontend verification run `cd .github/app && bun run check`, and execute `python3 -m unittest discover -s .github/tests -p 'test_*.py'` from the root.
6. The GitHub Pages workflow additionally verifies the compiled entrypoint and executes the Chromium smoke suite. Verify actual CI and deployment revision separately rather than assuming a build means the public page was updated.
7. The manifest and hooks are optional host conventions, never automatic ChatGPT capabilities. Maintain the **open prototyping phase** until the user expressly approves its completion.

## Optional local lifecycle

- Orientation: `bash .agents/hooks/session-start.sh`
- After editing source records: `bash .agents/hooks/after-change.sh`
- Opt-in Git hook: `git config core.hooksPath .agents/hooks` (replaces another configured hooks directory).
