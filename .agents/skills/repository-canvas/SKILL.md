---
name: repository-canvas
description: Load, inspect, update and verify a repository-backed read-only HTML Canvas using Git-tracked records as the sole source of truth.
---
# Repository Canvas agent skill

## Source and interaction contract

1. On session orientation, read root `canvas.html`, run `python3 .agents/tools/canvas.py snapshot`, and inspect `repo.dfconfig`, `.agents/GOAL.md` and active work. Treat the Canvas as a generated projection, **never** as an authority over its underlying Git-tracked records.
2. All persisted data must originate from the repository. New user instructions or external facts must first be recorded as attributed, confidence-labeled source records under the project's canonical paths, then rendered; do not invent or silently blend external state into the Canvas.
3. Agents may interact through their authorized repository tools: read source, change tracked source, regenerate documentation and Canvas, run checks, create a branch/PR and report evidence. Humans view the output; the HTML itself does not provide edit controls.
4. To show requested additional views, author/review appropriate source records and extend the **generic template/generator** (or a project-specific renderer extension) rather than adding a disconnected UI, embedded remote API or hardcoded fake data.
5. Use `python3 .agents/tools/canvas.py snapshot` to print a compact, current project snapshot at the end of a turn, and link to root `canvas.html`. The host must invoke this skill each turn for repeat behavior. A repository manifest cannot register universal ChatGPT turn hooks.
6. Read/search/list/put/render/check are documented in `.agents/plugin.json`. `put` is limited to existing, safe tracked source files; new files require an ordinary Git-tracked edit and regeneration. Never directly edit generated `canvas.html` or canonical generated Markdown.
7. Verify with `python3 .agents/tools/canvas.py check`, `python3 .github/scripts/generate_documents.py --check`, and all repository tests before reporting completion. Respect PR and human review policy.

## Lifecycle

- Bootstrap/switch repository: `bash .agents/hooks/session-start.sh`
- After source changes: `bash .agents/hooks/after-change.sh`
- Opt-in local Git hook: `git config core.hooksPath .agents/hooks`; be aware this replaces any existing configured hooks directory.
- No reliance on a browser, network feed, runtime JS or unpublished chat state for Canvas values.
