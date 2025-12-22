import { type PrimitiveAtom, atom, useAtomValue } from "jotai";
import { useMemo } from "react";
import type { CellDescriptor } from "./schema/cell";
import type { CollectionAllQuery, CollectionByIdQuery } from "./schema/collection";
import type { Storage } from "./storage";

type StorageQuery<T> = CellDescriptor<T> | CollectionByIdQuery<T> | CollectionAllQuery<T>;

type StorageValueMeta = {
  isLoading: boolean;
  usingDefault: boolean;
};

type StorageValueResult<T> = [value: T | undefined, meta: StorageValueMeta];

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

const storageAtoms = new Map<string, PrimitiveAtom<unknown>>();

/** @internal Clears cached atoms. Use only for testing. */
export function clearAtomCache(): void {
  storageAtoms.clear();
}

export function atomWithStorageQuery<T>(query: CellDescriptor<T>): PrimitiveAtom<T | undefined>;
export function atomWithStorageQuery<T>(query: CollectionByIdQuery<T>): PrimitiveAtom<T | undefined>;
export function atomWithStorageQuery<T>(query: CollectionAllQuery<T>): PrimitiveAtom<Record<string, T>>;
export function atomWithStorageQuery<T>(query: StorageQuery<T>): PrimitiveAtom<T | undefined | Record<string, T>> {
  const key = getAtomKey(query);

  if (storageAtoms.has(key)) {
    return storageAtoms.get(key) as PrimitiveAtom<T | undefined | Record<string, T>>;
  }

  const storage = getGlobalStorage();
  const initialValue = storage.get(query as CellDescriptor<T>);

  const baseAtom = atom<T | undefined | Record<string, T>>(initialValue);

  baseAtom.onMount = (setAtom) => {
    const currentValue = storage.get(query as CellDescriptor<T>);
    setAtom(currentValue as T | undefined | Record<string, T>);

    const unsubscribe = storage.subscribe(query as CellDescriptor<T>, (newValue) => {
      setAtom(newValue as T | undefined | Record<string, T>);
    });

    return unsubscribe;
  };

  storageAtoms.set(key, baseAtom as PrimitiveAtom<unknown>);
  return baseAtom;
}

export function useStorageValue<T>(query: CellDescriptor<T>): StorageValueResult<T>;
export function useStorageValue<T>(query: CollectionByIdQuery<T>): StorageValueResult<T>;
export function useStorageValue<T>(query: CollectionAllQuery<T>): StorageValueResult<Record<string, T>>;
export function useStorageValue<T>(
  query: StorageQuery<T>,
): StorageValueResult<T> | StorageValueResult<Record<string, T>> {
  // biome-ignore lint/correctness/useExhaustiveDependencies: query is object and can be re-created on each render. We use atom key to serialize it into string used to track its changes
  const valueAtom = useMemo(() => atomWithStorageQuery(query as CellDescriptor<T>), [getAtomKey(query)]);
  const value = useAtomValue(valueAtom);

  const usingDefault = useMemo(() => {
    if ("defaultValue" in query && value === query.defaultValue) {
      return true;
    }
    return false;
  }, [query, value]);

  const meta: StorageValueMeta = {
    isLoading: false,
    usingDefault,
  };

  return [value, meta] as StorageValueResult<T> | StorageValueResult<Record<string, T>>;
}
