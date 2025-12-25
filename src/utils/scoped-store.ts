import { useWidgetMetadata } from "@anori/utils/plugins/widget";
import { type AnoriStorage, anoriSchema, getAnoriStorage } from "@anori/utils/storage";
import { type CollectionByIdQuery, useStorageValue } from "@anori/utils/storage-lib";
import { getQueryId } from "@anori/utils/storage-lib";
import type { ID, Mapping } from "@anori/utils/types";
import { type SetStateAction, useCallback, useMemo } from "react";

/**
 * A typed key-value store scoped to a specific collection entity.
 */
export class ScopedStore<T extends Mapping> {
  private query: CollectionByIdQuery<T>;
  private storage!: AnoriStorage;
  private _loadingPromise: Promise<void>;

  loaded: boolean;

  private static cache = new Map<string, ScopedStore<Mapping>>();

  static get<T extends Mapping>(query: CollectionByIdQuery<T>): ScopedStore<T> {
    const queryId = getQueryId(query);
    const cached = ScopedStore.cache.get(queryId);
    if (cached) {
      return cached as ScopedStore<T>;
    }

    const store = new ScopedStore<T>(query);
    ScopedStore.cache.set(queryId, store as ScopedStore<Mapping>);
    return store;
  }

  private constructor(query: CollectionByIdQuery<T>) {
    this.query = query;
    this.loaded = false;

    this._loadingPromise = getAnoriStorage().then((storage) => {
      this.storage = storage;
      this.loaded = true;
    });
  }

  waitForLoad(): Promise<this> {
    return this._loadingPromise.then(() => this);
  }

  get<K extends keyof T>(key: K): T[K] | undefined {
    const data = this.storage.get(this.query) as Partial<T> | undefined;
    return data?.[key];
  }

  async set<K extends keyof T>(key: K, value: T[K]): Promise<void> {
    const data = this.storage.get(this.query) as Partial<T> | undefined;
    await this.storage.set(this.query, { ...data, [key]: value } as T);
  }

  async setMany(values: Partial<T>): Promise<void> {
    const data = this.storage.get(this.query) as Partial<T> | undefined;
    await this.storage.set(this.query, { ...data, ...values } as T);
  }

  async delete<K extends keyof T>(key: K): Promise<void> {
    const data = this.storage.get(this.query) as Partial<T> | undefined;
    if (data) {
      const { [key]: _, ...rest } = data;
      await this.storage.set(this.query, rest as T);
    }
  }

  async clear(): Promise<void> {
    await this.storage.delete(this.query);
  }

  useValue<K extends keyof T>(key: K, defaultValue: T[K]): [T[K], (value: SetStateAction<T[K]>) => void] {
    const [data, setData] = useStorageValue(this.query);
    const value = (data as Partial<T> | undefined)?.[key] ?? defaultValue;

    const setValue = useCallback(
      (newValue: SetStateAction<T[K]>) => {
        setData((prevData) => {
          const prevValue = (prevData as Partial<T> | undefined)?.[key] ?? defaultValue;
          const resolvedValue =
            typeof newValue === "function" ? (newValue as (prev: T[K]) => T[K])(prevValue) : newValue;
          return { ...prevData, [key]: resolvedValue } as T;
        });
      },
      [key, defaultValue, setData],
    );

    return [value, setValue];
  }
}

/**
 * Creates typed store factory functions for a collection entity.
 *
 * @example
 * ```ts
 * const { getStore: getTasksStore, useStore: useTasksStore } = createScopedStoreFactories(
 *   anoriSchema.tasksWidgetStore.store
 * );
 *
 * // Imperative usage:
 * const store = getTasksStore(instanceId);
 * await store.waitForLoad();
 * const tasks = store.get("tasks");
 * await store.set("tasks", [...tasks, newTask]);
 *
 * // React hook usage:
 * const store = useTasksStore();
 * const [tasks, setTasks] = store.useValue("tasks", []);
 * ```
 */
export function createScopedStoreFactories<T extends Mapping>(entityAccessor: {
  byId(id: string): CollectionByIdQuery<T>;
}) {
  const getStore = (id: ID): ScopedStore<T> => {
    return ScopedStore.get(entityAccessor.byId(id));
  };

  const useStore = (): ScopedStore<T> => {
    const { instanceId } = useWidgetMetadata();
    return useMemo(() => getStore(instanceId), [instanceId]);
  };

  return { getStore, useStore };
}

/**
 * Clears all widget storage for a given instance ID.
 * Tries to delete from all typed widget store collections.
 */
export async function clearWidgetStorage(instanceId: ID): Promise<void> {
  // TODO: not entirely happy with this setup cuz it will be easy to add new store here and then it will be dangled
  // Maybe it will be better to have some kind of "on remove" callback for widgets
  const storage = await getAnoriStorage();
  const schema = anoriSchema;

  // All widget store collections
  const queries = [
    schema.tasksWidgetStore.store.byId(instanceId),
    schema.notesWidgetStore.store.byId(instanceId),
    schema.weatherCurrentWidgetStore.store.byId(instanceId),
    schema.weatherForecastWidgetStore.store.byId(instanceId),
    schema.topSitesWidgetStore.store.byId(instanceId),
    schema.rssWidgetStore.store.byId(instanceId),
    schema.bookmarkWidgetStore.store.byId(instanceId),
  ];

  await Promise.all(queries.map((q) => storage.delete(q)));
}
