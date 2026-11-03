import { fail, fromException, ok, type Result, type StorageError } from "../domain/errors";
import {
  APPLICATION_SCHEMA_VERSION,
  DATABASE_NAME,
  INDEXED_DB_VERSION,
  type CommitReceipt,
  type DocumentId,
  type EditableDocument,
  type GlobalRecord,
  type Invalidation,
  type InvalidationListener,
  type LegacyBackup,
  type LegacyValue,
  type MigrationLease,
  type MigrationRecord,
  type MigrationStatus,
  type Mutation,
  type RecordRef,
  type Revision,
  type TransactionRequest,
  type WindowId,
  type WorkspaceId,
  type WorkspaceRecord,
} from "../domain/types";
import {
  asDocumentId,
  asJsonObject,
  asRevision,
  asWindowId,
  asWorkspaceId,
  newWindowId,
  nextRevision,
  validKey,
  validateBackup,
  validateDocument,
  validateGlobal,
  validateMigration,
  validateWorkspace,
} from "./validation";

const CHANNEL = `${DATABASE_NAME}:invalidations`;
const STORES = ["global", "workspaces", "documents", "migration", "backups"] as const;
type Store = (typeof STORES)[number];
const now = () => new Date().toISOString();
const migrationId = (key: string) => `legacy:${key}`;

type InitOptions = {
  readonly databaseName?: string;
  readonly indexedDB?: IDBFactory;
  readonly broadcastChannelFactory?: (name: string) => BroadcastChannel;
  readonly windowId?: WindowId;
};

function errorResult<T>(cause: unknown, fallback: StorageError["code"] = "INTERNAL"): Result<T> {
  return { ok: false, error: fromException(cause, fallback) };
}
/** Abort any already queued requests before reporting a synchronous IndexedDB failure. */
function requestFailure<T>(tx: IDBTransaction, cause: unknown): Result<T> {
  try {
    tx.abort();
  } catch {
    // The transaction may already have aborted or completed.
  }
  return errorResult(cause, "STORAGE_UNAVAILABLE");
}
function validateMutation(m: Mutation): Result<RecordRef> {
  if (!m || typeof m !== "object" || typeof m.kind !== "string")
    return fail("INVALID_INPUT", "Mutation is not an object");
  if (m.kind === "putGlobal") {
    return asRevision(m.expectedRevision).ok && asJsonObject(m.data).ok
      ? ok({ store: "global", id: "global" })
      : fail("INVALID_INPUT", "Invalid global mutation");
  }
  if (
    m.kind === "createWorkspace" ||
    m.kind === "updateWorkspace" ||
    m.kind === "deleteWorkspace"
  ) {
    if (!asWorkspaceId((m as { id: unknown }).id).ok)
      return fail("INVALID_INPUT", "Workspace ID is not a UUID");
    if (
      (m.kind === "createWorkspace") !== (m.expectedRevision === null) ||
      (m.expectedRevision !== null && !asRevision(m.expectedRevision).ok)
    )
      return fail("INVALID_INPUT", "Invalid expected workspace revision");
    if (m.kind !== "deleteWorkspace" && !asJsonObject(m.data).ok)
      return fail("INVALID_INPUT", "Invalid workspace data");
    return ok({ store: "workspaces", id: m.id });
  }
  if (m.kind === "createDocument" || m.kind === "updateDocument" || m.kind === "deleteDocument") {
    const d = m as Extract<
      Mutation,
      { kind: "createDocument" | "updateDocument" | "deleteDocument" }
    >;
    if (!asDocumentId(d.id).ok || !asWorkspaceId(d.workspaceId).ok)
      return fail("INVALID_INPUT", "Invalid document or workspace UUID");
    if (
      (d.kind === "createDocument") !== (d.expectedRevision === null) ||
      (d.expectedRevision !== null && !asRevision(d.expectedRevision).ok)
    )
      return fail("INVALID_INPUT", "Invalid expected document revision");
    if (d.kind !== "deleteDocument" && !asJsonObject(d.data).ok)
      return fail("INVALID_INPUT", "Invalid document data");
    return ok({ store: "documents", id: d.id });
  }
  return fail("INVALID_INPUT", "Unknown mutation kind");
}

/** One database instance per application/window. No React or Dockview dependencies. */
export class CanvasPersistence {
  readonly databaseName: string;
  readonly windowId: WindowId;
  private readonly factory: IDBFactory | undefined;
  private readonly channelFactory: ((name: string) => BroadcastChannel) | undefined;
  private db: IDBDatabase | null = null;
  private channel: BroadcastChannel | null = null;
  private listeners = new Set<InvalidationListener>();
  private closed = false;
  private opening: Promise<Result<void>> | null = null;

  constructor(options: InitOptions = {}) {
    this.databaseName = options.databaseName ?? DATABASE_NAME;
    this.factory = options.indexedDB ?? globalThis.indexedDB;
    this.channelFactory =
      options.broadcastChannelFactory ??
      (typeof BroadcastChannel === "undefined" ? undefined : (name) => new BroadcastChannel(name));
    const id = options.windowId !== undefined ? asWindowId(options.windowId) : newWindowId();
    // Absent secure UUID source is a hard initialization error, never a shared sender ID.
    this.windowId = id.ok ? id.value : ("" as WindowId);
  }

