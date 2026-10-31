# Canvas Web — repository application

The first-class Canvas UI is authored in `.github/app`. A deterministic build step reads
only allowlisted, Git-tracked repository documents and generates `src/generated/context.json`;
this derived file is not edited manually. GitHub Actions compile a React application into
`.canvas-dist/index.html` and `canvas.html`, publishing the former as the repository's
GitHub Pages site. No browser fetch, backend, credential, or independent authoritative
project state is required.

Stack: Bun, TypeScript, React, Rsbuild, Wouter (hash routes), Tailwind CSS v4, shadcn-style
Radix primitives, Motion, lucide-animated, React Flow + Dagre, and Dockview.

Local commands from `.github/app`:

```sh
bun install
bun run dev
bun run typecheck
bun run build
```

Site publishing requires the repository administrator to configure
**Settings → Pages → Source: GitHub Actions**. No workflow can bypass missing
GitHub Pages authorization or organization policy.

**Privacy:** GitHub Pages is a public deployment for this repo. The builder uses an
explicit allowlist and does not publish raw private archives, credentials or all
repository files. Reusing the app in a private repo must involve a separate security
review, not automatically opt in to public publishing.

The existing `.agents/tools/canvas.py` CLI is retained temporarily as the historical
source inspector/exporter while CI validates the React replacement. Both are derived
views; tracked authoring records remain authoritative.
