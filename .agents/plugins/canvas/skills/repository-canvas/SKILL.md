---
name: repository-canvas
description: Orient on the tracked repository and present, search and regenerate its stateless HTML Canvas.
---
# Canvas agent skill

At session start run `python3 .agents/tools/canvas.py check`, then `context --limit 16000`. Use `read FILE` and `search QUERY` to inspect source. The static Canvas is only a derived display.

Agents are interactive through Git/GitHub tools: read and edit actual repository files, optionally add Markdown or SVG views under `.agents/views/`, stage source edits, run `write`, stage `canvas.html`, run `check` and tests, and present the relevant Canvas section/link. No browser UI state or Canvas-only data is permitted.

This manifest is portable documentation, NOT an automatically installed ChatGPT integration. Host lifecycle hooks require explicit integration; Git hooks require opt-in.
