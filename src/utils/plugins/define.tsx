import type { GridItemSize } from "@anori/utils/grid/types";
import { createOnMessageHandlers } from "@anori/utils/plugins/messaging";
import type { SomePlugin, SomeWidget, WidgetResizable } from "@anori/utils/plugins/types";
import { anoriSchema, getAnoriStorage } from "@anori/utils/storage";
import { useStorageValue } from "@anori/utils/storage-lib";
import type { EmptyObject, Mapping } from "@anori/utils/types";
import { homeFolder, type WidgetInFolder } from "@anori/utils/user-data/types";
import { type ComponentType, useMemo } from "react";
import { z } from "zod";

type Appearance = {
  withHoverAnimation?: boolean;
  withoutPadding?: boolean;
  size: GridItemSize;
  resizable: WidgetResizable;
};

export type WidgetRenderProps<WC extends Mapping, PC extends Mapping = EmptyObject> = {
  instanceId: string;
  config: WC;
  pluginConfig?: PC;
};
export type WidgetConfigScreenProps<WC extends Mapping> = {
  widgetId: string;
  instanceId?: string;
  currentConfig?: WC;
  saveConfiguration: (config: WC) => void;
};

export type WidgetDef<Id extends string, WC extends Mapping, PC extends Mapping> = {
  id: Id;
  name: string;
  schema?: z.ZodType<WC>;
  appearance: Appearance;
  mainScreen: ComponentType<WidgetRenderProps<WC, PC>>;
  mock: ComponentType;
  configurationScreen: ComponentType<WidgetConfigScreenProps<WC>> | null;
};

export const defineWidget = <Id extends string, WC extends Mapping = EmptyObject, PC extends Mapping = EmptyObject>(
  def: WidgetDef<Id, WC, PC>,
): WidgetDef<Id, WC, PC> => def;

// biome-ignore lint/suspicious/noExplicitAny: deliberate variance erasure at the registry boundary
type AnyWidgetDef = WidgetDef<string, any, any>;

// biome-ignore lint/suspicious/noExplicitAny: bivariant arg position to accept any concrete handler bag
type MessageHandlers = Record<string, (args: any, senderTab?: number) => unknown>;

type WidgetInstance<W> =
  W extends WidgetDef<infer Id, infer WC, infer _PC> ? { instanceId: string; widgetId: Id; config: WC } : never;

export type PluginContext<Widgets extends readonly AnyWidgetDef[], PC extends Mapping> = {
  pluginId: string;
  getConfig: () => Promise<PC | undefined>;
  getWidgets: () => Promise<WidgetInstance<Widgets[number]>[]>;
};

export const usePluginConfigValue = (pluginId: string, decode: (raw: unknown) => Mapping): Mapping | undefined => {
  const [raw] = useStorageValue(anoriSchema.pluginConfig.config.byId(pluginId));
  return useMemo(() => {
    if (raw === undefined) return undefined;
    try {
      return decode(raw);
    } catch (e) {
      console.error(`Failed to decode plugin config for "${pluginId}"`, e);
      return undefined;
    }
  }, [raw, decode, pluginId]);
};

type PluginSpec<Id extends string, PC extends Mapping, Widgets extends readonly AnyWidgetDef[]> = {
  id: Id;
  name: string;
  icon: string;
  widgets: Widgets;
  config?: {
    schema: z.ZodType<PC>;
    configurationScreen: ComponentType<{ currentConfig?: PC; saveConfiguration: (config: PC) => void }>;
  };
};

type Behaviors<Widgets extends readonly AnyWidgetDef[], PC extends Mapping> = {
  onMessage?: SomePlugin["onMessage"];
  onStart?: (ctx: PluginContext<Widgets, PC>) => void;
  scheduled?: { intervalInMinutes: number; callback: (ctx: PluginContext<Widgets, PC>) => void };
};

export type PluginBuilder<Widgets extends readonly AnyWidgetDef[], PC extends Mapping> = {
  withMessaging: (handlers: MessageHandlers) => PluginBuilder<Widgets, PC>;
  withScheduledCallback: (
    intervalInMinutes: number,
    callback: (ctx: PluginContext<Widgets, PC>) => void,
  ) => PluginBuilder<Widgets, PC>;
  withOnStart: (callback: (ctx: PluginContext<Widgets, PC>) => void) => PluginBuilder<Widgets, PC>;
  build: () => SomePlugin;
};