  initialize(): Promise<Result<void>> {
    if (this.closed)
      return Promise.resolve(fail("STORAGE_UNAVAILABLE", "Persistence adapter is closed"));
    if (!this.windowId)
      return Promise.resolve(fail("STORAGE_UNAVAILABLE", "Window UUID unavailable"));
    if (!this.factory)
      return Promise.resolve(fail("STORAGE_UNAVAILABLE", "IndexedDB is unavailable"));
    if (this.db) return Promise.resolve(ok(undefined));
    if (this.opening) return this.opening;
    this.opening = this.openDatabase();
    return this.opening.finally(() => {
      this.opening = null;
    });
  }

  private openDatabase(): Promise<Result<void>> {
    return new Promise((resolve) => {
      let request: IDBOpenDBRequest;
      try {
        request = this.factory!.open(this.databaseName, INDEXED_DB_VERSION);
      } catch (error) {
        resolve(errorResult(error, "STORAGE_UNAVAILABLE"));
        return;
      }
      let settled = false;
      const finish = (r: Result<void>) => {
        if (!settled) {
          settled = true;
          resolve(r);
        }
      };
      request.onupgradeneeded = () => {
        const db = request.result;
        // Schema version 1 is structural. Application records independently use schema 3.
        if (!db.objectStoreNames.contains("global"))
          db.createObjectStore("global", { keyPath: "id" });
        if (!db.objectStoreNames.contains("workspaces")) {
          const s = db.createObjectStore("workspaces", { keyPath: "id" });
          s.createIndex("byDeletedAt", "deletedAt", { unique: false });
        }
        if (!db.objectStoreNames.contains("documents")) {
          const s = db.createObjectStore("documents", { keyPath: "id" });
          s.createIndex("byWorkspace", "workspaceId", { unique: false });
          s.createIndex("byWorkspaceAndDeletedAt", ["workspaceId", "deletedAt"], { unique: false });
        }
        if (!db.objectStoreNames.contains("migration")) {
          const s = db.createObjectStore("migration", { keyPath: "id" });
          s.createIndex("byStatus", "status", { unique: false });
        }
        if (!db.objectStoreNames.contains("backups")) {
          const s = db.createObjectStore("backups", { keyPath: "id" });
          s.createIndex("byKey", "key", { unique: true });
          s.createIndex("byCapturedAt", "capturedAt", { unique: false });
        }
      };
      request.onblocked = () =>
        finish(fail("STORAGE_UNAVAILABLE", "IndexedDB upgrade blocked by another window"));
      request.onerror = () => {
        const error = request.error;
        finish(
          error?.name === "VersionError"
            ? fail("UNSUPPORTED_SCHEMA", "Database structural version exceeds 1")
            : errorResult(error, "STORAGE_UNAVAILABLE"),
        );
      };
      request.onsuccess = () => {
        const db = request.result;
        if (settled || this.closed) {
          db.close();
          return;
        }
        try {
          if (
            db.version !== INDEXED_DB_VERSION ||
            STORES.some((s) => !db.objectStoreNames.contains(s)) ||
            !db
              .transaction("documents")
              .objectStore("documents")
              .indexNames.contains("byWorkspace") ||
            !db
              .transaction("documents")
              .objectStore("documents")
              .indexNames.contains("byWorkspaceAndDeletedAt") ||
            !db
              .transaction("workspaces")
              .objectStore("workspaces")
              .indexNames.contains("byDeletedAt") ||
            !db.transaction("migration").objectStore("migration").indexNames.contains("byStatus") ||
            !db.transaction("backups").objectStore("backups").indexNames.contains("byKey") ||
            !db.transaction("backups").objectStore("backups").indexNames.contains("byCapturedAt")
          ) {
            db.close();
            finish(fail("UNSUPPORTED_SCHEMA", "Missing required IndexedDB stores or indexes"));
            return;
          }
        } catch (cause) {
          db.close();
          finish(errorResult(cause, "STORAGE_UNAVAILABLE"));
          return;
        }
        this.db = db;
        db.onversionchange = () => {
          db.close();
          if (this.db === db) this.db = null;
        };
        db.onclose = () => {
          if (this.db === db) this.db = null;
        };
        this.ensureGlobal().then((r) => {
          if (!r.ok) {
            db.close();
            if (this.db === db) this.db = null;
            finish(r);
            return;
          }
          if (!this.closed) this.openChannel();
          finish(
            this.closed
              ? fail("STORAGE_UNAVAILABLE", "Adapter closed during initialization")
              : ok(undefined),
          );
        });
      };
    });
  }

