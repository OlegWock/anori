import type { GridItemSize } from "@anori/utils/grid/types";
import type { SomeWidget } from "@anori/utils/plugins/types";
import type { EmptyObject, Mapping } from "@anori/utils/types";
import { createContext, useContext } from "react";

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
