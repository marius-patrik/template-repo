---
status: published
---
# Contribution and delivery

Use `development` as the integration branch. Work in a focused topic branch and propose the change into `development`. After review and verification, publish `development` into `main` using a release pull request.

The versioning, document-check and release workflows are stored under `.darkfactory/github/workflows/`, reached locally through the `.github` symlink. **GitHub Actions may not discover these symlinked workflows.** Treat automatic version bumps, PR checks and releases as unavailable until the GitHub Actions registry and actual trigger behavior have been verified. Native branch protection also requires separate administrative activation. Do not claim enforcement or automation without live evidence.

Useful command:

```bash
python3 .darkfactory/github/scripts/generate_documents.py --write
python3 .darkfactory/github/scripts/generate_documents.py --check
python3 -m unittest discover -s .darkfactory/tests -p 'test_*.py'
```

For task-specific guidance, select a role from `.darkfactory/agents/agents/` and skills from `.darkfactory/agents/skills/`. Treat them as portable instructions: a harness must explicitly load them to execute them.
