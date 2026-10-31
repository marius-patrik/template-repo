import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const filename = resolve(process.argv[2] ?? "../../.canvas-dist/index.html");
const html = readFileSync(filename, "utf8");
const root = html.search(/<div\s+id=["']root["'][^>]*>/i);
const body = html.search(/<body(?:\s[^>]*)?>/i);
const endBody = html.search(/<\/body\s*>/i);
const scripts = [...html.matchAll(/<script\b[^>]*>/gi)];

if (root < 0 || body < 0 || endBody < 0 || scripts.length === 0) {
  throw new Error("Canvas build is missing mount element, body or bundled scripts");
}
if (root < body || root > endBody) {
  throw new Error("Canvas mount element is outside the document body");
}
for (const script of scripts) {
  if (script.index < root || script.index > endBody) {
    throw new Error(`Canvas JavaScript executes before #root exists: ${script[0]}`);
  }
}
console.log(`Canvas DOM boot order valid: #root precedes ${scripts.length} bundled script(s).`);
