import { createRoot } from 'react-dom/client';

export const injectStyles = (styles: string[], into?: HTMLElement) => {
    if (!into) into = document.head;
    const combined = styles.join('\n');
    const styleTag = document.createElement('style');
    styleTag.append(document.createTextNode(combined));
    into.append(styleTag);
};

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

export const setPageTitle = (title: string) => {
    document.title = title;
};
