---
status: published
---
# Overview

This repository is a technology-neutral starting point for projects coordinated by human contributors and AI coding agents. It supplies source-controlled product intent, architectural decisions, agent operating rules, reusable roles and procedures, and a minimal GitHub delivery pipeline. **It is a template, not an implemented application.**

The public README is an overview of the repository and onboarding process, **not** the product requirements document. Requirements are authored in `.agents/requests/` and compiled into `.agents/PRD.md`; architecture is authored in `.agents/decisions/` and compiled into `.agents/ARCHITECTURE.md`.

## Getting started

1. Replace the starter goal in `.agents/GOAL.md` with a specific outcome and measurable acceptance criteria.
2. Add an approved request to `.agents/requests/` and accepted architectural choices to `.agents/decisions/`.
3. Adjust `.agents/rules/` for project-specific conventions, then select the relevant role and skill instructions.
4. Regenerate committed docs: `python3 .github/scripts/generate_documents.py --write`.
5. Verify: `python3 .github/scripts/generate_documents.py --check`, then the project's own build/test commands when an application exists.
