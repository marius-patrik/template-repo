"""Validate the build-time source contract without installing frontend packages."""
from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
APP = ROOT / ".github/app"
GENERATED = APP / "src/generated/context.json"

class CanvasWebTests(unittest.TestCase):
    def test_snapshot_uses_real_repository_documents(self):
        result = subprocess.run(
            ["node", str(APP / "scripts/generate-context.mjs")],
            cwd=ROOT, capture_output=True, text=True, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        snapshot = json.loads(GENERATED.read_text(encoding="utf8"))
        self.assertEqual(snapshot["schema"], 1)
        self.assertGreaterEqual(len(snapshot["documents"]), 3)
        self.assertEqual(snapshot["goal"], (ROOT / ".agents/GOAL.md").read_text(encoding="utf8"))
        self.assertEqual(
            snapshot["repository"], "marius-patrik/template-repo",
        )
        self.assertTrue(all(item["path"].startswith(".agents/") or
                            item["path"] == "AGENTS.md" for item in snapshot["documents"]))
        self.assertEqual(len(snapshot["paths"]), len(set(snapshot["paths"])))

    def test_publication_allowlist_never_publishes_archive_files(self):
        self.test_snapshot_uses_real_repository_documents()
        snapshot = json.loads(GENERATED.read_text(encoding="utf8"))
        for path in snapshot["paths"]:
            self.assertNotIn("/.env", path)
            self.assertNotIn("vehicle/", path)
            self.assertNotIn("evidence/", path)
            self.assertNotIn("private/", path)
        self.assertNotIn("api_key", json.dumps(snapshot["paths"]).lower())

    def test_reproducible_snapshot(self):
        self.test_snapshot_uses_real_repository_documents()
        before = GENERATED.read_bytes()
        subprocess.run(["node", str(APP / "scripts/generate-context.mjs")],
                       cwd=ROOT, capture_output=True, check=True)
        self.assertEqual(GENERATED.read_bytes(), before)

if __name__ == "__main__":
    unittest.main()
