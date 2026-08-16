import type { z } from "zod";
import type { FileMetaValue } from "../types";
import type { SyncMode } from "./sync-mode";

const FILE_TYPE = Symbol("file");
const FILE_COLLECTION_TYPE = Symbol("fileCollection");
const FILE_QUERY_TYPE = Symbol("fileQuery");

type FileOptions<P> = {
  key: string;
  sync: SyncMode;
  includedInBackup: boolean;
  propertiesSchema?: z.ZodType<P>;
};

export type FileDescriptor<P = unknown> = {
  readonly _type: typeof FILE_TYPE;
  readonly _propertiesType: P;
  readonly _valueType: FileMetaValue<P>;
  readonly key: string;
  readonly sync: SyncMode;
  readonly includedInBackup: boolean;
  readonly propertiesSchema?: z.ZodType<P>;
};

type FileCollectionOptions<P> = {
  keyPrefix: string;
  sync: SyncMode;
  includedInBackup: boolean;
  propertiesSchema?: z.ZodType<P>;
};

export type FileCollectionAllQuery<P = unknown> = {
  readonly _type: typeof FILE_QUERY_TYPE;
  readonly _propertiesType: P;
  readonly _valueType: FileMetaValue<P>;
  readonly queryType: "all";
  readonly keyPrefix: string;
  readonly sync: SyncMode;
};

export type FileCollectionByIdQuery<P = unknown> = {
  readonly _type: typeof FILE_QUERY_TYPE;
  readonly _propertiesType: P;
  readonly _valueType: FileMetaValue<P>;
  readonly queryType: "byId";
  readonly keyPrefix: string;
  readonly id: string;
  readonly sync: SyncMode;
};

export type FileCollectionQuery<P = unknown> = FileCollectionAllQuery<P> | FileCollectionByIdQuery<P>;

export type FileCollectionDescriptor<P = unknown> = {
  readonly _type: typeof FILE_COLLECTION_TYPE;
  readonly _propertiesType: P;
  readonly _valueType: FileMetaValue<P>;
  readonly keyPrefix: string;
  readonly sync: SyncMode;
  readonly includedInBackup: boolean;
  readonly propertiesSchema?: z.ZodType<P>;
  all(): FileCollectionAllQuery<P>;
  byId(id: string): FileCollectionByIdQuery<P>;
};

export function file<P = undefined>(options: FileOptions<P>): FileDescriptor<P> {
  return {
    _type: FILE_TYPE,
    _propertiesType: undefined as unknown as P,
    _valueType: undefined as unknown as FileMetaValue<P>,
    key: options.key,
    sync: options.sync,
    includedInBackup: options.includedInBackup,
    propertiesSchema: options.propertiesSchema,
  };
}

export function fileCollection<P = undefined>(options: FileCollectionOptions<P>): FileCollectionDescriptor<P> {
  const { keyPrefix, sync, propertiesSchema } = options;
  const includedInBackup = options.includedInBackup;

  return {
    _type: FILE_COLLECTION_TYPE,
    _propertiesType: undefined as unknown as P,
    _valueType: undefined as unknown as FileMetaValue<P>,
    keyPrefix,
    sync,
    includedInBackup,
    propertiesSchema,

    all(): FileCollectionAllQuery<P> {
      return {
        _type: FILE_QUERY_TYPE,
        _propertiesType: undefined as unknown as P,
        _valueType: undefined as unknown as FileMetaValue<P>,
        queryType: "all",
        keyPrefix,
        sync,
      };
    },

    byId(id: string): FileCollectionByIdQuery<P> {
      return {
        _type: FILE_QUERY_TYPE,
        _propertiesType: undefined as unknown as P,
        _valueType: undefined as unknown as FileMetaValue<P>,
        queryType: "byId",
        keyPrefix,
        id,
        sync,
      };
    },
  };
}

export function isFileDescriptor(value: unknown): value is FileDescriptor {
  return typeof value === "object" && value !== null && "_type" in value && value._type === FILE_TYPE;
}

export function isFileCollectionDescriptor(value: unknown): value is FileCollectionDescriptor {
  return typeof value === "object" && value !== null && "_type" in value && value._type === FILE_COLLECTION_TYPE;
}

export function isFileQuery(value: unknown): value is FileDescriptor | FileCollectionQuery {
  if (typeof value !== "object" || value === null || !("_type" in value)) {
    return false;
  }
  return value._type === FILE_TYPE || value._type === FILE_QUERY_TYPE;
}

export function isFileCollectionAllQuery(value: unknown): value is FileCollectionAllQuery {
  return (
    typeof value === "object" &&
    value !== null &&
    "_type" in value &&
    value._type === FILE_QUERY_TYPE &&
    "queryType" in value &&
    value.queryType === "all"
  );
}

export function isFileCollectionByIdQuery(value: unknown): value is FileCollectionByIdQuery {
  return (
    typeof value === "object" &&
    value !== null &&
    "_type" in value &&
    value._type === FILE_QUERY_TYPE &&
    "queryType" in value &&
    value.queryType === "byId"
  );
}
