#!/usr/bin/env python3
"""Generate a deterministic, stateless repository HTML snapshot from the Git index."""
from __future__ import annotations
import argparse
import html
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path

STYLE = "body{margin:0;background:#0d1117;color:#e6edf3;font:14px/1.55 system-ui,sans-serif}header{padding:28px max(20px,calc((100vw - 1200px)/2));background:#161b22;border-bottom:1px solid #30363d}h1{margin:0;font-size:26px}p,.meta{color:#98a6b5}main{max-width:1200px;margin:auto;padding:24px}nav{columns:3;margin:20px 0}nav a{display:block;color:#85b7f5;padding:3px;overflow-wrap:anywhere}section{margin:24px 0;border:1px solid #30363d;border-radius:10px;overflow:hidden}h2{background:#161b22;padding:13px 18px;font-size:15px;margin:0;overflow-wrap:anywhere}.kind{font:12px monospace;color:#98a6b5;padding:0 18px}pre{margin:0;padding:16px 18px;white-space:pre-wrap;overflow-wrap:anywhere;tab-size:2;font:12px/1.55 ui-monospace,monospace}@media(max-width:800px){nav{columns:1}main{padding:14px}}"
LIMIT = 400_000

def git(root: Path, *args: str) -> bytes:
    return subprocess.check_output(["git", *args], cwd=root, stderr=subprocess.PIPE)

def private(path: str) -> bool:
    s = "/" + path.lower() + "/"
    return any(x in s for x in ("/private/", "/secrets/", "/credentials/", "/evidence/raw/")) or "/.env" in path.lower() or path.lower().startswith(".env") or path.lower().endswith((".key", ".pem", ".p12", ".pfx"))

def files(root: Path) -> list[tuple[str, str, str, str]]:
    rows = []
    for line in git(root, "ls-files", "--stage", "-z").split(b"\0"):
        if not line: continue
        meta, name = line.split(b"\t", 1)
        mode, sha, stage = meta.decode("ascii").split(" ")
        path = name.decode("utf-8")
        if path == "canvas.html": continue
        if stage != "0": raise ValueError("Unresolved index: " + path)
        if mode == "160000":
            kind, content = "submodule", "Git submodule pinned to " + sha
        else:
            raw = git(root, "cat-file", "blob", sha)
            if private(path):
                kind, content = "redacted", "Sensitive file withheld; Git blob: " + sha
            elif mode == "120000":
                kind, content = "symlink", "Git symlink -> " + raw.decode("utf-8", "replace")
            elif len(raw) > LIMIT or b"\0" in raw:
                kind, content = "binary/large", f"Content not inlined ({len(raw)} bytes); Git blob: " + sha
            else:
                try: kind, content = "text", raw.decode("utf-8")
                except UnicodeDecodeError: kind, content = "binary", "Non-UTF8 content withheld; Git blob: " + sha
        rows.append((path, kind, sha, content))
    return sorted(rows)

def render(root: Path) -> str:
    rows, esc = files(root), html.escape
    name = esc(root.name)
    links = "".join(f'<a href="#f{i}">{esc(p)}</a>' for i, (p, _, _, _) in enumerate(rows))
    sections = "".join(f'<section id="f{i}"><h2>{esc(p)}</h2><p class="kind">{esc(k)} · {esc(s)}</p><pre>{esc(c)}</pre></section>' for i, (p, k, s, c) in enumerate(rows))
    return ('<!doctype html>\n<html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            f'<title>{name} | Repository Canvas</title><style>{STYLE}</style></head><body>'
            f'<header><p class="meta">STATELESS · READ-ONLY · GENERATED FROM GIT</p><h1>{name} Canvas</h1>'
            f'<p>{len(rows)} tracked entries. Agents edit source files and regenerate; no separate state or JavaScript.</p></header>'
            f'<main><nav aria-label="Repository files">{links}</nav>{sections}</main></body></html>\n')

class ToText(HTMLParser):
    def __init__(self): super().__init__(); self.parts = []; self.ignore = False
    def handle_starttag(self, tag, attrs):
        if tag == "style": self.ignore = True
        if tag in ("h1", "h2", "p", "pre"): self.parts.append("\n")
    def handle_endtag(self, tag):
        if tag == "style": self.ignore = False
        if tag in ("h1", "h2", "p", "pre"): self.parts.append("\n")
    def handle_data(self, data):
        if not self.ignore: self.parts.append(data)

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("command", choices=("write", "check", "context", "read", "search"))
    ap.add_argument("query", nargs="?")
    ap.add_argument("--limit", type=int, default=16000)
    a = ap.parse_args()
    root = Path(__file__).resolve().parents[2]
    target = root / "canvas.html"
    if a.command == "write":
        target.write_text(render(root), encoding="utf-8")
        print("Generated canvas.html")
        return 0
    if a.command in ("check", "context"):
        if not target.exists() or target.read_text(encoding="utf-8") != render(root):
            print("Stale Canvas; run python3 .agents/tools/canvas.py write", file=sys.stderr)
            return 1
        if a.command == "check": print("Canvas is current"); return 0
        p = ToText(); p.feed(target.read_text(encoding="utf-8"))
        print("".join(p.parts)[:max(0, a.limit)])
        return 0
    if not a.query: ap.error("read/search requires path/query")
    rows = files(root)
    if a.command == "read":
        r = next((x for x in rows if x[0] == a.query), None)
        if not r: print("Not a tracked path", file=sys.stderr); return 2
        print(r[3]); return 0
    hits = [p for p, _, _, c in rows if a.query.casefold() in (p + "\n" + c).casefold()]
    print("\n".join(hits[:max(0, a.limit)]))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
