export {
  type HlcTimestamp,
  type HlcState,
  type Hlc,
  createHlc,
  generateNodeId,
  compareHlc,
  serializeHlc,
  deserializeHlc,
} from "./hlc";

export { type StorageRecord, type FileMetaValue, isStorageRecord } from "./types";

export {
  type Query,
  type ResolvedQuery,
  type ResolvedCellQuery,
  type ResolvedCollectionAllQuery,
  type ResolvedCollectionByIdQuery,
  resolveQuery,
  getStorageKey,
  isKeyMatchingPrefix,
  extractIdFromKey,
  getQueryId,
} from "./query";

export {
  type Storage,
  type StorageFork,
  type CreateStorageOptions,
  type OutboxEntry,
  type ValueMeta,
  type ValueWithMeta,
  createStorage,
} from "./storage";

export type { FilesStorage, FileQuery, SingleFileQuery, FileWithMeta } from "./files";

export { useStorageValue, atomWithStorageQuery, StorageContext, useStorage } from "./react";

export {
  generateFilePath,
  writeFile,
  readFile,
  deleteFile,
  listFiles,
  fileExists,
} from "./opfs";

export {
  // Cell
  type CellDescriptor,
  type CellQuery,
  cell,
  isCellDescriptor,
  isCellQuery,
  // Entity
  type EntityDescriptor,
  entity,
  isEntityDescriptor,
  // Collection
  type CollectionDescriptor,
  type CollectionQuery,
  type CollectionAllQuery,
  type CollectionByIdQuery,
  collection,
  isCollectionDescriptor,
  isCollectionQuery,
  isCollectionAllQuery,
  isCollectionByIdQuery,
  // Schema Version
  type SchemaDefinition,
  type SchemaVersion,
  defineSchemaVersion,
  // Versioned Schema
  createMigration,
  defineVersionedSchema,
  // File
  type FileDescriptor,
  type FileCollectionDescriptor,
  type FileCollectionQuery,
  type FileCollectionAllQuery,
  type FileCollectionByIdQuery,
  file,
  fileCollection,
  isFileDescriptor,
  isFileCollectionDescriptor,
  isFileQuery,
  isFileCollectionAllQuery,
  isFileCollectionByIdQuery,
} from "./schema";

export { HLC_STATE_KEY, OUTBOX_KEY, SCHEMA_VERSION_KEY } from "./keys";
