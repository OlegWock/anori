import type { GridItemSize } from "@anori/utils/grid/types";
import type { SomePlugin, SomeWidget } from "@anori/utils/plugins/types";
import { anoriSchema, getAnoriStorage } from "@anori/utils/storage";
import type { EmptyObject, Mapping } from "@anori/utils/types";
import { homeFolder, type WidgetInFolder, type WidgetInFolderWithMeta } from "@anori/utils/user-data/types";
import { createContext, useContext } from "react";

// Erased in, erased out: every caller is a plugin background task that's generic over its plugin (to dodge
// the plugin↔background circular import), so the concrete config types are unavailable to them anyway —
// they narrow `configuration` (an opaque Mapping) at use. No point pretending the input/output is specific.
export const getAllWidgetsByPlugin = async (plugin: SomePlugin): Promise<WidgetInFolderWithMeta[]> => {
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
    .filter((w) => w.pluginId === plugin.id)
    .map((w) => {
      const widget = plugin.widgets.find((d) => d.id === w.widgetId);
      if (!widget) {
        throw new Error(`couldn't find widget with id ${w.widgetId} for plugin ${plugin.id}`);
      }
      return { ...w, widget, plugin } satisfies WidgetInFolderWithMeta;
    });
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

export const isWidgetNonConfigurable = (
  descriptor: SomeWidget,
): descriptor is SomeWidget & { configurationScreen: null } => {
  return !descriptor.configurationScreen;
};
