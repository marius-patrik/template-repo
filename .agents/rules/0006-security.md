---
status: active
---
# Safety, credentials and data

- Never commit secrets, credentials, tokens, local private data or generated secret material. Prefer managed credentials and least-privilege identities.
- Validate external input at trust boundaries; use safe, idempotent or reconciled mutations instead of blindly retrying uncertain side effects.
- Make destructive actions explicit and auditable. Do not delete user work, rewrite history, discard branches or alter production state without verified authorization.
- Ensure failures are observable: a missing dependency or blocked operation must not silently succeed.
- Do not claim that a repository policy is enforced merely because a workflow or config file declares it; confirm the actual GitHub settings and checks.
