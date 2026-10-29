---
status: approved
---
# Repository Canvas and interactive agent interface

- Generate a root `canvas.html` static, non-editable view from all Git-tracked repository source entries. Do not add remote data feeds, hand-written Canvas facts or browser-side persistent state.
- Embed full UTF-8 text for ordinary tracked files; represent symlinks as paths, gitlinks by pinned commit and nontext files by length and content checksum. Exclude `canvas.html` from itself.
- Provide a readable project overview, file navigation, source listing and structured vehicle facts only if such data is present in the repository.
- Provide repository-local agent plugin instructions, a documented read/write/render/check command-line tool and opt-in hooks under `.agents/`. Agent changes must update canonical repository sources and regenerate the Canvas.
- Provide a compact snapshot command intended for agent turn summaries; repeat invocation requires host integration and may not be claimed automatic in ChatGPT.
- Verify deterministic output and security boundaries with tests strictly under `.github/tests/` and normal repository CI. Maintain existing generated-document ownership and PR review rules.
