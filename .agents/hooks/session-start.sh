#!/bin/sh
set -eu
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
printf 'Repository: %s\n' "$(git remote get-url origin 2>/dev/null || pwd)"
printf 'Revision: %s\n' "$(git rev-parse --short HEAD)"
printf 'Branch: %s\n' "$(git branch --show-current)"
git status --short
printf '\nCanvas source: .github/app/\nCanonical records: .agents/\n'
