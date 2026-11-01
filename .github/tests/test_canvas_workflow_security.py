"""Regression tests for Canvas and DarkFactory GitHub Actions security boundaries.

Evaluate event/job expressions and permissions, rather than searching YAML text
for a supposedly safe condition that might never actually guard a job.
"""
from __future__ import annotations

import ast
import fnmatch
import re
import unittest
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
WORKFLOWS = ROOT / ".github" / "workflows"


def workflow(name: str) -> dict:
    # YAML 1.1 SafeLoader converts the GitHub 'on' key into boolean True.
    document = yaml.load((WORKFLOWS / name).read_text(encoding="utf-8"), Loader=yaml.BaseLoader)
    assert isinstance(document, dict), name
    return document


def event_matches(doc: dict, event: str, ref: str, base: str = "") -> bool:
    triggers = doc.get("on", {})
    if event not in triggers:
        return False
    settings = triggers[event] or {}
    branches = settings.get("branches") if isinstance(settings, dict) else None
    if branches:
        branch = base if event == "pull_request" else ref.removeprefix("refs/heads/")
        if not any(fnmatch.fnmatchcase(branch, pattern) for pattern in branches):
            return False
    # Path filters are not part of the security guarantee; every eligible
    # trigger must be safe even if a matching source path changes.
    return True


REFERENCE = re.compile(r"\b(?:github|inputs|needs)(?:\.[A-Za-z_][A-Za-z0-9_-]*)+")


def active(condition: str | None, **context: str) -> bool:
    """Evaluate the supported GitHub job expression subset; reject unknowns."""
    if not condition:
        return True
    expression = str(condition).strip()
    if expression.startswith(chr(36) + "{{") and expression.endswith("}}"):
        expression = expression[3:-2].strip()
    expression = expression.replace("always()", "True").replace("&&", " and ").replace("||", " or ")
    expression = re.sub(r"(?<![=!])!(?!=)", " not ", expression)

    def substitute(match: re.Match[str]) -> str:
        token = match.group(0)
        if token not in context:
            raise AssertionError(f"Unknown job condition reference: {token} in {condition}")
        return repr(context[token])

    tree = ast.parse(REFERENCE.sub(substitute, expression), mode="eval")

    def evaluate(node: ast.AST) -> object:
        if isinstance(node, ast.Expression):
            return evaluate(node.body)
        if isinstance(node, ast.Constant):
            return node.value
        if isinstance(node, ast.BoolOp):
            values = [bool(evaluate(v)) for v in node.values]
            if isinstance(node.op, ast.And):
                return all(values)
            if isinstance(node.op, ast.Or):
                return any(values)
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.Not):
            return not bool(evaluate(node.operand))
        if isinstance(node, ast.Compare) and len(node.ops) == 1:
            left, right = evaluate(node.left), evaluate(node.comparators[0])
            if isinstance(node.ops[0], ast.Eq):
                return left == right
            if isinstance(node.ops[0], ast.NotEq):
                return left != right
        raise AssertionError(f"Unsupported security condition: {condition}")

    return bool(evaluate(tree))


def grants_write(permissions: dict | None) -> bool:
    return bool(permissions) and any(level not in ("read", "none") for level in permissions.values())


