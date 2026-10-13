---
status: published
---
# Contribution and delivery

Use `development` as the integration branch. Work in a focused topic branch and propose the change into `development`. After review and verification, publish `development` into `main` using a release pull request.

The repository bumps `VERSION` once per same-repository PR, checks generated documents, restricts `main` PR sources to `development`, and automatically tags/publishes releases on `main` pushes. These workflows are not substitutes for GitHub's **native** branch protection.

Useful command:

```bash
python3 .github/scripts/generate_documents.py --write
python3 .github/scripts/generate_documents.py --check
python3 -m unittest discover -s .github/scripts -p 'test_*.py'
```

For task-specific guidance, select a role from `.agents/agents/` and skills from `.agents/skills/`. Treat them as portable instructions: a harness must explicitly load them to execute them.
