import type { GridItemSize } from "@anori/utils/grid/types";
import type { AnoriPlugin, WidgetDescriptor } from "@anori/utils/plugins/types";
import { storage } from "@anori/utils/storage/api";
import type { EmptyObject, ID, Mapping } from "@anori/utils/types";
import {
  type DistributedWidgetInFolderWithMeta,
  type FolderDetailsInStorage,
  type WidgetInFolder,
  type WidgetInFolderWithMeta,
  homeFolder,
} from "@anori/utils/user-data/types";
import { createContext, useContext } from "react";
import browser from "webextension-polyfill";

export const getAllWidgetsByPlugin = async <PID extends ID, WD extends WidgetDescriptor[]>(
  plugin: AnoriPlugin<PID, Mapping, WD>,
) => {
  const foldersFromStorage = await storage.getOne("folders");
  const folders = [homeFolder, ...(foldersFromStorage || [])];

  const folderDetails = (await Promise.all(
    folders.map((f) => {
      return browser.storage.local
        .get({
          [`Folder.${f.id}`]: {
            widgets: [],
          } satisfies FolderDetailsInStorage,
        })
        .then((r) => r[`Folder.${f.id}`]);
    }),
  )) as FolderDetailsInStorage[];

  const widgets = folderDetails.flatMap((details) => details.widgets);
  return widgets
    .filter((w): w is WidgetInFolder<PID, WD> => w.pluginId === plugin.id)
    .map((w) => {
      const widget = plugin.widgets.find((d) => d.id === w.widgetId);
      if (!widget) {
        throw new Error(`couldn't find widget with id ${w.widgetId} for plugin ${plugin.id}`);
      }

      return {
        ...w,
        widget,
        plugin,
      } satisfies WidgetInFolderWithMeta<PID, WD>;
    }) as DistributedWidgetInFolderWithMeta<PID, WD>[];
};

export type WidgetMetadataContextType<WidgetConfigT extends Mapping = Mapping> = {
  pluginId: string;
  widgetId: string;
  instanceId: string;
  size: GridItemSize;
  config: WidgetConfigT;
  updateConfig: (update: Partial<WidgetConfigT>) => void;
};

export const WidgetMetadataContext = createContext<WidgetMetadataContextType>({
  pluginId: "",
  widgetId: "",
  instanceId: "",
  size: {
    width: 0,
    height: 0,
  },
  config: {},
  updateConfig: () => {},
});

export const useWidgetMetadata = <WidgetConfigT extends Mapping = EmptyObject>() => {
  const val = useContext(WidgetMetadataContext) as WidgetMetadataContextType<WidgetConfigT>;
  if (!val.pluginId) throw new Error("useWidgetMetadata should be used only inside widgets");

  return val;
};

export const isWidgetNonConfigurable = <I extends ID>(
  descriptor: WidgetDescriptor<I>,
): descriptor is WidgetDescriptor<I, EmptyObject> => {
  return !descriptor.configurationScreen;
};
