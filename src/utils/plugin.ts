import browser from 'webextension-polyfill';
import { AtomWithBrowserStorage, atomWithBrowserStorage, storage, useAtomWithStorage } from "./storage";
import { AnoriPlugin, FolderDetailsInStorage, ID, OnMessageDescriptor, WidgetInFolderWithMeta, homeFolder } from "./user-data/types";
import { SetStateAction, createContext, useContext, useMemo } from 'react';
import { NamespacedStorage } from './namespaced-storage';
import { LayoutItemSize } from './grid';


export const getAllWidgetsByPlugin = async <PT extends {}, WT extends {}>(plugin: AnoriPlugin<PT, WT>) => {
    const foldersFromStorage = await storage.getOne('folders');
    const folders = [
        homeFolder,
        ...(foldersFromStorage || [])
    ];

    const folderDetails = await Promise.all(folders.map(f => {
        return browser.storage.local.get({
            [`Folder.${f.id}`]: {
                widgets: [],
            } satisfies FolderDetailsInStorage
        }).then(r => r[`Folder.${f.id}`])
    })) as FolderDetailsInStorage<WT>[];

    const widgets = folderDetails.flatMap(details => details.widgets);
    return widgets.filter(w => w.pluginId === plugin.id).map(w => {
        const widget = plugin.widgets.flat().find(d => d.id === w.widgetId)!;

        return {
            ...w,
            widget,
            plugin,
        } satisfies WidgetInFolderWithMeta<WT, PT, WT>;
    });

};

export type WidgetMetadataContextType<WidgetConfigT extends {}> = {
    pluginId: string,
    instanceId: string,
    size: LayoutItemSize,
    config: WidgetConfigT,
    updateConfig: (update: Partial<WidgetConfigT>) => void,
};

export const WidgetMetadataContext = createContext({
    pluginId: '',
} as WidgetMetadataContextType<{}>);

export const useWidgetMetadata = <WidgetConfigT extends {} = {}>() => {
    const val = useContext(WidgetMetadataContext) as WidgetMetadataContextType<WidgetConfigT>;
    if (!val.pluginId) throw new Error('useWidgetMetadata should be used only inside widgets');

    return val;
};

export const getWidgetStorage = <StorageT extends {}>(instanceId: ID) => {
    return NamespacedStorage.get<StorageT>(`WidgetStorage.${instanceId}`);
};

export const useWidgetStorage = <StorageT extends {}>() => {
    const metadata = useWidgetMetadata();
    const nsStorage = useMemo(() => getWidgetStorage<StorageT>(metadata.instanceId), [metadata.pluginId]);
    return nsStorage;
};

// ---- Plugin storage ----

export const getPluginStorage = <StorageT extends {}>(pluginId: ID) => {
    return NamespacedStorage.get<StorageT>(`PluginStorage.${pluginId}`);
};

export const usePluginStorage = <StorageT extends {}>() => {
    const metadata = useWidgetMetadata();
    const nsStorage = useMemo(() => getPluginStorage<StorageT>(metadata.pluginId), [metadata.pluginId]);
    return nsStorage;
};

// ---- Plugin config ----

const pluginConfigAtoms: Record<ID, AtomWithBrowserStorage<any>> = {};
const getPluginConfigAtom = <T extends {}>(plugin: AnoriPlugin<T>) => {
    if (!pluginConfigAtoms[plugin.id]) {
        pluginConfigAtoms[plugin.id] = atomWithBrowserStorage<T | undefined>(`PluginConfig.${plugin.id}`, undefined);
    }

    return pluginConfigAtoms[plugin.id];
};

export function usePluginConfig<T extends {}>(plugin: AnoriPlugin<T>): readonly [value: T | undefined, setValue: (val: SetStateAction<T>) => void, isLoaded: boolean];
export function usePluginConfig<T extends {}>(plugin: AnoriPlugin<T>, defaultConfig: T): readonly [value: T, setValue: (val: SetStateAction<T>) => void, isLoaded: boolean];
export function usePluginConfig<T extends {}>(plugin: AnoriPlugin<T>, defaultConfig?: T): readonly [value: T | undefined, setValue: (val: SetStateAction<T>) => void, isLoaded: boolean] {

    const [val, setVal, meta] = useAtomWithStorage(getPluginConfigAtom<T>(plugin));
    
    return [
        meta.usingDefaultValue ? defaultConfig : val, 
        setVal, 
        ['loaded', 'empty'].includes(meta.status),
    ] as const;
}

export const getPluginConfig = <T extends {}>(plugin: AnoriPlugin<T>) => {
    // @ts-ignore It's dynamic property, but I don't want to code custom util for one usage
    return storage.getOne(`PluginConfig.${plugin.id}`) as Promise<T | undefined>;
};


// TODO: Message passing should be documented, see examples of usage in bookmarks plugin
export const createOnMessageHandlers = <T extends {[key in string]: OnMessageDescriptor<any, any>},>(pluginId: string, handlers: {[K in keyof T]: (args: T[K]["args"], senderTab?: number) => Promise<T[K]["result"]>}) => {
    return {
        handlers,
        sendMessage: <K extends keyof T>(command: K, args: T[K]["args"]): Promise<T[K]["result"]> => {
            const message = {
                type: 'plugin-command',
                pluginId,
                command,
                args,
            };
            return browser.runtime.sendMessage(message);
        },
    };
};