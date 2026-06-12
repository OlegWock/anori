import type { GridItemSize } from "@anori/utils/grid/types";
import type { EmptyObject, ID, Mapping } from "@anori/utils/types";
import type { ComponentType } from "react";

export type WidgetConfigurationScreenProps<T> = {
  widgetId: ID;
  instanceId?: ID;
  currentConfig?: T;
  saveConfiguration: (config: T) => void;
};

export type PluginConfigurationScreenProps<T> = {
  currentConfig?: T;
  saveConfiguration: (config: T) => void;
};

export type WidgetRenderProps<T = Mapping, P = Mapping> = {
  config: T;
  instanceId: string;
  pluginConfig?: P;
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
  configurationScreen: ComponentType<WidgetConfigurationScreenProps<T>> | null;
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

export type WidgetDescriptorFromPluginByID<P extends AnoriPlugin, WID extends ID> =
  P extends AnoriPlugin<ID, Mapping, infer WD> ? Extract<WD[number], WidgetDescriptor<WID, Mapping>> : never;

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
  configurationScreen: ComponentType<PluginConfigurationScreenProps<T>> | null;
  onStart?: () => void;
  onMessage?: Record<string, (args: unknown, senderTab?: number) => unknown>;
  scheduledCallback?: {
    intervalInMinutes: number;
    callback: () => void;
  };
};

// A plugin/widget with its config type erased — the form the registry holds and the render pipeline
// consumes (a plugin arrives erased from `definePlugin().build()`; widgets via `eraseWidget`). Config is
// `unknown`; narrow/parse it at the point of use. The concrete config types stay inside each plugin's own
// folder; only this boundary is opaque.
export type SomeWidget = Omit<WidgetDescriptor, "mainScreen" | "configurationScreen"> & {
  // The storage <-> config seam (a zod schema underneath). `decode` (storage -> config) runs on read and
  // `encode` (config -> storage) on write; the renderer parses once (memoized) and passes the decoded value
  // to mainScreen/configurationScreen, and encodes back to the serializable form before persisting.
  decode: (raw: unknown) => Mapping;
  encode: (config: unknown) => Mapping;
  mainScreen: ComponentType<WidgetRenderProps<unknown, unknown>>;
  configurationScreen: ComponentType<WidgetConfigurationScreenProps<unknown>> | null;
};

export type SomePlugin = Omit<AnoriPlugin, "widgets" | "configurationScreen"> & {
  widgets: SomeWidget[];
  // Same seam for the plugin-level config: decode on read (widget pluginConfig / config-screen currentConfig),
  // encode on write.
  decodeConfig: (raw: unknown) => Mapping;
  encodeConfig: (config: unknown) => Mapping;
  configurationScreen: ComponentType<PluginConfigurationScreenProps<unknown>> | null;
};
