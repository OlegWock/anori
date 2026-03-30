import type { FilesStorage } from "./files";
import type { HlcTimestamp } from "./hlc";
import type { ResolvedQuery } from "./query";
import type { CellDescriptor } from "./schema/cell";
import type { CollectionAllQuery, CollectionByIdQuery } from "./schema/collection";
import type { VersionedSchema } from "./schema/versioned";
import type { FileMetaValue, StorageRecord } from "./types";

export type OutboxEntry = {
  key: string;
  type: "kv" | "file";
  hlc: HlcTimestamp;
  addedAt: number;
};

export type Outbox = OutboxEntry[];

export type ChangeSource =
  | "remote" // Changes from cloud sync
  | "external" // Changes from other tabs/background via browser.storage.local.onChanged
  | "local" // Changes from this storage instance
  | "fork"; // Changes from a fork of this storage

export type ChangeInfo = {
  source: ChangeSource;
};

export type ChangeCallback<T = unknown> = (value: T | undefined, oldValue: T | undefined, info: ChangeInfo) => void;

export type Subscription = {
  query: ResolvedQuery;
  callback: ChangeCallback;
  sourceId?: string;
};

export type OutboxChangeCallback = (data: {
  key: string;
  record: StorageRecord<unknown>;
  type: "kv" | "file";
}) => void;

export type OutboxSubscription = {
  callback: OutboxChangeCallback;
};

export type ValueMeta = {
  isDefault: boolean;
};

export type ValueWithMeta<T> = {
  value: T;
  meta: ValueMeta;
};

export type StorageQueryInterface = {
  get<T>(query: CellDescriptor<T, true>): T;
  get<T>(query: CellDescriptor<T, false>): T | undefined;
  get<T>(query: CellDescriptor<T, boolean>): T | undefined;
  get<T>(query: CollectionByIdQuery<T>): T | undefined;
  get<T>(query: CollectionAllQuery<T>): Record<string, T>;
  getWithMeta<T>(query: CellDescriptor<T, true>): ValueWithMeta<T>;
  getWithMeta<T>(query: CellDescriptor<T, false>): ValueWithMeta<T | undefined>;
  getWithMeta<T>(query: CellDescriptor<T, boolean>): ValueWithMeta<T | undefined>;
  getWithMeta<T>(query: CollectionByIdQuery<T>): ValueWithMeta<T | undefined>;
  getWithMeta<T>(query: CollectionAllQuery<T>): ValueWithMeta<Record<string, T>>;
  set<T>(query: CellDescriptor<T>, value: T): Promise<void>;
  set<T>(query: CollectionByIdQuery<T>, value: T): Promise<void>;
  delete(query: CellDescriptor): Promise<void>;
  delete(query: CollectionByIdQuery): Promise<void>;
  subscribe<T>(query: CellDescriptor<T, true>, callback: ChangeCallback<T>): () => void;
  subscribe<T>(query: CellDescriptor<T, false>, callback: ChangeCallback<T | undefined>): () => void;
  subscribe<T>(query: CellDescriptor<T, boolean>, callback: ChangeCallback<T | undefined>): () => void;
  subscribe<T>(query: CollectionByIdQuery<T>, callback: ChangeCallback<T>): () => void;
  subscribe<T>(query: CollectionAllQuery<T>, callback: ChangeCallback<Record<string, T>>): () => void;
};

export type StorageFork = StorageQueryInterface & {
  readonly id: string;
};

export type Storage<S extends VersionedSchema = VersionedSchema> = StorageQueryInterface & {
  readonly schema: S["latestSchema"]["definition"];

  initialize(): Promise<void>;

  fork(): StorageFork;

  sync: {
    isOutboxEnabled(): boolean;
    enableOutbox(): void;
    disableOutbox(): void;
    getOutbox(): Outbox;
    removeFromOutbox(entries: Array<{ key: string; hlc: HlcTimestamp }>): Promise<void>;
    clearOutbox(): Promise<void>;
    subscribeToOutbox(callback: OutboxChangeCallback): () => void;
    exportForFullSync(): {
      kv: Record<string, StorageRecord<unknown>>;
      files: Record<string, { record: StorageRecord<FileMetaValue<unknown>>; path: string }>;
    };
    exportOutbox(): Array<{ key: string; type: "file" | "kv"; record: StorageRecord<unknown> }>;
    mergeRemoteChanges(
      changes: { key: string; record: StorageRecord<unknown>; schemaVersion: number }[],
      fileBlobs?: Map<string, Blob>,
    ): Promise<{ applied: string[]; skipped: string[] }>;
    applyRemoteChangesIgnoringHlc(
      changes: { key: string; record: StorageRecord<unknown>; schemaVersion: number }[],
      fileBlobs?: Map<string, Blob>,
    ): Promise<{ applied: string[]; skipped: string[] }>;
  };

  exportForBackup(): {
    kv: Record<string, StorageRecord<unknown>>;
    files: Record<string, { record: StorageRecord<FileMetaValue<unknown>>; path: string }>;
  };

  importFromBackup(data: {
    kv: Record<string, unknown>;
    fileBlobs: Map<string, Blob>;
  }): Promise<void>;

  files: FilesStorage;
};

export type CreateStorageOptions<S extends VersionedSchema = VersionedSchema> = {
  schema: S;
};

/**
 * Shared context passed to extracted storage subsystems (sync, backup).
 * Provides access to the closure state of createStorage without exposing internals.
 */
export type StorageInternalContext = {
  cache: Record<string, unknown>;
  getHlc(): import("./hlc").Hlc;
  ensureInitialized(): void;
  persistRecord(key: string, record: StorageRecord<unknown>, options?: { notifyAs?: ChangeSource }): void;
  persistHlcState(): void;
  persistOutbox(outbox: Outbox): void;
  waitForPersist(): Promise<void>;
  getOutboxFromCache(): Outbox;
  notifyOutboxSubscribers(key: string, type: "kv" | "file", record: StorageRecord<unknown>): void;
  isKeyTracked(key: string): boolean;
  isKeyBackupEligible(key: string): boolean;
  isFileKey(key: string): boolean;
  outboxSubscriptions: OutboxSubscription[];
  getOutboxEnabled(): boolean;
  currentSchemaVersion: number;
};
