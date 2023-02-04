import { useEffect, useLayoutEffect, useRef, useState } from "react"

export const useForceRerender = () => {
    const [state, setState] = useState({});

    return () => setState({});
};

export function usePrevious<T>(value: T) {
    const ref = useRef<T>();
    useLayoutEffect(() => {
        ref.current = value;
    }, [value]);
    return ref.current;
};

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