  private ensureGlobal(): Promise<Result<void>> {
    return new Promise((resolve) => {
      let tx: IDBTransaction;
      try {
        tx = this.db!.transaction("global", "readwrite");
      } catch (error) {
        resolve(errorResult(error, "STORAGE_UNAVAILABLE"));
        return;
      }
      let failure: StorageError | null = null;
      let r: IDBRequest;
      try {
        r = tx.objectStore("global").get("global");
      } catch (cause) {
        try {
          tx.abort();
        } catch {
          // The transaction may already have closed.
        }
        resolve(errorResult(cause, "STORAGE_UNAVAILABLE"));
        return;
      }
      r.onsuccess = () => {
        if (r.result === undefined) {
          try {
            tx.objectStore("global").put({
              schemaVersion: APPLICATION_SCHEMA_VERSION,
              id: "global",
              revision: 0 as Revision,
              updatedAt: now(),
              data: {},
            } satisfies GlobalRecord);
          } catch (cause) {
            failure = fromException(cause);
            tx.abort();
          }
          return;
        }
        const parsed = validateGlobal(r.result);
        if (!parsed.ok) {
          failure = parsed.error;
          tx.abort();
        }
      };
      tx.oncomplete = () => resolve(ok(undefined));
      tx.onabort = () =>
        resolve(
          failure ? { ok: false, error: failure } : errorResult(tx.error, "TRANSACTION_ABORTED"),
        );
    });
  }

  private ready(): Result<IDBDatabase> {
    return this.closed || !this.db
      ? fail("STORAGE_UNAVAILABLE", "Initialize an open IndexedDB adapter first")
      : ok(this.db);
  }

  private read<T>(
    store: Store,
    key: IDBValidKey | IDBKeyRange,
    parse: (value: unknown) => Result<T>,
    index?: string,
  ): Promise<Result<T | null>> {
    const ready = this.ready();
    if (!ready.ok) return Promise.resolve(ready);
    return new Promise((resolve) => {
      let tx: IDBTransaction;
      try {
        tx = ready.value.transaction(store, "readonly");
      } catch (cause) {
        resolve(errorResult(cause, "STORAGE_UNAVAILABLE"));
        return;
      }
      let value: T | null = null;
      let failure: StorageError | null = null;
      let req: IDBRequest;
      try {
        const source = index ? tx.objectStore(store).index(index) : tx.objectStore(store);
        req = source.get(key);
      } catch (cause) {
        try {
          tx.abort();
        } catch {
          // The transaction may already have closed.
        }
        resolve(errorResult(cause, "STORAGE_UNAVAILABLE"));
        return;
      }
      req.onsuccess = () => {
        if (req.result === undefined) return;
        const result = parse(req.result);
        if (!result.ok) {
          failure = result.error;
          tx.abort();
        } else value = result.value;
      };
      tx.oncomplete = () => resolve(ok(value));
      tx.onabort = () =>
        resolve(
          failure ? { ok: false, error: failure } : errorResult(tx.error, "TRANSACTION_ABORTED"),
        );
    });
  }

  async readGlobal(): Promise<Result<GlobalRecord>> {
    const record = await this.read("global", "global", validateGlobal);
    return record.ok
      ? record.value
        ? ok(record.value)
        : fail("NOT_FOUND", "Global record absent")
      : record;
  }
  readWorkspace(id: WorkspaceId): Promise<Result<WorkspaceRecord | null>> {
    if (!asWorkspaceId(id).ok)
      return Promise.resolve(fail("INVALID_INPUT", "Workspace UUID invalid"));
    return this.read("workspaces", id, validateWorkspace).then((r) =>
      r.ok && r.value?.deletedAt ? ok(null) : r,
    );
  }
  readDocuments(workspaceId: WorkspaceId): Promise<Result<EditableDocument[]>> {
    if (!asWorkspaceId(workspaceId).ok)
      return Promise.resolve(fail("INVALID_INPUT", "Workspace UUID invalid"));
    const ready = this.ready();
    if (!ready.ok) return Promise.resolve(ready);
    return new Promise((resolve) => {
      let tx: IDBTransaction;
      try {
        tx = ready.value.transaction(["workspaces", "documents"], "readonly");
      } catch (cause) {
        resolve(errorResult(cause, "STORAGE_UNAVAILABLE"));
        return;
      }
      let failure: StorageError | null = null;
      let workspace: WorkspaceRecord | null = null;
      const docs: EditableDocument[] = [];
      let p: IDBRequest;
      let r: IDBRequest;
      try {
        p = tx.objectStore("workspaces").get(workspaceId);
        r = tx.objectStore("documents").index("byWorkspace").getAll(workspaceId);
      } catch (cause) {
        resolve(requestFailure(tx, cause));
        return;
      }
      p.onsuccess = () => {
        if (p.result !== undefined) {
          const parsed = validateWorkspace(p.result);
          if (!parsed.ok) {
            failure = parsed.error;
            tx.abort();
          } else workspace = parsed.value;
        }
      };
      r.onsuccess = () => {
        for (const raw of r.result) {
          const parsed = validateDocument(raw);
          if (!parsed.ok) {
            failure = parsed.error;
            tx.abort();
            return;
          }
          if (parsed.value.workspaceId !== workspaceId) {
            failure = { code: "CORRUPT_RECORD", message: "Document index and ownership mismatch" };
            tx.abort();
            return;
          }
          if (!parsed.value.deletedAt) docs.push(parsed.value);
        }
      };
      tx.oncomplete = () =>
        resolve(
          ok(
            workspace && !workspace.deletedAt ? docs.sort((a, b) => a.id.localeCompare(b.id)) : [],
          ),
        );
      tx.onabort = () =>
        resolve(
          failure ? { ok: false, error: failure } : errorResult(tx.error, "TRANSACTION_ABORTED"),
        );
    });
  }

