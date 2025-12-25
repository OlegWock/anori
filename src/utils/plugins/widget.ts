import type { GridItemSize } from "@anori/utils/grid/types";
import type { AnoriPlugin, WidgetDescriptor } from "@anori/utils/plugins/types";
import { anoriSchema, getAnoriStorage } from "@anori/utils/storage";
import type { EmptyObject, ID, Mapping } from "@anori/utils/types";
import {
  type DistributedWidgetInFolderWithMeta,
  type WidgetInFolder,
  type WidgetInFolderWithMeta,
  homeFolder,
} from "@anori/utils/user-data/types";
import { createContext, useContext } from "react";

export const getAllWidgetsByPlugin = async <PID extends ID, WD extends WidgetDescriptor[]>(
  plugin: AnoriPlugin<PID, Mapping, WD>,
) => {
  const storage = await getAnoriStorage();

  const foldersFromStorage = storage.get(anoriSchema.folders);
  const folders = [homeFolder, ...(foldersFromStorage || [])];

  const allWidgets: WidgetInFolder[] = [];
  for (const folder of folders) {
    const details = storage.get(anoriSchema.folderDetails.folder.byId(folder.id));
    if (details?.widgets) {
      allWidgets.push(...details.widgets);
    }
  }

  return allWidgets
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
