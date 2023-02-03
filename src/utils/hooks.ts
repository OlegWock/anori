import { useLayoutEffect, useRef, useState } from "react"

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
}