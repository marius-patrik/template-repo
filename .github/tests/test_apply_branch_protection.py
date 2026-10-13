"""Tests for administrative branch-protection policy rendering and verification."""

from __future__ import annotations

import unittest
import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import apply_branch_protection as protection


class BranchProtectionTests(unittest.TestCase):
    def test_policy_is_derived_from_repository_config(self) -> None:
        repo, branch, payload = protection.declared_policy()
        self.assertEqual(repo, "marius-patrik/template-repo")
        self.assertEqual(branch, "main")
        self.assertEqual(set(payload["required_status_checks"]["contexts"]), {"main-source", "generated-docs"})
        self.assertTrue(payload["required_status_checks"]["strict"])
        self.assertTrue(payload["enforce_admins"])
        self.assertFalse(payload["allow_force_pushes"])
        self.assertFalse(payload["allow_deletions"])

    def test_missing_reviews_is_not_compliant(self) -> None:
        payload = protection.declared_policy()[2]
        existing = {
            "required_status_checks": {"strict": True, "contexts": ["main-source", "generated-docs"]},
            "enforce_admins": {"enabled": True},
            "required_pull_request_reviews": None,
            "required_conversation_resolution": {"enabled": True},
            "allow_force_pushes": {"enabled": False},
            "allow_deletions": {"enabled": False},
        }
        self.assertFalse(protection.matches(existing, payload))

    def test_exact_protection_is_compliant(self) -> None:
        payload = protection.declared_policy()[2]
        existing = {
            "required_status_checks": {
                "strict": True,
                "checks": [{"context": "main-source"}, {"context": "generated-docs"}],
            },
            "enforce_admins": {"enabled": True},
            "required_pull_request_reviews": {"required_approving_review_count": 1},
            "required_conversation_resolution": {"enabled": True},
            "allow_force_pushes": {"enabled": False},
            "allow_deletions": {"enabled": False},
        }
        self.assertTrue(protection.matches(existing, payload))

    def test_dry_run_does_not_call_github(self) -> None:
        with patch("sys.argv", ["apply_branch_protection.py"]), patch.object(
            protection, "github_api", side_effect=AssertionError("unexpected GitHub API call")
        ):
            self.assertEqual(protection.main(), 0)


if __name__ == "__main__":
    unittest.main()
