---
status: published
---
# GitHub administration

The live `main` protection requirement is tracked separately from the repository declaration. A configuration file alone does not protect a GitHub branch. Using a GitHub CLI login that has repository administration privileges, apply and verify the policy:

```bash
python3 .github/scripts/apply_branch_protection.py
python3 .github/scripts/apply_branch_protection.py --apply
```

The script reads `repo.dfconfig` and refuses unapproved replacement of existing divergent protection. Until GitHub reports `main.protected = true`, do not claim enforcement is complete. Native review settings may require an eligible reviewer other than the PR author.
