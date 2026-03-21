import { type WritableAtom, atom, useAtom } from "jotai";
import { type SetStateAction, createContext, useContext } from "react";
import { getQueryId } from "./query";
import type { CellDescriptor } from "./schema/cell";
import type { CollectionAllQuery, CollectionByIdQuery } from "./schema/collection";
import type { FileCollectionAllQuery, FileCollectionByIdQuery, FileDescriptor } from "./schema/file";
import type { Storage, ValueMeta } from "./storage";

type StorageQuery<T> = CellDescriptor<T> | CollectionByIdQuery<T> | CollectionAllQuery<T>;
type WritableStorageQuery<T> = CellDescriptor<T> | CollectionByIdQuery<T>;

type StorageValueMeta = ValueMeta;

type WritableStorageValueResult<T, V = T | undefined> = [
  value: V,
  setValue: (value: T | ((prev: V) => T)) => Promise<void>,
  meta: StorageValueMeta,
];

type AtomState<T> = {
  value: T;
  meta: ValueMeta;
};

type StorageAtom<T> = WritableAtom<AtomState<T>, [SetStateAction<T>], Promise<void>>;

const storageAtoms = new Map<string, StorageAtom<unknown>>();
const fileAtoms = new Map<
  string,
  WritableAtom<FileAtomState<unknown>, [FileAtomWriteAction<unknown>], Promise<void>>
>();
const fileCollectionAtoms = new Map<
  string,
  WritableAtom<FileCollectionAtomState<unknown>, [FileCollectionAtomWriteAction<unknown>], Promise<void>>
>();

/** @internal Clears cached atoms. Use only for testing. */
export function clearAtomCache(): void {
  storageAtoms.clear();
  fileAtoms.clear();
  fileCollectionAtoms.clear();
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
      await fork.set(query as CellDescriptor<T>, newValue as T);
    },
  );

  storageAtoms.set(key, writableAtom as StorageAtom<unknown>);
  return writableAtom as StorageAtom<T | undefined | Record<string, T>>;
}

type FileAtomData<P = unknown> = {
  properties: P | undefined;
  blob: Blob;
  objectUrl: string;
};

type FileAtomState<P = unknown> =
  | { status: "loading"; data: undefined; error: undefined }
  | { status: "error"; data: undefined; error: Error }
  | { status: "success"; data: FileAtomData<P> | undefined; error: undefined };

type FileAtomWriteAction<P = unknown> =
  | { type: "init" | "load" }
  | { type: "set"; blob: Blob; properties: P }
  | { type: "updateBlob"; blob: Blob }
  | { type: "updateProperties"; properties: P }
  | { type: "delete" };

type FileAtom<P> = WritableAtom<FileAtomState<P>, [FileAtomWriteAction<P>], Promise<void>>;

