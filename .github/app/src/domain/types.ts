/** Canonical storage identities. Only parsers and UUID factories can mint these brands. */
declare const workspaceBrand: unique symbol;
declare const panelBrand: unique symbol;
declare const documentBrand: unique symbol;
declare const windowBrand: unique symbol;
declare const revisionBrand: unique symbol;

export type WorkspaceId = string & { readonly [workspaceBrand]: true };
export type PanelId = string & { readonly [panelBrand]: true };
export type DocumentId = string & { readonly [documentBrand]: true };
export type WindowId = string & { readonly [windowBrand]: true };
export type Revision = number & { readonly [revisionBrand]: true };
export type ToolId = "canvas" | "editor" | "library" | "settings";

/** Domain data intentionally remains opaque until CAN-02/03/04 define the models. */
export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export const APPLICATION_SCHEMA_VERSION = 3 as const;
export const INDEXED_DB_VERSION = 1 as const;
export const DATABASE_NAME = "canvas:v3:marius-patrik/template-repo";

export type StoreName = "global" | "workspaces" | "documents" | "migration" | "backups";
export type RecordRef =
  | { readonly store: "global"; readonly id: "global" }
  | { readonly store: "workspaces"; readonly id: WorkspaceId }
  | { readonly store: "documents"; readonly id: DocumentId }
  | { readonly store: "migration" | "backups"; readonly id: string };

export interface PersistentRecord {
  readonly schemaVersion: typeof APPLICATION_SCHEMA_VERSION;
  readonly revision: Revision;
  readonly updatedAt: string;
}
export interface GlobalRecord extends PersistentRecord {
  readonly id: "global";
  readonly data: JsonObject;
}
export interface WorkspaceRecord extends PersistentRecord {
  readonly id: WorkspaceId;
  readonly data: JsonObject;
  readonly deletedAt?: string;
}
export interface EditableDocument extends PersistentRecord {
  readonly id: DocumentId;
  readonly workspaceId: WorkspaceId;
  readonly data: JsonObject;
  readonly deletedAt?: string;
}
export type Mutation =
  | { readonly kind: "putGlobal"; readonly expectedRevision: Revision; readonly data: JsonObject }
  | {
      readonly kind: "createWorkspace";
      readonly id: WorkspaceId;
      readonly expectedRevision: null;
      readonly data: JsonObject;
    }
  | {
      readonly kind: "updateWorkspace";
      readonly id: WorkspaceId;
      readonly expectedRevision: Revision;
      readonly data: JsonObject;
    }
  | {
      readonly kind: "deleteWorkspace";
      readonly id: WorkspaceId;
      readonly expectedRevision: Revision;
    }
  | {
      readonly kind: "createDocument";
      readonly id: DocumentId;
      readonly workspaceId: WorkspaceId;
      readonly expectedRevision: null;
      readonly data: JsonObject;
    }
  | {
      readonly kind: "updateDocument";
      readonly id: DocumentId;
      readonly workspaceId: WorkspaceId;
      readonly expectedRevision: Revision;
      readonly data: JsonObject;
    }
  | {
      readonly kind: "deleteDocument";
      readonly id: DocumentId;
      readonly workspaceId: WorkspaceId;
      readonly expectedRevision: Revision;
    };

/** Completion is deliberately included in the *same* commit as converted records. */
export type MigrationCompletion = {
  readonly key: string;
  readonly expectedRevision: Revision;
};
export interface TransactionRequest {
  readonly mutations: readonly Mutation[];
  readonly migration?: MigrationCompletion;
}
export interface CommitReceipt {
  readonly changed: readonly RecordRef[];
  readonly committedAt: string;
  readonly revisions: ReadonlyArray<{ readonly ref: RecordRef; readonly revision: Revision }>;
}
export interface Invalidation {
  readonly sender: WindowId;
  readonly changed: readonly RecordRef[];
  readonly committedAt: string;
  readonly remote: boolean;
}
export type InvalidationListener = (event: Invalidation) => void;

export interface LegacyValue {
  readonly key: string;
  readonly raw: string | null;
}
export interface LegacyBackup extends PersistentRecord {
  readonly id: string;
  readonly key: string;
  readonly raw: string;
  readonly capturedAt: string;
}
export type MigrationStatus = "started" | "imported" | "failed";
export interface MigrationRecord extends PersistentRecord {
  readonly id: string;
  readonly key: string;
  readonly backupId: string;
  readonly status: MigrationStatus;
  readonly attempts: number;
  readonly startedAt: string;
  readonly completedAt?: string;
}
export interface MigrationLease {
  readonly key: string;
  readonly revision: Revision;
  readonly backupId: string;
}
