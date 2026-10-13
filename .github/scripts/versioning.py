#!/usr/bin/env python3
"""Compute an immutable release tag from Git tags, or opt-in VERSION file."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TAG = re.compile(r"^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$")
VERSION = re.compile(r"^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$")


def parse_tag(tag: str) -> tuple[int, int, int] | None:
    match = TAG.fullmatch(tag)
    return tuple(map(int, match.groups())) if match else None


def choose_tag(
    mode: str,
    all_tags: list[str],
    head_tags: list[str],
    file_contents: str | None,
) -> str:
    """Resolve retries without moving a tag or reusing a tag on another commit."""
    if mode not in {"tags", "file"}:
        raise ValueError(f"Unsupported version mode: {mode}")
    if mode == "tags" and file_contents is not None:
        raise ValueError("Tag-only mode must not contain VERSION")
    if mode == "file" and (
        file_contents is None or not VERSION.fullmatch(file_contents.rstrip("\n")) or
        file_contents.count("\n") != 1 or not file_contents.endswith("\n")
    ):
        raise ValueError("File mode requires one strict major.minor.patch VERSION line")

    current = [tag for tag in head_tags if parse_tag(tag) is not None]
    if len(current) > 1:
        raise ValueError(f"Multiple SemVer tags on the release commit: {current}")
    if current:
        if mode == "file" and current[0] != f"v{file_contents.strip()}":
            raise ValueError(f"Current release tag disagrees with VERSION: {current[0]}")
        return current[0]

    parsed = [tag_version for tag in all_tags if (tag_version := parse_tag(tag)) is not None]
    if mode == "file":
        proposed = f"v{file_contents.strip()}"
        if parsed and parse_tag(proposed) <= max(parsed):
            raise ValueError(f"VERSION {proposed} does not exceed existing SemVer tags")
        return proposed

    if not parsed:
        return "v0.1.0"
    major, minor, patch = max(parsed)
    return f"v{major}.{minor}.{patch + 1}"


def git_lines(*args: str) -> list[str]:
    output = subprocess.run(
        ["git", *args], cwd=ROOT, capture_output=True, text=True, check=True
    )
    return [line.strip() for line in output.stdout.splitlines() if line.strip()]


def main() -> int:
    config = json.loads((ROOT / "repo.dfconfig").read_text(encoding="utf-8"))
    mode = config["repo"].get("versioning", {}).get("mode", "tags")
    version = ROOT / "VERSION"
    contents = version.read_text(encoding="utf-8") if version.is_file() else None
    tag = choose_tag(mode, git_lines("tag", "--list"), git_lines("tag", "--points-at", "HEAD"), contents)
    print(tag)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, KeyError, OSError, subprocess.CalledProcessError) as error:
        print(f"error: {error}", file=sys.stderr)
        sys.exit(1)
