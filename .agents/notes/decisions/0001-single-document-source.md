---
status: accepted
---
# One source per kind of knowledge

## Decision

Requests, decisions and rules are independently reviewable Markdown records with a `status` field in YAML-style front matter. Only `approved` requests, `accepted` decisions and `active` rules appear in generated documents. Files are assembled in lexical filename order.

Derived Markdown files are committed for easy discovery and GitHub rendering, but are not independently edited. A dependency-free generator produces them deterministically, and CI rejects stale outputs. Root human-facing entrypoints are real Git symlinks to the derived documents.

## Rationale

This prevents drift between duplicate READMEs, contribution guides, architecture summaries and approved requirements without requiring a specific language runtime beyond Python 3 for repository automation. Changes remain reviewable at the source-record level.

## Consequences

Editing a source record requires regeneration of its derived document in the same change. Draft or superseded records remain in place for history but are excluded from current projections.
