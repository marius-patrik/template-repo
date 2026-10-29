#!/usr/bin/env python3
"""Repository Canvas: a deterministic, read-only HTML projection of Git-tracked data.

The repository is the source of truth. This file is a repository-scoped agent tool,
not an automatically installed ChatGPT plugin or a remote-control service.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CANVAS = ROOT / "canvas.html"
TEMPLATE = ROOT / ".agents" / "canvas-template.html"
GENERATED = {"canvas.html", ".agents/README.md", ".agents/PRD.md",
             ".agents/ARCHITECTURE.md", ".agents/AGENTS.md"}
DETAILS = [
    ("make", "Make"), ("model", "Model"), ("generation", "Generation"),
    ("vin", "VIN"), ("registration_plate", "Registration"),
    ("model_year", "Model year"), ("first_registration", "First registration"),
    ("first_cz_registration", "Czech registration"),
    ("engine_code", "Engine code"), ("engine_displacement_cc", "Displacement (cc)"),
    ("engine_power_kw", "Power (kW)"), ("fuel", "Fuel"),
    ("emissions_class", "Emissions"), ("drivetrain", "Drivetrain"),
    ("transmission_family", "Transmission family"), ("transmission_code", "Gearbox code"),
    ("rear_differential_code", "Rear differential"),
    ("odometer_km", "Measured odometer (km)"),
    ("odometer_estimate_km", "Estimated odometer (km)"),
    ("stk_sticker_month", "STK sticker month"),
    ("stk_expiration_date", "Exact STK expiration"),
    ("factory_pr_codes", "Factory PR codes"),
    ("s_line_factory_trim", "Factory S line"),
]


def entries(root: Path = ROOT) -> list[tuple[str, str, str]]:
    result = subprocess.run(["git", "ls-files", "--stage", "-z"], cwd=root,
                            capture_output=True, check=True)
    parsed = []
    for item in result.stdout.split(b"\0"):
        if not item:
            continue
        meta, raw_path = item.split(b"\t", 1)
        mode, sha, stage = meta.decode("ascii").split()
        if stage != "0":
            raise ValueError("Unmerged index entry: " + os.fsdecode(raw_path))
        path = os.fsdecode(raw_path)
        if path != "canvas.html":
            parsed.append((path, mode, sha))
    return sorted(parsed)


def read_entry(root: Path, path: str, mode: str, sha: str) -> str:
    location = root / path
    if mode == "160000":
        return "Git submodule pinned commit: " + sha + "\n"
    if mode == "120000":
        return "Symbolic link to: " + os.readlink(location) + "\n"
    data = location.read_bytes()
    if b"\0" in data:
        return f"[Binary file; {len(data)} bytes; sha256 {hashlib.sha256(data).hexdigest()}]\n"
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return f"[Non-UTF-8 file; {len(data)} bytes; sha256 {hashlib.sha256(data).hexdigest()}]\n"


def snapshot(root: Path) -> tuple[str, str, str]:
    try:
        config = json.loads((root / "repo.dfconfig").read_text(encoding="utf-8"))
        title = config["repo"]["identity"]["project_title"]
    except (OSError, ValueError, KeyError, TypeError):
        title = root.name
    goal = ""
    try:
        lines = (root / ".agents/GOAL.md").read_text(encoding="utf-8").splitlines()
        goal = next((x.strip() for x in lines if x.strip() and not x.startswith("#")), "")
    except OSError:
        pass
    table = ""
    profile_file = root / "vehicle/profile.json"
    if profile_file.is_file():
        profile = json.loads(profile_file.read_text(encoding="utf-8"))["vehicle"]
        rows = []
        for key, label in DETAILS:
            if key not in profile:
                continue
            field = profile[key]
            value = field["value"]
            rendered = "Pending" if value is None else str(value)
            state = str(field["status"])
            rows.append('<tr><th>' + html.escape(label) + '</th><td>' +
                        html.escape(rendered) + '</td><td>' + html.escape(state) + '</td></tr>')
        table = '<section class="profile"><h2>Vehicle record</h2><p>Values and verification states are taken exclusively from the repository profile.</p><table><thead><tr><th>Field</th><th>Value</th><th>Evidence status</th></tr></thead><tbody>' + "".join(rows) + '</tbody></table></section>'
    return str(title), goal, table


def render(root: Path = ROOT) -> str:
    files = entries(root)
    index = []
    sections = []
    for number, (path, mode, sha) in enumerate(files, start=1):
        anchor = f"file-{number:04d}"
        safe_name = html.escape(path, quote=True)
        text = html.escape(read_entry(root, path, mode, sha), quote=True)
        index.append(f'<li><a href="#{anchor}">{safe_name}</a></li>')
        sections.append(f'<section class="file" id="{anchor}"><h3>{safe_name}</h3><p class="meta">Git mode {mode} · {sha}</p><pre>{text}</pre></section>')
    title, goal, profile = snapshot(root)
    template = (root / ".agents/canvas-template.html").read_text(encoding="utf-8")
    return (template.replace("{{TITLE}}", html.escape(title, quote=True))
            .replace("{{GOAL}}", html.escape(goal, quote=True))
            .replace("{{COUNT}}", str(len(files)))
            .replace("{{PROFILE}}", profile)
            .replace("{{INDEX}}", "\n".join(index))
            .replace("{{FILES}}", "\n".join(sections)))


def safe_target(raw: str) -> Path:
    path = Path(raw)
    if path.is_absolute() or ".." in path.parts or raw in GENERATED or raw.startswith(".git/"):
        raise ValueError("Refusing unsafe or generated path")
    tracked = {path for path, _, _ in entries()}
    if raw not in tracked:
        raise ValueError("Writes require an existing tracked source file")
    target = (ROOT / path).resolve()
    if not target.is_relative_to(ROOT.resolve()) or (ROOT / path).is_symlink():
        raise ValueError("Refusing symlink or out-of-repository write")
    return target


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["render", "check", "snapshot", "list", "read", "put"])
    parser.add_argument("path", nargs="?", help="Tracked source path for read/put")
    parser.add_argument("--input", help="Existing input file for put")
    args = parser.parse_args()
    if args.command == "list":
        print("\n".join(path for path, _, _ in entries()))
        return 0
    if args.command == "snapshot":
        title, goal, _ = snapshot(ROOT)
        print(f"# {title}\n\n{goal}\n\nCanvas: canvas.html")
        print(f"Git-tracked source entries: {len(entries())}; render before relying on HTML.")
        profile_file = ROOT / "vehicle/profile.json"
        if profile_file.is_file():
            data = json.loads(profile_file.read_text(encoding="utf-8"))["vehicle"]
            for key, label in DETAILS:
                if key in data:
                    value = data[key]["value"]
                    print(f"- {label}: {'pending' if value is None else value} [{data[key]['status']}]")
        return 0
    if args.command == "read":
        if not args.path:
            parser.error("read requires a tracked path")
        for path, mode, sha in entries():
            if path == args.path:
                print(read_entry(ROOT, path, mode, sha), end="")
                return 0
        parser.error("Path is not a tracked source file")
    if args.command == "put":
        if not args.path or not args.input:
            parser.error("put requires tracked path and --input")
        target = safe_target(args.path)
        payload = Path(args.input).read_bytes()
        target.write_bytes(payload)
        if args.path.startswith((".agents/notes/", ".agents/requests/",
                                ".agents/decisions/", ".agents/rules/")):
            subprocess.run([sys.executable, ".github/scripts/generate_documents.py", "--write"],
                           check=True, cwd=ROOT)
        CANVAS.write_text(render(), encoding="utf-8")
        print("Updated tracked source and regenerated canvas.html")
        return 0
    expected = render()
    if args.command == "render":
        CANVAS.write_text(expected, encoding="utf-8")
        print(f"Rendered canvas.html from {len(entries())} tracked source entries")
        return 0
    if not CANVAS.is_file() or CANVAS.read_text(encoding="utf-8") != expected:
        print("canvas.html is missing or stale; run python3 .agents/tools/canvas.py render", file=sys.stderr)
        return 1
    print("Canvas matches the current Git-tracked repository source.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
