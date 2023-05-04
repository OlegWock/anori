import browser from 'webextension-polyfill';
import { StorageContent } from "./user-data/types";
import { PrimitiveAtom, atom, getDefaultStore, useAtom } from "jotai";

type StorageKey = keyof StorageContent;

type StoageValue<T extends StorageKey> = StorageContent[T] | undefined;

type SetStoragePayload = { [key in StorageKey]?: StorageContent[key] };
type GetStorageQueryWithDefaults = SetStoragePayload;
type StorageChanges = {
    [key in StorageKey]: {
        oldValue: StorageContent[key],
        newValue: StorageContent[key],
    } | undefined;
};
type StorageChangeCallback = (changes: StorageChanges, areaName: 'local') => void;


async function storageGet(query: null): Promise<StorageContent>; // Load entire storage
async function storageGet<T extends StorageKey>(query: T): Promise<{ [key in T]: StoageValue<T> }>; // Single key without default value
async function storageGet<T extends StorageKey>(query: T[]): Promise<{ [key in T]: StoageValue<T> }>;
async function storageGet<T extends GetStorageQueryWithDefaults>(query: T): Promise<T>;
async function storageGet(query: any): Promise<any> {
    return browser.storage.local.get(query);
}

export const storage = {
    get: storageGet,
    getOne: async <K extends StorageKey>(key: K) => {
        const res = await storageGet(key);
        return res[key];
    },
    getOneUntyped: async (key: string) => {
        // @ts-ignore untyped
        const res = await storageGet(key);
        // @ts-ignore untyped
        return res[key];
    },
    set: (changes: SetStoragePayload) => {
        return browser.storage.local.set(changes);
    },
    setOne: <K extends StorageKey>(key: K, val: StorageContent[K]) => {
        return browser.storage.local.set({ [key]: val });
    },
    addListener: (cb: StorageChangeCallback) => {
        // @ts-ignore Out type is a bit more narrower than one from webextension-polyfill and TS doesn't like this
        browser.storage.local.onChanged.addListener(cb);
    },
    removeListener: (cb: StorageChangeCallback) => {
        // @ts-ignore Out type is a bit more narrower than one from webextension-polyfill and TS doesn't like this
        browser.storage.local.onChanged.removeListener(cb);
    },
};

const storageAtoms: Record<string, PrimitiveAtom<any>> = {};
export const useBrowserStorageValue = <K extends StorageKey>(name: K, defaultValue: StorageContent[K]) => {
    if (!storageAtoms[name]) {
        storageAtoms[name] = atomWithBrowserStorage(name, defaultValue, { forceLoad: true });
    }
    const atom = storageAtoms[name] as PrimitiveAtom<StorageContent[K]>;
    return useAtom(atom);
};


type AtomWithBrowserStorageOptions = {
    forceLoad?: boolean, // Otherwise content will be loaded when atom first used in provider
    onLoad?: () => void,
};

export const atomWithBrowserStorage = <K extends StorageKey>(key: K, initialValue: StorageContent[K], { forceLoad, onLoad }: AtomWithBrowserStorageOptions = {}): PrimitiveAtom<StorageContent[K]> => {
    let isLoaded = false;
    const baseAtom = atom(initialValue)
    baseAtom.onMount = (setValue) => {
        (async () => {
            if (isLoaded) return;
            const item = await storage.getOne(key);
            if (item !== undefined) setValue(item);
            isLoaded = true;
            if (onLoad) onLoad();
        })()
    }
    const derivedAtom = atom(
        (get) => get(baseAtom),
        (get, set, update) => {
            const nextValue = typeof update === 'function' ? update(get(baseAtom)) : update;
            set(baseAtom, nextValue);
            storage.setOne(key, nextValue);
        }
    )

    // This approach in incompatible with custom Jotai providers
    if (forceLoad) {
        storage.getOne(key).then(item => {

            if (item !== undefined) {
                const store = getDefaultStore();
                store.set(baseAtom, item);
            }
            isLoaded = true;
            if (onLoad) onLoad();
        });
    }

    return derivedAtom
};

export const dynamicAtomWithBrowserStorage = <T>(key: string, initialValue: T, options: AtomWithBrowserStorageOptions = {}): PrimitiveAtom<T> => {
    // @ts-ignore Types doesn't match, but code is totally same
    return atomWithBrowserStorage(key, initialValue, options);
};