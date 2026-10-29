# Opt-in Git hook

`git config --local core.hooksPath .agents/plugins/canvas/hooks` enables the pre-commit renderer. Inspect existing hook configuration first, as this replaces the hook directory. No Git or ChatGPT hook is installed automatically. The renderer uses staged Git objects, not a mutable Canvas-only store.
