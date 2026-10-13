---
status: published
---
# Single workspace and test suite

The physical source tree is `.darkfactory/`. Root `.agents` and `.github` are symbolic links, not separate directories. Project documents, role instructions and skills live at `.darkfactory/agents/`; GitHub workflow definitions and maintenance scripts live at `.darkfactory/github/`; **all tests** live under `.darkfactory/tests/`.

Run the test suite and documentation checks locally:

```bash
python3 -m unittest discover -s .darkfactory/tests -p 'test_*.py'
python3 .darkfactory/github/scripts/generate_documents.py --check
```

**GitHub Actions limitation:** A root `.github` symlink may not be followed by GitHub's workflow scanner. Workflow definitions remain source files but version-bump, CI and release automation cannot be assumed to operate. Verify native Actions execution before relying on those mechanisms or enforcing checks through branch protection.
