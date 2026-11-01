/** Offline executable validation tests; browser suite tests the actual IDB engine separately. */
import { createRequire } from "node:module";
import { mkdtemp, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const app = join(root, ".github/app");
const ts = createRequire(join(app, "package.json"))("typescript");
const dest = await mkdtemp(join(tmpdir(), "c01-domain-"));
const tests = [];
async function run(name, fn) {
  try { await fn(); tests.push({ name, status: "PASS" }); console.log(`PASS ${name}`); }
  catch (e) { tests.push({ name, status: "FAIL" }); console.error(`FAIL ${name}: ${e.stack || e}`); }
}
try {
  await writeFile(join(dest, "package.json"), '{"type":"module"}');
  for (const relative of ["domain/types.ts", "domain/errors.ts", "persistence/validation.ts", "persistence/indexeddb.ts"]) {
    const input = await readFile(join(app, "src", relative), "utf8");
    const text = ts.transpileModule(input, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
      .replace(/(from\s+["'])(\.{1,2}\/[^"']+)(["'])/g, (_, a, b, c) => `${a}${b}.js${c}`);
    const path = join(dest, relative.replace(/\.ts$/, ".js")); await mkdir(dirname(path), { recursive: true }); await writeFile(path, text);
  }
  const v = await import(pathToFileURL(join(dest, "persistence/validation.js")));
  const e = await import(pathToFileURL(join(dest, "domain/errors.js")));
  const p = await import(pathToFileURL(join(dest, "persistence/indexeddb.js")));
  await run("UUID brands and factories", () => {
    for (const f of [v.newWorkspaceId, v.newPanelId, v.newDocumentId, v.newWindowId]) {
      const result = f(); assert.equal(result.ok, true); assert.match(result.value, /^[0-9a-f-]{36}$/);
    }
  });
  await run("Reject legacy profile id without UUID", () => {
    assert.equal(v.asWorkspaceId("global").error.code, "INVALID_INPUT");
    assert.equal(v.asPanelId("editor:1").error.code, "INVALID_INPUT");
  });
  await run("Revision monotonicity and limit", () => {
    assert.equal(v.asRevision(0).ok, true); assert.equal(v.nextRevision(0).value, 1);
    assert.equal(v.asRevision(-1).ok, false); assert.equal(v.nextRevision(Number.MAX_SAFE_INTEGER - 1).ok, false);
  });
  await run("Strict JSON rejects cycles, class instances and invalid numbers", () => {
    const cycle = {}; cycle.self = cycle;
    assert.equal(v.asJsonObject(cycle).ok, false);
    assert.equal(v.asJsonObject({ a: undefined }).ok, false);
    assert.equal(v.asJsonObject({ a: Infinity }).ok, false);
    assert.equal(v.asJsonObject({ a: new Date() }).ok, false);
    assert.equal(v.asJsonObject({ a: [1, 2, { b: null }] }).ok, true);
  });
  await run("Stored application-version mismatch typed", () => {
    const record = { id: "global", schemaVersion: 2, revision: 0, updatedAt: new Date().toISOString(), data: {} };
    assert.equal(v.validateGlobal(record).error.code, "UNSUPPORTED_SCHEMA");
  });
  await run("Corrupt stored record typed", () => {
    const record = { id: "global", schemaVersion: 3, revision: "zero", updatedAt: new Date().toISOString(), data: {} };
    assert.equal(v.validateGlobal(record).error.code, "CORRUPT_RECORD");
  });
  await run("Missing IndexedDB reports storage failure", async () => {
    const a = p.createCanvasPersistence({ indexedDB: { open() { throw new DOMException("denied", "SecurityError"); } } });
    const init = await a.initialize(); assert.equal(init.ok, false); assert.equal(init.error.code, "STORAGE_UNAVAILABLE");
    a.close(); assert.equal((await a.readGlobal()).error.code, "STORAGE_UNAVAILABLE");
  });
  await run("Quota DOMException is typed", () => {
    assert.equal(e.fromException(new DOMException("full", "QuotaExceededError")).code, "QUOTA_EXCEEDED");
  });
  await run("Absent IDB abort exception preserves TRANSACTION_ABORTED", () => {
    assert.equal(e.fromException(null, "TRANSACTION_ABORTED").code, "TRANSACTION_ABORTED");
  });
  await run("JSON accessors and symbol keys are rejected", () => {
    const secret = { get content() { throw new Error("getter executed"); } };
    assert.equal(v.asJsonObject(secret).error.code, "INVALID_INPUT");
    const sym = { [Symbol("hidden")]: "foo" };
    assert.equal(v.asJsonObject(sym).error.code, "INVALID_INPUT");
  });
  await run("Invalid migration state is rejected as corruption", () => {
    const entry = { id: "legacy:key", key: "key", backupId: "legacy:key", schemaVersion: 3,
      revision: 0, updatedAt: new Date().toISOString(), startedAt: new Date().toISOString(),
      status: "started", attempts: -5 };
    assert.equal(v.validateMigration(entry).error.code, "CORRUPT_RECORD");
  });
  await run("Migration completion cannot be a no-op", async () => {
    const a = p.createCanvasPersistence();
    assert.equal((await a.commit({ mutations: [], migration: { key: "foo", expectedRevision: 0 } })).error.code, "INVALID_INPUT");
    a.close();
  });
  await run("Invalid window identity fails at initialize", async () => {
    const a = p.createCanvasPersistence({ windowId: "window1" });
    assert.equal((await a.initialize()).error.code, "STORAGE_UNAVAILABLE"); a.close();
  });
  await run("Migration key validation rejects empty name", async () => {
    const a = p.createCanvasPersistence();
    assert.equal((await a.readMigration("")).error.code, "INVALID_INPUT");
    assert.equal((await a.readBackup("")).error.code, "INVALID_INPUT"); a.close();
  });
  await run("No silent no-op commit", async () => {
    const a = p.createCanvasPersistence();
    assert.equal((await a.commit({ mutations: [] })).error.code, "INVALID_INPUT"); a.close();
  });
} finally {
  await rm(dest, { recursive: true, force: true });
}
const failed = tests.filter((t) => t.status === "FAIL").length;
console.log(JSON.stringify({ passed: tests.length - failed, failed, tests }));
process.exitCode = failed ? 1 : 0;
