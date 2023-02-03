import { atomWithBrowserStorage } from "@utils/storage";
import { atom, useAtom } from "jotai";
import { Folder, ID, homeFolder } from "./types";
import { guid } from "@utils/misc";

const foldersAtom = atomWithBrowserStorage('folders', []);
const activeFolderAtom = atom<ID>('home');
export const useFolders = (includeHome = false) => {
    const createFolder = (name = 'New folder', icon = 'ion:folder-open-sharp') => {
        const newFolder = {
            id: guid(),
            name,
            icon,
        };
        setFolders(p => [...p, newFolder]);
        return newFolder;
    };

    const removeFolder = (id: ID) => {
        // TODO: don't forget to wipe all widgets from this folder;
        setFolders(p => p.filter(f => f.id !== id));
    };

    const updateFolder = (id: ID, update: Partial<Omit<Folder, 'id'>>) => {
        setFolders(p => p.map(f => {
            if (f.id === id) {
                return {
                    ...f,
                    ...update,
                }
            }
            return f;
        }))
    };

    const changeFolderPosition = (id: ID, moveTo: number) => {
        setFolders(p => {
            const copy = [...p];
            const currentIndex = copy.findIndex(f => f.id === id);
            if (currentIndex === -1 || moveTo === currentIndex) return copy;

            const [folder] = copy.splice(currentIndex, 1);
            const newIndex = moveTo > currentIndex ? moveTo - 1 : moveTo;
            copy.splice(newIndex, 0, folder);
            return copy;
        });
    };

    const setActiveFolder = (f: ID | Folder) => {
        setActiveId(typeof f === 'string' ? f : f.id);
    }

    const [activeId, setActiveId] = useAtom(activeFolderAtom);
    const [folders, setFolders] = useAtom(foldersAtom);
    let foldersFinal = [...folders];
    if (includeHome) {
        foldersFinal.unshift(homeFolder);
    }

    const activeFolder = activeId === homeFolder.id ? homeFolder : folders.find(f => f.id === activeId)!;

    return { 
        folders: foldersFinal, 
        activeFolder,
        setActiveFolder,
        setFolders,
        createFolder,
        updateFolder,
        changeFolderPosition,
        removeFolder,
     };
}