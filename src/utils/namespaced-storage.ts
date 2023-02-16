import { PrimitiveAtom, getDefaultStore, useAtom } from "jotai";
import { dynamicAtomWithBrowserStorage } from "./storage";
import { useMemo } from "react";
import { focusAtom } from "jotai-optics";
import { OpticFor } from "optics-ts";
import browser from 'webextension-polyfill';

export class NamespacedStorage<T extends {} = {}> {
    ns: string;
    atom: PrimitiveAtom<Partial<T>>;

    static get<T extends {} = {}>(ns: string): NamespacedStorage<T> {
        const inCache = cache.get(ns);
        if (inCache) return inCache;

        const nsStorage = new NamespacedStorage<T>(ns);
        cache.set(ns, nsStorage);
        return nsStorage;
    }

    private constructor(ns: string) {
        this.ns = ns;
        this.atom = dynamicAtomWithBrowserStorage(ns, {});
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
        const focusedAtom = useMemo(() => focusAtom(this.atom, (optic: OpticFor<any>) => optic.prop(name)), [name]);
        const [value, setValue] = useAtom(focusedAtom);

        const correctedValue: T[K] = value === undefined ? defaultValue : value;

        const correctedSetValue = (newVal: T[K] | ((old: T[K]) => T[K])) => {
            // @ts-ignore
            const toStore = typeof newVal === 'function' ? newVal(correctedValue) : newVal;
            setValue(toStore);
        };

        return [correctedValue, correctedSetValue] as const;
    }
    
}

const cache: Map<string, NamespacedStorage> = new Map();