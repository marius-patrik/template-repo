"""Behavior tests for native GitHub layout, independent docs, submodule, tests."""

from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / ".github" / "scripts"))
import generate_documents as generator


class WorkspaceLayoutTests(unittest.TestCase):
    def test_native_github_and_agents_dirs(self) -> None:
        for name in (".agents", ".github"):
            path = ROOT / name
            self.assertTrue(path.is_dir(), name)
            self.assertFalse(path.is_symlink(), name)
        for alias, target in (
            ("README.md", ".agents/README.md"),
            ("CONTRIBUTING.md", ".agents/AGENTS.md"),
        ):
            link = ROOT / alias
            self.assertTrue(link.is_symlink(), alias)
            self.assertEqual(link.readlink().as_posix(), target)

    def test_darkfactory_is_git_submodule(self) -> None:
        result = subprocess.run(
            ["git", "ls-files", "--stage", "--", ".darkfactory"],
            cwd=ROOT, capture_output=True, text=True, check=True,
        )
        self.assertRegex(result.stdout, r"^160000 [0-9a-f]{40} 0\t\.darkfactory\n$")
        self.assertIn("path = .darkfactory", (ROOT / ".gitmodules").read_text(encoding="utf-8"))

    def test_generated_documents_are_identical_to_approved_records(self) -> None:
        for directory, status, output, title in generator.PROJECTIONS:
            self.assertEqual(
                (generator.WORKSPACE / output).read_text(encoding="utf-8"),
                generator.content_for(directory, status, title),
                output,
            )

    def test_layout_check_passes(self) -> None:
        self.assertEqual(generator.validate_layout(), [])

    def test_unpublished_note_stays_out_of_readme(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            file = Path(tmp) / "draft.md"
            file.write_text("# Draft\n", encoding="utf-8")
            self.assertEqual(generator.parse_source(file, allow_plain_notes=True), (None, ""))
            with self.assertRaises(ValueError):
                generator.parse_source(file, allow_plain_notes=False)

    def test_generator_exits_successfully(self) -> None:
        r = subprocess.run(
            [sys.executable, str(ROOT / ".github/scripts/generate_documents.py"), "--check"],
            cwd=ROOT, text=True, capture_output=True, check=False,
        )
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_rejects_external_test_and_fixture_paths(self) -> None:
        fake = subprocess.CompletedProcess(
            args=["git", "ls-files", "-z"], returncode=0,
            stdout="package/tests/test_bad.py\0other/fixtures/data.json\0", stderr="",
        )
        with patch.object(generator.subprocess, "run", side_effect=lambda command, **kwargs:
                          fake if "-z" in command else subprocess.CompletedProcess(command, 0, stdout="160000 " + "a"*40 + " 0\t.darkfactory\n", stderr="")):
            errors = generator.validate_layout()
        self.assertTrue(any("package/tests/test_bad.py" in e for e in errors), errors)
        self.assertTrue(any("other/fixtures/data.json" in e for e in errors), errors)


if __name__ == "__main__":
    unittest.main()
