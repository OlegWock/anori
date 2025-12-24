import {
  type AnoriStorage,
  type CollectionByIdQuery,
  getAnoriStorage,
  useWritableStorageValue,
} from "@anori/utils/storage";
import { getQueryId } from "@anori/utils/storage/query";
import type { EmptyObject, Mapping } from "@anori/utils/types";
import { type SetStateAction, useCallback } from "react";

// TODO: ideally, all usage of this should be migrated to proper strict schema
export class NamespacedStorage<T extends Mapping = Mapping> {
  query: CollectionByIdQuery<Record<string, unknown>>;

  loaded: boolean;
  private storage: AnoriStorage;
  private _loadingPromise: Promise<void>;

  static get<T extends Mapping = EmptyObject>(
    query: CollectionByIdQuery<Record<string, unknown>>,
  ): NamespacedStorage<T> {
    const queryId = getQueryId(query);
    const inCache = cache.get(queryId);
    if (inCache) {
      return inCache as NamespacedStorage<T>;
    }

    const nsStorage = new NamespacedStorage<T>(query);
    cache.set(queryId, nsStorage);
    return nsStorage;
  }

  private constructor(query: CollectionByIdQuery<Record<string, unknown>>) {
    let onLoad = () => {};
    this.query = query;
    this._loadingPromise = new Promise((resolve) => {
      onLoad = () => {
        this.loaded = true;
        resolve();
      };
    });
    this.loaded = false;
    getAnoriStorage().then((storage) => {
      this.storage = storage;
      onLoad();
    });
  }

  waitForLoad() {
    return this._loadingPromise.then(() => this);
  }

  get<K extends keyof T>(name: K): T[K] | undefined {
    const value = this.storage.get(this.query) as Partial<T> | undefined;
    return value?.[name];
  }

  async set<K extends keyof T>(name: K, val: T[K]) {
    const value = this.storage.get(this.query) as Partial<T> | undefined;
    await this.storage.set(this.query, { ...value, [name]: val });
  }

  async setMany<M extends Partial<T>>(mapping: M) {
    const value = this.storage.get(this.query) as Partial<T> | undefined;
    await this.storage.set(this.query, { ...value, ...mapping });
  }

  async clear() {
    await this.storage.delete(this.query);
  }

  useValue<K extends keyof T>(name: K, defaultValue: T[K]) {
    const [data, setData] = useWritableStorageValue(this.query);
    const val = (data as Partial<T> | undefined)?.[name] ?? defaultValue;
    const setValue = useCallback(
      (newValue: SetStateAction<T[K]>) => {
        setData((prevData) => {
          const prevValue = (prevData as Partial<T> | undefined)?.[name] ?? defaultValue;
          // @ts-ignore I know what I'm doing, this code will be rewritted probably anyway
          return { ...prevData, [name]: typeof newValue === "function" ? newValue(prevValue) : newValue };
        });
      },
      [val, setData],
    );

    return [val, setValue] as const;
  }
}

const cache: Map<string, NamespacedStorage> = new Map();
