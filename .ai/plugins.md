Main building block on Anori start page is widget. Widgets are narrow in function. They are organized in folders, and each folder's widgets can be organized in grid. All widgets in Anori are provided by plugins. One plugin can provide multiple widgets.

# Plugins

All plugins are stored in `src/plugins` folder.

## File structure

Small plugins (under ~300 lines) can live in a single `plugin-name-plugin.tsx` file (styles co-located via Panda `css`/`cva`). Larger plugins should be split into multiple files:

```
src/plugins/plugin-name/
├── plugin-name-plugin.ts       → definePlugin + wire widgets, messaging, scheduling
├── types.ts                    → config types, message handler types, shared interfaces
├── storage.ts                  → scoped store factories (createScopedStoreFactories)
├── messaging.ts                → createOnMessageHandlers + sendMessage export
├── background.ts               → scheduled callback logic
├── widgets/
│   ├── SomeWidget.tsx          → main screen component (styles co-located via Panda)
│   ├── SomeWidgetConfig.tsx    → configuration screen component
│   ├── AnotherWidget.tsx       → second widget main screen
│   ├── AnotherWidgetConfig.tsx → second widget config screen
│   └── descriptors.ts          → defineWidget calls + mock components
```

Guidelines for when to extract into a separate file:

* **types.ts** — when the plugin has multiple config types or types shared between widgets
* **storage.ts** — when the plugin uses scoped stores with custom schemas
* **messaging.ts** — when the plugin uses `createOnMessageHandlers`
* **background.ts** — when the scheduled callback has non-trivial logic (e.g. iterating widgets, fetching data)
* **widgets/** — each widget component and its config screen go into separate files; `descriptors.ts` holds all `defineWidget` calls and inline mock components
* Utility/API files (e.g. `api.ts`, `utils.ts`) are fine as siblings when the plugin integrates with external services

The main plugin file (`plugin-name-plugin.ts`) should remain a thin wiring file: it imports descriptors, messaging handlers, and background callbacks, then chains them via the builder API.

A plugin is defined in two layers: its **identity** (`definePlugin({ id, name, icon, config?, widgets })`) and the **behaviors** (messaging, scheduling, onStart) chained on top, finalized with `.build()` (required). The result is added to `src/plugins/all.ts`.

```ts
// 1. Identity. ContextOf<typeof base> recovers the behavior-context type, so background.ts can type its
//    `ctx` param off it via a type-only import (no plugin <-> background runtime cycle).
const base = definePlugin({
  id: "pluginname-plugin",
  get name() {
    return translate("blueprint-plugin.name");
  },
  icon: builtinIcons.plugin,
  // Optional plugin-level config, shared by every widget of the plugin. Omit for plugins without one.
  config: {
    parse: (raw) => pluginConfigSchema.parse(raw),
    configurationScreen: PluginConfigScreen, // ComponentType<{ currentConfig?: PC; saveConfiguration: (c: PC) => void }>
  },
  widgets: [widgetDescriptor],
});

export type PluginnameContext = ContextOf<typeof base>;

// 2. Behaviors. Each receives a typed PluginContext; chain in any order.
export const pluginnamePlugin = base
  .withMessaging(handlers)
  .withScheduledCallback(15, updateAllWidgets)
  .withOnStart((ctx) => plantWebRequestHandler())
  .build();
```

A plugin needs at least `id` (unique), `name` (translatable), `icon`, and `widgets`. `config` is optional — provide a `parse` + a `configurationScreen` (typed `{ currentConfig?: PC; saveConfiguration: (c: PC) => void }`) when the plugin has settings shared across its widgets; widgets then receive the value as `pluginConfig` and background tasks read it via `ctx.getConfig()`.

Builder methods (all optional, chain in any order):

* `.withMessaging(handlers)` — registers message handlers (typed via `createOnMessageHandlers`). Plugin messages are isolated between plugins. Intended for invoking background-only APIs from widgets.

* `.withScheduledCallback(intervalInMinutes, callback)` — runs the callback every N minutes in the background. Anori checks for due callbacks every 5 minutes, so values under 5 don't make sense, and exact timing isn't guaranteed.

* `.withOnStart(callback)` — runs once on extension start in the background; for registering `browser.*` listeners.

* `.build()` — **required**. Must be the last call (the builder type is intentionally incompatible with the registry until built).

The `ctx` passed to `withScheduledCallback`/`withOnStart` is a **`PluginContext`**: `ctx.getWidgets()` returns this plugin's widget instances **typed and correlated per descriptor** (`{ instanceId, widgetId, config }` — narrow on `widgetId`), and `ctx.getConfig()` returns the plugin config. Define these behaviors in `background.ts` typed `(ctx: PluginnameContext) => …` and import `PluginnameContext` **type-only** from the plugin file — that's what avoids the plugin↔background circular import while keeping config types precise. (`getAllWidgetsByPlugin` still exists, but `ctx.getWidgets()` is preferred since it's typed.)

# Widgets

Example widget descriptor:

```ts
const widgetDescriptor = defineWidget({
  id: "widget", // Unique identificator
  get name() { // User-facing name
    return translate("blueprint-plugin.widgetName");
  },
  // Optional: the unknown -> config seam. Defaults to a cast (today's behavior); pass a zod `.parse`
  // (e.g. `(raw) => widgetConfigSchema.parse(raw)`) to additionally validate the persisted config.
  parse: (raw) => raw as WidgetConfig,
  configurationScreen: WidgetConfigScreen, // ComponentType<WidgetConfigScreenProps<WidgetConfig>>, or null
  mainScreen: MainScreen, // ComponentType<WidgetRenderProps<WidgetConfig, PluginConfig>>
  // Mock screen is rendered on "New widget" screen and is intended for user to get an idea 
  // how widget will look before adding and configuring it
  mock: () => {
    return <MainScreen instanceId="mock" config={{ exampleConfigProp: "hey!" }} />;
  },
  appearance: {
    // Widget size and whether it can be resized (and min/max size if resizable)
    // Size is always set in "boxes". Its size depends on user screen size, but they
    // are usually around 150px
    size: {
      width: 1,
      height: 1,
    },
    resizable: false,
  },
});
```

The `mainScreen` receives `WidgetRenderProps<WidgetConfig, PluginConfig>` — `config` (this widget's own config) and `pluginConfig` (the plugin-level config, if the plugin declares one). The `configurationScreen` (`ComponentType<WidgetConfigScreenProps<WidgetConfig>>`, or `null`) is shown when the user adds the widget; its config is persisted per-widget. Both `WidgetRenderProps` and `WidgetConfigScreenProps` are imported from `@anori/utils/plugins/define`.

## Memoize widget components

**Wrap every widget `mainScreen` (and `mock`) component in `React.memo`** — see `blueprint` plugin's `BlueprintWidget` for the canonical shape:

```tsx
export const BlueprintWidget = memo(function BlueprintWidget({ config, instanceId }: WidgetRenderProps<BlueprintWidgetConfig>) {
  // ...
});
```

A widget is rendered deep inside the folder grid, which re-renders for reasons unrelated to any single widget (a sibling being dragged/resized, the folder's edit state, the new-widget wizard opening, …). Without `memo`, every such ancestor re-render cascades into every widget's whole subtree. `memo` lets a widget bail and re-render only when its own `config`/props change or one of its hooks fires. Its props (`config`, `instanceId`) are stable references from storage, so the shallow compare bails cleanly.

Use a **named function inside `memo`** (`memo(function WidgetName(...) {...})`) rather than an anonymous arrow, so the widget shows by name in React DevTools / profiles instead of `Anonymous`/`Memo`.

# Widgets and plugins API

Widgets and plugins have access to set of useful APIs.

## `<RequirePermissions />` component

This components allows you easily handle optional permissions. Select which permissions are required for your widget and wrap it in `<RequirePermissions />`. Component will present user a message requesting missing permissions and will render your widget only if all permissions are acquired. Thus, inside component itself you can use those permissions without any additional checks.

## `<ScrollArea />` component

Across the extension we use `<ScrollArea />` instead of normal `overflow: scroll`. This allows us to change styling of scrollbars reliably across different browser.

## Other components

There is also a bunch of more common UI element like `<Alert />`, `<Button />`, `<Checkbox />`, `<Hint />`, `<Input />`, `<Modal />`, `<Popover />` and `<Select />`. They are pretty much same you can find in any other frontend project, you can see examples of usage across extensions ui and/in plugins. 

## `useParentFolder()`

This hook exposes info about parent folder of current widget. Info includes folder name, is user currently in edit mode as well as details about grid and ref to grid element.

## `useSizeSettings()`

This hook exposes info about current mode: compact/normal and font size, ideal and minimal block sizes (to get actual value, use `useParentFolder()`) and gap size in that mode. As well as helper `rem` function which converts rems (preferrable stylng unit) into pixels.

## `getPluginConfig(pluginDescriptor)` and `usePluginConfig(pluginDescriptor)`

Those functions provide a way to load plugin configuration. Function is imperative and hook is reactive.

## `getPluginStorage<StorageT>(pluginId)` and `usePluginStorage<StorageT>()`

Each plugin can have separate storage dedicated to it. This functions allows you to get instance of [`NamespacedStorage`](/src/utils/namespaced-storage.ts) linked to plugin. Hook can be used in widgets and doesn't require manually providing plugin ID.

## `getWidgetStorage<StorageT>(instanceId)` and `useWidgetStorage<StorageT>()`

Same as previous, but for widget instances. I.e. each widget instance will have it's separate storage.

## `useWidgetMetadata()`

This hook exposes metadata about current widget: configuration, function to update configuration, instance id, widget id, plugin id and current size. Size is updated in real time as user resizes widget. Will throw if called outside widget.

## `getAllWidgetsByPlugin(pluginDescriptor)`

Loads all widget instances of a plugin (config erased to an opaque `Mapping`). Inside a plugin's own background task prefer **`ctx.getWidgets()`** — it returns the same instances but with config typed and correlated per descriptor.

## CSS

> `--widget-box-size`
> `--widget-box-size-px`
> `--widget-box-percent`

Those CSS variables set on folder's root element and thus are available for use in widget styles. `--widget-box-size` exposes current box size as number (without unit), `--widget-box-size-px` holds same value, but with `px`, and  `--widget-box-percent` contains value between 0 and 1 (inclusive), where 0 means current box size is smallest possible and 1 is biggest possible.

> `.compact-mode-active`
> `.is-touch-device`
> `.is-android`

Those classes are applied to `<body>` so you can target compact mode, touch devices, or Android. In Panda, use the `_compact` condition for compact (spacing tokens also auto-compress in compact mode); target the others with a selector:

```tsx
import { css } from "styled-system/css";

css({
  padding: "8",
  _compact: { padding: "4" },
  ".is-touch-device &": { padding: "6" },
  ".is-android &": { fontSize: "sm" },
});
```

For hover styles use the `_hover` condition. If a hover effect should apply only on devices with a mouse (not touch), wrap it in `@media (hover: hover)`.
