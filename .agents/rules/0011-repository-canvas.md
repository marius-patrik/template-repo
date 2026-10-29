---
status: active
---
# Repository-backed Canvas and agent interactions

- Root `canvas.html` is a deterministic, read-only projection of Git-tracked repository content; never edit it directly.
- At the beginning of repository work, load the Canvas and run the repository-local context script; at the end, report a concise snapshot from the repository and link to the HTML file.
- The agent is the interaction layer: it may inspect, propose, modify and validate **underlying tracked files** with approved tools, then regenerate the Canvas. Do not add independent persisted UI state.
- Facts must be in version-controlled source records with relevant evidence/confidence before they can be displayed as confirmed. The Canvas must not substitute external information or hallucinations for absent repository data.
- Treat the plugin manifest and hooks as repository conventions. They are not automatically installed ChatGPT capabilities; invoke or integrate them explicitly in supported agent hosts.
- All tests and generated-Canvas checks belong in `.github/tests/` and native GitHub Actions. Preserve human review gates and data privacy.
