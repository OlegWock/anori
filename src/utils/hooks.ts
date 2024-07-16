import { DependencyList, MouseEventHandler, MutableRefObject, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react"
import { useHotkeys as useHotkeysOriginal } from 'react-hotkeys-hook';
import { HotkeyCallback, HotkeysEvent, Keys, OptionsOrDependencyArray } from "react-hotkeys-hook/dist/types";
import { trackEvent } from "./analytics";

export const useForceRerender = () => {
    const [, forceUpdate] = useReducer(x => x + 1, 0);

    return forceUpdate;
};

export function usePrevious<T>(value: T): T | undefined;
export function usePrevious<T>(value: T, defaultValue: T): T;
export function usePrevious<T>(value: T, defaultValue?: T) {
    const ref = useRef<T>();

    useEffect(() => {
        ref.current = value;
    });
    return ref.current === undefined ? defaultValue : ref.current;
}

export const useWindowIsResizing = () => {
    const TIMEOUT = 1000;

    const [isResizing, setIsResizing] = useState(false);

    useEffect(() => {
        let tid: null | number = null;
        const handler = () => {
            setIsResizing(true);
            if (tid) clearTimeout(tid);
            tid = window.setTimeout(() => {
                setIsResizing(false);
            }, TIMEOUT);
        };
        window.addEventListener('resize', handler);

        return () => window.removeEventListener('resize', handler);
    }, []);

    return isResizing;
};

export const useMirrorStateToRef = <T>(val: T) => {
    const ref = useRef(val);
    ref.current = val;
    return ref;
};

export const useOnChangeEffect = (fn: React.EffectCallback, deps?: React.DependencyList | undefined) => {
    const isFirstRun = useRef(true);
    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }

        return fn();
    }, deps);
};


export const useOnChangeLayoutEffect = (fn: React.EffectCallback, deps?: React.DependencyList | undefined) => {
    const isFirstRun = useRef(true);
    useLayoutEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }

        return fn();
    }, deps);
};

const symbolUseRunIfDepsChangedNotSet = Symbol();
export const useRunIfDepsChanged = (fn: () => void, deps: React.DependencyList) => {
    const prevRefs = deps.map(d => usePrevious(d, symbolUseRunIfDepsChangedNotSet));
    const isChanged = prevRefs.some((r, ind) => r !== symbolUseRunIfDepsChangedNotSet && r !== deps[ind]);
    if (isChanged) {
        fn();
    }
};

export const useLinkNavigationState = () => {
    const onLinkClick: MouseEventHandler<HTMLElement> = (e) => {
        if (e.metaKey || e.ctrlKey) return;
        setIsNavigating(true);

        setTimeout(() => {
            setIsNavigating(false);
        }, 5000);
    };

    const [isNavigating, setIsNavigating] = useState(false);

    return { isNavigating, onLinkClick }
};

export const useHotkeys = (keys: Keys, callback: HotkeyCallback, options?: OptionsOrDependencyArray, dependencies?: OptionsOrDependencyArray) => {
    const patchedCallback: HotkeyCallback = (keyboardEvent: KeyboardEvent, hotkeysEvent: HotkeysEvent) => {
        const finalKeys = Array.isArray(keys) ? keys.join('+') : keys;
        trackEvent('Hotkey used', { hotkey: finalKeys });
        return callback(keyboardEvent, hotkeysEvent);
    };

    return useHotkeysOriginal(keys, patchedCallback, options, dependencies);
};

export const useRunAfterNextRender = () => {
    const functionsList = useRef<(() => void)[]>([]);

    useEffect(() => {
        while (functionsList.current.length > 0) {
            const func = functionsList.current.pop()!;
            func();
        }
    });

    return (func: () => void) => {
        functionsList.current.push(func);
    };
};


export const useIntervalRender = (interval: number) => {
    const forceUpdate = useForceRerender();

    useEffect(() => {
        const tid = setInterval(() => forceUpdate(), interval);
        return () => clearInterval(tid);
    }, [interval]);
};

export const useScheduledRender = () => {
    const forceUpdate = useForceRerender();
    const tid = useRef<null | NodeJS.Timeout>(null);

    useEffect(() => {
        return () => {
            if (tid.current) clearTimeout(tid.current);
        };
    }, []);

    return (delay: number) => {
        if (tid.current) clearTimeout(tid.current);
        tid.current = setTimeout(() => {
            forceUpdate();
            tid.current = null;
        }, delay);
    };
};

export const useLazyRef = <T>(init: () => T): MutableRefObject<T> => {
    const ref = useRef<T | undefined>(undefined);
    if (ref.current === undefined) {
        ref.current = init();
    }

    return ref as MutableRefObject<T>;
};

export const useAsyncEffect = (func: () => any, deps?: DependencyList | undefined) => {
    // This hook needed only to please typescript, as it's angry when you pass async function into useEffect
    useEffect(() => {
        func();
    }, deps);
};

export const useAsyncLayoutEffect = (func: () => any, deps?: DependencyList | undefined) => {
    // This hook needed only to please typescript, as it's angry when you pass async function into useEffect
    useLayoutEffect(() => {
        func();
    }, deps);
};

export const useLocationHash = () => {
    const setHash = (newHash: string) => {
        window.location.hash = newHash;
        _setHash(newHash);
    };

    const [hash, _setHash] = useState(() => window.location.hash.slice(window.location.hash.length > 0 ? 1 : 0));
    const hashStateRef = useMirrorStateToRef(hash);

    useEffect(() => {
        const func = () => {
            const normalizedHash = window.location.hash.slice(window.location.hash.length > 0 ? 1 : 0);
            if (hashStateRef.current === normalizedHash) {
                return;
            }
            console.log(`Hash changed ${hashStateRef.current} => ${normalizedHash}`)
            _setHash(normalizedHash);
        }
        window.addEventListener('hashchange', func);
        return () => window.removeEventListener('hashchange', func);
    }, []);

    return [hash, setHash] as const;
};