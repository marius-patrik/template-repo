/** Native Chromium/IndexedDB verification. Run `node .github/tests/persistence/canvas-persistence.mjs`. */
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { mkdtemp, rm, writeFile, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const app = resolve(root, ".github/app");
const appRequire = createRequire(join(app, "package.json"));
const ts = appRequire("typescript");
const { chromium } = appRequire("playwright");
const temp = await mkdtemp(join(tmpdir(), "canvas-c01-"));
const source = join(app, "src");
const files = ["domain/types.ts", "domain/errors.ts", "persistence/validation.ts", "persistence/indexeddb.ts", "persistence/index.ts"];
for (const path of files) {
  const src = await readFile(join(source, path), "utf8");
  const output = ts.transpileModule(src, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, strict: true,
  }, fileName: path }).outputText.replace(/(from\s+["']|import\s*\(["'])(\.{1,2}\/[^"']+)(["'])/g,
    (_match, a, b, c) => `${a}${b}.js${c}`);
  const target = join(temp, path.replace(/\.ts$/, ".js"));
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, output);
}
await writeFile(join(temp, "index.html"), "<!doctype html><meta charset=utf-8><title>C01 Browser Tests</title>");
const server = createServer(async (req, res) => {
  const path = (req.url ?? "/").replace(/^\//, "") || "index.html";
  if (!/^(index\.html|(domain|persistence)\/[a-z-]+\.js)$/.test(path)) { res.writeHead(404); res.end(); return; }
  try {
    const body = await readFile(join(temp, path));
    res.writeHead(200, { "content-type": path.endsWith(".js") ? "text/javascript" : "text/html", "cache-control": "no-store" });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
let passed = 0;
let failed = 0;
const cases = [];
const unique = () => `canvas:c01:test:${crypto.randomUUID()}`;
const assert = (condition, message) => { if (!condition) throw new Error(message); };
async function test(name, fn) {
  try { await fn(); passed++; cases.push({ name, status: "PASS" }); console.log(`PASS ${name}`); }
  catch (error) { failed++; cases.push({ name, status: "FAIL", error: String(error) }); console.error(`FAIL ${name}: ${error.stack ?? error}`); }
}
const inBrowser = (page, f, arg) => page.evaluate(f, arg);
try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.CANVAS_TEST_CHROMIUM || undefined });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(origin);
  await page.evaluate(async () => { window.C01 = await import("/persistence/index.js"); });

  await test("Initialization, required stores and indexes", async () => {
    const name = unique();
    const result = await inBrowser(page, async (name) => {
      const a = new window.C01.CanvasPersistence({ databaseName: name });
      const init = await a.initialize();
      const global = await a.readGlobal();
      const db = await new Promise((resolve, reject) => { const r = indexedDB.open(name, 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
      const stores = Array.from(db.objectStoreNames);
      const indexes = Array.from(db.transaction("documents").objectStore("documents").indexNames);
      db.close(); a.close();
      return { init, global, stores, indexes };
    }, name);
    assert(result.init.ok && result.global.ok && result.global.value.revision === 0, JSON.stringify(result));
    assert(["global", "workspaces", "documents", "migration", "backups"].every((n) => result.stores.includes(n)), JSON.stringify(result.stores));
    assert(result.indexes.includes("byWorkspace"), "Missing workspace index");
  });

  await test("Global revision CAS and increments", async () => {
    const result = await inBrowser(page, async (name) => {
      const a = new window.C01.CanvasPersistence({ databaseName: name }); await a.initialize();
      const first = await a.commit({ mutations: [{ kind: "putGlobal", expectedRevision: 0, data: { counter: 1 } }] });
      const stale = await a.commit({ mutations: [{ kind: "putGlobal", expectedRevision: 0, data: { counter: 99 } }] });
      const global = await a.readGlobal(); a.close(); return { first, stale, global };
    }, unique());
    assert(result.first.ok && !result.stale.ok && result.stale.error.code === "CONFLICT", JSON.stringify(result));
    assert(result.global.value.revision === 1 && result.global.value.data.counter === 1, JSON.stringify(result));
  });

  await test("Atomic workspace plus documents commit", async () => {
    const result = await inBrowser(page, async (name) => {
      const c = window.C01; const a = new c.CanvasPersistence({ databaseName: name }); await a.initialize();
      const ws = c.newWorkspaceId().value, doc1 = c.newDocumentId().value, doc2 = c.newDocumentId().value;
      const write = await a.commit({ mutations: [
        { kind: "createDocument", id: doc1, workspaceId: ws, expectedRevision: null, data: { text: "1" } },
        { kind: "createWorkspace", id: ws, expectedRevision: null, data: { title: "A" } },
        { kind: "createDocument", id: doc2, workspaceId: ws, expectedRevision: null, data: { text: "2" } },
      ] });
      const docs = await a.readDocuments(ws); const workspace = await a.readWorkspace(ws);
      a.close(); return { write, docs, workspace };
    }, unique());
    assert(result.write.ok && result.write.value.changed.length === 3, JSON.stringify(result));
    assert(result.docs.ok && result.docs.value.length === 2 && result.workspace.value.data.title === "A", JSON.stringify(result));
  });

  await test("Abort rolls back other mutations", async () => {
    const result = await inBrowser(page, async (name) => {
      const c = window.C01; const a = new c.CanvasPersistence({ databaseName: name }); await a.initialize();
      const wrongParent = c.newWorkspaceId().value;
      const result = await a.commit({ mutations: [
        { kind: "putGlobal", expectedRevision: 0, data: { bad: true } },
        { kind: "createDocument", id: c.newDocumentId().value, workspaceId: wrongParent, expectedRevision: null, data: { bad: true } },
      ] });
      const global = await a.readGlobal(); a.close(); return { result, global };
    }, unique());
    assert(!result.result.ok && result.result.error.code === "NOT_FOUND", JSON.stringify(result));
    assert(result.global.ok && result.global.value.revision === 0, "Global write leaked from aborted transaction");
  });

  await test("Concurrent same-record writers: exactly one winner", async () => {
    const result = await inBrowser(page, async (name) => {
      const c = window.C01;
      const a = new c.CanvasPersistence({ databaseName: name });
      const b = new c.CanvasPersistence({ databaseName: name });
      await Promise.all([a.initialize(), b.initialize()]);
      const [x, y] = await Promise.all([
        a.commit({ mutations: [{ kind: "putGlobal", expectedRevision: 0, data: { source: "a" } }] }),
        b.commit({ mutations: [{ kind: "putGlobal", expectedRevision: 0, data: { source: "b" } }] }),
      ]);
      const record = await b.readGlobal(); a.close(); b.close(); return { x, y, record };
    }, unique());
    assert([result.x, result.y].filter((r) => r.ok).length === 1, JSON.stringify(result));
    assert([result.x, result.y].filter((r) => !r.ok)[0].error.code === "CONFLICT", JSON.stringify(result));
    assert(result.record.value.revision === 1, JSON.stringify(result));
  });

  await test("Independent document record transactions", async () => {
    const result = await inBrowser(page, async (name) => {
      const c = window.C01; const a = new c.CanvasPersistence({ databaseName: name });
      const b = new c.CanvasPersistence({ databaseName: name }); await Promise.all([a.initialize(), b.initialize()]);
      const ws = c.newWorkspaceId().value, id1 = c.newDocumentId().value, id2 = c.newDocumentId().value;
      await a.commit({ mutations: [
        { kind: "createWorkspace", id: ws, expectedRevision: null, data: {} },
        { kind: "createDocument", id: id1, workspaceId: ws, expectedRevision: null, data: { n: 1 } },
        { kind: "createDocument", id: id2, workspaceId: ws, expectedRevision: null, data: { n: 2 } },
      ] });
      const [x, y] = await Promise.all([
        a.commit({ mutations: [{ kind: "updateDocument", id: id1, workspaceId: ws, expectedRevision: 0, data: { n: 10 } }] }),
        b.commit({ mutations: [{ kind: "updateDocument", id: id2, workspaceId: ws, expectedRevision: 0, data: { n: 20 } }] }),
      ]);
      const docs = await a.readDocuments(ws); a.close(); b.close(); return { x, y, docs };
    }, unique());
    assert(result.x.ok && result.y.ok, JSON.stringify(result));
    assert(result.docs.value.map((d) => d.data.n).sort().join() === "10,20", JSON.stringify(result));
  });

  await test("Stored corruption and schema mismatch are typed", async () => {
    const result = await inBrowser(page, async (name) => {
      const c = window.C01; const a = new c.CanvasPersistence({ databaseName: name }); await a.initialize();
      const ws = c.newWorkspaceId().value;
      await a.commit({ mutations: [{ kind: "createWorkspace", id: ws, expectedRevision: null, data: {} }] });
      const db = await new Promise((resolve) => { const r = indexedDB.open(name); r.onsuccess = () => resolve(r.result); });
      await new Promise((resolve, reject) => {
        const t = db.transaction("workspaces", "readwrite");
        t.objectStore("workspaces").put({ id: ws, revision: "bad", schemaVersion: 3, updatedAt: new Date().toISOString(), data: {} });
        t.oncomplete = resolve; t.onabort = reject;
      });
      const corrupt = await a.readWorkspace(ws);
      await new Promise((resolve, reject) => {
        const t = db.transaction("workspaces", "readwrite");
        t.objectStore("workspaces").put({ id: ws, revision: 0, schemaVersion: 99, updatedAt: new Date().toISOString(), data: {} });
        t.oncomplete = resolve; t.onabort = reject;
      });
      const unsupported = await a.readWorkspace(ws); db.close(); a.close(); return { corrupt, unsupported };
    }, unique());
    assert(!result.corrupt.ok && result.corrupt.error.code === "CORRUPT_RECORD", JSON.stringify(result));
    assert(!result.unsupported.ok && result.unsupported.error.code === "UNSUPPORTED_SCHEMA", JSON.stringify(result));
  });

  await test("Structural version higher than supported fails", async () => {
    const result = await inBrowser(page, async (name) => {
      const db = await new Promise((resolve, reject) => { const r = indexedDB.open(name, 2); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
      db.close(); const a = new window.C01.CanvasPersistence({ databaseName: name });
      const result = await a.initialize(); a.close(); return result;
    }, unique());
    assert(!result.ok && result.error.code === "UNSUPPORTED_SCHEMA", JSON.stringify(result));
  });

  await test("Migration raw backup, interruption and explicit resume", async () => {
    const key = `legacy:${crypto.randomUUID()}`;
    const result = await inBrowser(page, async ({ name, key }) => {
      const c = window.C01; localStorage.setItem(key, '{"profiles":[]}');
      const a = new c.CanvasPersistence({ databaseName: name }); await a.initialize();
      const raw = a.readLegacyValues([key]);
      const first = await a.beginLegacyMigration(key);
      const duplicate = await a.beginLegacyMigration(key);
      const backup = await a.readBackup(key);
      const resumed = await a.resumeLegacyMigration(key, first.value.revision);
      const imported = await a.commit({ mutations: [{ kind: "createWorkspace", id: c.newWorkspaceId().value, expectedRevision: null, data: { title: "Migrated" } }], migration: { key, expectedRevision: resumed.value.revision } });
      const repeat = await a.commit({ mutations: [{ kind: "createWorkspace", id: c.newWorkspaceId().value, expectedRevision: null, data: {} }], migration: { key, expectedRevision: resumed.value.revision } });
      const marker = await a.readMigration(key);
      localStorage.removeItem(key); a.close();
      return { raw, first, duplicate, backup, resumed, imported, repeat, marker };
    }, { name: unique(), key });
    assert(result.raw.value[0].raw === '{"profiles":[]}', JSON.stringify(result));
    assert(result.first.ok && !result.duplicate.ok && result.duplicate.error.code === "MIGRATION_FAILED", JSON.stringify(result));
    assert(result.backup.value.raw === '{"profiles":[]}' && result.resumed.value.revision === 1, JSON.stringify(result));
    assert(result.imported.ok && !result.repeat.ok && result.repeat.error.code === "CONFLICT", JSON.stringify(result));
    assert(result.marker.value.status === "imported", JSON.stringify(result));
  });

  await test("Migration failure state is indexed and explicitly recoverable", async () => {
    const key = `legacy:${crypto.randomUUID()}`;
    const result = await inBrowser(page, async ({ name, key }) => {
      const a = new window.C01.CanvasPersistence({ databaseName: name }); await a.initialize();
      localStorage.setItem(key, "{corrupt legacy material");
      const begun = await a.beginLegacyMigration(key);
      const failed = await a.markLegacyMigrationFailed(key, begun.value.revision);
      const pending = await a.listMigrations("failed");
      const restarted = await a.resumeLegacyMigration(key, failed.value.revision);
      const backup = await a.readBackup(key);
      localStorage.removeItem(key); a.close();
      return { begun, failed, pending, restarted, backup };
    }, { name: unique(), key });
    assert(result.begun.ok && result.failed.value.status === "failed", JSON.stringify(result));
    assert(result.pending.ok && result.pending.value.length === 1, JSON.stringify(result));
    assert(result.restarted.value.revision === 2 && result.backup.value.raw === "{corrupt legacy material", JSON.stringify(result));
  });

  await test("Legacy backup never overwritten by changed raw value", async () => {
    const key = `legacy:${crypto.randomUUID()}`;
    const result = await inBrowser(page, async ({ name, key }) => {
      const a = new window.C01.CanvasPersistence({ databaseName: name }); await a.initialize();
      localStorage.setItem(key, "original"); await a.beginLegacyMigration(key);
      localStorage.setItem(key, "changed"); const again = await a.beginLegacyMigration(key);
      const backup = await a.readBackup(key); localStorage.removeItem(key); a.close(); return { again, backup };
    }, { name: unique(), key });
    assert(!result.again.ok && result.again.error.code === "CONFLICT", JSON.stringify(result));
    assert(result.backup.value.raw === "original", JSON.stringify(result));
  });

  await test("Workspace deletion requires explicit child CAS and is atomic", async () => {
    const result = await inBrowser(page, async (name) => {
      const c = window.C01; const a = new c.CanvasPersistence({ databaseName: name }); await a.initialize();
      const ws = c.newWorkspaceId().value; const doc = c.newDocumentId().value;
      await a.commit({ mutations: [
        { kind: "createWorkspace", id: ws, expectedRevision: null, data: {} },
        { kind: "createDocument", id: doc, workspaceId: ws, expectedRevision: null, data: { saved: 1 } },
      ] });
      const refused = await a.commit({ mutations: [{ kind: "deleteWorkspace", id: ws, expectedRevision: 0 }] });
      const stillHere = await a.readWorkspace(ws);
      const deleted = await a.commit({ mutations: [
        { kind: "deleteWorkspace", id: ws, expectedRevision: 0 },
        { kind: "deleteDocument", id: doc, workspaceId: ws, expectedRevision: 0 },
      ] });
      const docs = await a.readDocuments(ws); const gone = await a.readWorkspace(ws);
      const reused = await a.commit({ mutations: [{ kind: "createWorkspace", id: ws, expectedRevision: null, data: {} }] });
      a.close(); return { refused, stillHere, deleted, docs, gone, reused };
    }, unique());
    assert(!result.refused.ok && result.refused.error.code === "INVALID_STATE", JSON.stringify(result));
    assert(result.stillHere.ok && result.stillHere.value.revision === 0, JSON.stringify(result));
    assert(result.deleted.ok && result.deleted.value.changed.length === 2, JSON.stringify(result));
    assert(result.docs.ok && result.docs.value.length === 0 && result.gone.value === null, JSON.stringify(result));
    assert(!result.reused.ok && result.reused.error.code === "ALREADY_EXISTS", JSON.stringify(result));
  });

  await test("Closed adapter and unavailable factory fail visibly", async () => {
    const result = await inBrowser(page, async (name) => {
      const c = window.C01; const a = new c.CanvasPersistence({ databaseName: name });
      await a.initialize(); a.close(); const closed = await a.readGlobal();
      const b = new c.CanvasPersistence({ databaseName: name + ":unavailable", indexedDB: { open() { throw new DOMException("disabled", "SecurityError"); } } });
      const unavailable = await b.initialize(); b.close(); return { closed, unavailable };
    }, unique());
    assert(!result.closed.ok && result.closed.error.code === "STORAGE_UNAVAILABLE", JSON.stringify(result));
    assert(!result.unavailable.ok && result.unavailable.error.code === "STORAGE_UNAVAILABLE", JSON.stringify(result));
  });

  await test("Cross-window invalidation carries IDs but not contents", async () => {
    const p2 = await page.context().newPage(); await p2.goto(origin);
    const name = unique();
    const result = await inBrowser(page, async (name) => {
      const a = new window.C01.CanvasPersistence({ databaseName: name }); await a.initialize();
      window.adapterA = a; return { ok: true };
    }, name);
    assert(result.ok, JSON.stringify(result));
    await p2.evaluate(async (name) => {
      const c = await import("/persistence/index.js");
      window.adapterB = new c.CanvasPersistence({ databaseName: name });
      await window.adapterB.initialize();
      window.received = [];
      window.adapterB.subscribeInvalidations((event) => window.received.push(event));
    }, name);
    const commit = await inBrowser(page, (n) => window.adapterA.commit({ mutations: [{ kind: "putGlobal", expectedRevision: 0, data: { secret: n } }] }), "never-broadcast-contents");
    assert(commit.ok, JSON.stringify(commit));
    await p2.waitForFunction(() => window.received?.length > 0);
    const state = await p2.evaluate(async () => ({ events: window.received, reread: await window.adapterB.readGlobal() }));
    assert(state.events.length > 0 && state.events[0].remote, JSON.stringify(state));
    assert(JSON.stringify(state.events).indexOf("never-broadcast-contents") === -1, JSON.stringify(state.events));
    assert(state.reread.value.data.secret === "never-broadcast-contents", JSON.stringify(state));
    await page.evaluate(() => { window.adapterA.close(); delete window.adapterA; });
    await p2.evaluate(() => window.adapterB.close()); await p2.close();
  });

  await test("Notification loss does not affect durable rereads", async () => {
    const result = await inBrowser(page, async (name) => {
      const c = window.C01;
      const a = new c.CanvasPersistence({ databaseName: name, broadcastChannelFactory: () => { throw new Error("disabled"); } });
      const b = new c.CanvasPersistence({ databaseName: name, broadcastChannelFactory: () => { throw new Error("disabled"); } });
      await Promise.all([a.initialize(), b.initialize()]);
      const committed = await a.commit({ mutations: [{ kind: "putGlobal", expectedRevision: 0, data: { synced: true } }] });
      const reread = await b.readGlobal(); a.close(); b.close(); return { committed, reread };
    }, unique());
    assert(result.committed.ok && result.reread.value.data.synced === true, JSON.stringify(result));
  });

  await test("Injected QuotaExceededError aborts a real IndexedDB transaction", async () => {
    const result = await inBrowser(page, async (name) => {
      const c = window.C01; const a = new c.CanvasPersistence({ databaseName: name }); await a.initialize();
      const original = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function(value, ...rest) {
        if (this.name === "global") throw new DOMException("simulated storage limit", "QuotaExceededError");
        return original.call(this, value, ...rest);
      };
      let failed;
      try { failed = await a.commit({ mutations: [{ kind: "putGlobal", expectedRevision: 0, data: { a: 1 } }] }); }
      finally { IDBObjectStore.prototype.put = original; }
      const global = await a.readGlobal(); a.close(); return { failed, global };
    }, unique());
    assert(!result.failed.ok && result.failed.error.code === "QUOTA_EXCEEDED", JSON.stringify(result));
    assert(result.global.value.revision === 0, JSON.stringify(result));
  });

  await test("Invalid inputs never write", async () => {
    const result = await inBrowser(page, async (name) => {
      const c = window.C01; const a = new c.CanvasPersistence({ databaseName: name }); await a.initialize();
      const wrong = await a.commit({ mutations: [{ kind: "createWorkspace", id: "study", expectedRevision: null, data: {} }] });
      const cyclic = {}; cyclic.self = cyclic;
      const noJson = await a.commit({ mutations: [{ kind: "putGlobal", expectedRevision: 0, data: cyclic }] });
      const global = await a.readGlobal(); a.close(); return { wrong, noJson, global };
    }, unique());
    assert(result.wrong.error.code === "INVALID_INPUT" && result.noJson.error.code === "INVALID_INPUT", JSON.stringify(result));
    assert(result.global.value.revision === 0, JSON.stringify(result));
  });

  await test("Durability after closing and reopening independent connection", async () => {
    const result = await inBrowser(page, async (name) => {
      const c = window.C01; const a = new c.CanvasPersistence({ databaseName: name }); await a.initialize();
      await a.commit({ mutations: [{ kind: "putGlobal", expectedRevision: 0, data: { persists: true } }] }); a.close();
      const b = new c.CanvasPersistence({ databaseName: name }); await b.initialize();
      const value = await b.readGlobal(); b.close(); return value;
    }, unique());
    assert(result.ok && result.value.data.persists === true, JSON.stringify(result));
  });

  await test("Unexpected synchronous IndexedDB get errors return typed Results", async () => {
    const result = await inBrowser(page, async (name) => {
      const c = window.C01; const a = new c.CanvasPersistence({ databaseName: name });
      await a.initialize();
      const original = IDBObjectStore.prototype.get;
      IDBObjectStore.prototype.get = function(...args) {
        if (this.name === "global") throw new DOMException("forced request failure", "InvalidStateError");
        return original.apply(this, args);
      };
      let read, write;
      try {
        read = await a.readGlobal();
        write = await a.commit({ mutations: [{ kind: "putGlobal", expectedRevision: 0, data: { shouldNotWrite: 1 } }] });
      } finally {
        IDBObjectStore.prototype.get = original;
      }
      const after = await a.readGlobal(); a.close(); return { read, write, after };
    }, unique());
    assert(!result.read.ok && result.read.error.code === "STORAGE_UNAVAILABLE", JSON.stringify(result));
    assert(!result.write.ok && result.write.error.code === "STORAGE_UNAVAILABLE", JSON.stringify(result));
    assert(result.after.ok && result.after.value.revision === 0, JSON.stringify(result));
  });

  await test("Global initialization aborts safely on synchronous put failure", async () => {
    const result = await inBrowser(page, async (name) => {
      const c = window.C01; const a = new c.CanvasPersistence({ databaseName: name });
      const original = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function(...args) {
        if (this.name === "global") throw new DOMException("forced quota failure", "QuotaExceededError");
        return original.apply(this, args);
      };
      let first;
      try { first = await a.initialize(); }
      finally { IDBObjectStore.prototype.put = original; a.close(); }
      const b = new c.CanvasPersistence({ databaseName: name });
      const recovered = await b.initialize(), global = await b.readGlobal();
      b.close(); return { first, recovered, global };
    }, unique());
    assert(!result.first.ok && result.first.error.code === "QUOTA_EXCEEDED", JSON.stringify(result));
    assert(result.recovered.ok && result.global.ok && result.global.value.revision === 0, JSON.stringify(result));
  });


  await test("Document indexed-read request failures return typed Results", async () => {
    const result = await inBrowser(page, async (name) => {
      const c = window.C01; const a = new c.CanvasPersistence({ databaseName: name }); await a.initialize();
      const ws = c.newWorkspaceId().value, doc = c.newDocumentId().value;
      await a.commit({ mutations: [
        { kind: "createWorkspace", id: ws, expectedRevision: null, data: {} },
        { kind: "createDocument", id: doc, workspaceId: ws, expectedRevision: null, data: { original: true } },
      ] });
      const original = IDBIndex.prototype.getAll;
      IDBIndex.prototype.getAll = function(...args) {
        if (this.name === "byWorkspace") throw new DOMException("forced getAll failure", "InvalidStateError");
        return original.apply(this, args);
      };
      let failed;
      try { failed = await a.readDocuments(ws); }
      finally { IDBIndex.prototype.getAll = original; }
      const restored = await a.readDocuments(ws);
      a.close(); return { failed, restored };
    }, unique());
    assert(!result.failed.ok && result.failed.error.code === "STORAGE_UNAVAILABLE", JSON.stringify(result));
    assert(result.restored.ok && result.restored.value.length === 1, JSON.stringify(result));
  });

  await test("Migration query failures remain typed and cannot create backups", async () => {
    const key = `legacy:${crypto.randomUUID()}`;
    const result = await inBrowser(page, async ({ name, key }) => {
      const c = window.C01; const a = new c.CanvasPersistence({ databaseName: name }); await a.initialize();
      localStorage.setItem(key, "migration raw");
      const original = IDBObjectStore.prototype.get;
      IDBObjectStore.prototype.get = function(...args) {
        if (this.name === "migration") throw new DOMException("forced get failure", "InvalidStateError");
        return original.apply(this, args);
      };
      let begin, mark, resume;
      try {
        begin = await a.beginLegacyMigration(key);
        mark = await a.markLegacyMigrationFailed(key, 0);
        resume = await a.resumeLegacyMigration(key, 0);
      } finally { IDBObjectStore.prototype.get = original; }
      const originalAll = IDBObjectStore.prototype.getAll;
      IDBObjectStore.prototype.getAll = function(...args) {
        if (this.name === "migration") throw new DOMException("forced getAll failure", "InvalidStateError");
        return originalAll.apply(this, args);
      };
      let listed;
      try { listed = await a.listMigrations(); }
      finally { IDBObjectStore.prototype.getAll = originalAll; }
      const backup = await a.readBackup(key), marker = await a.readMigration(key);
      localStorage.removeItem(key); a.close(); return { begin, mark, resume, listed, backup, marker };
    }, { name: unique(), key });
    for (const op of ["begin", "mark", "resume", "listed"]) {
      assert(!result[op].ok && result[op].error.code === "STORAGE_UNAVAILABLE", JSON.stringify(result));
    }
    assert(result.backup.ok && result.backup.value === null && result.marker.ok && result.marker.value === null, JSON.stringify(result));
  });

  await test("Migration write failures preserve atomic backups and revision leases", async () => {
    const key = `legacy:${crypto.randomUUID()}`;
    const result = await inBrowser(page, async ({ name, key }) => {
      const c = window.C01; const a = new c.CanvasPersistence({ databaseName: name }); await a.initialize();
      localStorage.setItem(key, "immutable original");
      const original = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function(...args) {
        if (this.name === "migration") throw new DOMException("forced quota failure", "QuotaExceededError");
        return original.apply(this, args);
      };
      let initial;
      try { initial = await a.beginLegacyMigration(key); }
      finally { IDBObjectStore.prototype.put = original; }
      const firstBackup = await a.readBackup(key);
      const begun = await a.beginLegacyMigration(key);
      IDBObjectStore.prototype.put = function(...args) {
        if (this.name === "migration") throw new DOMException("forced quota failure", "QuotaExceededError");
        return original.apply(this, args);
      };
      let mark, resume;
      try {
        mark = await a.markLegacyMigrationFailed(key, begun.value.revision);
        resume = await a.resumeLegacyMigration(key, begun.value.revision);
      } finally { IDBObjectStore.prototype.put = original; }
      const marker = await a.readMigration(key), backup = await a.readBackup(key);
      localStorage.removeItem(key); a.close();
      return { initial, firstBackup, begun, mark, resume, marker, backup };
    }, { name: unique(), key });
    assert(!result.initial.ok && result.initial.error.code === "QUOTA_EXCEEDED", JSON.stringify(result));
    assert(result.firstBackup.ok && result.firstBackup.value === null && result.begun.ok, JSON.stringify(result));
    assert(!result.mark.ok && result.mark.error.code === "QUOTA_EXCEEDED", JSON.stringify(result));
    assert(!result.resume.ok && result.resume.error.code === "QUOTA_EXCEEDED", JSON.stringify(result));
    assert(result.marker.value.revision === 0 && result.marker.value.status === "started", JSON.stringify(result));
    assert(result.backup.value.raw === "immutable original", JSON.stringify(result));
  });

  await page.close();
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
  await rm(temp, { recursive: true, force: true });
}
console.log(JSON.stringify({ passed, failed, cases }, null, 2));
process.exitCode = failed ? 1 : 0;
