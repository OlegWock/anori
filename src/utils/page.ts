export const injectStyles = (styles: string[], into?: HTMLElement) => {
    if (!into) into = document.head;
    const combined = styles.join('\n');
    const styleTag = document.createElement('style');
    styleTag.append(document.createTextNode(combined));
    into.append(styleTag);
};

export const setPageTitle = (title: string) => {
    document.title = title;
};

export const setPageBackground = (bg: string) => {
    document.body.style.backgroundImage = `url(${bg})`;
    document.documentElement.style.setProperty('--background-image', `url('${bg}')`);
}