import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" })
  .split("\0")
  .filter(Boolean)
  .sort();
const sourcePaths = [
  "AGENTS.md",
  ".agents/GOAL.md",
  ".agents/PRD.md",
  ".agents/ARCHITECTURE.md",
  ".agents/AGENTS.md",
  ".agents/README.md",
];
const read = (path) => {
  const target = join(root, path);
  return tracked.includes(path) && existsSync(target)
    ? readFileSync(target, "utf8").replace(/\r\n/g, "\n")
    : null;
};
const raw = read("repo.dfconfig");
let config = {};
if (raw) config = JSON.parse(raw);
const identity = config?.repo?.identity ?? {};
const docs = sourcePaths
  .map((path) => ({ path, content: read(path) }))
  .filter((doc) => doc.content !== null);
const snapshot = {
  schema: 1,
  repository: [identity.owner, identity.repo].filter(Boolean).join("/") || "Current repository",
  name: identity.display_name || identity.project_title || identity.repo || "Repository",
  branch: process.env.GITHUB_REF_NAME || "local",
  revision: execFileSync("git", ["rev-parse", "--short=12", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim(),
  goal: read(".agents/GOAL.md") ?? "No goal document available.",
  documents: docs,
  // Only publish structural paths from known, documentation-oriented directories.
  // Excludes private records, secret files and general source-code dumps.
  paths: tracked.filter((p) =>
    /^(\.agents\/(?:requests|decisions|notes|rules)\/[^/]+\.md|AGENTS\.md|repo\.dfconfig)$/.test(p),
  ),
  publication: "Curated repository-authored documentation. No live backend.",
};
const dest = join(root, ".github/app/src/generated/context.json");
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
console.log(
  "Generated Canvas source snapshot:",
  docs.length,
  "documents,",
  snapshot.paths.length,
  "source records",
);
