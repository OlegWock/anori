import type { CellDescriptor } from "../schema/cell";
import type { CollectionAllQuery, CollectionByIdQuery } from "../schema/collection";
import type { SchemaDefinition } from "../schema/version";
import type { MigrationFromAccessor, MigrationToAccessor } from "../schema/versioned";
import { type StorageRecord, isStorageRecord } from "../types";

export function createFromAccessor<S extends SchemaDefinition>(
  schema: S,
  snapshot: Record<string, unknown>,
): MigrationFromAccessor<S> {
  function getValue<T>(key: string): T | undefined {
    const record = snapshot[key];
    if (!isStorageRecord(record) || record.deleted) {
      return undefined;
    }
    return record.value as T;
  }

  function getCollectionAll<T>(keyPrefix: string, brand?: string): Record<string, T> {
    const result: Record<string, T> = {};
    const prefixWithColon = `${keyPrefix}:`;
    for (const [key, value] of Object.entries(snapshot)) {
      if (!key.startsWith(prefixWithColon)) continue;
      if (!isStorageRecord(value) || value.deleted) continue;
      if (brand && value.brand !== brand) continue;

      const id = key.slice(prefixWithColon.length);
      result[id] = value.value as T;
    }
    return result;
  }

  return {
    schema,
    get<T>(
      query: CellDescriptor<T> | CollectionByIdQuery<T> | CollectionAllQuery<T>,
    ): T | undefined | Record<string, T> {
      if ("key" in query) {
        const value = getValue<T>(query.key);
        if (value === undefined && "defaultValue" in query) {
          return query.defaultValue;
        }
        return value;
      }

      if ("queryType" in query) {
        if (query.queryType === "all") {
          return getCollectionAll<T>(query.keyPrefix, query.brand);
        }
        return getValue<T>(`${query.keyPrefix}:${query.id}`);
      }

      return undefined;
    },
  } as MigrationFromAccessor<S>;
}

export function createToAccessor<S extends SchemaDefinition>(
  schema: S,
  target: Record<string, StorageRecord<unknown>>,
  hlcTick: () => { pt: number; lc: number; node: string },
): MigrationToAccessor<S> {
  return {
    schema,
    set<T>(query: CellDescriptor<T> | CollectionByIdQuery<T>, value: T): void {
      let key: string;
      let brand: string | undefined;

      if ("key" in query) {
        key = query.key;
      } else if ("queryType" in query && query.queryType === "byId") {
        key = `${query.keyPrefix}:${query.id}`;
        brand = query.brand;
      } else {
        throw new Error("Cannot set with collection.all() query");
      }

      const record: StorageRecord<T> = {
        hlc: hlcTick(),
        value,
      };

      if (brand) {
        record.brand = brand;
      }

      target[key] = record as StorageRecord<unknown>;
    },

    delete(query: CellDescriptor | CollectionByIdQuery): void {
      let key: string;
      let brand: string | undefined;

      if ("key" in query) {
        key = query.key;
      } else if ("queryType" in query && query.queryType === "byId") {
        key = `${query.keyPrefix}:${query.id}`;
        brand = query.brand;
      } else {
        throw new Error("Cannot delete with collection.all() query");
      }

      const record: StorageRecord<null> = {
        hlc: hlcTick(),
        value: null,
        deleted: true,
      };

      if (brand) {
        record.brand = brand;
      }

      target[key] = record;
    },
  } as MigrationToAccessor<S>;
}
