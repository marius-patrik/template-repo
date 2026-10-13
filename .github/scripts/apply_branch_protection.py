#!/usr/bin/env python3
"""Apply the declared native GitHub main-branch protection using the maintainer's gh login.

Requires GitHub CLI authenticated as a repository administrator.
Dry-run by default; pass --apply to mutate GitHub. Requires no saved PAT or extra secrets.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "repo.dfconfig"
API_VERSION = "2026-03-10"


def declared_policy() -> tuple[str, str, dict]:
    """Read the canonical repository identity and exactly one main protection lane."""
    config = json.loads(CONFIG.read_text(encoding="utf-8"))["repo"]
    identity = config["identity"]
    repo = f'{identity["owner"]}/{identity["repo"]}'
    branch = identity["default_branch"]
    if branch != "main":
        raise ValueError(f"Refusing to protect unexpected default branch {branch!r}")
    lanes = [lane for lane in config["protection"]["lanes"] if lane["branch"] == branch]
    if len(lanes) != 1:
        raise ValueError("Expected exactly one declared protection lane for main")
    lane = lanes[0]
    checks = lane["required_checks"]
    if not isinstance(checks, list) or len(checks) < 2 or len(checks) != len(set(checks)):
        raise ValueError("Specify at least two unique required check names")
    payload = {
        "required_status_checks": {
            "strict": bool(lane["strict"]),
            "contexts": checks,
        },
        "enforce_admins": bool(lane["enforce_admins"]),
        "required_pull_request_reviews": {
            "required_approving_review_count": int(lane["approvals"]),
            "dismiss_stale_reviews": True,
            "require_code_owner_reviews": False,
        },
        "restrictions": None,
        "required_conversation_resolution": bool(lane["resolve_conversations"]),
        "allow_force_pushes": False,
        "allow_deletions": False,
    }
    if not 0 <= lane["approvals"] <= 6:
        raise ValueError("Invalid required approval count")
    return repo, branch, payload


def github_api(path: str, method: str = "GET", body: dict | None = None) -> dict:
    """Use the human's GitHub CLI identity; never read tokens into the script."""
    args = [
        "gh", "api", "-H", "Accept: application/vnd.github+json",
        "-H", f"X-GitHub-Api-Version: {API_VERSION}",
        "--method", method, path,
    ]
    if body is not None:
        args += ["--input", "-"]
    result = subprocess.run(
        args,
        input=json.dumps(body) if body is not None else None,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(f"GitHub API {method} {path} failed: {result.stderr.strip()}")
    return json.loads(result.stdout)


def matches(existing: dict, payload: dict) -> bool:
    """Require the desired checks, review and mutation restrictions to be present."""
    checks = existing.get("required_status_checks") or {}
    reviews = existing.get("required_pull_request_reviews") or {}
    admin = existing.get("enforce_admins") or {}
    resolution = existing.get("required_conversation_resolution") or {}
    force = existing.get("allow_force_pushes") or {}
    deletion = existing.get("allow_deletions") or {}
    actual_checks = {check["context"] for check in checks.get("checks", [])} | set(checks.get("contexts", []))
    return (
        checks.get("strict") is payload["required_status_checks"]["strict"]
        and set(payload["required_status_checks"]["contexts"]).issubset(actual_checks)
        and admin.get("enabled") is payload["enforce_admins"]
        and (reviews.get("required_approving_review_count") or 0)
        >= payload["required_pull_request_reviews"]["required_approving_review_count"]
        and resolution.get("enabled") is payload["required_conversation_resolution"]
        and force.get("enabled") is False
        and deletion.get("enabled") is False
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Apply native protection (default: dry run)")
    parser.add_argument(
        "--replace", action="store_true",
        help="Allow replacement of an existing nonconforming branch-protection policy",
    )
    options = parser.parse_args()

    repo, branch, payload = declared_policy()
    print(f"Target: {repo}, branch {branch}; source: repo.dfconfig")
    if not options.apply:
        print("DRY RUN: native protection will be set to:")
        print(json.dumps(payload, indent=2))
        print("\nUse --apply with a GitHub CLI identity holding Administration:write.")
        return 0

    if not shutil.which("gh"):
        raise RuntimeError("GitHub CLI (gh) is required. Install it and run gh auth login.")
    branch_data = github_api(f"repos/{repo}/branches/{branch}")
    github_api(f"repos/{repo}/branches/development")  # Must exist before sealing main.
    endpoint = f"repos/{repo}/branches/{branch}/protection"
    if branch_data.get("protected"):
        existing = github_api(endpoint)
        if matches(existing, payload):
            print("Existing native branch protection satisfies the declared policy.")
            return 0
        if not options.replace:
            raise RuntimeError("Existing protection differs. Review manually; use --apply --replace only if overwriting is intended.")
    print("WARNING: Required review approvals are enforced even for the repository owner.")
    print("You cannot approve your own PR. A second reviewer or bot-authored release PR is needed.")
    github_api(endpoint, method="PUT", body=payload)
    after = github_api(f"repos/{repo}/branches/{branch}")
    if not after.get("protected") or not matches(github_api(endpoint), payload):
        raise RuntimeError("GitHub did not confirm the requested native protection.")
    print(f"VERIFIED: {repo}/{branch} is protected with required checks and reviews.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (RuntimeError, ValueError, KeyError, OSError) as error:
        print(f"error: {error}", file=sys.stderr)
        sys.exit(1)
