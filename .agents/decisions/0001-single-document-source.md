---
status: accepted
---
# One source per kind of knowledge

## Decision

Four kinds of individually reviewable Markdown source records drive the four human-facing generated documents:

| Source records | Eligible status | Generated artifact |
| --- | --- | --- |
| `.agents/notes/*.md` | `published` | `.agents/README.md` |
| `.agents/requests/*.md` | `approved` | `.agents/PRD.md` |
| `.agents/decisions/*.md` | `accepted` | `.agents/ARCHITECTURE.md` |
| `.agents/rules/*.md` | `active` | `.agents/AGENTS.md` |

All selected records require YAML-style front matter containing `status`. Unpublished notes do not contribute to README; `.agents/TODO.md` is a separate, non-generated task file. Other source directories reject files without status rather than silently hiding them. Records assemble in lexical filename order with source backlinks relative to the generated document.

Derived Markdown is committed for review and GitHub rendering, but is not edited independently. A dependency-free Python generator writes it deterministically, and CI rejects stale outputs using normal GitHub Actions workflow discovery. Root `README.md` and `CONTRIBUTING.md` are Git symlinks to `.agents/README.md` and `.agents/AGENTS.md` respectively; `.agents/` and `.github/` themselves are real directories.

## Rationale

Separating the public project overview from normative requirements prevents the README from becoming an accidental competing PRD. Flat source folders avoid unnecessary nesting; clear ownership eliminates duplicated content and stale symlinks.

## Consequences

Edit records and regenerate the derived documents in the same change. Draft, rejected and superseded records remain in history but do not appear as current specifications. Public notes are not authoritative product requirements; requirements are owned by requests.
