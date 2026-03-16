import browser from "webextension-polyfill";
import { createFilesStorage } from "./files";
import { type Hlc, type HlcState, type HlcTimestamp, compareHlc, createHlc, generateNodeId } from "./hlc";
import { HLC_STATE_KEY, OUTBOX_KEY } from "./keys";
import { type Query, extractIdFromKey, isKeyMatchingPrefix, resolveQuery } from "./query";
import type { CellDescriptor } from "./schema/cell";
import type { CollectionAllQuery, CollectionByIdQuery } from "./schema/collection";
import { isFileCollectionAllQuery, isFileCollectionByIdQuery, isFileDescriptor } from "./schema/file";
import type { VersionedSchema } from "./schema/versioned";
import { createBackupInterface } from "./storage-backup";
import { createSchemaHelpers } from "./storage-helpers";
import { createSyncInterface } from "./storage-sync";
import type {
  ChangeCallback,
  ChangeInfo,
  ChangeSource,
  CreateStorageOptions,
  Outbox,
  OutboxEntry,
  OutboxSubscription,
  Storage,
  StorageFork,
  StorageInternalContext,
  Subscription,
  ValueWithMeta,
} from "./storage-types";
import { type StorageRecord, isStorageRecord } from "./types";

// Re-export types that external consumers import from this module
export type {
  OutboxEntry,
  ChangeSource,
  ChangeInfo,
  ChangeCallback,
  OutboxChangeCallback,
  ValueMeta,
  ValueWithMeta,
  StorageFork,
  Storage,
  CreateStorageOptions,
} from "./storage-types";

