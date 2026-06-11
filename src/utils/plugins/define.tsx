// Plugin framework (Identity → Behaviors → Assembly). Plugins keep precise config types in their own
// folder; `definePlugin().build()` produces a config-erased SomePlugin for the registry/render pipeline,
// while widgets and behaviors stay fully typed.

import type { GridItemSize } from "@anori/utils/grid/types";
import { createOnMessageHandlers } from "@anori/utils/plugins/messaging";
import type {
  PluginConfigurationScreenProps,
  SomePlugin,
  SomeWidget,
  WidgetResizable,
} from "@anori/utils/plugins/types";
import { anoriSchema, getAnoriStorage } from "@anori/utils/storage";
import { useStorageValue } from "@anori/utils/storage-lib";
import type { EmptyObject, Mapping } from "@anori/utils/types";
import { homeFolder, type WidgetInFolder } from "@anori/utils/user-data/types";
import type { ComponentType } from "react";

type Appearance = {
  withHoverAnimation?: boolean;
  withoutPadding?: boolean;
  size: GridItemSize;
  resizable: WidgetResizable;
};

// ── Typed authoring surfaces (what a widget author writes) ──
export type WidgetRenderProps<WC extends Mapping, PC extends Mapping = EmptyObject> = {
  instanceId: string;
  config: WC;
  pluginConfig?: PC; // shared plugin-level config (undefined until the user sets it / absent for plugins without one)
};
export type WidgetConfigScreenProps<WC extends Mapping> = {
  widgetId: string;
  instanceId?: string;
  currentConfig?: WC;
  saveConfiguration: (config: WC) => void;
};

// A widget's parse step turns the persisted unknown into its config type (zod `.parse` in practice).
type Parse<T> = (raw: unknown) => T;

// ── Widget identity — carries the precise types; produced by defineWidget ──
export type WidgetDef<Id extends string, WC extends Mapping, PC extends Mapping> = {
  id: Id;
  name: string;
  // The unknown -> config seam. Optional: defaults to a cast (today's behavior). Provide a zod `.parse`
  // (see blueprint) to additionally validate the persisted config at runtime.
  parse?: Parse<WC>;
  appearance: Appearance;
  mainScreen: ComponentType<WidgetRenderProps<WC, PC>>;
  mock: ComponentType;
  configurationScreen: ComponentType<WidgetConfigScreenProps<WC>> | null;
};

export const defineWidget = <Id extends string, WC extends Mapping = EmptyObject, PC extends Mapping = EmptyObject>(
  def: WidgetDef<Id, WC, PC>,
): WidgetDef<Id, WC, PC> => def;

// Both `WC` and `PC` sit in contravariant (component-prop) positions inside `WidgetDef`, so a concrete
// `WidgetDef<Id, SpecificConfig, SpecificPluginConfig>` is NOT assignable to `WidgetDef<…, Mapping, Mapping>`
// (TS 6 enforces this; TS 5.9 let it slide). Every registry/assembly boundary below erases widgets to
// `SomeWidget` anyway, so bound the heterogeneous widget list with `any` in those slots to opt out of the
// variance check. The concrete `Widgets` tuple a plugin passes is still inferred precisely, so
// `WidgetInstance` / `getWidgets()` config types stay fully typed.
// biome-ignore lint/suspicious/noExplicitAny: deliberate variance erasure at the registry boundary
type AnyWidgetDef = WidgetDef<string, any, any>;

// Same story for message handlers: a concrete handler's `args` is an input, so the typed bag
// `createOnMessageHandlers` returns isn't assignable to the erased `Record<string, (args: unknown) => …>`
// on SomePlugin under TS 6. Accept it via a bivariant `any` arg (which is still assignable to the erased
// `unknown` form on storage), keeping the per-command typing the author wrote intact at the call site.
// biome-ignore lint/suspicious/noExplicitAny: bivariant arg position to accept any concrete handler bag
type MessageHandlers = Record<string, (args: any, senderTab?: number) => unknown>;

