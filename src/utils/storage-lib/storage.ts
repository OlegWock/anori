import browser from "webextension-polyfill";
import { type FilesStorage, createFilesStorage } from "./files";
import { type Hlc, type HlcState, type HlcTimestamp, compareHlc, createHlc, generateNodeId } from "./hlc";
import { HLC_STATE_KEY, OUTBOX_KEY } from "./keys";
import { type Query, type ResolvedQuery, extractIdFromKey, isKeyMatchingPrefix, resolveQuery } from "./query";
import { type CellDescriptor, isCellDescriptor } from "./schema/cell";
import { type CollectionAllQuery, type CollectionByIdQuery, isCollectionDescriptor } from "./schema/collection";
import {
  isFileCollectionAllQuery,
  isFileCollectionByIdQuery,
  isFileCollectionDescriptor,
  isFileDescriptor,
} from "./schema/file";
import type { VersionedSchema } from "./schema/versioned";
import { type StorageRecord, isStorageRecord } from "./types";

export type OutboxEntry = {
  key: string;
  type: "kv" | "file";
  hlc: HlcTimestamp;
  addedAt: number;
};

type Outbox = OutboxEntry[];

type ChangeCallback<T = unknown> = (value: T | undefined, oldValue: T | undefined) => void;

type Subscription = {
  query: ResolvedQuery;
  callback: ChangeCallback;
  sourceId?: string;
};

export type ValueMeta = {
  isDefault: boolean;
};

export type ValueWithMeta<T> = {
  value: T;
  meta: ValueMeta;
};

type StorageQueryInterface = {
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
    getOutbox(): Outbox;
    removeFromOutbox(keys: string[]): Promise<void>;
    clearOutbox(): Promise<void>;
    exportForFullSync(): Record<string, StorageRecord<unknown>>;
    exportOutbox(): Record<string, StorageRecord<unknown>>;
    mergeRemoteChanges(
      changes: { key: string; record: StorageRecord<unknown>; schemaVersion: number }[],
    ): Promise<{ applied: string[]; skipped: string[] }>;
  };

  files: FilesStorage;
};

export type CreateStorageOptions<S extends VersionedSchema = VersionedSchema> = {
  schema: S;
};

