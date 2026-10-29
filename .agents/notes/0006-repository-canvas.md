---
status: published
---
# Repository Canvas

Root `canvas.html` is a generated, read-only HTML projection of **tracked Git files**. It contains escaped text, path/commit references, symlink targets and metadata for binary or oversized files. Sensitive paths are redacted. It has no JavaScript, external database or browser persistence.

Agents use `.agents/plugins/canvas/` and the standard-library script `.agents/tools/canvas.py` to inspect and modify canonical files, then regenerate Canvas. A host must explicitly register session hooks; Git hooks are optional.

```bash
python3 .agents/tools/canvas.py write
python3 .agents/tools/canvas.py check
python3 .agents/tools/canvas.py context --limit 16000
python3 .agents/tools/canvas.py search vehicle
```