// ── Behaviour context — derived from the standalone widget list + plugin config, never the assembled plugin ──
type WidgetInstance<W> =
  W extends WidgetDef<infer Id, infer WC, infer _PC> ? { instanceId: string; widgetId: Id; config: WC } : never;

export type PluginContext<Widgets extends readonly AnyWidgetDef[], PC extends Mapping> = {
  pluginId: string;
  getConfig: () => Promise<PC | undefined>;
  getWidgets: () => Promise<WidgetInstance<Widgets[number]>[]>;
};

// ── usePluginConfig for the (config-erased) render side: read + parse the plugin's stored config ──
const usePluginConfigValue = <PC extends Mapping>(pluginId: string, parse: Parse<PC> | undefined): PC | undefined => {
  const [raw] = useStorageValue(anoriSchema.pluginConfig.config.byId(pluginId));
  if (raw === undefined || parse === undefined) return raw as PC | undefined;
  return parse(raw);
};

// ── Assembly ──
type PluginSpec<Id extends string, PC extends Mapping, Widgets extends readonly AnyWidgetDef[]> = {
  id: Id;
  name: string;
  icon: string;
  widgets: Widgets;
  // Optional plugin-level config: a schema/parse + a screen to edit it. Widgets receive the value as `pluginConfig`.
  config?: {
    parse: Parse<PC>;
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

// Recover a plugin's behavior-context type from `typeof definePlugin(identity)`, so a behavior defined in a
// separate file can type its `ctx` without hand-writing `PluginContext<…>`.
export type ContextOf<B> = B extends PluginBuilder<infer Widgets, infer PC> ? PluginContext<Widgets, PC> : never;

const toSomeWidget = (def: AnyWidgetDef, pluginId: string, parsePluginConfig?: Parse<Mapping>): SomeWidget => {
  const Main = def.mainScreen;
  const Config = def.configurationScreen;
  const parse = def.parse ?? ((raw: unknown) => raw as Mapping);
  const widget: SomeWidget = {
    id: def.id,
    name: def.name,
    appearance: def.appearance,
    mock: def.mock,
    mainScreen: ({ instanceId, config }) => {
      const pluginConfig = usePluginConfigValue(pluginId, parsePluginConfig);
      return <Main instanceId={instanceId} config={parse(config)} pluginConfig={pluginConfig} />;
    },
    configurationScreen: Config
      ? ({ currentConfig, ...rest }) => (
          <Config {...rest} currentConfig={currentConfig === undefined ? undefined : parse(currentConfig)} />
        )
      : null,
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
  const parsePluginConfig = pluginConfigSpec?.parse as Parse<Mapping> | undefined;

  const buildContext = (): PluginContext<Widgets, PC> => {
    const plugin = built;
    return {
      pluginId: spec.id,
      getConfig: async () => {
        const storage = await getAnoriStorage();
        const raw = storage.get(anoriSchema.pluginConfig.config.byId(spec.id));
        return raw === undefined ? undefined : ((spec.config ? spec.config.parse(raw) : raw) as PC | undefined);
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
            return {
              instanceId: w.instanceId,
              widgetId: w.widgetId,
              config: def?.parse ? def.parse(w.configuration) : w.configuration,
            };
          }) as WidgetInstance<Widgets[number]>[];
      },
    };
  };

  const behaviors: Behaviors<Widgets, PC> = {};

  const built = Object.defineProperties(
    {
      icon: spec.icon,
      widgets: spec.widgets.map((d) => toSomeWidget(d, spec.id, parsePluginConfig)),
      configurationScreen: pluginConfigSpec
        ? ({ currentConfig, saveConfiguration }: PluginConfigurationScreenProps<unknown>) => {
            const Screen = pluginConfigSpec.configurationScreen;
            return (
              <Screen
                currentConfig={currentConfig === undefined ? undefined : pluginConfigSpec.parse(currentConfig)}
                saveConfiguration={saveConfiguration as (c: PC) => void}
              />
            );
          }
        : null,
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
