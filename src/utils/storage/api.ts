import browser, { Storage } from 'webextension-polyfill';
import { StorageContent } from "../user-data/types";
import { SetStateAction, WritableAtom, atom, getDefaultStore, useAtom } from "jotai";
import { globalStorageCache } from './migrations';

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
        if (globalStorageCache.loaded) {
            return globalStorageCache.content[key] as StoageValue<K>;
        }
        const res = await storageGet(key);
        return res[key];
    },
    getOneDynamic: async <V>(key: string) => {
        // @ts-ignore untyped
        const res = await storageGet(key);
        // @ts-ignore untyped
        return res[key] as V | undefined;
    },
    set: (changes: SetStoragePayload) => {
        Object.keys(changes).forEach((key) => {
            if (storageAtoms[key]) {
                setAtomWithStorageValue(storageAtoms[key], changes[key as keyof typeof changes]);
            }
        });
        return browser.storage.local.set(changes);
    },
    setOne: <K extends StorageKey>(key: K, val: StorageContent[K], onlyInStorage = false) => {
        if (storageAtoms[key] && !onlyInStorage) {
            setAtomWithStorageValue(storageAtoms[key], val);
        }
        return browser.storage.local.set({ [key]: val });
    },
    setOneDynamic: async <V>(key: string, val: V, onlyInStorage = false) => {
        if (storageAtoms[key] && !onlyInStorage) {
            setAtomWithStorageValue(storageAtoms[key], val);
        }
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

const storageAtoms: Record<string, AtomWithBrowserStorage<any>> = {};

export const useBrowserStorageValue = <K extends StorageKey>(name: K, defaultValue: StorageContent[K]) => {
    if (!storageAtoms[name]) {
        storageAtoms[name] = atomWithBrowserStorageStatic(name, defaultValue, { forceLoad: true });
    }
    const atom = storageAtoms[name] as AtomWithBrowserStorage<StorageContent[K]>;
    return useAtomWithStorage(atom);
};

export const preloadBrowserStorageAtom = <K extends StorageKey>(name: K, defaultValue: StorageContent[K], onLoad?: (v: StorageContent[K]) => void) => {
    if (!storageAtoms[name]) {
        storageAtoms[name] = atomWithBrowserStorageStatic(name, defaultValue, { forceLoad: true, onLoad });
    }
};


type AtomWithBrowserStorageOptions<T> = {
    forceLoad?: boolean, // Otherwise content will be loaded when atom first used in provider
    onLoad?: (value: T | undefined) => void,
};

const SYMBOL_NOT_LOADED = Symbol();
const SYMBOL_NO_VALUE = Symbol();

export type AtomWithBrowserStorageMeta<T> = {
    defaultValue: T,
    currentValue: T | typeof SYMBOL_NO_VALUE | typeof SYMBOL_NOT_LOADED,
};

type AtomWithStorageStatus = 'loaded' | 'empty' | 'notLoaded';

type UseAtomWithStorageResult<T> = [
    value: T,
    setValue: (val: SetStateAction<T>) => void,
    meta: {
        status: AtomWithStorageStatus,
        usingDefaultValue: boolean,
    },
];

// Tiny type hack to not allow using atoms with storage with jotai's `useAtom`
// Atoms with browser storage shouldn't be used with jotai's `useAtom`, you should use `useAtomWithStorage` from this file
export type AtomWithBrowserStorage<V> = { __doNotUseThisWithJotaisUseAtom: 1, v: V };

export const atomWithBrowserStorage = <V>(key: string, defaultValue: V, { forceLoad, onLoad }: AtomWithBrowserStorageOptions<V> = {}) => {
    if (storageAtoms[key]) {
        return storageAtoms[key] as AtomWithBrowserStorage<V>;
    }

    let isLoaded = false;
    let atomValue: AtomWithBrowserStorageMeta<V> = {
        defaultValue,
        currentValue: SYMBOL_NOT_LOADED
    };

    if (globalStorageCache.loaded) {
        isLoaded = false;
        atomValue = {
            defaultValue,
            currentValue: globalStorageCache.content[key] === undefined ? SYMBOL_NO_VALUE : globalStorageCache.content[key],
        };
        if (onLoad) onLoad(globalStorageCache.content[key]);
    }

    const baseAtom = atom<AtomWithBrowserStorageMeta<V>>(atomValue);

    baseAtom.onMount = (setValue) => {
        const onChange = (changes: Storage.StorageAreaOnChangedChangesType) => {
            if (changes[key]) {
                const newValue = changes[key].newValue as V;
                setValue({
                    defaultValue,
                    currentValue: newValue === undefined ? SYMBOL_NO_VALUE : newValue,
                });
            }
        };

        const load = async () => {
            if (isLoaded) return;
            const item = await storage.getOneDynamic<V>(key);
            if (item === undefined) {
                setValue({
                    defaultValue,
                    currentValue: SYMBOL_NO_VALUE,
                });
            } else {
                setValue({
                    defaultValue,
                    currentValue: item,
                });
            }
            isLoaded = true;
            if (onLoad) onLoad(item);
        };

        load();
        browser.storage.local.onChanged.addListener(onChange);

        return () => browser.storage.local.onChanged.removeListener(onChange);
    };

    const derivedAtom = atom<AtomWithBrowserStorageMeta<V>, [V, () => void | undefined], void>(
        (get) => get(baseAtom),
        (get, set, update, onSave) => {
            const currentAtomValueMeta = get(baseAtom);
            const shouldUseDefaultValue = currentAtomValueMeta.currentValue === SYMBOL_NOT_LOADED || currentAtomValueMeta.currentValue === SYMBOL_NO_VALUE;
            const currentValue = shouldUseDefaultValue ? currentAtomValueMeta.defaultValue : currentAtomValueMeta.currentValue;
            const nextValue = typeof update === 'function' ? update(currentValue) : update;
            const nextValueMeta = {
                defaultValue: currentAtomValueMeta.defaultValue,
                currentValue: nextValue,
            }
            set(baseAtom, nextValueMeta);
            storage.setOneDynamic<V>(key, nextValue, true).then(() => onSave && onSave());
        }
    );

    storageAtoms[key] = derivedAtom as unknown as AtomWithBrowserStorage<V>;

    // This approach in incompatible with custom Jotai providers
    if (forceLoad) {
        storage.getOneDynamic<V>(key).then(item => {
            const store = getDefaultStore();
            if (item === undefined) {
                store.set(baseAtom, {
                    defaultValue,
                    currentValue: SYMBOL_NO_VALUE,
                });
            } else {
                store.set(baseAtom, {
                    defaultValue,
                    currentValue: item,
                });
            }
            isLoaded = true;
            if (onLoad) onLoad(item);
        });
    }

    return derivedAtom as unknown as AtomWithBrowserStorage<V>;
};

export const atomWithBrowserStorageStatic = <K extends StorageKey>(key: K, initialValue: StorageContent[K], options: AtomWithBrowserStorageOptions<StorageContent[K]> = {}) => {
    return atomWithBrowserStorage<StorageContent[K]>(key, initialValue, options);
};

export const focusAtomWithStorage = <T extends {}, K extends keyof T>(storageAtom: AtomWithBrowserStorage<T>, key: K, defaultValue: Required<T>[K]): AtomWithBrowserStorage<T[K]> => {
    return atom<AtomWithBrowserStorageMeta<Required<T>[K]>, [Required<T>[K], () => void | undefined], void>(
        (get) => {
            const valueWithMeta = get(storageAtom as unknown as WritableAtom<AtomWithBrowserStorageMeta<T>, [T], void>);
            const shouldUseDefaultValue = valueWithMeta.currentValue === SYMBOL_NOT_LOADED || valueWithMeta.currentValue === SYMBOL_NO_VALUE;
            const value = (shouldUseDefaultValue ? valueWithMeta.defaultValue : valueWithMeta.currentValue) as T;
            const propValue = value[key] === undefined ? defaultValue : value[key];
            const currentValue = (() => {
                if (valueWithMeta.currentValue === SYMBOL_NOT_LOADED) return SYMBOL_NOT_LOADED;
                if (valueWithMeta.currentValue === SYMBOL_NO_VALUE || propValue === undefined) return SYMBOL_NO_VALUE;
                return propValue;
            })();

            return {
                defaultValue,
                currentValue,
            }
        },
        (get, set, update, onSave) => {
            const valueWithMeta = get(storageAtom as unknown as WritableAtom<AtomWithBrowserStorageMeta<T>, [T], void>);
            const shouldUseDefaultValue = valueWithMeta.currentValue === SYMBOL_NOT_LOADED || valueWithMeta.currentValue === SYMBOL_NO_VALUE;
            const value = (shouldUseDefaultValue ? valueWithMeta.defaultValue : valueWithMeta.currentValue) as T;
            const propValue = value[key];
            const finalValue = { ...value };
            if (typeof update === 'function') {
                finalValue[key] = update(propValue === undefined ? defaultValue : propValue);
            } else {
                finalValue[key] = update;
            }
            set(storageAtom as unknown as WritableAtom<AtomWithBrowserStorageMeta<T>, [T, () => void | undefined], void>, finalValue, onSave);
        },
    ) as unknown as AtomWithBrowserStorage<T[K]>;
};

export const getAtomWithStorageValue = <T>(atom: AtomWithBrowserStorage<T>) => {
    const atomStore = getDefaultStore();
    const valueWithMeta = atomStore.get(atom as unknown as WritableAtom<AtomWithBrowserStorageMeta<T>, [T], void>);
    const shouldUseDefaultValue = valueWithMeta.currentValue === SYMBOL_NOT_LOADED || valueWithMeta.currentValue === SYMBOL_NO_VALUE;
    const value = (shouldUseDefaultValue ? valueWithMeta.defaultValue : valueWithMeta.currentValue) as T;
    const status = ((): AtomWithStorageStatus => {
        if (valueWithMeta.currentValue === SYMBOL_NOT_LOADED) return 'notLoaded';
        if (valueWithMeta.currentValue === SYMBOL_NO_VALUE) return 'empty';
        return 'loaded';
    })();

    return {
        value,
        status,
    };
};

export const setAtomWithStorageValue = <T>(atom: AtomWithBrowserStorage<T>, value: T) => {
    const atomStore = getDefaultStore();
    return new Promise((resolve) => {
        atomStore.set(atom as unknown as WritableAtom<AtomWithBrowserStorageMeta<T>, [T, () => void | undefined], void>, value, resolve);
    });
};

export const useAtomWithStorage = <T>(atom: AtomWithBrowserStorage<T>): UseAtomWithStorageResult<T> => {
    const setValue = (val: T) => {
        return new Promise<void>((resolve) => {
            _setValue(val, resolve);
        })
    };

    const [valueWithMeta, _setValue] = useAtom(atom as unknown as WritableAtom<AtomWithBrowserStorageMeta<T>, [T, () => void | undefined], void>);
    const shouldUseDefaultValue = valueWithMeta.currentValue === SYMBOL_NOT_LOADED || valueWithMeta.currentValue === SYMBOL_NO_VALUE;
    const value = (shouldUseDefaultValue ? valueWithMeta.defaultValue : valueWithMeta.currentValue) as T;
    const status = (() => {
        if (valueWithMeta.currentValue === SYMBOL_NOT_LOADED) return 'notLoaded';
        if (valueWithMeta.currentValue === SYMBOL_NO_VALUE) return 'empty';
        return 'loaded';
    })();

    return [value, setValue, {
        status,
        usingDefaultValue: shouldUseDefaultValue,
    }];
};