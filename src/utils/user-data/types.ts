import { LayoutItem, LayoutItemSize } from "@utils/grid";
import { ComponentType } from "react";
import { Theme } from "./theme";

export type StorageContent = {
    folders: Folder[],
    theme: Theme,
    stealFocus: boolean,
};

export type ID = string;

export type Folder = {
    id: ID,
    name: string,
    icon: string,
};

export type FolderDetailsInStorage<WT extends {} = any> = {
    widgets: WidgetInFolder<WT>[],
};

export type WidgetInFolder<T extends {}> = {
    pluginId: ID,
    widgetId: ID,
    instanceId: ID,
    configutation: T,
} & LayoutItem;

export type WidgetInFolderWithMeta<T extends WT, P extends {}, WT extends {}> = WidgetInFolder<T> & {
    plugin: AodakePlugin<P, WT>,
    widget: WidgetDescriptor<T>,
}

export const homeFolder = {
    id: 'home',
    name: 'Home',
    icon: 'ion:home'
} satisfies Folder;

// ------ Plugins

export type AodakePlugin<T extends {} = {}, WT extends {} = {}> = {
    id: ID,
    name: string,
    widgets: WidgetDescriptor<WT>[],
    configurationScreen: ComponentType<ConfigurationScreenProps<T>> | null,
    onCommandInput?: OnCommandInputCallback,
    onStart?: () => void,
    scheduledCallback?: {
        intervalInMinutes: number,
        callback: () => void,
    }
};

export type ConfigurationScreenProps<T extends {}> = {
    currentConfig?: T,
    saveConfiguration: (config: T) => void,
};

export type WidgetRenderProps<T extends {}> = {
    config: T,
    instanceId: string,
};

export type WidgetDescriptor<T extends {} = {}> = {
    id: ID,
    name: string,
    mock: ComponentType<{}>,
    size: LayoutItemSize,
} & ({
    configurationScreen: ComponentType<ConfigurationScreenProps<T>>,
    mainScreen: ComponentType<WidgetRenderProps<T>>,
} | {
    configurationScreen: null,
    mainScreen: ComponentType<WidgetRenderProps<{}>>,
});

export type OnCommandInputCallback = (text: string) => Promise<CommandItem[]>;

export type CommandItem = {
    icon?: string,
    text: string,
    key: string,
    hint?: string,
    onSelected: () => void,
};