export type ContextOf<B> = B extends PluginBuilder<infer Widgets, infer PC> ? PluginContext<Widgets, PC> : never;

const codecFns = (schema: z.ZodType<Mapping> | undefined) => ({
  decode: schema ? (raw: unknown) => z.decode(schema, raw) : (raw: unknown) => raw as Mapping,
  encode: schema
    ? (config: unknown) => z.encode(schema, config as Mapping) as Mapping
    : (config: unknown) => config as Mapping,
});

const toSomeWidget = (def: AnyWidgetDef): SomeWidget => {
  const { decode, encode } = codecFns(def.schema);
  const widget: SomeWidget = {
    id: def.id,
    name: def.name,
    appearance: def.appearance,
    mock: def.mock,
    decode,
    encode,
    mainScreen: def.mainScreen,
    configurationScreen: def.configurationScreen,
  };
  // Preserve `name` as a getter (translations resolve lazily).
  Object.defineProperty(widget, "name", Object.getOwnPropertyDescriptor(def, "name") ?? { value: def.name });
  return widget;
};

export const definePlugin = <
  Id extends string,
  PC extends Mapping = EmptyObject,
  const Widgets extends readonly AnyWidgetDef[] = readonly AnyWidgetDef[],
>(
  spec: PluginSpec<Id, PC, Widgets>,
) => {
  const pluginConfigSpec = spec.config;
  const { decode: decodePluginConfig, encode: encodePluginConfig } = codecFns(
    pluginConfigSpec?.schema as z.ZodType<Mapping> | undefined,
  );

  const buildContext = (): PluginContext<Widgets, PC> => {
    const plugin = built;
    return {
      pluginId: spec.id,
      getConfig: async () => {
        const storage = await getAnoriStorage();
        const raw = storage.get(anoriSchema.pluginConfig.config.byId(spec.id));
        return raw === undefined ? undefined : (decodePluginConfig(raw) as PC | undefined);
      },
      getWidgets: async () => {
        const storage = await getAnoriStorage();
        const folders = [homeFolder, ...(storage.get(anoriSchema.folders) || [])];
        const instances: WidgetInFolder[] = [];
        for (const folder of folders) {
          const details = storage.get(anoriSchema.folderDetails.folder.byId(folder.id));
          if (details?.widgets) instances.push(...details.widgets);
        }

        return instances
          .filter((w) => w.pluginId === plugin.id)
          .map((w) => {
            const def = spec.widgets.find((d) => d.id === w.widgetId);
            let config: unknown = w.configuration;
            if (def?.schema) {
              try {
                config = z.decode(def.schema, w.configuration);
              } catch (e) {
                console.error(`Failed to decode config for widget "${w.widgetId}"`, e);
              }
            }
            return { instanceId: w.instanceId, widgetId: w.widgetId, config };
          }) as WidgetInstance<Widgets[number]>[];
      },
    };
  };

  const behaviors: Behaviors<Widgets, PC> = {};

  const built = Object.defineProperties(
    {
      icon: spec.icon,
      widgets: spec.widgets.map((d) => toSomeWidget(d)),
      decodeConfig: decodePluginConfig,
      encodeConfig: encodePluginConfig,
      configurationScreen: pluginConfigSpec ? pluginConfigSpec.configurationScreen : null,
      get onMessage() {
        return behaviors.onMessage;
      },
      get onStart() {
        return behaviors.onStart ? () => behaviors.onStart?.(buildContext()) : undefined;
      },
      get scheduledCallback() {
        return behaviors.scheduled
          ? {
              intervalInMinutes: behaviors.scheduled.intervalInMinutes,
              callback: () => behaviors.scheduled?.callback(buildContext()),
            }
          : undefined;
      },
    },
    {
      id: { value: spec.id, enumerable: true },
      name: Object.getOwnPropertyDescriptor(spec, "name") ?? { value: spec.name, enumerable: true },
    },
  ) as unknown as SomePlugin;

  const builder: PluginBuilder<Widgets, PC> = {
    withMessaging(handlers) {
      behaviors.onMessage = handlers;
      return builder;
    },
    withScheduledCallback(intervalInMinutes, callback) {
      behaviors.scheduled = { intervalInMinutes, callback };
      return builder;
    },
    withOnStart(callback) {
      behaviors.onStart = callback;
      return builder;
    },
    build: () => built,
  };
  return builder;
};

export { createOnMessageHandlers };
