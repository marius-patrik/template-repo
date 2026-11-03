import { fail, ok, type Result } from "../domain/errors";
import {
  APPLICATION_SCHEMA_VERSION,
  type DocumentId,
  type EditableDocument,
  type GlobalRecord,
  type JsonObject,
  type MigrationRecord,
  type PanelId,
  type Revision,
  type WindowId,
  type WorkspaceId,
  type WorkspaceRecord,
  type LegacyBackup,
} from "../domain/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function asWorkspaceId(value: unknown): Result<WorkspaceId> {
  return parseUuid(value) as Result<WorkspaceId>;
}
export function asPanelId(value: unknown): Result<PanelId> {
  return parseUuid(value) as Result<PanelId>;
}
export function asDocumentId(value: unknown): Result<DocumentId> {
  return parseUuid(value) as Result<DocumentId>;
}
export function asWindowId(value: unknown): Result<WindowId> {
  return parseUuid(value) as Result<WindowId>;
}
function parseUuid(value: unknown): Result<string> {
  return typeof value === "string" && UUID.test(value)
    ? ok(value.toLowerCase())
    : fail("INVALID_INPUT", "Identity must be a canonical UUID");
}
export function newWorkspaceId(): Result<WorkspaceId> {
  return newId(asWorkspaceId);
}
export function newPanelId(): Result<PanelId> {
  return newId(asPanelId);
}
export function newDocumentId(): Result<DocumentId> {
  return newId(asDocumentId);
}
export function newWindowId(): Result<WindowId> {
  return newId(asWindowId);
}
function newId<T>(parse: (value: unknown) => Result<T>): Result<T> {
  try {
    return parse(globalThis.crypto.randomUUID());
  } catch {
    return fail("STORAGE_UNAVAILABLE", "Secure UUID generation unavailable");
  }
}
export function asRevision(value: unknown): Result<Revision> {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value < Number.MAX_SAFE_INTEGER
    ? ok(value as Revision)
    : fail("INVALID_INPUT", "Revision must be a nonnegative safe integer");
}
export function nextRevision(value: Revision): Result<Revision> {
  return asRevision(value + 1);
}
export function validKey(key: unknown): key is string {
  return typeof key === "string" && key.length > 0 && key.length <= 1024 && !key.includes("\0");
}
/** Structured-clone objects are accepted only if they can also be safely serialized as plain JSON. */
export function asJsonObject(value: unknown): Result<JsonObject> {
  const seen = new WeakSet<object>();
  let count = 0;
  function walk(v: unknown, depth: number): boolean {
    if (++count > 100000 || depth > 64) return false;
    if (v === null || typeof v === "string" || typeof v === "boolean") return true;
    if (typeof v === "number") return Number.isFinite(v);
    if (typeof v !== "object" || seen.has(v)) return false;
    const proto = Object.getPrototypeOf(v);
    if (Array.isArray(v)) {
      seen.add(v);
      const keys = Reflect.ownKeys(v);
      const good =
        keys.length === v.length + 1 &&
        keys.every((key) => {
          if (key === "length") return true;
          if (typeof key !== "string" || !/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= v.length)
            return false;
          const descriptor = Object.getOwnPropertyDescriptor(v, key);
          return (
            descriptor?.enumerable === true &&
            "value" in descriptor &&
            walk(descriptor.value, depth + 1)
          );
        });
      seen.delete(v);
      return good;
    }
    if (proto !== Object.prototype && proto !== null) return false;
    seen.add(v);
    const good = Reflect.ownKeys(v).every((key) => {
      if (typeof key !== "string" || ["__proto__", "constructor", "prototype"].includes(key))
        return false;
      const descriptor = Object.getOwnPropertyDescriptor(v, key);
      return (
        descriptor?.enumerable === true &&
        "value" in descriptor &&
        walk(descriptor.value, depth + 1)
      );
    });
    seen.delete(v);
    return good;
  }
  try {
    return value !== null && typeof value === "object" && !Array.isArray(value) && walk(value, 0)
      ? ok(value as JsonObject)
      : fail("INVALID_INPUT", "Data must be a plain, finite, acyclic JSON object");
  } catch {
    return fail("INVALID_INPUT", "Data contains unreadable properties or unsupported proxies");
  }
}
function recordEnvelope(v: unknown): Result<Record<string, unknown>> {
  if (!v || typeof v !== "object" || Array.isArray(v))
    return fail("CORRUPT_RECORD", "Stored record is not an object");
  const record = v as Record<string, unknown>;
  if (record.schemaVersion !== APPLICATION_SCHEMA_VERSION) {
    return fail("UNSUPPORTED_SCHEMA", "Stored record schema differs from 3", {
      found: String(record.schemaVersion),
    });
  }
  if (
    !asRevision(record.revision).ok ||
    typeof record.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(record.updatedAt))
  )
    return fail("CORRUPT_RECORD", "Stored revision or timestamp is invalid");
  return ok(record);
}
export function validateGlobal(value: unknown): Result<GlobalRecord> {
  const base = recordEnvelope(value);
  if (!base.ok) return base;
  if (base.value.id !== "global" || !asJsonObject(base.value.data).ok)
    return fail("CORRUPT_RECORD", "Invalid global record");
  return ok(value as GlobalRecord);
}
export function validateWorkspace(value: unknown): Result<WorkspaceRecord> {
  const base = recordEnvelope(value);
  if (!base.ok) return base;
  if (
    !asWorkspaceId(base.value.id).ok ||
    !asJsonObject(base.value.data).ok ||
    (base.value.deletedAt !== undefined &&
      (typeof base.value.deletedAt !== "string" ||
        !Number.isFinite(Date.parse(base.value.deletedAt))))
  )
    return fail("CORRUPT_RECORD", "Invalid workspace record");
  return ok(value as WorkspaceRecord);
}
export function validateDocument(value: unknown): Result<EditableDocument> {
  const base = recordEnvelope(value);
  if (!base.ok) return base;
  if (
    !asDocumentId(base.value.id).ok ||
    !asWorkspaceId(base.value.workspaceId).ok ||
    !asJsonObject(base.value.data).ok ||
    (base.value.deletedAt !== undefined &&
      (typeof base.value.deletedAt !== "string" ||
        !Number.isFinite(Date.parse(base.value.deletedAt))))
  )
    return fail("CORRUPT_RECORD", "Invalid document record");
  return ok(value as EditableDocument);
}
export function validateMigration(value: unknown): Result<MigrationRecord> {
  const base = recordEnvelope(value);
  if (!base.ok) return base;
  const v = base.value;
  if (
    !validKey(v.key) ||
    v.id !== `legacy:${v.key}` ||
    v.backupId !== v.id ||
    !["started", "imported", "failed"].includes(String(v.status)) ||
    typeof v.attempts !== "number" ||
    !Number.isSafeInteger(v.attempts) ||
    v.attempts < 1 ||
    typeof v.startedAt !== "string" ||
    !Number.isFinite(Date.parse(v.startedAt)) ||
    (v.completedAt !== undefined &&
      (typeof v.completedAt !== "string" || !Number.isFinite(Date.parse(v.completedAt))))
  )
    return fail("CORRUPT_RECORD", "Invalid migration record");
  return ok(value as MigrationRecord);
}
export function validateBackup(value: unknown): Result<LegacyBackup> {
  const base = recordEnvelope(value);
  if (!base.ok) return base;
  const v = base.value;
  if (
    !validKey(v.key) ||
    v.id !== `legacy:${v.key}` ||
    typeof v.raw !== "string" ||
    typeof v.capturedAt !== "string" ||
    !Number.isFinite(Date.parse(v.capturedAt))
  )
    return fail("CORRUPT_RECORD", "Invalid legacy backup record");
  return ok(value as LegacyBackup);
}
