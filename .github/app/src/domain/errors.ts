export const ERROR_CODES = [
  "NOT_FOUND",
  "ALREADY_EXISTS",
  "INVALID_INPUT",
  "INVALID_STATE",
  "CONFLICT",
  "CORRUPT_RECORD",
  "UNSUPPORTED_SCHEMA",
  "STORAGE_UNAVAILABLE",
  "QUOTA_EXCEEDED",
  "TRANSACTION_ABORTED",
  "MIGRATION_FAILED",
  "INTERNAL",
] as const;
export type StorageErrorCode = (typeof ERROR_CODES)[number];
export interface StorageError {
  readonly code: StorageErrorCode;
  readonly message: string;
  readonly details?: Readonly<Record<string, string | number | boolean | null>>;
}
export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: StorageError };
export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = <T = never>(
  code: StorageErrorCode,
  message: string,
  details?: StorageError["details"],
): Result<T> => ({
  ok: false,
  error: { code, message, ...(details ? { details } : {}) },
});
export function isStorageError(value: unknown): value is StorageError {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Partial<StorageError>;
  return typeof item.message === "string" && ERROR_CODES.some((code) => code === item.code);
}
/** DOMException errors are not swallowed or promoted to success. */
export function fromException(
  cause: unknown,
  fallback: StorageErrorCode = "INTERNAL",
): StorageError {
  if (cause == null)
    return { code: fallback, message: `No underlying exception was supplied (${fallback})` };
  const name = cause instanceof Error ? cause.name : "UnknownError";
  const message = cause instanceof Error ? cause.message : String(cause);
  const code: StorageErrorCode =
    name === "QuotaExceededError"
      ? "QUOTA_EXCEEDED"
      : ["InvalidStateError", "SecurityError", "NotSupportedError", "UnknownError"].includes(name)
        ? "STORAGE_UNAVAILABLE"
        : name === "AbortError"
          ? "TRANSACTION_ABORTED"
          : fallback;
  return { code, message: `${name}: ${message}` };
}
