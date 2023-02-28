import { MouseEventHandler, useEffect, useLayoutEffect, useRef, useState } from "react"

export const useForceRerender = () => {
    const [state, setState] = useState({});

    return () => setState({});
};

export function usePrevious<T>(value: T): T | undefined;
export function usePrevious<T>(value: T, defaultValue: T): T;
export function usePrevious<T>(value: T, defaultValue?: T) {
    const ref = useRef<T>();
    useLayoutEffect(() => {
        ref.current = value;
    }, [value]);
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


export const useLinkNavigationState = () => {
    const onLinkClick: MouseEventHandler<HTMLAnchorElement> = (e) => {
        if (e.metaKey || e.ctrlKey) return;
        setIsNavigating(true);

        setTimeout(() => {
            setIsNavigating(false);
        }, 5000);
    };

    const [isNavigating, setIsNavigating] = useState(false);

    return {isNavigating, onLinkClick}
};