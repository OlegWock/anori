import type { AnoriPlugin, WidgetDescriptor } from "@anori/utils/plugins/types";
import type { EmptyObject, ID, Mapping } from "@anori/utils/types";

export const defineWidget = <const I extends ID, const T extends Mapping = EmptyObject>(
  descriptor: WidgetDescriptor<I, T>,
): WidgetDescriptor<I, T> => {
  return descriptor;
};

type PluginStaticDefinition<I extends ID = string, T extends Mapping = EmptyObject> = Omit<
  AnoriPlugin<I, T, never>,
  "widgets" | "onMessage" | "scheduledCallback" | "onStart"
>;

type PluginBuilder<I extends ID, T extends Mapping, W extends WidgetDescriptor<ID, Mapping | EmptyObject>[]> = {
  /** Brand field to prevent using PluginBuilder where AnoriPlugin is expected. Call .build() first. */
  readonly __pluginBuilder: unique symbol;
  withOnMessage: (handlers: AnoriPlugin<I, T, W>["onMessage"]) => PluginBuilder<I, T, W>;
  withScheduledCallback: (config: {
    intervalInMinutes: number;
    callback: (self: AnoriPlugin<I, T, W>) => void;
  }) => PluginBuilder<I, T, W>;
  withOnStart: (callback: (self: AnoriPlugin<I, T, W>) => void) => PluginBuilder<I, T, W>;
  build: () => AnoriPlugin<I, T, W>;
};

export const definePlugin = <const I extends ID = string, const T extends Mapping = EmptyObject>(
  descriptor: PluginStaticDefinition<I, T>,
) => {
  return {
    withWidgets: <const W extends WidgetDescriptor<ID, Mapping | EmptyObject>[]>(
      ...widgets: W
    ): PluginBuilder<I, T, W> => {
      // Use Object.defineProperties instead of single spread, as it evaluates getters on copy instead of copying whole
      // accessor, which breaks plugin name translation
      const plugin = Object.defineProperties({ widgets }, Object.getOwnPropertyDescriptors(descriptor)) as AnoriPlugin<
        I,
        T,
        W
      >;

      const builder = {
        withOnMessage(handlers: AnoriPlugin<I, T, W>["onMessage"]) {
          plugin.onMessage = handlers;
          return builder;
        },
        withScheduledCallback(config: {
          intervalInMinutes: number;
          callback: (self: AnoriPlugin<I, T, W>) => void;
        }) {
          plugin.scheduledCallback = {
            intervalInMinutes: config.intervalInMinutes,
            callback: () => config.callback(plugin),
          };
          return builder;
        },
        withOnStart(callback: (self: AnoriPlugin<I, T, W>) => void) {
          plugin.onStart = () => callback(plugin);
          return builder;
        },
        build(): AnoriPlugin<I, T, W> {
          return plugin;
        },
      } as PluginBuilder<I, T, W>;

      return builder;
    },
  };
};
