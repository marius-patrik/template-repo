---
status: accepted
---
# Agent roles and portable skills

## Decision

`.agents/agents/` contains lightweight role profiles (orchestrator, planner, implementer, reviewer and verifier), one Markdown document per role. A role describes authority, inputs, expected output and the handoff; it does not clone global rules.

`.agents/skills/<name>/SKILL.md` contains reusable, task-triggered procedures with standard `name` and `description` front matter. Skills cover repository orientation, requirements, architectural decisions, implementation verification, independent review, documentation generation and release checks.

All roles inherit the binding constraints of generated `.agents/AGENTS.md`. Host runtimes may consume these files directly or map them into their own agent/skill registries; placing them here does not imply that a specific runner automatically loads them.

## Rationale

Separating roles from procedures enables composition and provider portability. A planner can use the requirements and architecture skills; a verifier can run implementation and release checks without sharing an implementer's incentives.

## Consequences

A project may add or remove roles and skills based on actual needs. Keep them small, verifiable and grounded in the repository; do not add speculative personalities, redundant rule copies or vendor-specific tooling requirements.
