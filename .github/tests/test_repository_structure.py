"""Behavior tests for the canonical DarkFactory tree and document projection."""

from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / ".darkfactory" / "github" / "scripts"))
import generate_documents as generator


class WorkspaceLayoutTests(unittest.TestCase):
    def test_directory_aliases_are_real_git_symlinks(self) -> None:
        for alias, expected in (
            (".agents", ".darkfactory/agents"),
            (".github", ".darkfactory/github"),
            ("README.md", ".agents/README.md"),
            ("CONTRIBUTING.md", ".agents/AGENTS.md"),
        ):
            link = ROOT / alias
            self.assertTrue(link.is_symlink(), alias)
            self.assertEqual(link.readlink().as_posix(), expected)
            self.assertTrue(link.exists(), alias)

    def test_generated_projections_equal_sources(self) -> None:
        for directory, status, output, heading in generator.PROJECTIONS:
            generated = (generator.WORKSPACE / output).read_text(encoding="utf-8")
            self.assertEqual(generated, generator.content_for(directory, status, heading))

    def test_layout_validation(self) -> None:
        self.assertEqual(generator.validate_layout(), [])

    def test_unpublished_notes_do_not_pollute_public_readme(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            draft = Path(temporary) / "private.md"
            draft.write_text("# Private work\n", encoding="utf-8")
            self.assertEqual(generator.parse_source(draft, allow_plain_notes=True), (None, ""))
            with self.assertRaises(ValueError):
                generator.parse_source(draft, allow_plain_notes=False)

    def test_generated_check_has_real_exit_status(self) -> None:
        result = subprocess.run(
            [sys.executable, str(ROOT / ".darkfactory/github/scripts/generate_documents.py"), "--check"],
            cwd=ROOT, capture_output=True, text=True, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_rejects_separate_test_directory(self) -> None:
        fake_output = subprocess.CompletedProcess(
            args=["git", "ls-files", "-z"], returncode=0,
            stdout="other/tests/test_elsewhere.py\0other/fixtures/data.json\0", stderr="",
        )
        with patch.object(generator.subprocess, "run", return_value=fake_output):
            errors = generator.validate_layout()
        self.assertTrue(any("other/tests/test_elsewhere.py" in error for error in errors))
        self.assertTrue(any("other/fixtures/data.json" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
