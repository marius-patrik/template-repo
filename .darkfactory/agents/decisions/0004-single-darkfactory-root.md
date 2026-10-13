---
status: accepted
---
# Single DarkFactory working tree and test ownership

## Decision

All repository coordination assets live under the physical `.darkfactory/` root:

- `.darkfactory/agents/` owns project requirements, decisions, rules, role profiles, skills, notes and generated documentation.
- `.darkfactory/github/` owns GitHub pull-request templates, workflows and administration scripts.
- `.darkfactory/tests/` is the **only** place to store tests of any type, including unit, integration, functional, smoke, end-to-end, snapshot tests, mocks, fixtures and test helpers.
- Root `.agents` and `.github` must be Git symlinks to `.darkfactory/agents` and `.darkfactory/github` respectively. Root `README.md` and `CONTRIBUTING.md` continue to reference the `.agents` alias.

No duplicate copies, test directories outside `.darkfactory/tests/`, or separate actual `.agents` / `.github` trees are allowed. The generator enforces symlink targets and audits tracked test locations.

## Trade-off and activation boundary

GitHub expects executable workflow files physically discoverable under root `.github/workflows/`. GitHub Actions has not established reliable support for a symlinked root `.github` directory. This structural decision prioritizes a canonical `.darkfactory` tree; workflow definitions under `.darkfactory/github/workflows/` **must not be claimed as active** until live event triggers prove discovery. No workflow, version-bump, branch-source policy or release action should be marked operational based only on the files' presence.

Restoring GitHub-native automation requires a separately approved, GitHub-supported activation arrangement. Do not silently reverse the symlink requirement or manufacture passing CI results.

## Consequences

Tooling resolves its workspace by the physical location of `.darkfactory/`, while conventional root aliases remain available to humans and local tools. Tests run from `.darkfactory/tests/`; test code elsewhere is a repository-layout violation.
