---
status: published
---
# Single repository Canvas

Root `canvas.html` is the complete, deterministic and static human-readable view of Git-tracked repository content. It embeds readable tracked source files; binary files are represented with checksums, symlinks as targets, and the pinned DarkFactory submodule by commit identifier. The Canvas excludes itself from its input list to avoid recursion. No external API calls or independent browser state are used.

Agent-side interaction lives in the repo-local `.agents/plugin.json`, `.agents/skills/repository-canvas/SKILL.md`, `.agents/tools/canvas.py` and optional `.agents/hooks/`. Agents read and modify source files with authorized tools; after any change they regenerate `canvas.html` and verify it. The interface remains read-only for human visitors.

```bash
python3 .agents/tools/canvas.py snapshot
python3 .agents/tools/canvas.py render
python3 .agents/tools/canvas.py check
bash .agents/hooks/session-start.sh
```

The hook manifest is a portable repo convention rather than an automatically installed ChatGPT plugin. Native Git hooks require explicit local opt-in. Private repository information embedded in the Canvas must not be deployed publicly without a privacy audit.
