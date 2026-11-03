export { CanvasPersistence, createCanvasPersistence } from "./indexeddb";
export {
  asWorkspaceId,
  asPanelId,
  asDocumentId,
  asWindowId,
  asRevision,
  newWorkspaceId,
  newPanelId,
  newDocumentId,
  newWindowId,
} from "./validation";
export { DATABASE_NAME, APPLICATION_SCHEMA_VERSION, INDEXED_DB_VERSION } from "../domain/types";
export type {
  WorkspaceId,
  PanelId,
  DocumentId,
  WindowId,
  Revision,
  ToolId,
  GlobalRecord,
  WorkspaceRecord,
  EditableDocument,
  TransactionRequest,
  CommitReceipt,
  MigrationLease,
  MigrationRecord,
  LegacyBackup,
  Invalidation,
  InvalidationListener,
  Mutation,
  RecordRef,
  LegacyValue,
} from "../domain/types";
export type { Result, StorageError, StorageErrorCode } from "../domain/errors";
