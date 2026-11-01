---
status: published
---
# Overview

This repository is a reusable starting point for projects coordinated by human contributors and AI coding agents. It supplies source-controlled requirements, architecture decisions, operating rules, portable agent roles and skills, and a native GitHub delivery pipeline.

Its **only Canvas application** is the React workspace in `.github/app/`, currently in an **open prototyping phase**. GitHub Pages publishes the compiled application; its screens are a source-backed design prototype, not evidence of live autonomous agents or execution telemetry.

The public README introduces the repository; it is not a competing requirements document. Approved requests generate `.agents/PRD.md`, accepted decisions generate `.agents/ARCHITECTURE.md`, active rules generate `.agents/AGENTS.md`, and published notes generate `.agents/README.md`.

## Getting started

1. Describe the target project's goal in `.agents/GOAL.md` and approved requirements in `.agents/requests/`.
2. Record architecture choices in `.agents/decisions/`, and adjust `.agents/rules/` as needed.
3. Run `python3 .github/scripts/generate_documents.py --write` and `--check` to validate generated documentation.
4. For the Canvas prototype, enter `.github/app/`, run `bun install`, then `bun run dev`; use `bun run check` before proposing changes.
5. Keep prototyping open until its completion is explicitly approved; do not treat a successful build or deployment as design sign-off.
