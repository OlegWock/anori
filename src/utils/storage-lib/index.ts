export type { FileQuery, FilesStorage, FileWithMeta, SingleFileQuery } from "./files";
export {
  compareHlc,
  createHlc,
  deserializeHlc,
  generateNodeId,
  type Hlc,
  type HlcState,
  type HlcTimestamp,
  serializeHlc,
} from "./hlc";
export { HLC_STATE_KEY, OUTBOX_KEY, SCHEMA_VERSION_KEY } from "./keys";
export {
  deleteFile,
  fileExists,
  generateFilePath,
  listFiles,
  readFile,
  writeFile,
} from "./opfs";
export {
  extractIdFromKey,
  getQueryId,
  getStorageKey,
  isKeyMatchingPrefix,
  type Query,
  type ResolvedCellQuery,
  type ResolvedCollectionAllQuery,
  type ResolvedCollectionByIdQuery,
  type ResolvedQuery,
  resolveQuery,
} from "./query";

export { atomWithStorageQuery, StorageContext, useStorage, useStorageValue } from "./react";
export {
  // Cell
  type CellDescriptor,
  type CellQuery,
  type CollectionAllQuery,
  type CollectionByIdQuery,
  // Collection
  type CollectionDescriptor,
  type CollectionQuery,
  cell,
  collection,
  // Versioned Schema
  createMigration,
  defineSchemaVersion,
  defineVersionedSchema,
  type EntityAccessor,
  // Entity
  type EntityDescriptor,
  entity,
  type FileCollectionAllQuery,
  type FileCollectionByIdQuery,
  type FileCollectionDescriptor,
  type FileCollectionQuery,
  // File
  type FileDescriptor,
  file,
  fileCollection,
  isCellDescriptor,
  isCellQuery,
  isCollectionAllQuery,
  isCollectionByIdQuery,
  isCollectionDescriptor,
  isCollectionQuery,
  isEntityDescriptor,
  isFileCollectionAllQuery,
  isFileCollectionByIdQuery,
  isFileCollectionDescriptor,
  isFileDescriptor,
  isFileQuery,
  type SchemaDefinition,
  // Schema Version
  type SchemaEntry,
  type SchemaVersion,
} from "./schema";
export {
  type CreateStorageOptions,
  createStorage,
  type OutboxEntry,
  type Storage,
  type StorageFork,
  type ValueMeta,
  type ValueWithMeta,
} from "./storage";
export { type FileMetaValue, isStorageRecord, type StorageRecord } from "./types";
