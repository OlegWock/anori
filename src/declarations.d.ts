declare module '@assets/*' {
    const url: string;
    export default url;
}

declare module '*?raw' {
    const content: string;
    export default content;
}

declare module '*.scss' {
    const content: string;
    export default content;
}

declare module '*.sass' {
    const content: string;
    export default content;
}

declare module '*.css' {
    const content: string;
    export default content;
}

declare const X_MODE: 'development' | 'production';
declare const X_BROWSER: 'chrome';
