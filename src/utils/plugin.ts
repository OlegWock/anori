import browser from 'webextension-polyfill';
import { dynamicAtomWithBrowserStorage, storage } from "./storage";
import { AodakePlugin, FolderDetailsInStorage, ID, WidgetInFolderWithMeta, homeFolder } from "./user-data/types";
import { PrimitiveAtom, WritableAtom, atom, useAtom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { SetStateAction, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { focusAtom } from 'jotai-optics';
import { OpticFor } from 'optics-ts';


export const getAllWidgetsByPlugin = async <PT extends {}, WT extends {}>(plugin: AodakePlugin<PT, WT>) => {
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

type UsePluginStorageHook<T extends {}> = <K extends keyof T>(key: K, defaultValue: T[K]) => readonly [val: T[K], setter: (newVal: T[K] | ((old: T[K]) => T[K])) => void];

const pluginStorageAtoms: Record<ID, PrimitiveAtom<any>> = {};
const getPluginStorageAtom = (plugin: AodakePlugin) => {
    if (!pluginStorageAtoms[plugin.id]) {
        pluginStorageAtoms[plugin.id] = dynamicAtomWithBrowserStorage<any>(`PluginStorage.${plugin.id}`, {});
    }

    return pluginStorageAtoms[plugin.id];
};
export const createPluginStorageHook = <T extends {}>(plugin: AodakePlugin) => {
    const atom = getPluginStorageAtom(plugin);

    const hook: UsePluginStorageHook<T> = <K extends keyof T>(key: K, defaultValue: T[K]) => {
        const focusedAtom = useMemo(() => focusAtom(atom, (optic: OpticFor<any>) => optic.prop(key)), [key]);
        const [value, setValue] = useAtom(focusedAtom);

        const correctedValue: T[K] = value === undefined ? defaultValue : value;

        const correctedSetValue = (newVal: T[K] | ((old: T[K]) => T[K])) => {
            // @ts-ignore
            const toStore = typeof newVal === 'function' ? newVal(correctedValue) : newVal;
            setValue(toStore);
        };

        return [correctedValue, correctedSetValue] as const;
    };

    return hook;
};

export type PluginUtilsContextType<StorageT extends {}, WidgetConfigT extends {}> = {
    pluginId: string,
    instanceId: string,
    useStorage: UsePluginStorageHook<StorageT>,
    config: WidgetConfigT,
    updateConfig: (update: Partial<WidgetConfigT>) => void,
};

export const PluginUtilsContext = createContext({
    pluginId: '',
} as PluginUtilsContextType<{}, {}>);

export const usePluginUtils = <WidgetConfigT extends {} = {}, StorageT extends {} = {}>() => {
    const val = useContext(PluginUtilsContext) as PluginUtilsContextType<StorageT, WidgetConfigT>;
    if (!val.pluginId) throw new Error('usePluginUtils should be used only inside widgets');

    return val;
};


const ATOM_NOT_SET_VALUE = Symbol.for('default');
const pluginConfigAtoms: Record<ID, PrimitiveAtom<any>> = {};
const getPluginConfigAtom = <T extends {}>(plugin: AodakePlugin<T>) => {
    if (!pluginConfigAtoms[plugin.id]) {
        pluginConfigAtoms[plugin.id] = dynamicAtomWithBrowserStorage(`PluginConfig.${plugin.id}`, ATOM_NOT_SET_VALUE);
    }

    return pluginConfigAtoms[plugin.id] as WritableAtom<T | typeof ATOM_NOT_SET_VALUE, [
        SetStateAction<T>
    ], void>;
};

export function usePluginConfig<T extends {}>(plugin: AodakePlugin<T>): readonly [value: T | undefined, setValue: (val: SetStateAction<T>) => void, isDefault: boolean];
export function usePluginConfig<T extends {}>(plugin: AodakePlugin<T>, defaultConfig: T): readonly [value: T, setValue: (val: SetStateAction<T>) => void, isDefault: boolean];
export function usePluginConfig<T extends {}>(plugin: AodakePlugin<T>, defaultConfig?: T): readonly [value: T | undefined, setValue: (val: SetStateAction<T>) => void, isDefault: boolean] {

    const [val, setVal] = useAtom(getPluginConfigAtom<T>(plugin));
    const isDefault = val === ATOM_NOT_SET_VALUE;
    // @ts-ignore
    return [
        isDefault ? defaultConfig : val, 
        setVal, 
        isDefault
    ] as const;
}

export const getPluginConfig = <T extends {}>(plugin: AodakePlugin<T>) => {
    // @ts-ignore
    return storage.getOne(`PluginConfig.${plugin.id}`) as Promise<T | undefined>;
};