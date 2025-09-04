import { type Language, translate } from "@anori/translations/index";
import type { LayoutItem, LayoutItemSize } from "@anori/utils/grid";
import type { ComponentType } from "react";
import type { CustomTheme, Theme } from "./theme";

type UsageQuantifiableMetrics =
  | "Times new tab opened"
  | "Times hotkey used"
  | "Times navigated to another folder"
  | `Interactions / ${string} / ${string} / ${string}`; // plugin id / widget id / interaction type

export type StorageContent = {
  folders: Folder[];
  theme: Theme["name"];
  customThemes: CustomTheme[];
  stealFocus: boolean;
  userId: string;
  sidebarOrientation: "vertical" | "horizontal" | "auto";
  autoHideSidebar: boolean;
  showBookmarksBar: boolean;
  rememberLastFolder: boolean;
  lastFolder: string | undefined;

  analyticsEnabled: boolean;
  analyticsLastSend: number;

  hasUnreadReleaseNotes: boolean;
  finishedOnboarding: boolean;

  compactMode: boolean;
  automaticCompactMode: boolean;
  automaticCompactModeThreshold: number;
  showLoadAnimation: boolean;
  hideEditFolderButton: boolean;
  newTabTitle: string;
  language: Language;

  dailyUsageMetrics: { [key in UsageQuantifiableMetrics]?: number };
  performanceAvgLcp: {
    avg: number;
    n: number;
  };
  performanceRawInp: number[];

  storageVersion: number;
};

export type ID = string;

export type Folder = {
  id: ID;
  name: string;
  icon: string;
};

export type FolderDetailsInStorage<WT extends {} = Record<string, any>> = {
  widgets: WidgetInFolder<WT>[];
};

export type WidgetInFolder<T extends {}> = {
  pluginId: ID;
  widgetId: ID;
  instanceId: ID;
  configuration: T;
} & LayoutItem;

export type WidgetInFolderWithMeta<T extends WT, P extends {}, WT extends {}> = WidgetInFolder<T> & {
  plugin: AnoriPlugin<P, WT>;
  widget: WidgetDescriptor<T>;
};

export const homeFolder = {
  id: "home",
  get name() {
    return translate("home");
  },
  icon: "ion:home",
} satisfies Folder;

// ------ Plugins

export type AnoriPlugin<T extends {} = Record<string, unknown>, WT extends {} = Record<string, any>> = {
  id: ID;
  name: string;
  widgets: Array<WidgetDescriptor<WT> | WidgetDescriptor<WT>[]>;
  configurationScreen: ComponentType<PluginConfigurationScreenProps<T>> | null;
  onStart?: () => void;
  onMessage?: Record<string, (args: any, senderTab?: number) => any>;
  scheduledCallback?: {
    intervalInMinutes: number;
    callback: () => void;
  };
};

export type WidgetConfigurationScreenProps<T extends {}> = {
  widgetId: ID;
  instanceId?: ID;
  currentConfig?: T;
  saveConfiguration: (config: T) => void;
};

export type PluginConfigurationScreenProps<T extends {}> = {
  currentConfig?: T;
  saveConfiguration: (config: T) => void;
};

export type WidgetRenderProps<T extends {} = Record<string, unknown>> = {
  config: T;
  instanceId: string;
};

export type WidgetResizable =
  | boolean
  | {
      min?: LayoutItemSize;
      max?: LayoutItemSize;
    };

export type WidgetDescriptor<T extends {} = Record<string, unknown>> = {
  id: ID;
  name: string;
  mock: ComponentType<Record<string, never>>;
  appearance: {
    withHoverAnimation?: boolean;
    withoutPadding?: boolean;
    size: LayoutItemSize;
    resizable: WidgetResizable;
  };
} & (
  | {
      configurationScreen: ComponentType<WidgetConfigurationScreenProps<T>>;
      mainScreen: ComponentType<WidgetRenderProps<T>>;
    }
  | {
      configurationScreen: null;
      mainScreen: ComponentType<WidgetRenderProps<Record<string, never>>>;
    }
);

export type OnMessageDescriptor<I extends {}, O> = {
  args: I;
  result: O;
};

export type OnMessageHandler<I extends {}, O> = (args: I) => O;
