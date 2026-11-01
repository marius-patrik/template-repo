#!/bin/sh
set -eu
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
python3 .github/scripts/generate_documents.py --write
python3 .github/scripts/generate_documents.py --check
node .github/app/scripts/generate-context.mjs
printf 'Canvas context regenerated; run (cd .github/app && bun run check) before publication.\n'
