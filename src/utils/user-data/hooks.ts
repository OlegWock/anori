import { atomWithBrowserStorage, dynamicAtomWithBrowserStorage, storage } from "@utils/storage";
import { PrimitiveAtom, atom, getDefaultStore, useAtom } from "jotai";
import { AnoriPlugin, Folder, FolderDetailsInStorage, ID, WidgetDescriptor, WidgetInFolder, WidgetInFolderWithMeta, homeFolder } from "./types";
import { guid } from "@utils/misc";
import { useEffect, useMemo } from "react";
import { availablePluginsWithWidgets } from "@plugins/all";
import { Position } from "@utils/grid";
import browser from 'webextension-polyfill';
import { NamespacedStorage } from "@utils/namespaced-storage";

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
        const atom = getFolderDetailsAtom(id);
        const store = getDefaultStore();
        store.set(atom, { widgets: [] });
        setTimeout(() => {
            browser.storage.local.remove(`Folder.${id}`);
        }, 0);
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
    const foldersFinal = [...folders];
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
        } satisfies FolderDetailsInStorage);
    }

    return folderDetailsAtoms[id];
};

export const useFolderWidgets = (folder: Folder) => {
    const addWidget = <T extends {}>({ plugin, widget, config, position }: { plugin: AnoriPlugin, widget: WidgetDescriptor<T>, config: T, position: Position }) => {
        const instanceId = guid();

        const data: WidgetInFolder<T> = {
            pluginId: plugin.id,
            widgetId: widget.id,
            instanceId,
            configutation: config,
            ...widget.size,
            ...position,
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
        NamespacedStorage.get(`WidgetStorage.${id}`).clear();
        setDetails(p => {
            return {
                ...p,
                widgets: p.widgets.filter(w => w.instanceId !== id),
            };
        });
    };

    const moveWidget = (widgetOrId: WidgetInFolder<any> | ID, position: Position) => {
        const id = typeof widgetOrId === 'string' ? widgetOrId : widgetOrId.instanceId;
        setDetails(p => {
            return {
                ...p,
                widgets: p.widgets.map(w => {
                    if (w.instanceId === id) {
                        return {
                            ...w,
                            ...position,
                        }
                    }
                    return w;
                }),
            };
        });
    };

    const updateWidgetConfig = <T extends {}>(widgetOrId: WidgetInFolder<T> | ID, newConfig: T) => {
        const id = typeof widgetOrId === 'string' ? widgetOrId : widgetOrId.instanceId;
        setDetails(p => {
            return {
                ...p,
                widgets: p.widgets.map(w => {
                    if (w.instanceId === id) {
                        return {
                            ...w,
                            configutation: {
                                ...w.configutation,
                                ...newConfig,
                            },
                        }
                    }
                    return w;
                }),
            };
        });
    };

    const atom = useMemo(() => getFolderDetailsAtom(folder.id), [folder]);
    const [details, setDetails] = useAtom(atom);

    const widgets: WidgetInFolderWithMeta<any, any, any>[] = details.widgets.filter(w => {
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
        moveWidget,
        updateWidgetConfig,
    };
};