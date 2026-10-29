"""Contract tests for a deterministic static Canvas."""
from __future__ import annotations
import importlib.util
from pathlib import Path
import unittest
ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("canvas", ROOT / ".agents/tools/canvas.py")
assert SPEC and SPEC.loader
canvas = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(canvas)
class CanvasTests(unittest.TestCase):
    def test_committed_snapshot(self):
        self.assertEqual((ROOT / "canvas.html").read_text(encoding="utf-8"), canvas.render(ROOT))
    def test_security_and_no_browser_state(self):
        html = canvas.render(ROOT)
        self.assertNotIn("<script", html)
        self.assertNotIn("localStorage", html)
        self.assertTrue(canvas.private(".env.local"))
        self.assertTrue(canvas.private("evidence/raw/document.pdf"))
        self.assertFalse(canvas.private("vehicle/profile.json"))
    def test_no_recursive_canvas(self):
        self.assertFalse(any(x[0] == "canvas.html" for x in canvas.files(ROOT)))
if __name__ == "__main__":
    unittest.main()
