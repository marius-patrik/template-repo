---
status: accepted
---
# Canvas is a projection, not a second data store

Tracked repository contents own every durable fact. `canvas.html` is deterministically generated from the staged Git index, with HTML-escaped text and metadata for unsupported, binary, submodule, and sensitive files. It cannot contain unique records, browser state or JavaScript. Agent tools edit canonical files and re-render; portable hooks are opt-in.

This avoids drift between a UI-specific database and the repository. Generated Canvas is committed and verified just like generated Markdown. No platform session callback is asserted merely from the presence of local plugin files.
