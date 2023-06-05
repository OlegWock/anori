import { useEffect } from "react";
import { asyncIterableToArray } from "./misc";
import { atom, getDefaultStore, useAtom } from "jotai";

const CUSTOM_ICONS_FOLDER_NAME = 'custom-icons';

export type CustomIcon = {
    name: string,
    urlObject: string,
};

export const CUSTOM_ICONS_AVAILABLE = (() => {
    if (typeof window === 'undefined') return true;
    if (navigator.userAgent.includes('Firefox/')) {
        const version = parseInt(navigator.userAgent.split('Firefox/')[1].split('.')[0]);
        return version >= 111;
    } else {
        return true;
    }
})();

const iconsCache: Record<string, string> = {};
const iconsAtom = atom<CustomIcon[]>([]);

const getMimeFromFile = (f: FileSystemFileHandle) => {
    const name = f.name.toLowerCase();
    // SVG requires special treatment because of Firefox which doesn't display it unsless correct mime type set
    if (name.endsWith('.svg')) return 'image/svg+xml';

    return '';
};

const getIconsDirHandle = async () => {
    const opfsRoot = await navigator.storage.getDirectory();
    const iconsDir = await opfsRoot.getDirectoryHandle(CUSTOM_ICONS_FOLDER_NAME, { create: true });
    return iconsDir;
};

export const getAllCustomIconNames = async (): Promise<string[]> => {
    const files = await getAllCustomIconFiles();
    return files.map(f => f.name);
};

export const getAllCustomIcons = async (): Promise<CustomIcon[]> => {
    const files = await getAllCustomIconFiles();
    const icons: CustomIcon[] = await Promise.all(
        files.sort((a, b) => a.name.localeCompare(b.name)).map(async (handle) => {
            const file = await (handle as FileSystemFileHandle).getFile();
            const blob = new Blob([file], { type: getMimeFromFile(handle) });
            const urlObject = iconsCache[handle.name] ? iconsCache[handle.name] : URL.createObjectURL(blob);
            if (!iconsCache[handle.name]) iconsCache[handle.name] = urlObject;
            return {
                name: handle.name,
                urlObject
            };
        })
    );
    getDefaultStore().set(iconsAtom, icons);
    return icons;
};

export const getAllCustomIconFiles = async () => {
    const iconsDir = await getIconsDirHandle();
    const files = await asyncIterableToArray(iconsDir.values());
    return files.filter(h => h.kind === 'file') as FileSystemFileHandle[];
};

export const removeAllCustomIcons = async () => {
    const opfsRoot = await navigator.storage.getDirectory();
    await opfsRoot.removeEntry(CUSTOM_ICONS_FOLDER_NAME, { recursive: true });
};

export const getCustomIcon = async (name: string): Promise<CustomIcon | null> => {
    if (iconsCache[name]) {
        return {
            name,
            urlObject: iconsCache[name],
        }
    }

    const iconsDir = await getIconsDirHandle();
    try {
        const fileHandle = await iconsDir.getFileHandle(name);
        const file = await fileHandle.getFile();
        const blob = new Blob([file], { type: getMimeFromFile(fileHandle) });
        const urlObject = URL.createObjectURL(blob);
        iconsCache[name] = urlObject;
        return {
            name,
            urlObject,
        };
    } catch (err) {
        return null;
    }
};

export const getCustomIconFromCache = (name: string): CustomIcon | null => {
    if (iconsCache[name]) {
        return {
            name,
            urlObject: iconsCache[name],
        }
    }

    return null;
};

export const useCustomIcon = (name: string) => {
    const { customIcons } = useCustomIcons();

    return customIcons.find(i => i.name === name);
};

export const useCustomIcons = () => {
    const addNewCustomIcon = async (filename: string, content: ArrayBuffer, urlObj?: string) => {
        const iconsDir = await getIconsDirHandle();
        const fileHandle = await iconsDir.getFileHandle(filename, { create: true });
        const writeHandle = await fileHandle.createWritable();
        await writeHandle.write(content);
        await writeHandle.close();

        const urlObjFinal = urlObj || URL.createObjectURL(new Blob([content]));
        iconsCache[filename] = urlObjFinal;
        setIcons(p => [...p.filter(i => i.name !== filename), { name: filename, urlObject: urlObjFinal }].sort((a, b) => a.name.localeCompare(b.name)));
    };

    const removeCustomIcon = async (filename: string) => {
        const iconsDir = await getIconsDirHandle();
        await iconsDir.removeEntry(filename);
        setIcons(p => p.filter(icon => icon.name !== filename));
        if (iconsCache[filename]) {
            URL.revokeObjectURL(iconsCache[filename]);
            delete iconsCache[filename];
        }
    }

    const [icons, setIcons] = useAtom(iconsAtom);

    useEffect(() => {
        getAllCustomIcons().then(icons => setIcons(icons));
    }, []);

    return {
        customIcons: icons,
        addNewCustomIcon,
        removeCustomIcon,
    };
};

export const isValidCustomIconName = (name: string) => {
    return (/^[\w\-_]+$/).test(name);
}