---
status: active
---
# Repository hygiene

- Prefer one durable record per fact; periodically reconcile branches, issues, pull requests and plans against reality.
- Do not delete a branch containing unique commits without explicit approval and a verified recovery path.
- Keep commits, generated files, links and imports free of stale paths or obsolete aliases.
- Only create CI workflows or dependencies when they verify real behavior or support required delivery; avoid speculative scaffolding.
- Treat failures, blockers and decisions as durable project records rather than ephemeral chat history.
