import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Rsbuild v2's inlineScripts places synchronous inline scripts in <head> even
// when html.inject = "body". Move only those pre-mount scripts after #root.
// Keep the deployed HTML deterministic and validate it separately.
const filename = resolve(process.argv[2] ?? "../../.canvas-dist/index.html");
const original = readFileSync(filename, "utf8");
const mount = original.search(/<div\s+id=["']root["'][^>]*>/i);
if (mount < 0) throw new Error("Canvas HTML is missing its root mount");
const moved = [];
const updated = original.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, (source, position) => {
  if (position >= mount) return source;
  const openTag = source.slice(0, source.indexOf(">") + 1);
  if (/\btype\s*=\s*["'](?:application\/(?:json|ld\+json)|importmap)["']/i.test(openTag))
    return source;
  moved.push(source);
  return "";
});
if (moved.length) {
  const endBody = updated.match(/<\/body\s*>/i);
  if (!endBody) throw new Error("Canvas HTML is missing </body>");
  const finalized = updated.replace(/<\/body\s*>/i, `${moved.join("\n")}\n</body>`);
  writeFileSync(filename, finalized, "utf8");
}
console.log(`Canvas finalized: ${moved.length} head script(s) moved after the mount`);
