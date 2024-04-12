import { createRoot } from 'react-dom/client';
import type { LegacyRef, MutableRefObject } from "react";
import { mergeRefs } from "react-merge-refs";

export const mountPage = (element: JSX.Element) => {
    const node = document.getElementById('root');
    if (!node) {
        throw new Error('Called mountPage in invalid context');
    }
    const root = createRoot(node);
    root.render(element);

    return () => {
        root.unmount();
    };
};

export const combineRefs = (...args: (MutableRefObject<any> | LegacyRef<any> | undefined)[]) => {
    return mergeRefs(args.filter(a => !!a) as (MutableRefObject<any> | LegacyRef<any>)[]);
};