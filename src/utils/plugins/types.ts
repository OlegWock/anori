import type { GridItemSize } from "@anori/utils/grid/types";
import type { EmptyObject, ID, Mapping } from "@anori/utils/types";
import type { ComponentType } from "react";

export type WidgetConfigurationScreenProps<T extends Mapping> = {
  widgetId: ID;
  instanceId?: ID;
  currentConfig?: T;
  saveConfiguration: (config: T) => void;
};

export type PluginConfigurationScreenProps<T extends Mapping> = {
  currentConfig?: T;
  saveConfiguration: (config: T) => void;
};

export type WidgetRenderProps<T extends Mapping = Mapping> = {
  config: T;
  instanceId: string;
};

export type WidgetResizable =
  | boolean
  | {
      min?: GridItemSize;
      max?: GridItemSize;
    };

export type WidgetDescriptor<I extends ID = ID, T extends Mapping = Mapping | EmptyObject> = {
  id: I;
  name: string;
  mock: ComponentType<EmptyObject>;
  configurationScreen: T extends EmptyObject ? null : ComponentType<WidgetConfigurationScreenProps<T>>;
  mainScreen: ComponentType<WidgetRenderProps<T>>;
  appearance: {
    withHoverAnimation?: boolean;
    withoutPadding?: boolean;
    size: GridItemSize;
    resizable: WidgetResizable;
  };
};

export type NonConfigurableWidgetDescriptor<I extends ID = ID> = WidgetDescriptor<I, EmptyObject>;

export type ConfigFromWidgetDescriptor<W> = W extends WidgetDescriptor<ID, infer WT> ? WT : never;

export type IDFromWidgetDescriptor<W> = W extends WidgetDescriptor
  ? W["id"]
  : W extends WidgetDescriptor[]
    ? W[number]["id"]
    : never;

export type WidgetDescriptorFromPluginByID<P extends AnoriPlugin, WID extends ID> = P extends AnoriPlugin<
  ID,
  Mapping,
  infer WD
>
  ? Extract<WD[number], WidgetDescriptor<WID, Mapping>>
  : never;

export type OnMessageDescriptor<I extends Mapping, O> = {
  args: I;
  result: O;
};

export type OnMessageHandler<I extends Mapping, O> = (args: I) => O;

export type AnoriPlugin<
  I extends ID = string,
  T extends Mapping = Mapping,
  W extends WidgetDescriptor<ID, Mapping | EmptyObject>[] = WidgetDescriptor[],
> = {
  id: I;
  name: string;
  icon: string;
  widgets: W;
  configurationScreen: T extends EmptyObject ? null : ComponentType<PluginConfigurationScreenProps<T>>;
  onStart?: () => void;
  onMessage?: Record<string, (args: unknown, senderTab?: number) => unknown>;
  scheduledCallback?: {
    intervalInMinutes: number;
    callback: () => void;
  };
};
