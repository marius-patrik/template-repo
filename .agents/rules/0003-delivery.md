---
status: active
---
# Planning and change delivery

- Translate the request into explicit acceptance criteria and a bounded plan before implementing. Keep `.agents/PLAN.md` and `.agents/TODO.md` aligned with actual progress.
- Prefer small, cohesive, independently verifiable changes. Delegate independent work only when boundaries and integration contracts are clear.
- Work from a dedicated branch; feature and fix pull requests target `development`. Only `development` may propose changes to `main`.
- Preserve human approval gates; never bypass a review or required check merely to unblock a merge.
- Describe actual changes, verification and remaining gaps precisely in the pull request. Keep unrelated discoveries visible as separate tracked work.
- Use focused conventional commits such as `feat(ui): add navigation` or `fix(core): handle cancellation`.
