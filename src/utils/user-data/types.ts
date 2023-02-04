import { LayoutItem, LayoutItemSize } from "@utils/grid";
import { ComponentType } from "react";

export type StorageContent = {
    folders: Folder[],
};

export type ID = string;

export type Folder = {
    id: ID,
    name: string,
    icon: string,
};

export type FolderDetailsInStorage = {
    widgets: WidgetInFolder<any>[],
};

export type WidgetInFolder<T extends {}> = {
    pluginId: ID,
    widgetId: ID,
    instanceId: ID,
    configutation: T,
} & LayoutItem;

export type WidgetInFolderWithMeta<T extends {}> = WidgetInFolder<T> & {
    plugin: AodakePlugin,
    widget: WidgetDescriptor<T>,
}

export const homeFolder = {
    id: 'home',
    name: 'Home',
    icon: 'ion:home'
} satisfies Folder;

// ------ Plugins

export type AodakePlugin = {
    id: ID,
    name: string,
    widgets: WidgetDescriptor<any>[],
    commands: CommandDescriptor[],
};

export type WidgetConfigurationProps<T extends {}> = {
    currentConfig?: T,
    saveConfiguration: (config: T) => void,
};

export type WidgetRenderProps<T extends {}> = {
    config: T,
    instanceId: string,
};

export type WidgetDescriptor<T extends {}> = {
    id: ID,
    name: string,
    configurationScreen: ComponentType<WidgetConfigurationProps<T>>,
    mainScreen: ComponentType<WidgetRenderProps<T>>,
    mock: ComponentType<{}>,
    size: LayoutItemSize,
};

export type CommandDescriptor = {
    
};