  commit(request: TransactionRequest): Promise<Result<CommitReceipt>> {
    if (
      !request ||
      !Array.isArray(request.mutations) ||
      request.mutations.length > 1000 ||
      request.mutations.length === 0
    )
      return Promise.resolve(
        fail(
          "INVALID_INPUT",
          "Commit requires 1-1000 mutations; a migration completion must accompany actual writes",
        ),
      );
    const touched = new Set<string>();
    const deleting = new Set<WorkspaceId>();
    for (const m of request.mutations) {
      const ref = validateMutation(m);
      if (!ref.ok) return Promise.resolve(ref);
      const key = `${ref.value.store}:${ref.value.id}`;
      if (touched.has(key))
        return Promise.resolve(fail("INVALID_INPUT", "Duplicate mutation target", { key }));
      touched.add(key);
      if (m.kind === "deleteWorkspace") deleting.add(m.id);
    }
    for (const m of request.mutations) {
      if (
        (m.kind === "createDocument" || m.kind === "updateDocument") &&
        deleting.has(m.workspaceId)
      )
        return Promise.resolve(
          fail("INVALID_INPUT", "Cannot create or edit a document while deleting its workspace"),
        );
    }
    if (
      request.migration &&
      (!validKey(request.migration.key) || !asRevision(request.migration.expectedRevision).ok)
    )
      return Promise.resolve(fail("INVALID_INPUT", "Invalid migration completion token"));
    // Take a detached snapshot synchronously: caller mutations after commit() begins
    // must never alter a transaction while its IndexedDB reads are pending.
    let stable: TransactionRequest;
    try {
      stable = structuredClone(request);
    } catch {
      return Promise.resolve(fail("INVALID_INPUT", "Mutation payload cannot be cloned"));
    }
    for (const mutation of stable.mutations) {
      const validated = validateMutation(mutation);
      if (!validated.ok) return Promise.resolve(validated);
    }
    request = stable;
    const ready = this.ready();
    if (!ready.ok) return Promise.resolve(ready);
    return new Promise((resolve) => {
      let tx: IDBTransaction;
      try {
        tx = ready.value.transaction(
          request.migration ? [...STORES] : ["global", "workspaces", "documents"],
          "readwrite",
        );
      } catch (cause) {
        resolve(errorResult(cause, "STORAGE_UNAVAILABLE"));
        return;
      }
      let failure: StorageError | null = null;
      let pending = 0;
      let applied = false;
      const current = new Map<string, unknown>();
      const owned = new Map<WorkspaceId, unknown[]>();
      const changed: RecordRef[] = [];
      const revisions: { ref: RecordRef; revision: Revision }[] = [];
      const at = now();
      const abort = (code: StorageError["code"], message: string) => {
        if (!failure) failure = { code, message };
        try {
          tx.abort();
        } catch {
          /* transaction may already have aborted */
        }
      };
      const get = (store: Store, id: string) => {
        const key = `${store}:${id}`;
        if (current.has(key)) return;
        current.set(key, undefined);
        pending++;
        const r = tx.objectStore(store).get(id);
        r.onsuccess = () => {
          current.set(key, r.result);
          if (--pending === 0 && !failure) apply();
        };
      };
      const loadDocuments = (id: WorkspaceId) => {
        pending++;
        const r = tx.objectStore("documents").index("byWorkspace").getAll(id);
        r.onsuccess = () => {
          owned.set(id, r.result);
          if (--pending === 0 && !failure) apply();
        };
      };
      const add = (ref: RecordRef, revision: Revision) => {
        changed.push(ref);
        revisions.push({ ref, revision });
      };
      const requireRevision = (
        raw: unknown,
        expected: Revision | null,
        store: Store,
      ): Result<Revision> => {
        if (raw === undefined)
          return expected === null
            ? ok(0 as Revision)
            : fail("NOT_FOUND", `${store} record does not exist`);
        const parsed =
          store === "global"
            ? validateGlobal(raw)
            : store === "workspaces"
              ? validateWorkspace(raw)
              : validateDocument(raw);
        if (!parsed.ok) return parsed;
        if (expected === null)
          return fail("ALREADY_EXISTS", `${store} identity already used, including tombstones`);
        if (parsed.value.revision !== expected)
          return fail("CONFLICT", `${store} revision changed; reread before writing`);
        if ("deletedAt" in parsed.value && parsed.value.deletedAt)
          return fail("INVALID_STATE", `${store} record is deleted`);
        return nextRevision(parsed.value.revision);
      };
      const apply = () => {
        if (applied || pending !== 0 || failure) return;
        applied = true;
        try {
          const output = new Map<string, GlobalRecord | WorkspaceRecord | EditableDocument>();
          const parentStates = new Map<WorkspaceId, WorkspaceRecord | null>();
          for (const m of request.mutations) {
            if (
              m.kind === "createDocument" ||
              m.kind === "updateDocument" ||
              m.kind === "deleteDocument"
            )
              continue;
            const store = m.kind === "putGlobal" ? "global" : "workspaces";
            const id = m.kind === "putGlobal" ? "global" : m.id;
            const parsed = requireRevision(
              current.get(`${store}:${id}`),
              m.expectedRevision,
              store,
            );
            if (!parsed.ok) {
              abort(parsed.error.code, parsed.error.message);
              return;
            }
            const revision = m.kind === "createWorkspace" ? (0 as Revision) : parsed.value;
            if (m.kind === "putGlobal") {
              const row: GlobalRecord = {
                id: "global",
                schemaVersion: APPLICATION_SCHEMA_VERSION,
                revision,
                updatedAt: at,
                data: m.data,
              };
              output.set(`global:${id}`, row);
            } else {
              const old = current.get(`workspaces:${id}`) as WorkspaceRecord | undefined;
              const row: WorkspaceRecord = {
                id: m.id,
                schemaVersion: APPLICATION_SCHEMA_VERSION,
                revision,
                updatedAt: at,
                data: m.kind === "deleteWorkspace" ? old!.data : m.data,
                ...(m.kind === "deleteWorkspace" ? { deletedAt: at } : {}),
              };
              output.set(`workspaces:${id}`, row);
              parentStates.set(m.id, m.kind === "deleteWorkspace" ? null : row);
            }
          }
          // Validate every document and its owning workspace before any put.
          for (const m of request.mutations) {
            if (
              m.kind !== "createDocument" &&
              m.kind !== "updateDocument" &&
              m.kind !== "deleteDocument"
            )
              continue;
            const previous = current.get(`documents:${m.id}`);
            const parsed = requireRevision(previous, m.expectedRevision, "documents");
            if (!parsed.ok) {
              abort(parsed.error.code, parsed.error.message);
              return;
            }
            if (
              previous !== undefined &&
              (previous as EditableDocument).workspaceId !== m.workspaceId
            ) {
              abort("INVALID_STATE", "Document cannot change owning workspace");
              return;
            }
            const parent = parentStates.has(m.workspaceId)
              ? (parentStates.get(m.workspaceId) ??
                (m.kind === "deleteDocument" ? current.get(`workspaces:${m.workspaceId}`) : null))
              : current.get(`workspaces:${m.workspaceId}`);
            if (!parent) {
              abort("NOT_FOUND", "Document owner workspace does not exist");
              return;
            }
            const checked = validateWorkspace(parent);
            if (!checked.ok) {
              abort(checked.error.code, checked.error.message);
              return;
            }
            if (checked.value.deletedAt) {
              abort("INVALID_STATE", "Document owner workspace is deleted");
              return;
            }
            const row: EditableDocument = {
              id: m.id,
              workspaceId: m.workspaceId,
              schemaVersion: APPLICATION_SCHEMA_VERSION,
              revision: m.kind === "createDocument" ? (0 as Revision) : parsed.value,
              updatedAt: at,
              data: m.kind === "deleteDocument" ? (previous as EditableDocument).data : m.data,
              ...(m.kind === "deleteDocument" ? { deletedAt: at } : {}),
            };
            output.set(`documents:${m.id}`, row);
          }
          // A workspace deletion must name every live child with its own expected
          // revision. Implicit cascades would violate the CAS rule for each record.
          for (const id of deleting) {
            for (const raw of owned.get(id) ?? []) {
              const parsed = validateDocument(raw);
              if (!parsed.ok) {
                abort(parsed.error.code, parsed.error.message);
                return;
              }
              if (parsed.value.workspaceId !== id) {
                abort("CORRUPT_RECORD", "Document owner index mismatch");
                return;
              }
              if (parsed.value.deletedAt) continue;
              const planned = output.get(`documents:${parsed.value.id}`) as
                | EditableDocument
                | undefined;
              if (!planned?.deletedAt || planned.workspaceId !== id) {
                abort(
                  "INVALID_STATE",
                  "Deleting a workspace requires explicit CAS deletion of every live document",
                );
                return;
              }
            }
          }
          if (request.migration) {
            const raw = current.get(`migration:${migrationId(request.migration.key)}`);
            const backupRaw = current.get(`backups:${migrationId(request.migration.key)}`);
            if (raw === undefined || backupRaw === undefined) {
              abort("MIGRATION_FAILED", "Migration lease or raw backup missing");
              return;
            }
            const record = validateMigration(raw);
            const backup = validateBackup(backupRaw);
            if (!record.ok || !backup.ok) {
              abort("CORRUPT_RECORD", "Migration record or backup corrupt");
              return;
            }
            if (
              record.value.status !== "started" ||
              record.value.revision !== request.migration.expectedRevision
            ) {
              abort("CONFLICT", "Migration already completed or lease changed");
              return;
            }
            const next = nextRevision(record.value.revision);
            if (!next.ok) {
              abort(next.error.code, next.error.message);
              return;
            }
            const updated: MigrationRecord = {
              ...record.value,
              revision: next.value,
              status: "imported",
              completedAt: at,
              updatedAt: at,
            };
            tx.objectStore("migration").put(updated);
            add({ store: "migration", id: updated.id }, updated.revision);
          }
          for (const [key, record] of output) {
            const store = key.slice(0, key.indexOf(":")) as "global" | "workspaces" | "documents";
            tx.objectStore(store).put(record);
            if (store === "global") add({ store, id: "global" }, record.revision);
            else if (store === "workspaces")
              add({ store, id: record.id as WorkspaceId }, record.revision);
            else add({ store, id: record.id as DocumentId }, record.revision);
          }
        } catch (cause) {
          const mapped = fromException(cause);
          abort(mapped.code, mapped.message);
        }
      };
      // Register transaction handlers before scheduling; even a synchronous
      // IndexedDB request exception must produce a typed Result, not a rejected Promise.
      // Every valid request schedules at least one get; apply stays inside its last onsuccess.
      tx.oncomplete = () => {
        const receipt: CommitReceipt = { changed, revisions, committedAt: at };
        this.notify(receipt);
        resolve(ok(receipt));
      };
      tx.onabort = () =>
        resolve(
          failure ? { ok: false, error: failure } : errorResult(tx.error, "TRANSACTION_ABORTED"),
        );
      try {
        for (const m of request.mutations) {
          if (m.kind === "putGlobal") get("global", "global");
          else if (
            m.kind === "createWorkspace" ||
            m.kind === "updateWorkspace" ||
            m.kind === "deleteWorkspace"
          ) {
            get("workspaces", m.id);
            if (m.kind === "deleteWorkspace") loadDocuments(m.id);
          } else {
            get("documents", m.id);
            get("workspaces", m.workspaceId);
          }
        }
        if (request.migration) {
          get("migration", migrationId(request.migration.key));
          get("backups", migrationId(request.migration.key));
        }
      } catch (cause) {
        const mapped = fromException(cause, "TRANSACTION_ABORTED");
        abort(mapped.code, mapped.message);
      }
    });
  }

