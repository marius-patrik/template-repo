---
status: published
---
# Contribution and releases

Propose focused source changes into `development`. After review and required checks, promote `development` to `main` through a release PR. Native GitHub workflow definitions live at `.github/workflows/`.

The default version mode is **tags only**. A push to `main` computes the next SemVer patch from existing release tags and publishes an immutable tag and GitHub Release. Projects may opt into `file` mode through `repo.dfconfig` and a `VERSION` file.

Verify repository source records and tests:

```bash
python3 .github/scripts/generate_documents.py --write
python3 .github/scripts/generate_documents.py --check
python3 -m unittest discover -s .github/tests -p 'test_*.py'
```

Verify the single Canvas implementation from `.github/app/`:

```bash
bun install
bun run check
```

The Pages workflow also runs a compiled-HTML Chromium smoke test. DarkFactory automation uses external workflows and artifacts; no local submodule initialization is needed.