export function createStorage<S extends VersionedSchema>(options: CreateStorageOptions<S>): Storage<S> {
  const versionedSchema = options.schema;
  const latestSchema = versionedSchema.latestSchema;
  const storageId = generateNodeId();

  let hlc: Hlc | null = null;
  let initialized = false;
  let cache: Record<string, unknown> = {};
  const subscriptions: Subscription[] = [];

  function ensureInitialized(): void {
    if (!initialized) {
      throw new Error("Storage not initialized. Call initialize() first.");
    }
  }

  function isKeyTracked(key: string): boolean {
    for (const descriptor of Object.values(latestSchema.definition)) {
      if (isCellDescriptor(descriptor) || isFileDescriptor(descriptor)) {
        if (descriptor.key === key && descriptor.tracked) {
          return true;
        }
      } else if (isCollectionDescriptor(descriptor) || isFileCollectionDescriptor(descriptor)) {
        if (isKeyMatchingPrefix(key, descriptor.keyPrefix) && descriptor.tracked) {
          return true;
        }
      }
    }
    return false;
  }

  function getHlc(): Hlc {
    if (!hlc) {
      throw new Error("HLC not initialized");
    }
    return hlc;
  }

  function getOutboxFromCache(): Outbox {
    return (cache[OUTBOX_KEY] as Outbox) || [];
  }

  function setOutboxInCache(outbox: Outbox): void {
    cache[OUTBOX_KEY] = outbox;
  }

  async function persistHlcState(): Promise<void> {
    const state = getHlc().getState();
    cache[HLC_STATE_KEY] = state;
    await browser.storage.local.set({ [HLC_STATE_KEY]: state });
  }

  async function persistRecord(key: string, record: StorageRecord<unknown>): Promise<void> {
    cache[key] = record;
    await browser.storage.local.set({ [key]: record });
  }

  async function persistOutbox(outbox: Outbox): Promise<void> {
    setOutboxInCache(outbox);
    await browser.storage.local.set({ [OUTBOX_KEY]: outbox });
  }

  async function addToOutbox(key: string, type: "kv" | "file", hlcTs: HlcTimestamp): Promise<void> {
    const outbox = getOutboxFromCache();
    const existingIndex = outbox.findIndex((e) => e.key === key);
    const entry: OutboxEntry = {
      key,
      type,
      hlc: hlcTs,
      addedAt: Date.now(),
    };

    if (existingIndex >= 0) {
      outbox[existingIndex] = entry;
    } else {
      outbox.push(entry);
    }

    await persistOutbox(outbox);
  }

  function notifySubscribers(key: string, newValue: unknown, oldValue: unknown, sourceId?: string): void {
    for (const sub of subscriptions) {
      // Skip if subscription's sourceId matches write sourceId (it's the fork's own echo)
      if (sub.sourceId && sourceId && sub.sourceId === sourceId) {
        continue;
      }

      if (sub.query.type === "cell" && sub.query.key === key) {
        sub.callback(newValue, oldValue);
      } else if (sub.query.type === "collectionById" && sub.query.key === key) {
        sub.callback(newValue, oldValue);
      } else if (sub.query.type === "collectionAll" && isKeyMatchingPrefix(key, sub.query.keyPrefix)) {
        // For collection.all(), rebuild the full record and notify
        const allRecords = getCollectionAll(sub.query.keyPrefix, sub.query.brand);
        sub.callback(allRecords, undefined);
      }
    }
  }

  function getCollectionAll<T>(keyPrefix: string, brand?: string): Record<string, T> {
    const records: Record<string, T> = {};

    for (const [key, value] of Object.entries(cache)) {
      if (!isKeyMatchingPrefix(key, keyPrefix)) continue;
      if (!isStorageRecord(value)) continue;
      if (value.deleted) continue;
      if (brand && value.brand !== brand) continue;

      const id = extractIdFromKey(key, keyPrefix);
      if (id) {
        records[id] = value.value as T;
      }
    }

    return records;
  }

  function setupChangeListener(): void {
    browser.storage.local.onChanged.addListener((changes) => {
      for (const [key, change] of Object.entries(changes)) {
        if (key === HLC_STATE_KEY || key === OUTBOX_KEY) {
          // Just update cache for internal keys
          if (change.newValue === undefined) {
            delete cache[key];
          } else {
            cache[key] = change.newValue;
          }
          continue;
        }

        const newRecord = isStorageRecord(change.newValue) ? change.newValue : undefined;

        // Skip events from this storage instance - we already handled them synchronously
        if (newRecord?.writerId === storageId) {
          continue;
        }

        // Update cache for external changes
        if (change.newValue === undefined) {
          delete cache[key];
        } else {
          cache[key] = change.newValue;
        }

        const oldRecord = isStorageRecord(change.oldValue) ? change.oldValue : undefined;
        const oldValue = oldRecord?.deleted ? undefined : oldRecord?.value;
        const newValue = newRecord?.deleted ? undefined : newRecord?.value;

        if (oldValue !== undefined || newValue !== undefined) {
          notifySubscribers(key, newValue, oldValue);
        }
      }
    });
  }

  async function setInternal<T>(query: Query, value: T, sourceId?: string): Promise<void> {
    const resolved = resolveQuery(query);

    if (resolved.type === "collectionAll") {
      throw new Error("Cannot set value for collection.all() query. Use byId() instead.");
    }

    const oldCachedValue = cache[resolved.key];
    const oldRecord = isStorageRecord(oldCachedValue) ? oldCachedValue : undefined;
    const oldValue = oldRecord?.deleted ? undefined : oldRecord?.value;

    const hlcTs = getHlc().tick();

    const record: StorageRecord<T> = {
      hlc: hlcTs,
      value,
      writerId: storageId,
    };

    if (resolved.type === "collectionById" && resolved.brand) {
      record.brand = resolved.brand;
    }

    cache[resolved.key] = record;
    notifySubscribers(resolved.key, value, oldValue, sourceId);

    await browser.storage.local.set({ [resolved.key]: record });
    await persistHlcState();

    if ("tracked" in query && query.tracked) {
      await addToOutbox(resolved.key, "kv", hlcTs);
    }
  }

  async function deleteInternal(query: Query, sourceId?: string): Promise<void> {
    const resolved = resolveQuery(query);

    if (resolved.type === "collectionAll") {
      throw new Error("Cannot delete with collection.all() query. Use byId() instead.");
    }

    const existingValue = cache[resolved.key];
    const existingRecord = isStorageRecord(existingValue) ? existingValue : undefined;
    const oldValue = existingRecord?.deleted ? undefined : existingRecord?.value;

    const hlcTs = getHlc().tick();

    const record: StorageRecord<null> = {
      hlc: hlcTs,
      deleted: true,
      value: null,
      writerId: storageId,
    };

    if (existingRecord?.brand) {
      record.brand = existingRecord.brand;
    }

    cache[resolved.key] = record;
    notifySubscribers(resolved.key, undefined, oldValue, sourceId);
    await browser.storage.local.set({ [resolved.key]: record });
    await persistHlcState();

    if ("tracked" in query && query.tracked) {
      await addToOutbox(resolved.key, "kv", hlcTs);
    }
  }

  function getWithMetaInternal<T>(query: Query): ValueWithMeta<T | undefined> | ValueWithMeta<Record<string, T>> {
    const resolved = resolveQuery(query);

    if (resolved.type === "cell" || resolved.type === "collectionById") {
      const cachedValue = cache[resolved.key];
      const record = isStorageRecord(cachedValue) ? cachedValue : undefined;

      if (!record || record.deleted) {
        if (resolved.type === "cell" && "defaultValue" in query) {
          return {
            value: (query as CellDescriptor<T>).defaultValue,
            meta: { isDefault: true },
          };
        }
        return { value: undefined, meta: { isDefault: false } };
      }

      if (resolved.type === "collectionById" && resolved.brand && record.brand !== resolved.brand) {
        return { value: undefined, meta: { isDefault: false } };
      }

      return {
        value: (record.value as T) ?? undefined,
        meta: { isDefault: false },
      };
    }

    return {
      value: getCollectionAll<T>(resolved.keyPrefix, resolved.brand),
      meta: { isDefault: false },
    };
  }

  function subscribeInternal<T>(
    query: Query,
    callback: ChangeCallback<T> | ChangeCallback<Record<string, T>>,
    sourceId?: string,
  ): () => void {
    const resolved = resolveQuery(query);
    const subscription: Subscription = {
      query: resolved,
      callback: callback as ChangeCallback,
      sourceId,
    };

    subscriptions.push(subscription);

    return () => {
      const index = subscriptions.indexOf(subscription);
      if (index >= 0) {
        subscriptions.splice(index, 1);
      }
    };
  }

  function createFork(): StorageFork {
    const forkId = generateNodeId();

    return {
      id: forkId,

      getWithMeta<T>(
        query: CellDescriptor<T> | CollectionByIdQuery<T> | CollectionAllQuery<T>,
      ): ValueWithMeta<T | undefined> | ValueWithMeta<Record<string, T>> {
        ensureInitialized();

        if (isFileDescriptor(query) || isFileCollectionByIdQuery(query) || isFileCollectionAllQuery(query)) {
          throw new Error("Cannot use fork.getWithMeta() with file queries.");
        }

        return getWithMetaInternal<T>(query);
      },

      get<T>(
        query: CellDescriptor<T> | CollectionByIdQuery<T> | CollectionAllQuery<T>,
      ): T | undefined | Record<string, T> {
        ensureInitialized();

        if (isFileDescriptor(query) || isFileCollectionByIdQuery(query) || isFileCollectionAllQuery(query)) {
          throw new Error("Cannot use fork.get() with file queries.");
        }

        return getWithMetaInternal<T>(query).value;
      },

      async set<T>(query: CellDescriptor<T> | CollectionByIdQuery<T>, value: T): Promise<void> {
        ensureInitialized();

        if (isFileDescriptor(query) || isFileCollectionByIdQuery(query)) {
          throw new Error("Cannot use fork.set() with file queries.");
        }

        await setInternal(query, value, forkId);
      },

      async delete(query: CellDescriptor | CollectionByIdQuery): Promise<void> {
        ensureInitialized();

        if (isFileDescriptor(query) || isFileCollectionByIdQuery(query)) {
          throw new Error("Cannot use fork.delete() with file queries.");
        }

        await deleteInternal(query, forkId);
      },

      subscribe<T>(
        query: CellDescriptor<T> | CollectionByIdQuery<T> | CollectionAllQuery<T>,
        callback: ChangeCallback<T> | ChangeCallback<Record<string, T>>,
      ): () => void {
        if (isFileDescriptor(query) || isFileCollectionByIdQuery(query) || isFileCollectionAllQuery(query)) {
          throw new Error("Cannot use fork.subscribe() with file queries.");
        }

        return subscribeInternal(query, callback, forkId);
      },
    };
  }

  const storage: Storage<S> = {
    schema: latestSchema.definition,

    async initialize(): Promise<void> {
      if (initialized) return;

      // Load entire storage into memory
      const allData = await browser.storage.local.get(null);
      cache = { ...allData };

      // Load or create HLC state
      const hlcState = allData[HLC_STATE_KEY] as HlcState | undefined;

      if (hlcState) {
        hlc = createHlc(hlcState.nodeId, hlcState.last);
      } else {
        const nodeId = generateNodeId();
        hlc = createHlc(nodeId);
        await persistHlcState();
      }

      // Initialize outbox if not present
      if (!cache[OUTBOX_KEY]) {
        setOutboxInCache([]);
      }

      setupChangeListener();
      initialized = true;
    },

    getWithMeta<T>(
      query: CellDescriptor<T> | CollectionByIdQuery<T> | CollectionAllQuery<T>,
    ): ValueWithMeta<T | undefined> | ValueWithMeta<Record<string, T>> {
      ensureInitialized();

      if (isFileDescriptor(query) || isFileCollectionByIdQuery(query) || isFileCollectionAllQuery(query)) {
        throw new Error(
          "Cannot use storage.getWithMeta() with file queries. Use filesStorage.get() or filesStorage.getMeta() instead.",
        );
      }

      return getWithMetaInternal<T>(query);
    },

    get<T>(
      query: CellDescriptor<T> | CollectionByIdQuery<T> | CollectionAllQuery<T>,
    ): T | undefined | Record<string, T> {
      ensureInitialized();

      if (isFileDescriptor(query) || isFileCollectionByIdQuery(query) || isFileCollectionAllQuery(query)) {
        throw new Error(
          "Cannot use storage.get() with file queries. Use filesStorage.get() or filesStorage.getMeta() instead.",
        );
      }

      return getWithMetaInternal<T>(query).value;
    },

    async set<T>(query: CellDescriptor<T> | CollectionByIdQuery<T>, value: T): Promise<void> {
      ensureInitialized();

      if (isFileDescriptor(query) || isFileCollectionByIdQuery(query)) {
        throw new Error("Cannot use storage.set() with file queries. Use filesStorage.set() instead.");
      }

      await setInternal(query, value);
    },

    async delete(query: CellDescriptor | CollectionByIdQuery): Promise<void> {
      ensureInitialized();

      if (isFileDescriptor(query) || isFileCollectionByIdQuery(query)) {
        throw new Error("Cannot use storage.delete() with file queries. Use filesStorage.delete() instead.");
      }

      await deleteInternal(query);
    },

    subscribe<T>(
      query: CellDescriptor<T> | CollectionByIdQuery<T> | CollectionAllQuery<T>,
      callback: ChangeCallback<T> | ChangeCallback<Record<string, T>>,
    ): () => void {
      if (isFileDescriptor(query) || isFileCollectionByIdQuery(query) || isFileCollectionAllQuery(query)) {
        throw new Error("Cannot use storage.subscribe() with file queries. Use filesStorage for file operations.");
      }

      return subscribeInternal(query, callback);
    },

    fork(): StorageFork {
      return createFork();
    },

    sync: {
      getOutbox(): Outbox {
        ensureInitialized();
        return getOutboxFromCache();
      },

      async removeFromOutbox(keys: string[]): Promise<void> {
        ensureInitialized();
        const outbox = getOutboxFromCache();
        const filtered = outbox.filter((e) => !keys.includes(e.key));
        await persistOutbox(filtered);
      },

      async clearOutbox(): Promise<void> {
        ensureInitialized();
        await persistOutbox([]);
      },

      exportForFullSync(): Record<string, StorageRecord<unknown>> {
        ensureInitialized();
        const result: Record<string, StorageRecord<unknown>> = {};

        for (const [key, value] of Object.entries(cache)) {
          if (!isStorageRecord(value)) continue;
          if (!isKeyTracked(key)) continue;
          result[key] = value;
        }

        return result;
      },

      exportOutbox(): Record<string, StorageRecord<unknown>> {
        ensureInitialized();
        const outbox = getOutboxFromCache();
        const result: Record<string, StorageRecord<unknown>> = {};

        for (const entry of outbox) {
          const value = cache[entry.key];
          if (isStorageRecord(value)) {
            result[entry.key] = value;
          }
        }

        return result;
      },

      async mergeRemoteChanges(
        changes: { key: string; record: StorageRecord<unknown>; schemaVersion: number }[],
      ): Promise<{ applied: string[]; skipped: string[] }> {
        ensureInitialized();
        const applied: string[] = [];
        const skipped: string[] = [];
        const currentSchemaVersion = versionedSchema.currentVersion;

        for (const { key, record, schemaVersion } of changes) {
          // Skip if schema version doesn't match
          if (schemaVersion !== currentSchemaVersion) {
            skipped.push(key);
            continue;
          }

          // Get local record
          const localValue = cache[key];
          const localRecord = isStorageRecord(localValue) ? localValue : undefined;

          // Compare HLC - remote wins if newer
          const shouldApply = !localRecord || compareHlc(record.hlc, localRecord.hlc) > 0;

          if (shouldApply) {
            await persistRecord(key, record);
            applied.push(key);
          } else {
            skipped.push(key);
          }

          // Update local HLC with remote timestamp (even if not applied)
          getHlc().receive(record.hlc);
        }

        await persistHlcState();
        return { applied, skipped };
      },
    },

    files: createFilesStorage({
      getMeta(query) {
        ensureInitialized();
        return getWithMetaInternal(query).value;
      },
      async setMeta(query, value) {
        ensureInitialized();
        await setInternal(query, value);
      },
      async deleteMeta(query) {
        ensureInitialized();
        await deleteInternal(query);
      },
    }),
  };

  return storage;
}
