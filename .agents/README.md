# Agent workspace

This directory holds project-level guidance, planning, and the source material for generated documents. It is independent of the code ecosystem.

| File or directory | Role |
| --- | --- |
| `AGENTS.md` | Generated rules for agents and contributors; do not edit directly. |
| `PLAN.md` | Execution plan and verification gates. |
| `SCRATCHPAD.md` | Temporary notes, never normative. |
| `notes/GOAL.md` | Durable project goal and success criteria. |
| `notes/TODO.md` | Small actionable items. |
| `notes/requests/` | Approved requirement sources, generating `notes/PRD.md`. |
| `notes/decisions/` | Accepted architectural decisions, generating `notes/ARCHITECTURE.md`. |
| `notes/rules/` | Active development rules, generating `AGENTS.md`. |

To regenerate documents, run `python3 .github/scripts/generate_documents.py --write` from the repository root. CI checks the same outputs with `--check`. Change source files, not generated projections.

The root `README.md` links to `.agents/notes/PRD.md`. The root `CONTRIBUTING.md` links to `.agents/AGENTS.md`. Git symlinks are intentional.

## Complete the one-time GitHub protection bootstrap

The `main` branch must be protected in GitHub itself, not merely declared in `repo.dfconfig`. This privileged API action cannot be performed by the repository's regular GitHub Actions token or by an integration lacking `Administration: write`.

With GitHub CLI authenticated as a repository administrator, run:

```bash
python3 .github/scripts/apply_branch_protection.py  # preview
python3 .github/scripts/apply_branch_protection.py --apply
```

The script reads the protection lane from `repo.dfconfig` and verifies the applied GitHub state. It refuses to overwrite existing nonconforming protection unless explicitly passed `--apply --replace`. The policy requires one approving review, so a PR authored by the sole maintainer will need another eligible reviewer or a bot-authored PR. Do not report the protection requirement as complete until `main.protected` is true and the required checks are present.
