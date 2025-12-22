import { type WritableAtom, atom, useAtom, useAtomValue } from "jotai";
import { type SetStateAction, useMemo } from "react";
import type { CellDescriptor } from "./schema/cell";
import type { CollectionAllQuery, CollectionByIdQuery } from "./schema/collection";
import type { Storage } from "./storage";

type StorageQuery<T> = CellDescriptor<T> | CollectionByIdQuery<T> | CollectionAllQuery<T>;
type WritableStorageQuery<T> = CellDescriptor<T> | CollectionByIdQuery<T>;

type StorageValueMeta = {
  usingDefault: boolean;
};

type StorageValueResult<T> = [value: T | undefined, meta: StorageValueMeta];
type WritableStorageValueResult<T> = [
  value: T | undefined,
  setValue: (value: SetStateAction<T>) => Promise<void>,
  meta: StorageValueMeta,
];

type StorageAtom<T> = WritableAtom<T, [SetStateAction<T>], Promise<void>>;

let globalStorage: Storage | null = null;

export function setGlobalStorage(storage: Storage): void {
  globalStorage = storage;
}

export function getGlobalStorage(): Storage {
  if (!globalStorage) {
    throw new Error("Storage not initialized. Call setGlobalStorage() first.");
  }
  return globalStorage;
}

export function isStorageInitialized(): boolean {
  return globalStorage !== null;
}

function getAtomKey(query: StorageQuery<unknown>): string {
  if ("key" in query) {
    return `cell:${query.key}`;
  }
  if ("queryType" in query) {
    if (query.queryType === "all") {
      return `collection:${query.keyPrefix}:all`;
    }
    return `collection:${query.keyPrefix}:${query.id}`;
  }
  return `unknown:${JSON.stringify(query)}`;
}

const storageAtoms = new Map<string, StorageAtom<unknown>>();

/** @internal Clears cached atoms. Use only for testing. */
export function clearAtomCache(): void {
  storageAtoms.clear();
}

export function atomWithStorageQuery<T>(query: CellDescriptor<T>): StorageAtom<T | undefined>;
export function atomWithStorageQuery<T>(query: CollectionByIdQuery<T>): StorageAtom<T | undefined>;
export function atomWithStorageQuery<T>(query: CollectionAllQuery<T>): StorageAtom<Record<string, T>>;
export function atomWithStorageQuery<T>(query: StorageQuery<T>): StorageAtom<T | undefined | Record<string, T>> {
  const key = getAtomKey(query);

  if (storageAtoms.has(key)) {
    return storageAtoms.get(key) as StorageAtom<T | undefined | Record<string, T>>;
  }

  // Create a fork for this atom - writes through this fork won't trigger its own subscription
  const fork = getGlobalStorage().fork();

  const initialValue = fork.get(query as CellDescriptor<T>);

  const baseAtom = atom<T | undefined | Record<string, T>>(initialValue);

  baseAtom.onMount = (setAtom) => {
    const currentValue = fork.get(query as CellDescriptor<T>);
    setAtom(currentValue as T | undefined | Record<string, T>);

    const unsubscribe = fork.subscribe(query as CellDescriptor<T>, (newValue) => {
      setAtom(newValue as T | undefined | Record<string, T>);
    });

    return unsubscribe;
  };

  const writableAtom = atom(
    (get) => get(baseAtom),
    async (get, set, newValueOrFn: SetStateAction<T | undefined | Record<string, T>>) => {
      const currentValue = get(baseAtom);
      const newValue =
        typeof newValueOrFn === "function"
          ? (newValueOrFn as (prev: T | undefined | Record<string, T>) => T | undefined | Record<string, T>)(
              currentValue,
            )
          : newValueOrFn;

      // Optimistic update
      set(baseAtom, newValue);

      // Persist through fork - the fork's subscription will ignore this write's echo
      await fork.set(query as CellDescriptor<T>, newValue as T);
    },
  );

  storageAtoms.set(key, writableAtom as StorageAtom<unknown>);
  return writableAtom as StorageAtom<T | undefined | Record<string, T>>;
}

export function useStorageValue<T>(query: CellDescriptor<T>): StorageValueResult<T>;
export function useStorageValue<T>(query: CollectionByIdQuery<T>): StorageValueResult<T>;
export function useStorageValue<T>(query: CollectionAllQuery<T>): StorageValueResult<Record<string, T>>;
export function useStorageValue<T>(
  query: StorageQuery<T>,
): StorageValueResult<T> | StorageValueResult<Record<string, T>> {
  // biome-ignore lint/correctness/useExhaustiveDependencies: query is object and can be re-created on each render
  const valueAtom = useMemo(() => atomWithStorageQuery(query as CellDescriptor<T>), [getAtomKey(query)]);
  const value = useAtomValue(valueAtom);

  const usingDefault = useMemo(() => {
    if ("defaultValue" in query && value === query.defaultValue) {
      return true;
    }
    return false;
  }, [query, value]);

  const meta: StorageValueMeta = {
    usingDefault,
  };

  return [value, meta] as StorageValueResult<T> | StorageValueResult<Record<string, T>>;
}

export function useWritableStorageValue<T>(query: CellDescriptor<T>): WritableStorageValueResult<T>;
export function useWritableStorageValue<T>(query: CollectionByIdQuery<T>): WritableStorageValueResult<T>;
export function useWritableStorageValue<T>(query: WritableStorageQuery<T>): WritableStorageValueResult<T> {
  const queryKey = getAtomKey(query);

  // biome-ignore lint/correctness/useExhaustiveDependencies: query is object and can be re-created on each render
  const storageAtom = useMemo(() => atomWithStorageQuery(query as CellDescriptor<T>), [queryKey]);
  const [value, setValue] = useAtom(storageAtom);

  const usingDefault = useMemo(() => {
    if ("defaultValue" in query && value === query.defaultValue) {
      return true;
    }
    return false;
  }, [query, value]);

  const meta: StorageValueMeta = {
    usingDefault,
  };

  return [value, setValue as (value: SetStateAction<T>) => Promise<void>, meta];
}
