"""Behavioral tests of Git tag-only and optional file-driven versions."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / ".github" / "scripts"))
import versioning


class VersioningTests(unittest.TestCase):
    def test_tag_mode_starts_at_initial_patch(self) -> None:
        self.assertEqual(versioning.choose_tag("tags", [], [], None), "v0.1.0")

    def test_tag_mode_uses_highest_semver_not_lexicographic_order(self) -> None:
        self.assertEqual(
            versioning.choose_tag("tags", ["v0.1.9", "v0.1.10", "v0.2.0", "v0.1.200", "v1.0.0-rc1"], [], None),
            "v0.2.1",
        )

    def test_tag_mode_is_idempotent_for_existing_head_tag(self) -> None:
        self.assertEqual(
            versioning.choose_tag("tags", ["v0.1.9", "v0.1.10"], ["v0.1.10"], None),
            "v0.1.10",
        )

    def test_file_mode_uses_declared_version_if_ahead_of_tags(self) -> None:
        self.assertEqual(
            versioning.choose_tag("file", ["v0.1.9"], [], "0.1.10\n"), "v0.1.10"
        )

    def test_file_mode_rejects_stale_version(self) -> None:
        with self.assertRaises(ValueError):
            versioning.choose_tag("file", ["v0.1.10"], [], "0.1.10\n")

    def test_file_mode_rejects_wrong_tag_on_same_commit(self) -> None:
        with self.assertRaises(ValueError):
            versioning.choose_tag("file", ["v0.1.10"], ["v0.1.10"], "0.1.11\n")

    def test_tag_mode_disallows_version_file(self) -> None:
        with self.assertRaises(ValueError):
            versioning.choose_tag("tags", ["v0.1.9"], [], "0.1.10\n")

    def test_file_mode_requires_valid_single_line(self) -> None:
        for value in (None, "", "1.2.3", "1.2.3\n\n", "01.2.3\n", "1.2.3.4\n"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                versioning.choose_tag("file", [], [], value)

    def test_unrelated_tag_is_ignored(self) -> None:
        self.assertEqual(
            versioning.choose_tag("tags", ["feature-release", "v1.0.0-beta", "v0.1.9"], [], None),
            "v0.1.10",
        )


if __name__ == "__main__":
    unittest.main()
