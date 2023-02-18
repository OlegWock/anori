import browser from 'webextension-polyfill';
import { dynamicAtomWithBrowserStorage, storage } from "./storage";
import { AnoriPlugin, FolderDetailsInStorage, ID, WidgetInFolderWithMeta, homeFolder } from "./user-data/types";
import { PrimitiveAtom, WritableAtom, atom, useAtom } from 'jotai';
import { SetStateAction, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { NamespacedStorage } from './namespaced-storage';


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
        const widget = plugin.widgets.find(d => d.id === w.widgetId)!;

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

const ATOM_NOT_SET_VALUE = Symbol.for('default');
const pluginConfigAtoms: Record<ID, PrimitiveAtom<any>> = {};
const getPluginConfigAtom = <T extends {}>(plugin: AnoriPlugin<T>) => {
    if (!pluginConfigAtoms[plugin.id]) {
        pluginConfigAtoms[plugin.id] = dynamicAtomWithBrowserStorage(`PluginConfig.${plugin.id}`, ATOM_NOT_SET_VALUE);
    }

    return pluginConfigAtoms[plugin.id] as WritableAtom<T | typeof ATOM_NOT_SET_VALUE, [
        SetStateAction<T>
    ], void>;
};

export function usePluginConfig<T extends {}>(plugin: AnoriPlugin<T>): readonly [value: T | undefined, setValue: (val: SetStateAction<T>) => void, isDefault: boolean];
export function usePluginConfig<T extends {}>(plugin: AnoriPlugin<T>, defaultConfig: T): readonly [value: T, setValue: (val: SetStateAction<T>) => void, isDefault: boolean];
export function usePluginConfig<T extends {}>(plugin: AnoriPlugin<T>, defaultConfig?: T): readonly [value: T | undefined, setValue: (val: SetStateAction<T>) => void, isDefault: boolean] {

    const [val, setVal] = useAtom(getPluginConfigAtom<T>(plugin));
    const isDefault = val === ATOM_NOT_SET_VALUE;
    
    return [
        isDefault ? defaultConfig : val, 
        setVal, 
        isDefault
    ] as const;
}

export const getPluginConfig = <T extends {}>(plugin: AnoriPlugin<T>) => {
    // @ts-ignore It's dynamic property, but I don't want to code custom util for one usage
    return storage.getOne(`PluginConfig.${plugin.id}`) as Promise<T | undefined>;
};