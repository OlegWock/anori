import type { HlcTimestamp } from "../hlc";
import type { CellDescriptor } from "../schema/cell";
import type { CollectionAllQuery, CollectionByIdQuery } from "../schema/collection";
import type { SchemaDefinition } from "../schema/version";
import type { MigrationFromAccessor, MigrationToAccessor, MigrationWriteOptions } from "../schema/versioned";
import { isStorageRecord, type StorageRecord } from "../types";

function resolveKey(query: CellDescriptor | CollectionByIdQuery): { key: string; brand?: string } {
  if ("key" in query) {
    return { key: query.key };
  }
  if ("queryType" in query && query.queryType === "byId") {
    return { key: `${query.keyPrefix}:${query.id}`, brand: query.brand };
  }
  throw new Error("Cannot resolve key from collection.all() query");
}

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
    getRecord<T>(query: CellDescriptor<T> | CollectionByIdQuery<T>): StorageRecord<T> | undefined {
      const { key } = resolveKey(query);
      const record = snapshot[key];
      return isStorageRecord(record) ? (record as StorageRecord<T>) : undefined;
    },
  } as MigrationFromAccessor<S>;
}

export function createToAccessor<S extends SchemaDefinition>(
  schema: S,
  target: Record<string, StorageRecord<unknown>>,
  snapshot: Record<string, unknown>,
  hlcTick: () => HlcTimestamp,
): MigrationToAccessor<S> {
  // A migration re-encodes existing edits, so by default a write inherits the source cell's
  // hlc (same key) and only ticks a fresh one for a genuinely new key. `tick`/`hlc` override.
  function resolveHlc(key: string, options?: MigrationWriteOptions): HlcTimestamp {
    if (options?.hlc) return options.hlc;
    if (options?.tick) return hlcTick();
    const source = snapshot[key];
    if (isStorageRecord(source)) return source.hlc;
    return hlcTick();
  }

  return {
    schema,
    set<T>(query: CellDescriptor<T> | CollectionByIdQuery<T>, value: T, options?: MigrationWriteOptions): void {
      const { key, brand } = resolveKey(query);
      const record: StorageRecord<T> = { hlc: resolveHlc(key, options), value };
      if (brand) {
        record.brand = brand;
      }
      target[key] = record as StorageRecord<unknown>;
    },

    delete(query: CellDescriptor | CollectionByIdQuery, options?: MigrationWriteOptions): void {
      const { key, brand } = resolveKey(query);
      const record: StorageRecord<null> = {
        hlc: resolveHlc(key, options),
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
