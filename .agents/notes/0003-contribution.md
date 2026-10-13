---
status: published
---
# Contribution and releases

Propose focused changes into `development`. After review and required checks, promote `development` to `main` through a release PR. GitHub workflow definitions live directly at `.github/workflows/`.

The default version mode is **tags only**. There is no `VERSION` file and PRs do not bump a version. A push to `main` computes the next SemVer patch from existing release tags, then publishes an immutable tag and GitHub Release. Projects can select `file` mode in `repo.dfconfig` and add `VERSION`; that mode uses the PR version-bump workflow and releases exactly the checked-in version.

Verify locally:

```bash
python3 .github/scripts/generate_documents.py --write
python3 .github/scripts/generate_documents.py --check
python3 -m unittest discover -s .github/tests -p 'test_*.py'
```

When access to the DarkFactory dependency is needed, run `git submodule update --init --recursive`. A submodule is pinned to an exact commit; it is not a replacement for the repository's own `.agents/` or `.github/`.
