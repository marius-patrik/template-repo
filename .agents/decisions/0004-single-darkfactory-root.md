---
status: accepted
---
# Native repository directories without a DarkFactory submodule

## Decision

Root `.agents/` and `.github/` are independent physical Git directories, not symlinks. `.agents/` owns project knowledge, records, role guidance and skills. `.github/` owns discoverable workflows, scripts, templates, the sole test directory `.github/tests/`, and the Canvas application `.github/app/`.

There is **no** root `.darkfactory` Git submodule or `.gitmodules`. Managed DarkFactory operations may use explicit external reusable GitHub Actions workflows, versioned artifacts and configuration without mirroring or pinning a local checkout.

## Rationale

GitHub workflow discovery requires a real `.github/workflows/` tree; symlinked root directories previously broke CI and release automation. A pinned submodule duplicated an external integration that already resolves its executable workflows and artifacts independently, adding checkout complexity without an application owner.

## Consequences

Do not reintroduce a DarkFactory gitlink, mirrored sources or duplicate test locations. Keep integration pins reviewable in their existing configuration/workflow contracts; removing the submodule does **not** disable the independent DarkFactory workflows. Verify that all paths use the real root directories.
