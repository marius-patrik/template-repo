---
status: active
---
# Canvas lifecycle

- Start repository work by reading root `canvas.html` and checking its reproducibility. Load context using the Canvas CLI where available.
- Keep all persistent facts in canonical tracked files; never hand-edit Canvas or add Canvas-only state.
- Before committing, stage sources, run `canvas.py write`, stage `canvas.html`, then run `canvas.py check` and tests.
- Show the current snapshot/link when responding where supported; do not promise automatic ChatGPT hook execution.
