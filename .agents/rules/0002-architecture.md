---
status: active
---
# Architecture and ownership

- Assign one canonical owner to each capability, data model and state transition. Refactor the owner rather than creating competing implementations.
- Prefer simple, cohesive, discoverable modules with descriptive names over generic `utils` or `misc` files.
- Separate core mechanisms from project- or provider-specific policies; configure differences instead of duplicating entire subsystems.
- Avoid unrequested compatibility shims, legacy fallbacks and transitional production paths. Delete obsolete implementations only after verifying their consumers and state.
- Record a material architecture change as an accepted decision and update relevant approved requirements when scope changes.