export function createStorage<S extends VersionedSchema>(options: CreateStorageOptions<S>): Storage<S> {
  const versionedSchema = options.schema;
  const latestSchema = versionedSchema.latestSchema;
  const storageId = generateNodeId();
  const { isKeyTracked, isKeyBackupEligible, isFileKey } = createSchemaHelpers(latestSchema.definition);

  let hlc: Hlc | null = null;
  let initialized = false;
  let outboxEnabled = false;
  let cache: Record<string, unknown> = {};
  const subscriptions: Subscription[] = [];
  const outboxSubscriptions: OutboxSubscription[] = [];
  // Track HLCs of records we've already notified about (to skip duplicate onChanged events)
  const pendingNotifications = new Map<string, HlcTimestamp>();

  // Batched persistence: accumulates dirty keys and flushes them in a single browser.storage.local.set call
  const pendingPersistKeys = new Set<string>();
  let persistFlushPromise: Promise<void> | null = null;
  let persistFlushResolve: (() => void) | null = null;

  function schedulePersist(key: string): void {
    pendingPersistKeys.add(key);
    if (!persistFlushPromise) {
      persistFlushPromise = new Promise<void>((resolve) => {
        persistFlushResolve = resolve;
      });
      queueMicrotask(flushPersist);
    }
  }

  async function flushPersist(): Promise<void> {
    if (!persistFlushResolve) return;
    const batch: Record<string, unknown> = {};
    for (const key of pendingPersistKeys) {
      batch[key] = cache[key];
    }
    pendingPersistKeys.clear();
    const resolve = persistFlushResolve;
    persistFlushPromise = null;
    persistFlushResolve = null;
    await browser.storage.local.set(batch);
    resolve();
  }

  function waitForPersist(): Promise<void> {
    return persistFlushPromise ?? Promise.resolve();
  }

  function ensureInitialized(): void {
    if (!initialized) {
      throw new Error("Storage not initialized. Call initialize() first.");
    }
  }

  function notifyOutboxSubscribers(key: string, type: "kv" | "file", record: StorageRecord<unknown>): void {
    for (const sub of outboxSubscriptions) {
      sub.callback({
        key,
        record,
        type,
      });
    }
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

  function persistHlcState(): void {
    const state = getHlc().getState();
    cache[HLC_STATE_KEY] = state;
    schedulePersist(HLC_STATE_KEY);
  }

  function persistRecord(key: string, record: StorageRecord<unknown>, options?: { notifyAs?: ChangeSource }): void {
    const oldCachedValue = cache[key];
    const oldRecord = isStorageRecord(oldCachedValue) ? oldCachedValue : undefined;
    const oldValue = oldRecord?.deleted ? undefined : oldRecord?.value;
    const newValue = record.deleted ? undefined : record.value;

    // Mark this HLC as pending BEFORE writing, so onChanged can skip it
    if (options?.notifyAs) {
      pendingNotifications.set(key, record.hlc);
    }

    cache[key] = record;
    schedulePersist(key);

    if (options?.notifyAs && (oldValue !== undefined || newValue !== undefined)) {
      notifySubscribers(key, newValue, oldValue, options.notifyAs);
    }
  }

  function persistOutbox(outbox: Outbox): void {
    setOutboxInCache(outbox);
    schedulePersist(OUTBOX_KEY);
  }

  function addToOutbox(key: string, type: "kv" | "file", hlcTs: HlcTimestamp): void {
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

    persistOutbox(outbox);

    const record = cache[key];
    if (isStorageRecord(record)) {
      notifyOutboxSubscribers(key, type, record);
    }
  }

  function notifySubscribers(
    key: string,
    newValue: unknown,
    oldValue: unknown,
    source: ChangeSource,
    sourceId?: string,
  ): void {
    const info: ChangeInfo = { source };

    for (const sub of subscriptions) {
      // Skip if subscription's sourceId matches write sourceId (it's the fork's own echo)
      if (sub.sourceId && sourceId && sub.sourceId === sourceId) {
        continue;
      }

      if (sub.query.type === "cell" && sub.query.key === key) {
        sub.callback(newValue, oldValue, info);
      } else if (sub.query.type === "collectionById" && sub.query.key === key) {
        sub.callback(newValue, oldValue, info);
      } else if (sub.query.type === "collectionAll" && isKeyMatchingPrefix(key, sub.query.keyPrefix)) {
        // For collection.all(), rebuild the full record and notify
        const allRecords = getCollectionAll(sub.query.keyPrefix, sub.query.brand);
        sub.callback(allRecords, undefined, info);
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

        // Skip if this is a write we already notified about (e.g., remote sync)
        const pendingHlc = pendingNotifications.get(key);
        if (newRecord && pendingHlc && compareHlc(newRecord.hlc, pendingHlc) === 0) {
          pendingNotifications.delete(key);
          // Still update cache
          cache[key] = change.newValue;
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
          notifySubscribers(key, newValue, oldValue, "external");
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
    const source: ChangeSource = sourceId ? "fork" : "local";
    notifySubscribers(resolved.key, value, oldValue, source, sourceId);

    schedulePersist(resolved.key);
    persistHlcState();

    if (outboxEnabled && "tracked" in query && query.tracked) {
      const type = isFileDescriptor(query) || isFileCollectionByIdQuery(query) ? "file" : "kv";
      addToOutbox(resolved.key, type, hlcTs);
    }

    await waitForPersist();
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
    const source: ChangeSource = sourceId ? "fork" : "local";
    notifySubscribers(resolved.key, undefined, oldValue, source, sourceId);

    schedulePersist(resolved.key);
    persistHlcState();

    if (outboxEnabled && "tracked" in query && query.tracked) {
      const type = isFileDescriptor(query) || isFileCollectionByIdQuery(query) ? "file" : "kv";
      addToOutbox(resolved.key, type, hlcTs);
    }

    await waitForPersist();
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

  // Build internal context for extracted subsystems
  const ctx: StorageInternalContext = {
    cache,
    getHlc,
    ensureInitialized,
    persistRecord,
    persistHlcState,
    persistOutbox,
    waitForPersist,
    getOutboxFromCache,
    notifyOutboxSubscribers,
    isKeyTracked,
    isKeyBackupEligible,
    isFileKey,
    outboxSubscriptions,
    getOutboxEnabled: () => outboxEnabled,
    currentSchemaVersion: versionedSchema.currentVersion,
  };

  const syncInterface = createSyncInterface(ctx);
  const backupInterface = createBackupInterface(ctx);

  const storage: Storage<S> = {
    schema: latestSchema.definition,

    async initialize(): Promise<void> {
      if (initialized) return;

      // Load entire storage into memory
      const allData = await browser.storage.local.get(null);
      cache = { ...allData };
      // Update ctx.cache reference since we reassigned cache
      ctx.cache = cache;

      // Load or create HLC state
      const hlcState = allData[HLC_STATE_KEY] as HlcState | undefined;

      if (hlcState) {
        hlc = createHlc(hlcState.nodeId, hlcState.last);
      } else {
        const nodeId = generateNodeId();
        hlc = createHlc(nodeId);
        persistHlcState();
        await waitForPersist();
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
      ...syncInterface,
      enableOutbox(): void {
        outboxEnabled = true;
      },
      disableOutbox(): void {
        outboxEnabled = false;
      },
    },

    ...backupInterface,

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
      subscribe(query, callback) {
        return subscribeInternal(query, callback);
      },
    }),
  };

  return storage;
}