export function atomWithFileQuery<P = unknown>(
  query: FileDescriptor<P> | FileCollectionByIdQuery<P>,
  storage: Storage,
): FileAtom<P> {
  const key = getQueryId(query);

  if (fileAtoms.has(key)) {
    return fileAtoms.get(key) as FileAtom<P>;
  }

  const objectUrlAtom = atom<string | undefined>(undefined);

  const baseAtom = atom<FileAtomState<P>>({ status: "loading", data: undefined, error: undefined });

  const writableAtom = atom(
    (get) => get(baseAtom),
    async (get, set, action: FileAtomWriteAction<P>) => {
      if (action.type === "init" || action.type === "load") {
        try {
          const fileData = await storage.files.get(query as FileDescriptor<P>);
          const currentUrl = get(objectUrlAtom);

          if (!fileData) {
            if (currentUrl) {
              URL.revokeObjectURL(currentUrl);
              set(objectUrlAtom, undefined);
            }
            set(baseAtom, { status: "success", data: undefined, error: undefined });
            return;
          }

          if (currentUrl) {
            URL.revokeObjectURL(currentUrl);
          }

          const newUrl = URL.createObjectURL(fileData.blob);
          set(objectUrlAtom, newUrl);

          set(baseAtom, {
            status: "success",
            data: {
              properties: fileData.meta.properties,
              blob: fileData.blob,
              objectUrl: newUrl,
            },
            error: undefined,
          });
        } catch (error) {
          set(baseAtom, {
            status: "error",
            data: undefined,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
        return;
      }

      switch (action.type) {
        case "set":
          await storage.files.set(query as FileDescriptor<P>, action.blob, action.properties);
          break;
        case "updateBlob":
          await storage.files.updateBlob(query as FileDescriptor<P>, action.blob);
          break;
        case "updateProperties":
          await storage.files.updateProperties(query as FileDescriptor<P>, action.properties);
          break;
        case "delete":
          await storage.files.delete(query as FileDescriptor<P>);
          break;
      }
      // Subscription will trigger re-fetch
    },
  );

  writableAtom.onMount = (setAtom) => {
    setAtom({ type: "init" });

    const unsubscribe = storage.files.subscribe(query as FileDescriptor<P>, () => {
      setAtom({ type: "load" });
    });

    return () => {
      unsubscribe();
    };
  };

  fileAtoms.set(key, writableAtom as FileAtom<unknown>);
  return writableAtom as FileAtom<P>;
}

type FileCollectionItemData<P = unknown> = {
  properties: P | undefined;
  blob: Blob;
  objectUrl: string;
};

type FileCollectionAtomState<P = unknown> =
  | { status: "loading"; data: undefined; error: undefined }
  | { status: "error"; data: undefined; error: Error }
  | { status: "success"; data: Record<string, FileCollectionItemData<P>>; error: undefined };

type FileCollectionAtomWriteAction<P = unknown> =
  | { type: "init" | "load" }
  | { type: "set"; id: string; blob: Blob; properties?: P }
  | { type: "updateBlob"; id: string; blob: Blob }
  | { type: "updateProperties"; id: string; properties: P }
  | { type: "delete"; id: string };

type FileCollectionAtom<P> = WritableAtom<
  FileCollectionAtomState<P>,
  [FileCollectionAtomWriteAction<P>],
  Promise<void>
>;

export function atomWithFileCollectionQuery<P = unknown>(
  query: FileCollectionAllQuery<P>,
  storage: Storage,
): FileCollectionAtom<P> {
  const key = getQueryId(query);

  if (fileCollectionAtoms.has(key)) {
    return fileCollectionAtoms.get(key) as FileCollectionAtom<P>;
  }

  const objectUrlsAtom = atom<Record<string, string>>({});

  const baseAtom = atom<FileCollectionAtomState<P>>({ status: "loading", data: undefined, error: undefined });

  const writableAtom = atom(
    (get) => get(baseAtom),
    async (get, set, action: FileCollectionAtomWriteAction<P>) => {
      if (action.type === "init" || action.type === "load") {
        try {
          const filesData = await storage.files.get(query);
          const items: Record<string, FileCollectionItemData<P>> = {};
          const currentUrls = get(objectUrlsAtom);
          const newUrls: Record<string, string> = {};

          for (const [id, url] of Object.entries(currentUrls)) {
            if (!filesData[id]) {
              URL.revokeObjectURL(url);
            }
          }

          for (const [id, fileWithMeta] of Object.entries(filesData)) {
            const url = URL.createObjectURL(fileWithMeta.blob);
            newUrls[id] = url;
            items[id] = {
              properties: fileWithMeta.meta.properties,
              blob: fileWithMeta.blob,
              objectUrl: url,
            };
          }

          set(objectUrlsAtom, newUrls);
          set(baseAtom, { status: "success", data: items, error: undefined });
        } catch (error) {
          set(baseAtom, {
            status: "error",
            data: undefined,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
        return;
      }

      switch (action.type) {
        case "set": {
          const byIdQuery = { ...query, queryType: "byId" as const, id: action.id } as FileCollectionByIdQuery<P>;
          await storage.files.set(byIdQuery, action.blob, action.properties);
          break;
        }
        case "updateBlob": {
          const byIdQuery = { ...query, queryType: "byId" as const, id: action.id } as FileCollectionByIdQuery<P>;
          await storage.files.updateBlob(byIdQuery, action.blob);
          break;
        }
        case "updateProperties": {
          const byIdQuery = { ...query, queryType: "byId" as const, id: action.id } as FileCollectionByIdQuery<P>;
          await storage.files.updateProperties(byIdQuery, action.properties);
          break;
        }
        case "delete": {
          const byIdQuery = { ...query, queryType: "byId" as const, id: action.id } as FileCollectionByIdQuery<P>;
          await storage.files.delete(byIdQuery);
          break;
        }
      }
      // Subscription will trigger re-fetch
    },
  );

  writableAtom.onMount = (setAtom) => {
    setAtom({ type: "init" });

    const unsubscribe = storage.files.subscribe(query, () => {
      setAtom({ type: "load" });
    });

    return () => {
      unsubscribe();
    };
  };

  fileCollectionAtoms.set(key, writableAtom as FileCollectionAtom<unknown>);
  return writableAtom as FileCollectionAtom<P>;
}

export const StorageContext = createContext<Storage | null>(null);

export function useStorage() {
  const storage = useContext(StorageContext);
  if (!storage) {
    throw new Error("useStorageValue should be used inside StorageContext.Provider");
  }

  return storage;
}

export function useStorageValue<T>(query: CellDescriptor<T, true>): WritableStorageValueResult<T, T>;
export function useStorageValue<T>(query: CellDescriptor<T, false>): WritableStorageValueResult<T, T | undefined>;
export function useStorageValue<T>(query: CellDescriptor<T, boolean>): WritableStorageValueResult<T, T | undefined>;
export function useStorageValue<T>(query: CollectionByIdQuery<T>): WritableStorageValueResult<T, T | undefined>;
export function useStorageValue<T>(query: WritableStorageQuery<T>): WritableStorageValueResult<T, T | undefined> {
  const storage = useStorage();
  const storageAtom = atomWithStorageQuery(query as CellDescriptor<T>, storage);
  const [state, setValue] = useAtom(storageAtom);

  return [state.value, setValue as (value: SetStateAction<T>) => Promise<void>, state.meta];
}

type SingleFileQuery<P = unknown> = FileDescriptor<P> | FileCollectionByIdQuery<P>;

type UseStorageFileResult<P = unknown> = {
  properties: P | undefined;
  blob: Blob | undefined;
  objectUrl: string | undefined;
  isLoading: boolean;
  error: Error | undefined;
  setFile: (blob: Blob, properties: P) => Promise<void>;
  updateBlob: (blob: Blob) => Promise<void>;
  updateProperties: (properties: P) => Promise<void>;
  deleteFile: () => Promise<void>;
};

export function useStorageFile<P = unknown>(query: SingleFileQuery<P>): UseStorageFileResult<P> {
  const storage = useStorage();
  const fileAtom = atomWithFileQuery(query, storage);
  const [atomState, dispatch] = useAtom(fileAtom);

  return {
    properties: atomState.status === "success" ? atomState.data?.properties : undefined,
    blob: atomState.status === "success" ? atomState.data?.blob : undefined,
    objectUrl: atomState.status === "success" ? atomState.data?.objectUrl : undefined,
    isLoading: atomState.status === "loading",
    error: atomState.status === "error" ? atomState.error : undefined,
    setFile: async (blob: Blob, properties: P) => {
      await dispatch({ type: "set", blob, properties });
    },
    updateBlob: async (blob: Blob) => {
      await dispatch({ type: "updateBlob", blob });
    },
    updateProperties: async (properties: P) => {
      await dispatch({ type: "updateProperties", properties });
    },
    deleteFile: async () => {
      await dispatch({ type: "delete" });
    },
  };
}

type UseStorageFileCollectionResult<P = unknown> = {
  items: Record<string, FileCollectionItemData<P>>;
  isLoading: boolean;
  error: Error | undefined;
  setFile: (id: string, blob: Blob, properties?: P) => Promise<void>;
  updateBlob: (id: string, blob: Blob) => Promise<void>;
  updateProperties: (id: string, properties: P) => Promise<void>;
  deleteFile: (id: string) => Promise<void>;
};

export function useStorageFileCollection<P = unknown>(
  query: FileCollectionAllQuery<P>,
): UseStorageFileCollectionResult<P> {
  const storage = useStorage();
  const collectionAtom = atomWithFileCollectionQuery(query, storage);
  const [atomState, dispatch] = useAtom(collectionAtom);

  return {
    items: atomState.status === "success" ? atomState.data : {},
    isLoading: atomState.status === "loading",
    error: atomState.status === "error" ? atomState.error : undefined,
    setFile: async (id: string, blob: Blob, properties?: P) => {
      await dispatch({ type: "set", id, blob, properties });
    },
    updateBlob: async (id: string, blob: Blob) => {
      await dispatch({ type: "updateBlob", id, blob });
    },
    updateProperties: async (id: string, properties: P) => {
      await dispatch({ type: "updateProperties", id, properties });
    },
    deleteFile: async (id: string) => {
      await dispatch({ type: "delete", id });
    },
  };
}
