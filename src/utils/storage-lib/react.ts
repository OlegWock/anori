import { type WritableAtom, atom, useAtom } from "jotai";
import { type SetStateAction, createContext, useContext } from "react";
import { getQueryId } from "./query";
import type { CellDescriptor } from "./schema/cell";
import type { CollectionAllQuery, CollectionByIdQuery } from "./schema/collection";
import type { Storage, ValueMeta } from "./storage";

type StorageQuery<T> = CellDescriptor<T> | CollectionByIdQuery<T> | CollectionAllQuery<T>;
type WritableStorageQuery<T> = CellDescriptor<T> | CollectionByIdQuery<T>;

type StorageValueMeta = ValueMeta;

type WritableStorageValueResult<T, V = T | undefined> = [
  value: V,
  setValue: (value: SetStateAction<T>) => Promise<void>,
  meta: StorageValueMeta,
];

type AtomState<T> = {
  value: T;
  meta: ValueMeta;
};

type StorageAtom<T> = WritableAtom<AtomState<T>, [SetStateAction<T>], Promise<void>>;

const storageAtoms = new Map<string, StorageAtom<unknown>>();

/** @internal Clears cached atoms. Use only for testing. */
export function clearAtomCache(): void {
  storageAtoms.clear();
}

export function atomWithStorageQuery<T>(query: CellDescriptor<T, true>, storage: Storage): StorageAtom<T>;
export function atomWithStorageQuery<T>(query: CellDescriptor<T, false>, storage: Storage): StorageAtom<T | undefined>;
export function atomWithStorageQuery<T>(
  query: CellDescriptor<T, boolean>,
  storage: Storage,
): StorageAtom<T | undefined>;
export function atomWithStorageQuery<T>(query: CollectionByIdQuery<T>, storage: Storage): StorageAtom<T | undefined>;
export function atomWithStorageQuery<T>(query: CollectionAllQuery<T>, storage: Storage): StorageAtom<Record<string, T>>;
export function atomWithStorageQuery<T>(
  query: StorageQuery<T>,
  storage: Storage,
): StorageAtom<T | undefined | Record<string, T>> {
  const key = getQueryId(query);

  if (storageAtoms.has(key)) {
    return storageAtoms.get(key) as StorageAtom<T | undefined | Record<string, T>>;
  }

  // Create a fork for this atom - writes through this fork won't trigger its own subscription
  const fork = storage.fork();

  const initialState = fork.getWithMeta(query as CellDescriptor<T>) as AtomState<T | undefined | Record<string, T>>;

  const baseAtom = atom<AtomState<T | undefined | Record<string, T>>>(initialState);

  baseAtom.onMount = (setAtom) => {
    const currentState = fork.getWithMeta(query as CellDescriptor<T>) as AtomState<T | undefined | Record<string, T>>;
    setAtom(currentState);

    const unsubscribe = fork.subscribe(query as CellDescriptor<T>, () => {
      const newState = fork.getWithMeta(query as CellDescriptor<T>) as AtomState<T | undefined | Record<string, T>>;
      setAtom(newState);
    });

    return unsubscribe;
  };

  const writableAtom = atom(
    (get) => get(baseAtom),
    async (get, set, newValueOrFn: SetStateAction<T | undefined | Record<string, T>>) => {
      const currentState = get(baseAtom);
      const newValue =
        typeof newValueOrFn === "function"
          ? (newValueOrFn as (prev: T | undefined | Record<string, T>) => T | undefined | Record<string, T>)(
              currentState.value,
            )
          : newValueOrFn;

      // Optimistic update - mark as not default since user is explicitly setting
      set(baseAtom, { value: newValue, meta: { isDefault: false } });

      // Persist through fork - the fork's subscription will ignore this write's echo
      await fork.set(query as CellDescriptor<T>, newValue as T);
    },
  );

  storageAtoms.set(key, writableAtom as StorageAtom<unknown>);
  return writableAtom as StorageAtom<T | undefined | Record<string, T>>;
}

export const StorageContext = createContext<Storage | null>(null);

export function useStorageValue<T>(query: CellDescriptor<T, true>): WritableStorageValueResult<T, T>;
export function useStorageValue<T>(query: CellDescriptor<T, false>): WritableStorageValueResult<T, T | undefined>;
export function useStorageValue<T>(query: CellDescriptor<T, boolean>): WritableStorageValueResult<T, T | undefined>;
export function useStorageValue<T>(query: CollectionByIdQuery<T>): WritableStorageValueResult<T, T | undefined>;
export function useStorageValue<T>(query: WritableStorageQuery<T>): WritableStorageValueResult<T, T | undefined> {
  const storage = useContext(StorageContext);
  if (!storage) {
    throw new Error("useStorageValue should be used inside StorageContext.Provider");
  }
  const storageAtom = atomWithStorageQuery(query as CellDescriptor<T>, storage);
  const [state, setValue] = useAtom(storageAtom);

  return [state.value, setValue as (value: SetStateAction<T>) => Promise<void>, state.meta];
}
