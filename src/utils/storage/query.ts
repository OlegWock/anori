import { type CellDescriptor, isCellDescriptor } from "./schema/cell";
import {
  type CollectionAllQuery,
  type CollectionByIdQuery,
  type CollectionQuery,
  isCollectionAllQuery,
  isCollectionByIdQuery,
} from "./schema/collection";
import {
  type FileCollectionAllQuery,
  type FileCollectionByIdQuery,
  type FileCollectionQuery,
  type FileDescriptor,
  isFileCollectionAllQuery,
  isFileCollectionByIdQuery,
  isFileDescriptor,
} from "./schema/file";

export type Query = CellDescriptor | CollectionQuery | FileDescriptor | FileCollectionQuery;

export type ResolvedCellQuery = {
  type: "cell";
  key: string;
};

export type ResolvedCollectionAllQuery = {
  type: "collectionAll";
  keyPrefix: string;
  brand?: string;
};

export type ResolvedCollectionByIdQuery = {
  type: "collectionById";
  key: string;
  brand?: string;
};

export type ResolvedQuery = ResolvedCellQuery | ResolvedCollectionAllQuery | ResolvedCollectionByIdQuery;

export function resolveQuery(query: CellDescriptor): ResolvedCellQuery;
export function resolveQuery(query: FileDescriptor): ResolvedCellQuery;
export function resolveQuery(query: CollectionAllQuery): ResolvedCollectionAllQuery;
export function resolveQuery(query: FileCollectionAllQuery): ResolvedCollectionAllQuery;
export function resolveQuery(query: CollectionByIdQuery): ResolvedCollectionByIdQuery;
export function resolveQuery(query: FileCollectionByIdQuery): ResolvedCollectionByIdQuery;
export function resolveQuery(query: Query): ResolvedQuery;
export function resolveQuery(query: Query): ResolvedQuery {
  if (isCellDescriptor(query)) {
    return {
      type: "cell",
      key: query.key,
    };
  }

  if (isFileDescriptor(query)) {
    return {
      type: "cell",
      key: query.key,
    };
  }

  if (isCollectionAllQuery(query)) {
    return {
      type: "collectionAll",
      keyPrefix: query.keyPrefix,
      brand: query.brand,
    };
  }

  if (isFileCollectionAllQuery(query)) {
    return {
      type: "collectionAll",
      keyPrefix: query.keyPrefix,
    };
  }

  if (isCollectionByIdQuery(query)) {
    return {
      type: "collectionById",
      key: `${query.keyPrefix}:${query.id}`,
      brand: query.brand,
    };
  }

  if (isFileCollectionByIdQuery(query)) {
    return {
      type: "collectionById",
      key: `${query.keyPrefix}:${query.id}`,
    };
  }

  throw new Error("Unknown query type");
}

export function getStorageKey(
  query: CellDescriptor | CollectionByIdQuery | FileDescriptor | FileCollectionByIdQuery,
): string {
  if (isCellDescriptor(query) || isFileDescriptor(query)) {
    return query.key;
  }
  if (isCollectionByIdQuery(query) || isFileCollectionByIdQuery(query)) {
    return `${query.keyPrefix}:${query.id}`;
  }
  throw new Error("Cannot get single storage key for collection.all() query");
}

export function isKeyMatchingPrefix(key: string, prefix: string): boolean {
  return key.startsWith(`${prefix}:`);
}

export function extractIdFromKey(key: string, prefix: string): string | null {
  if (!isKeyMatchingPrefix(key, prefix)) {
    return null;
  }
  return key.slice(prefix.length + 1);
}
