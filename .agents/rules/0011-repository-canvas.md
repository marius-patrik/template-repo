---
status: active
---
# React Canvas and agent interactions

- The **sole** Canvas frontend is `.github/app/`; GitHub Pages publishes its compiled `.canvas-dist/index.html`. Never introduce a separate root HTML renderer, generated root `canvas.html`, Python Canvas CLI or alternate UI authority.
- Read `repo.dfconfig`, canonical `.agents/` source records, active work and the frontend's actual entrypoints before changing the prototype.
- Agents operate through authorized source-control tools; they may inspect, propose, edit and validate **underlying tracked records** with approved review gates, then regenerate Markdown and rebuild React.
- Public Canvas content is derived only from explicitly allowlisted, verified Git-tracked sources. Do not fabricate execution, external repositories, task states or private facts.
- Browser-local appearance, layout, language and keybinding settings are **presentation state** and do not override repository truth. Keep the compiled public viewer read-only unless the user approves a new interaction contract.
- The repository-local plugin manifest and hooks are opt-in conventions, not automatically installed ChatGPT capabilities.
- Keep application and documentation checks in native GitHub Actions with tests under `.github/tests/`. Do not infer prototype approval from successful CI or a Pages deployment.
