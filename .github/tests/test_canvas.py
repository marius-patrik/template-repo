"""Behavior checks for deterministic, repository-sourced Canvas."""
from __future__ import annotations
import importlib.util
import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("repository_canvas", ROOT / ".agents/tools/canvas.py")
assert SPEC is not None and SPEC.loader is not None
canvas = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = canvas
SPEC.loader.exec_module(canvas)


class CanvasTests(unittest.TestCase):
    def test_render_matches_committed_canvas(self):
        self.assertEqual((ROOT / "canvas.html").read_text(encoding="utf-8"), canvas.render(ROOT))

    def test_all_git_tracked_paths_included_except_canvas(self):
        entries = canvas.entries(ROOT)
        output = canvas.render(ROOT)
        self.assertNotIn("canvas.html", {p for p, _, _ in entries})
        self.assertIn(f"{len(entries)} source entries", output)
        for path, _, _ in entries:
            self.assertIn(canvas.html.escape(path, quote=True), output)

    def test_never_injects_runtime_network(self):
        output = canvas.render(ROOT)
        self.assertNotIn("<script", output)
        self.assertNotIn("<iframe", output)

    def test_generated_or_untracked_targets_cannot_be_modified(self):
        for path in ["canvas.html", "../outside.txt", ".agents/README.md", ".git/config"]:
            with self.assertRaises(ValueError):
                canvas.safe_target(path)

    def test_plugin_manifest_resolves_to_real_tools_and_skill(self):
        manifest = json.loads((ROOT / ".agents/plugin.json").read_text(encoding="utf-8"))
        self.assertEqual(manifest["authority"], "Git-tracked repository files only")
        for path in manifest["skills"] + list(manifest["hooks"].values()):
            self.assertTrue((ROOT / path).is_file(), path)

    def test_cli_check_succeeds(self):
        result = subprocess.run([sys.executable, ".agents/tools/canvas.py", "check"],
                                cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