  subscribeInvalidations(listener: InvalidationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private openChannel(): void {
    if (this.channel || !this.channelFactory) return;
    try {
      const channel = this.channelFactory(CHANNEL + ":" + this.databaseName);
      channel.onmessage = (event: MessageEvent<unknown>) => {
        const msg = event.data;
        if (!msg || typeof msg !== "object") return;
        const v = msg as Partial<Invalidation> & { database?: string };
        if (
          v.database !== this.databaseName ||
          !asWindowId(v.sender).ok ||
          v.sender === this.windowId ||
          !Array.isArray(v.changed) ||
          v.changed.length > 10000 ||
          typeof v.committedAt !== "string" ||
          !Number.isFinite(Date.parse(v.committedAt))
        )
          return;
        if (
          v.changed.some(
            (ref) =>
              !ref ||
              typeof ref !== "object" ||
              !STORES.includes(ref.store as Store) ||
              typeof ref.id !== "string",
          )
        )
          return;
        this.emit({
          sender: v.sender as WindowId,
          changed: v.changed,
          committedAt: v.committedAt,
          remote: true,
        });
      };
      this.channel = channel;
    } catch {
      /* Optional notification transport: IndexedDB provides consistency. */
    }
  }
  private emit(event: Invalidation): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        /* An observer must not invalidate an already durable commit. */
      }
    }
  }
  private notify(receipt: CommitReceipt): void {
    const message: Invalidation = {
      sender: this.windowId,
      changed: receipt.changed,
      committedAt: receipt.committedAt,
      remote: false,
    };
    this.emit(message);
    try {
      this.channel?.postMessage({ ...message, database: this.databaseName });
    } catch {
      /* Best effort; all readers can re-read durable state. */
    }
  }

  /** Read exact raw bytes represented by JS strings; never JSON.parse or remove legacy keys. */
  readLegacyValues(keys: readonly string[]): Result<LegacyValue[]> {
    if (!Array.isArray(keys) || keys.length > 1000 || keys.some((key) => !validKey(key)))
      return fail("INVALID_INPUT", "Legacy keys must be nonempty strings (max 1000)");
    try {
      if (typeof localStorage === "undefined")
        return fail("STORAGE_UNAVAILABLE", "localStorage unavailable");
      return ok(keys.map((key) => ({ key, raw: localStorage.getItem(key) })));
    } catch (cause) {
      return errorResult(cause, "STORAGE_UNAVAILABLE");
    }
  }
  readMigration(key: string): Promise<Result<MigrationRecord | null>> {
    if (!validKey(key)) return Promise.resolve(fail("INVALID_INPUT", "Invalid migration key"));
    return this.read("migration", migrationId(key), validateMigration);
  }
  readBackup(key: string): Promise<Result<LegacyBackup | null>> {
    if (!validKey(key)) return Promise.resolve(fail("INVALID_INPUT", "Invalid backup key"));
    return this.read("backups", migrationId(key), validateBackup);
  }

  listMigrations(status?: MigrationStatus): Promise<Result<MigrationRecord[]>> {
    if (
      status !== undefined &&
      status !== "started" &&
      status !== "imported" &&
      status !== "failed"
    )
      return Promise.resolve(fail("INVALID_INPUT", "Unknown migration status"));
    const ready = this.ready();
    if (!ready.ok) return Promise.resolve(ready);
    return new Promise((resolve) => {
      let tx: IDBTransaction;
      try {
        tx = ready.value.transaction("migration", "readonly");
      } catch (cause) {
        resolve(errorResult(cause, "STORAGE_UNAVAILABLE"));
        return;
      }
      let failure: StorageError | null = null;
      const records: MigrationRecord[] = [];
      let req: IDBRequest;
      try {
        const store = tx.objectStore("migration");
        req = status ? store.index("byStatus").getAll(status) : store.getAll();
      } catch (cause) {
        resolve(requestFailure(tx, cause));
        return;
      }
      req.onsuccess = () => {
        for (const raw of req.result) {
          const parsed = validateMigration(raw);
          if (!parsed.ok) {
            failure = parsed.error;
            tx.abort();
            return;
          }
          records.push(parsed.value);
        }
      };
      tx.oncomplete = () => resolve(ok(records.sort((a, b) => a.key.localeCompare(b.key))));
      tx.onabort = () =>
        resolve(
          failure ? { ok: false, error: failure } : errorResult(tx.error, "TRANSACTION_ABORTED"),
        );
    });
  }

  /** Durable explicit failure marker; source backup remains intact and reusable. */
  markLegacyMigrationFailed(
    key: string,
    expectedRevision: Revision,
  ): Promise<Result<MigrationRecord>> {
    if (!validKey(key) || !asRevision(expectedRevision).ok)
      return Promise.resolve(fail("INVALID_INPUT", "Invalid migration key or expected revision"));
    const ready = this.ready();
    if (!ready.ok) return Promise.resolve(ready);
    return new Promise((resolve) => {
      let tx: IDBTransaction;
      try {
        tx = ready.value.transaction("migration", "readwrite");
      } catch (cause) {
        resolve(errorResult(cause, "STORAGE_UNAVAILABLE"));
        return;
      }
      let failure: StorageError | null = null;
      let written: MigrationRecord | null = null;
      const id = migrationId(key);
      let r: IDBRequest;
      try {
        r = tx.objectStore("migration").get(id);
      } catch (cause) {
        resolve(requestFailure(tx, cause));
        return;
      }
      r.onsuccess = () => {
        if (r.result === undefined) {
          failure = { code: "NOT_FOUND", message: "Migration attempt is absent" };
          tx.abort();
          return;
        }
        const parsed = validateMigration(r.result);
        if (!parsed.ok) {
          failure = parsed.error;
          tx.abort();
          return;
        }
        if (parsed.value.revision !== expectedRevision) {
          failure = { code: "CONFLICT", message: "Migration lease changed" };
          tx.abort();
          return;
        }
        if (parsed.value.status !== "started") {
          failure = {
            code: "INVALID_STATE",
            message: "Only started migrations may be marked failed",
          };
          tx.abort();
          return;
        }
        const next = nextRevision(parsed.value.revision);
        if (!next.ok) {
          failure = next.error;
          tx.abort();
          return;
        }
        written = { ...parsed.value, status: "failed", revision: next.value, updatedAt: now() };
        try {
          tx.objectStore("migration").put(written);
        } catch (cause) {
          failure = fromException(cause);
          tx.abort();
        }
      };
      tx.oncomplete = () => {
        if (!written) {
          resolve(fail("INTERNAL", "Failure marker missing after commit"));
          return;
        }
        this.notify({
          changed: [{ store: "migration", id }],
          revisions: [],
          committedAt: written.updatedAt,
        });
        resolve(ok(written));
      };
      tx.onabort = () =>
        resolve(
          failure ? { ok: false, error: failure } : errorResult(tx.error, "TRANSACTION_ABORTED"),
        );
    });
  }

  /** Preserve raw material and claim a migration lease atomically. Does NOT convert anything. */
  beginLegacyMigration(key: string): Promise<Result<MigrationLease>> {
    const input = this.readLegacyValues([key]);
    if (!input.ok) return Promise.resolve(input);
    const raw = input.value[0].raw;
    if (raw === null) return Promise.resolve(fail("NOT_FOUND", "Legacy key absent"));
    const ready = this.ready();
    if (!ready.ok) return Promise.resolve(ready);
    return new Promise((resolve) => {
      let tx: IDBTransaction;
      try {
        tx = ready.value.transaction(["migration", "backups"], "readwrite");
      } catch (cause) {
        resolve(errorResult(cause, "STORAGE_UNAVAILABLE"));
        return;
      }
      let failure: StorageError | null = null;
      let backupRaw: unknown;
      let migrationRaw: unknown;
      let count = 2;
      const id = migrationId(key);
      const capturedAt = now();
      let lease: MigrationLease | null = null;
      const stop = (code: StorageError["code"], message: string) => {
        failure = { code, message };
        tx.abort();
      };
      const finishReads = () => {
        if (--count !== 0) return;
        if (backupRaw !== undefined) {
          const backup = validateBackup(backupRaw);
          if (!backup.ok) {
            stop(backup.error.code, backup.error.message);
            return;
          }
          if (backup.value.raw !== raw) {
            stop("CONFLICT", "Legacy value changed after its immutable backup was captured");
            return;
          }
        }
        if (migrationRaw !== undefined) {
          const migration = validateMigration(migrationRaw);
          if (!migration.ok) {
            stop(migration.error.code, migration.error.message);
            return;
          }
          stop(
            migration.value.status === "imported" ? "ALREADY_EXISTS" : "MIGRATION_FAILED",
            `Migration already ${migration.value.status}; inspect and explicitly resume if needed`,
          );
          return;
        }
        const backup: LegacyBackup = {
          id,
          key,
          raw,
          capturedAt,
          updatedAt: capturedAt,
          revision: 0 as Revision,
          schemaVersion: APPLICATION_SCHEMA_VERSION,
        };
        const migration: MigrationRecord = {
          id,
          key,
          backupId: id,
          status: "started",
          attempts: 1,
          startedAt: capturedAt,
          updatedAt: capturedAt,
          revision: 0 as Revision,
          schemaVersion: APPLICATION_SCHEMA_VERSION,
        };
        try {
          if (backupRaw === undefined) tx.objectStore("backups").put(backup);
          tx.objectStore("migration").put(migration);
          lease = { key, revision: migration.revision, backupId: id };
        } catch (cause) {
          failure = fromException(cause);
          tx.abort();
        }
      };
      let a: IDBRequest;
      let b: IDBRequest;
      try {
        a = tx.objectStore("backups").get(id);
        b = tx.objectStore("migration").get(id);
      } catch (cause) {
        resolve(requestFailure(tx, cause));
        return;
      }
      a.onsuccess = () => {
        backupRaw = a.result;
        finishReads();
      };
      b.onsuccess = () => {
        migrationRaw = b.result;
        finishReads();
      };
      tx.oncomplete = () => {
        if (!lease) {
          resolve(fail("INTERNAL", "Migration lease missing after transaction completion"));
          return;
        }
        this.notify({
          changed: [
            { store: "backups", id },
            { store: "migration", id },
          ],
          revisions: [],
          committedAt: capturedAt,
        });
        resolve(ok(lease));
      };
      tx.onabort = () =>
        resolve(
          failure ? { ok: false, error: failure } : errorResult(tx.error, "TRANSACTION_ABORTED"),
        );
    });
  }

  /** Explicit operator decision required for interrupted migration, using a CAS revision. */
  resumeLegacyMigration(key: string, expectedRevision: Revision): Promise<Result<MigrationLease>> {
    if (!validKey(key) || !asRevision(expectedRevision).ok)
      return Promise.resolve(fail("INVALID_INPUT", "Invalid migration identity or revision"));
    const ready = this.ready();
    if (!ready.ok) return Promise.resolve(ready);
    return new Promise((resolve) => {
      let tx: IDBTransaction;
      try {
        tx = ready.value.transaction(["migration", "backups"], "readwrite");
      } catch (cause) {
        resolve(errorResult(cause, "STORAGE_UNAVAILABLE"));
        return;
      }
      let failure: StorageError | null = null;
      let row: MigrationRecord | null = null;
      let raw: LegacyBackup | null = null;
      let pending = 2;
      let lease: MigrationLease | null = null;
      const id = migrationId(key);
      const stop = (code: StorageError["code"], message: string) => {
        failure = { code, message };
        tx.abort();
      };
      const act = () => {
        if (--pending) return;
        if (!row || !raw) {
          stop("MIGRATION_FAILED", "Cannot resume without both migration and raw backup");
          return;
        }
        if (row.status === "imported") {
          stop("ALREADY_EXISTS", "Migration already imported");
          return;
        }
        if (row.revision !== expectedRevision) {
          stop("CONFLICT", "Migration revision changed");
          return;
        }
        const next = nextRevision(row.revision);
        if (!next.ok) {
          stop(next.error.code, next.error.message);
          return;
        }
        const updated: MigrationRecord = {
          ...row,
          revision: next.value,
          attempts: row.attempts + 1,
          status: "started",
          updatedAt: now(),
        };
        try {
          tx.objectStore("migration").put(updated);
          lease = { key, backupId: id, revision: next.value };
        } catch (cause) {
          failure = fromException(cause);
          tx.abort();
        }
      };
      let a: IDBRequest;
      let b: IDBRequest;
      try {
        a = tx.objectStore("migration").get(id);
        b = tx.objectStore("backups").get(id);
      } catch (cause) {
        resolve(requestFailure(tx, cause));
        return;
      }
      a.onsuccess = () => {
        if (a.result !== undefined) {
          const v = validateMigration(a.result);
          if (!v.ok) {
            stop(v.error.code, v.error.message);
            return;
          }
          row = v.value;
        }
        act();
      };
      b.onsuccess = () => {
        if (b.result !== undefined) {
          const v = validateBackup(b.result);
          if (!v.ok) {
            stop(v.error.code, v.error.message);
            return;
          }
          raw = v.value;
        }
        act();
      };
      tx.oncomplete = () => {
        if (!lease) {
          resolve(fail("INTERNAL", "Resume lease missing"));
          return;
        }
        this.notify({ changed: [{ store: "migration", id }], revisions: [], committedAt: now() });
        resolve(ok(lease));
      };
      tx.onabort = () =>
        resolve(
          failure ? { ok: false, error: failure } : errorResult(tx.error, "TRANSACTION_ABORTED"),
        );
    });
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.db?.close();
    this.db = null;
    this.channel?.close();
    this.channel = null;
    this.listeners.clear();
  }
}

export function createCanvasPersistence(options?: InitOptions): CanvasPersistence {
  return new CanvasPersistence(options);
}
