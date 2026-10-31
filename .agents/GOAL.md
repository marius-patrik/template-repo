# Goal

Maintain a reusable, well-governed GitHub repository template with source-controlled requirements, documented decisions, portable agent guidance and reproducible delivery.

Prototype **Canvas** as a single React/TypeScript application in `.github/app/` published on the repository's GitHub Pages. Its build-time snapshot must use allowlisted Git-tracked records without exposing secrets or inventing live agent execution. Browser-local workspace preferences may not become an alternative project source of truth.

The obsolete root HTML/Python Canvas implementation and the root DarkFactory Git submodule are not part of the target architecture. External DarkFactory workflow integration is independent of the submodule.

**Phase: prototyping (open).** Design approval and the transition beyond prototyping require the user's explicit decision; successful CI or Pages deployment does not imply approval.
