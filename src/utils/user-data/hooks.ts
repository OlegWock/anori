import { atomWithBrowserStorage, dynamicAtomWithBrowserStorage } from "@utils/storage";
import { PrimitiveAtom, atom, useAtom } from "jotai";
import { AodakePlugin, Folder, FolderDetailsInStorage, ID, WidgetDescriptor, WidgetInFolder, WidgetInFolderWithMeta, homeFolder } from "./types";
import { guid } from "@utils/misc";
import { useEffect, useMemo } from "react";
import { availablePluginsWithWidgets } from "@plugins/all";

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
};


const folderDetailsAtoms: Record<ID, PrimitiveAtom<FolderDetailsInStorage>> = {};
const getFolderDetailsAtom = (id: ID) => {
    if (!folderDetailsAtoms[id]) {
        folderDetailsAtoms[id] = dynamicAtomWithBrowserStorage(`Folder.${id}`, {
            widgets: [],
        });
    }

    return folderDetailsAtoms[id];
};

export const useFolderWidgets = (folder: Folder) => {
    const addWidget = <T extends {}>({ plugin, widget, config }: { plugin: AodakePlugin, widget: WidgetDescriptor<T>, config: T }) => {
        const instanceId = guid();
        const data: WidgetInFolder<T> = {
            pluginId: plugin.id,
            widgetId: widget.id,
            instanceId,
            configutation: config,
        };

        setDetails(p => {
            return {
                ...p, 
                widgets: [
                    ...p.widgets,
                    data
                ]
            }
        });

        return data;
    };

    const removeWidget = (widgetOrId: WidgetInFolder<any> | ID) => {
        const id = typeof widgetOrId === 'string' ? widgetOrId : widgetOrId.instanceId;
        setDetails(p => {
            return {
                ...p,
                widgets: p.widgets.filter(w => w.instanceId !== id),
            };
        });
    }

    const atom = useMemo(() => getFolderDetailsAtom(folder.id), [folder]);
    const [details, setDetails] = useAtom(atom);

    const widgets: WidgetInFolderWithMeta<any>[] = details.widgets.filter(w => {
        const plugin = availablePluginsWithWidgets.find(p => p.id === w.pluginId);
        if (!plugin) return false;
        return !!plugin.widgets.find(d => d.id === w.widgetId);
    }).map(w => {
        const plugin = availablePluginsWithWidgets.find(p => p.id === w.pluginId)!;
        const widget = plugin.widgets.find(d => d.id === w.widgetId)!;

        return {
            ...w,
            widget,
            plugin,
        }
    });

    return {
        widgets,
        addWidget,
        removeWidget,
    };
};