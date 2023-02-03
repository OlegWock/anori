import { useEffect, useRef, useState } from "react";
import browser from 'webextension-polyfill';
import { StorageContent } from "./user-data/types";
import { PrimitiveAtom, atom } from "jotai";

type StorageKey = keyof StorageContent;

type StoageValue<T extends StorageKey> = StorageContent[T] | undefined;

type SetStoragePayload = { [key in StorageKey]: StorageContent[key] };
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

export const useBrowserStorageValue = <K extends StorageKey>(name: K, defaultValue: StorageContent[K]) => {
    const [value, _setValue] = useState<StorageContent[K]>(defaultValue);
    const loaded = useRef(false);

    const setValue = (newVal: StorageContent[K] | ((old: StorageContent[K]) => StorageContent[K])) => {
        // @ts-ignore
        const toStore = typeof newVal === 'function' ? newVal(value) : newVal;
        _setValue(toStore);

        storage.setOne(name, toStore);
    };

    useEffect(() => {
        const callback = (changes: browser.Storage.StorageAreaOnChangedChangesType) => {
            if (changes[name]) {
                if ((changes[name] as any).newValue === undefined) setValue(defaultValue);
                else _setValue((changes[name] as any).newValue);
            }
        };

        loaded.current = false;
        storage.get({ [name]: defaultValue } as GetStorageQueryWithDefaults).then(res => {
            _setValue(res[name]);
        });
        browser.storage.local.onChanged.addListener(callback);

        return () => browser.storage.local.onChanged.removeListener(callback);
    }, [name]);

    return [value, setValue] as const;
};

export const atomWithBrowserStorage = <K extends StorageKey>(key: K, initialValue: StorageContent[K]): PrimitiveAtom<StorageContent[K]> => {
    const baseAtom = atom(initialValue)
    baseAtom.onMount = (setValue) => {
        ; (async () => {
            const item = await storage.getOne(key);
            if (item !== undefined) setValue(item);
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
    return derivedAtom
}