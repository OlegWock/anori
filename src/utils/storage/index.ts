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
} from "./query";

export { type Storage, type StorageFork, type CreateStorageOptions, type OutboxEntry, createStorage } from "./storage";

export type { FilesStorage, FileQuery, SingleFileQuery, FileWithMeta } from "./files";

export {
  useStorageValue,
  useWritableStorageValue,
  atomWithStorageQuery,
  setGlobalStorage,
  getGlobalStorage,
  isStorageInitialized,
} from "./react";

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
  type CellOptions,
  type CellDescriptor,
  type CellQuery,
  cell,
  isCellDescriptor,
  isCellQuery,
  // Entity
  type EntityOptions,
  type EntityDescriptor,
  entity,
  isEntityDescriptor,
  // Collection
  type CollectionOptions,
  type CollectionDescriptor,
  type CollectionDescriptorBase,
  type CollectionQuery,
  type CollectionAllQuery,
  type CollectionByIdQuery,
  type EntityAccessor,
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
  type MigrationContext,
  type MigrationFn,
  type Migration,
  type VersionedSchema,
  createMigration,
  defineVersionedSchema,
  getMigrationPath,
  // File
  type FileOptions,
  type FileDescriptor,
  type FileCollectionOptions,
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

export {
  type MigrationResult,
  createFromAccessor,
  createToAccessor,
  runMigrations,
  needsMigration,
  getStoredSchemaVersion,
  setStoredSchemaVersion,
} from "./migrations";

export { anoriSchema, schemaV1, type AnoriSchemaV1, type Folder, type FolderDetails } from "./anori-schema";
export { initializeAnoriStorage, type AnoriStorage, type StorageInitResult } from "./anori-init";
