import { AtomWithBrowserStorage, atomWithBrowserStorage, focusAtomWithStorage, getAtomWithStorageValue, setAtomWithStorageValue, useAtomWithStorage } from "./storage/api";
import { useMemo } from "react";
import browser from 'webextension-polyfill';

export class NamespacedStorage<T extends {} = {}> {
    ns: string;
    atom: AtomWithBrowserStorage<Partial<T>>;
    loaded: boolean;
    private _loadingPromise: Promise<void>;

    static get<T extends {} = {}>(ns: string): NamespacedStorage<T> {
        const inCache = cache.get(ns);
        if (inCache) {
            return inCache as NamespacedStorage<T>;
        }

        const nsStorage = new NamespacedStorage<T>(ns);
        cache.set(ns, nsStorage);
        return nsStorage;
    }

    private constructor(ns: string) {
        let onLoad = () => { };
        this.ns = ns;
        this._loadingPromise = new Promise((resolve) => {
            onLoad = () => {
                this.loaded = true;
                resolve();
            };
        });
        this.atom = atomWithBrowserStorage<Partial<T>>(ns, {}, {
            forceLoad: true,
            onLoad: onLoad,
        });
        this.loaded = false;
    }

    waitForLoad() {
        return this._loadingPromise;
    }

    get<K extends keyof T>(name: K): T[K] | undefined {
        const { value } = getAtomWithStorageValue(this.atom);
        return value[name];
    }

    set<K extends keyof T>(name: K, val: T[K]) {
        const { value: currentState } = getAtomWithStorageValue(this.atom);
        return setAtomWithStorageValue(this.atom, {
            ...currentState,
            [name]: val,
        });
    }

    setMany<M extends Partial<T>>(mapping: M) {
        const { value: currentState } = getAtomWithStorageValue(this.atom);
        return setAtomWithStorageValue(this.atom, {
            ...currentState,
            ...mapping,
        });
    }

    clear() {
        setAtomWithStorageValue(this.atom, {});
        return browser.storage.local.remove(this.ns);
    }


    useValue<K extends keyof T>(name: K, defaultValue: T[K]) {
        const focusedAtom = useMemo(() => focusAtomWithStorage(this.atom, name, defaultValue), [name]) as AtomWithBrowserStorage<Required<T>[K]>;
        return useAtomWithStorage(focusedAtom);
    }

}

const cache: Map<string, NamespacedStorage> = new Map();