#!/bin/sh
set -eu
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
python3 .github/scripts/generate_documents.py --write
python3 .agents/tools/canvas.py render
python3 .github/scripts/generate_documents.py --check
python3 .agents/tools/canvas.py check
