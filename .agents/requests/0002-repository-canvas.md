---
status: approved
---
# Stateless Canvas requirements

- Generate `canvas.html` deterministically from tracked Git entries; exclude Canvas itself.
- Provide a single static human-facing interface and agent context-loading command, with no Canvas-only persistent state, JavaScript or external runtime.
- Safely escape tracked text; represent submodules, binaries and sensitive content by metadata without embedding secrets.
- Provide portable skills, tools, and opt-in hooks under `.agents`; agent interactions modify canonical repository sources, not the generated HTML.
- Wire reproducibility checks into CI with tests under `.github/tests`.
- Do not represent plugin manifests or hook definitions as active ChatGPT features without host registration.
