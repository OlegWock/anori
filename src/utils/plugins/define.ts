import type { AnoriPlugin, WidgetDescriptor } from "@anori/utils/plugins/types";
import type { EmptyObject, ID, Mapping } from "@anori/utils/types";

export const defineWidget = <const I extends ID, const T extends Mapping = EmptyObject>(
  descriptor: WidgetDescriptor<I, T>,
): WidgetDescriptor<I, T> => {
  return descriptor;
};

type PluginDefinitionWithoutWidgets<I extends ID = string, T extends Mapping = EmptyObject> = Omit<
  AnoriPlugin<I, T, never>,
  "widgets"
>;

export const definePlugin = <const I extends ID = string, const T extends Mapping = EmptyObject>(
  descriptor: PluginDefinitionWithoutWidgets<I, T>,
) => {
  return {
    withWidgets: <const W extends WidgetDescriptor<ID, Mapping | EmptyObject>[]>(
      ...widgets: W
    ): AnoriPlugin<I, T, W> => {
      // Use Object.defineProperties instead of single spread, as it evaluate getters on copy instead of copying whole
      // accessor, which breaks plugin name translation
      return Object.defineProperties({ widgets }, Object.getOwnPropertyDescriptors(descriptor)) as AnoriPlugin<I, T, W>;
    },
  };
};
