import { LayoutItem, LayoutItemSize } from "@utils/grid";
import { ComponentType } from "react";
import { CustomTheme, Theme } from "./theme";
import { Language, translate } from "@translations/index";

export type StorageContent = {
    folders: Folder[],
    theme: Theme["name"],
    customThemes: CustomTheme[],
    stealFocus: boolean,
    userId: string,
    sidebarOrientation: "vertical" | "horizontal" | "auto",
    showBookmarksBar: boolean,
    rememberLastFolder: boolean,
    lastFolder: string | undefined,

    analyticsEnabled: boolean,
    analyticsLastSend: number,

    hasUnreadReleaseNotes: boolean,
    finishedOnboarding: boolean,

    compactMode: boolean,
    automaticCompactMode: boolean,
    automaticCompactModeThreshold: number,
    showLoadAnimation: boolean,
    hideEditFolderButton: boolean,
    newTabTitle: string,
    language: Language,
    storageVersion: number,
};

export type ID = string;

export type Folder = {
    id: ID,
    name: string,
    icon: string,
};

export type FolderDetailsInStorage<WT extends {} = any> = {
    widgets: WidgetInFolder<WT>[],
};

export type WidgetInFolder<T extends {}> = {
    pluginId: ID,
    widgetId: ID,
    instanceId: ID,
    configutation: T,
} & LayoutItem;

export type WidgetInFolderWithMeta<T extends WT, P extends {}, WT extends {}> = WidgetInFolder<T> & {
    plugin: AnoriPlugin<P, WT>,
    widget: WidgetDescriptor<T>,
}

export const homeFolder = {
    id: 'home',
    get name() {
        return translate('home');
    },
    icon: 'ion:home'
} satisfies Folder;

// ------ Plugins

export type AnoriPlugin<T extends {} = {}, WT extends {} = {}> = {
    id: ID,
    name: string,
    widgets: Array<WidgetDescriptor<WT> | WidgetDescriptor<WT>[]>,
    configurationScreen: ComponentType<PluginConfigurationScreenProps<T>> | null,
    onCommandInput?: OnCommandInputCallback,
    onStart?: () => void,
    onMessage?: Record<string, (args: any, senderTab?: number) => any>,
    scheduledCallback?: {
        intervalInMinutes: number,
        callback: () => void,
    }
};

export type WidgetConfigurationScreenProps<T extends {}> = {
    widgetId: ID,
    instanceId?: ID,
    currentConfig?: T,
    saveConfiguration: (config: T) => void,
};

export type PluginConfigurationScreenProps<T extends {}> = {
    currentConfig?: T,
    saveConfiguration: (config: T) => void,
};

export type WidgetRenderProps<T extends {}> = {
    config: T,
    instanceId: string,
};

export type WidgetResizable = boolean | {
    min?: LayoutItemSize,
    max?: LayoutItemSize,
};

export type WidgetDescriptor<T extends {} = {}> = {
    id: ID,
    name: string,
    mock: ComponentType<{}>,
    appearance: {
        withHoverAnimation?: boolean,
        withoutPadding?: boolean,
        size: LayoutItemSize,
        resizable: WidgetResizable,
    }
} & ({
    configurationScreen: ComponentType<WidgetConfigurationScreenProps<T>>,
    mainScreen: ComponentType<WidgetRenderProps<T>>,
} | {
    configurationScreen: null,
    mainScreen: ComponentType<WidgetRenderProps<{}>>,
});

export type OnCommandInputCallback = (text: string) => Promise<CommandItem[]>;

export type CommandItem = {
    icon?: string,
    image?: string,
    text: string,
    key: string,
    hint?: string,
    onSelected: () => void,
};

export type OnMessageDescriptor<I extends {}, O> = {
    args: I,
    result: O,
}

export type OnMessageHandler<I extends {}, O> = (args: I) => O;