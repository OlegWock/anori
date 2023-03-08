import { PrimitiveAtom, getDefaultStore, useAtom } from "jotai";
import { dynamicAtomWithBrowserStorage } from "./storage";
import { useMemo } from "react";
import { focusAtom } from "jotai-optics";
import { OpticFor } from "optics-ts";
import browser from 'webextension-polyfill';

export class NamespacedStorage<T extends {} = {}> {
    ns: string;
    atom: PrimitiveAtom<Partial<T>>;
    loaded: boolean;
    private _loadingPromise: Promise<void>;

    static get<T extends {} = {}>(ns: string): NamespacedStorage<T> {
        const inCache = cache.get(ns);
        if (inCache) return inCache;

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
        this.atom = dynamicAtomWithBrowserStorage(ns, {}, {
            forceLoad: true,
            onLoad: onLoad,
        });
        this.loaded = false;
    }

    waitForLoad() {
        return this._loadingPromise;
    }

    get<K extends keyof T>(name: K): T[K] | undefined {
        const atomStore = getDefaultStore();
        const val = atomStore.get(this.atom);
        return val[name];
    }

    set<K extends keyof T>(name: K, val: T[K]) {
        const atomStore = getDefaultStore();
        const currentState = atomStore.get(this.atom);
        atomStore.set(this.atom, {
            ...currentState,
            [name]: val,
        });
    }

    clear() {
        const atomStore = getDefaultStore();
        atomStore.set(this.atom, {});
        return browser.storage.local.remove(this.ns);
    }


    useValue<K extends keyof T>(name: K, defaultValue: T[K]) {
        // @ts-ignore-error
        const focusedAtom = useMemo(() => focusAtom(this.atom, (optic: OpticFor<any>) => optic.prop(name)), [name]);
        const [value, setValue] = useAtom(focusedAtom);

        const correctedValue: T[K] = value === undefined ? defaultValue : value;

        const correctedSetValue = (newVal: T[K] | ((old: T[K]) => T[K])) => {
            // @ts-ignore Couldn't figure out better types
            const toStore = typeof newVal === 'function' ? newVal(correctedValue) : newVal;
            setValue(toStore);
        };

        return [correctedValue, correctedSetValue] as const;
    }

}

const cache: Map<string, NamespacedStorage> = new Map();