class CanvasWorkflowSecurityTests(unittest.TestCase):
    def setUp(self) -> None:
        self.doc = workflow("canvas-pages.yml")
        self.job = self.doc["jobs"]["canvas-quality"]

    def test_event_matrix_checks_without_pages_publication(self) -> None:
        cases = [
            ("push", "refs/heads/feat/canvas-react-pages", "", True),
            ("push", "refs/heads/agent/canvas-release-security-foundation", "", True),
            ("push", "refs/heads/development", "", True),
            ("push", "refs/heads/main", "", True),
            ("pull_request", "refs/pull/58/merge", "development", True),
            ("pull_request", "refs/pull/59/merge", "main", True),
            ("workflow_dispatch", "refs/heads/development", "", True),
            ("workflow_dispatch", "refs/heads/feat/canvas-react-pages", "", False),
            ("workflow_dispatch", "refs/heads/main", "", False),
        ]
        for event, ref, base, expected in cases:
            with self.subTest(event=event, ref=ref, base=base):
                enabled = event_matches(self.doc, event, ref, base) and active(
                    self.job.get("if"), **{"github.event_name": event, "github.ref": ref}
                )
                self.assertEqual(enabled, expected)
                self.assertFalse(grants_write(self.doc.get("permissions")))
                if enabled:
                    self.assertFalse(grants_write(self.job.get("permissions")))

    def test_no_pages_publisher_or_privileged_job(self) -> None:
        self.assertEqual(set(self.doc["jobs"]), {"canvas-quality"})
        for job in self.doc["jobs"].values():
            self.assertNotIn("environment", job)
            self.assertFalse(grants_write(job.get("permissions")))
            for step in job.get("steps", []):
                action = step.get("uses", "")
                self.assertNotIn("deploy-pages", action)
                self.assertNotIn("upload-pages-artifact", action)
                self.assertNotIn("configure-pages", action)
                self.assertNotRegex(step.get("run", ""), r"(?:gh\s+api\s+.*pages|deploy-pages)")
        self.assertNotIn("pull_request_target", self.doc["on"])
        self.assertNotIn("workflow_run", self.doc["on"])

    def test_acceptance_and_pr_preview_artifact(self) -> None:
        steps = self.job["steps"]
        scripts = "\n".join(s.get("run", "") for s in steps)
        for command in (
            "unittest discover", "bun install --frozen-lockfile", "bun run context",
            "bun run typecheck", "bun run lint", "bun run format:check",
            "bun run build", "verify-build.mjs", "smoke_canvas.mjs",
        ):
            self.assertIn(command, scripts)
        self.assertTrue(any("setup-bun" in s.get("uses", "") for s in steps))
        uploads = [s for s in steps if "actions/upload-artifact@" in s.get("uses", "")]
        self.assertEqual(len(uploads), 1)
        self.assertEqual(uploads[0].get("if"), "github.event_name == 'pull_request'")
        self.assertEqual(uploads[0]["with"]["include-hidden-files"], "true")
        self.assertEqual(uploads[0]["with"]["path"], ".canvas-dist/")
        self.assertTrue(active(uploads[0]["if"], **{"github.event_name": "pull_request"}))
        self.assertFalse(active(uploads[0]["if"], **{"github.event_name": "push"}))


class DarkFactoryPrivilegeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.caller = workflow("darkfactory.yml")
        self.called = workflow("darkfactory-control.yml")

    @staticmethod
    def ctx(event: str, mode: str) -> dict:
        return {
            "github.event_name": event,
            "inputs.mode": mode,
            "needs.detect.outputs.has-actions": "true",
        }

    def test_pr_and_quality_events_cannot_reach_write_permissions(self) -> None:
        self.assertFalse(grants_write(self.caller.get("permissions")))
        self.assertFalse(grants_write(self.called.get("permissions")))
        self.assertEqual(self.called["on"]["workflow_call"]["inputs"]["mode"]["required"], "true")
        for event in ("pull_request", "push", "workflow_dispatch"):
            selected = [
                (name, job) for name, job in self.caller["jobs"].items()
                if active(job.get("if"), **self.ctx(event, "quality"))
            ]
            self.assertEqual([name for name, _ in selected], ["governed-quality"])
            name, job = selected[0]
            self.assertEqual(job["with"]["mode"], "quality")
            self.assertFalse(grants_write(job.get("permissions")))
            self.assertNotIn("secrets", job)
            for called_name, called_job in self.called["jobs"].items():
                if active(called_job.get("if"), **self.ctx(event, "quality")):
                    self.assertFalse(grants_write(called_job.get("permissions")), called_name)
                    self.assertNotIn("secrets", called_job, called_name)
            for dangerous in ("agent", "approvals"):
                self.assertFalse(active(self.called["jobs"][dangerous].get("if"), **self.ctx(event, "quality")))

    def test_agent_and_approval_authorities_remain_event_scoped(self) -> None:
        cases = {
            "issues": {"governed-agent": "agent"},
            "issue_comment": {"governed-agent": "agent", "governed-approvals": "approvals"},
            "pull_request_review_comment": {"governed-agent": "agent"},
            "pull_request_review": {"governed-approvals": "approvals"},
        }
        for event, expected in cases.items():
            selected = {
                name: job["with"]["mode"] for name, job in self.caller["jobs"].items()
                if active(job.get("if"), **self.ctx(event, "quality"))
            }
            self.assertEqual(selected, expected, event)
            for mode in selected.values():
                enabled = {
                    name for name, job in self.called["jobs"].items()
                    if active(job.get("if"), **self.ctx(event, mode))
                }
                self.assertEqual(enabled, {mode}, (event, mode))
        self.assertNotIn("actions", self.caller["jobs"]["governed-approvals"]["permissions"])
        self.assertNotIn("actions", self.called["jobs"]["approvals"]["permissions"])

    def test_reusable_jobs_have_explicit_permissions(self) -> None:
        for name, job in self.called["jobs"].items():
            self.assertIn("permissions", job, name)
            if name not in ("agent", "approvals"):
                self.assertFalse(grants_write(job["permissions"]), name)
        self.assertEqual(self.called["jobs"]["quality"]["name"], "released-df-quality")
        self.assertEqual(self.called["jobs"]["issue-binding"]["with"]["pipeline-repo"], "marius-patrik/DarkFactory")


if __name__ == "__main__":
    unittest.main()
