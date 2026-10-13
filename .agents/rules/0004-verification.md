---
status: active
---
# Verification and evidence

- Identify actual build, formatting, type-check, test and documentation commands from the repository, not assumptions.
- Verify the smallest relevant scope while developing, then all affected integration paths before reporting completion.
- Add or update behavioral tests for implementation changes. If tests are absent, state that limitation and do not substitute compilation for behavioral evidence.
- For UI or deployed behavior, confirm the real interaction or runtime result; passing unit tests alone cannot prove a working interface.
- Do not weaken quality gates, manufacture passing results or ignore failing checks. Surface and fix defects with reproducible evidence.
- Before merging, revalidate against the current integration branch and inspect the final diff for unintended files.
