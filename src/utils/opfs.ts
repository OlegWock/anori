export const OPFS_AVAILABLE = (() => {
    if (typeof window === 'undefined') return true;
    if (navigator.userAgent.includes('Firefox/')) {
        const version = parseInt(navigator.userAgent.split('Firefox/')[1].split('.')[0]);
        return version >= 111;
    } else if (navigator.userAgent.includes('Safari/') && navigator.userAgent.includes('Version/')) {
        // This should be supported in Safari 15.2+. However, due to bug in Safari, data is not persisted across browser runs
        // https://bugs.webkit.org/show_bug.cgi?id=259637
        return false;
        
        // const version = parseFloat(navigator.userAgent.split('Version/')[1].split(' ')[0].split('.').slice(0, 2).join('.'));
        // return version >= 15.2;
    } else {
        return true;
    }
})();

export const getDirectoryInRoot = async (name: string) => {
    const opfsRoot = await navigator.storage.getDirectory();
    const dir = await opfsRoot.getDirectoryHandle(name, { create: true });
    return dir;
};