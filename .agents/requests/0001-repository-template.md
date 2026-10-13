---
status: approved
---
# Repository template requirements

## Purpose

Provide a minimal, technology-neutral GitHub repository template for work coordinated by humans and software agents. The template itself is infrastructure, not an application.

## Canonical workspace

- Keep `GOAL.md`, generated `PRD.md`, generated `ARCHITECTURE.md`, generated `AGENTS.md`, `PLAN.md`, `TODO.md` and `SCRATCHPAD.md` at the top of `.agents/`.
- Keep small working notes under `.agents/notes/`, approved requirements under `.agents/requests/`, accepted architectural decisions under `.agents/decisions/` and active rules under `.agents/rules/`.
- Keep reusable role descriptions in `.agents/agents/` and executable, runtime-agnostic guidance in `.agents/skills/<name>/SKILL.md`. A role is not a duplicate ruleset; a skill is a procedure, not automatically installed code.
- Generate `.agents/README.md` from published records in `.agents/notes/`, `.agents/PRD.md` from approved requests, `.agents/ARCHITECTURE.md` from accepted decisions, and `.agents/AGENTS.md` from active rules. Generated documents must never be edited as independent sources.
- Root `README.md` must be a Git symlink to `.agents/README.md`; root `CONTRIBUTING.md` must remain a Git symlink to `.agents/AGENTS.md`.
- Keep `.agents/TODO.md` as the non-generated task worklist; it is not a README source.

## Delivery

- Keep a machine-readable `VERSION` file and combined `repo.dfconfig` at root.
- Use a persistent `development` integration branch. Permit pull requests into `main` only when their source is the same repository's `development` branch.
- Bump the version once for each same-repository pull request, and tag and publish a GitHub Release after a change lands on `main`.
- Declare branch-protection policy, enforce review and checks when administrative access permits, and verify the live GitHub state rather than claiming a config file is enforcement.
- License the template under GPL-3.0.
- Do not install language-specific build tooling or pretend an empty template has application tests.
