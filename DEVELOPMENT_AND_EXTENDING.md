# Development and extending

To build extension from sources, you need, first of all, install dependencies:

```
yarn install
```

To compile extension you can use either `dev` or `production` command with optional suffix:

```
yarn dev # Development Chrome
yarn dev:ff # Development version for Firefox
yarn production:sf # Production version for Safari
```

In case of Chrome and Firefox, compiled code will be placed under `dist` folder. For Safari, it's placed in `safari-app/anori/Shared (Extension)` folder.

To install extension from disk refer to instructions for [Chrome](https://developer.chrome.com/docs/extensions/mv3/getstarted/development-basics/#load-unpacked) and [Firefox](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension#installing). For Safari, extendions are shipped as part of native apps, so you'll need to open `safari-app/anori/anori.xcodeproj` in Xcode and compile app for your Mac. This will install extension for Safari.

For easier development, there is also `watch` command which will compile changes as you code:

```
yarn watch
yarn watch:ff
yarn watch:sf
```

## Extending

To extend Anori with your own widgets of command for Cmd+K menu, you need to create plugin and enable it. Plugin may contain multiple widgets (and can contain none as well). To get a grasp on how plugin might look, check `src/plugins/blueprint` folder. You can use it as base for your own plugin. And you also need to add your plugin descriptor to `availablePlugins` in `src/plugins/all.ts`.

Besides widgets and command handler, plugin may provide configuration component. If present, this component will be rendered in separate section in settings and later widgets and command handlers can use stored configuration.

### Widgets

Widgets are main building blocks of page. Each plugin may provide multiple widgets, each of which described by descriptor (type `WidgetDescriptor`). Each widget should have: 

* ID (there shouldn't be widgets with same ID in one plugin).
* Name.
* Size of widget. This is desribed not in pixels, but in 'boxes'. While 'box' can we of different size, you can assume it's around 180px for normal mode and 140px for compact mode.
* Optional configuration screen (if widget requires configuration before adding it to a folder)
* Main component which will be rendered in folder
* Mock component which will be rendered in catalog of widgets (which is presented to user when adding new widget to folder)
* `appearance.withHoverAnimation` property. If set to `true`, Anori will apply scale animation to card on hover.

### Command handler

Plugin can also provide handler, which will be called when user types into Cmd+K menu. Handler should return promise which resolves to array of `CommandItem`. There is time limit of 300ms (`ON_COMMAND_INPUT_TIMEOUT` const). If promise doesn't resolve in 300ms, it will be ignored.

Each `CommandItem` should have:

* Text.
* Unique key (this should be stable between handler calls).
* Callback which will be invoked if user selects this item.

Optionally, it can also have:

* Icon or image URL. See below for details about icons.
* Hint which will be displayed on right side of item.

### Plugin callbacks

You can provide plugin-wide callbacks which will be invoked either on browser start or periodically. If you provide `onStart` callback, extension will run it on root level of background service worker. Use this callback to register any additional handlers required for your plugin to function. 

You can also provide `scheduledCallback` object with two fields: `intervalInMinutes` and `callback`. This `callback` will be invoked every `intervalInMinutes` minutes (values smaller than 1 will be rounded to 1 minute).


## Useful APIs

There is a couple of hooks, components and other utlities you might find useful while developing plugins.

> `useParentFolder()`

This hook exposes info about parent folder of current widget. Info includes folder name, is user currently in edit mode and current box size.

> `useSizeSettings()`

This hook exposes info about current mode: compact/normal and font size, block size and gap size in that mode. As well as helper `rem` function.

> `getPluginConfig(pluginDescriptor)`
> `usePluginConfig(pluginDescriptor)`

This functions provide a way to load plugin configuration. Hook is reactive.

> `getPluginStorage<StorageT>(pluginId)`
> `usePluginStorage<StorageT>()`

Each plugin can have separate storage are dedicated to it. This functions allows you to get instance of [`NamespacedStorage`](/src/utils//namespaced-storage.ts) linked to plugin. Hook can be used in widgets and doesn't require manually providing plugin ID.

> `getWidgetStorage<StorageT>(instanceId)`
> `useWidgetStorage<StorageT>()`

Same as previous, but for widget instances. I.e. each widget instance will have it's separate storage.

> `useWidgetMetadata()`

This hook exposes metadata about current widget: configuration, function to update configuration, instance id, widget id, plugin id. Will throw if called outside widget.

> `getAllWidgetsByPlugin(pluginDescriptor)`

This function loads all widget instances from selected plugin. Might be useful to loop over all widgets to provide related results in command handler.

> `<RequirePermissions />`

This components allows you easily handle optional permissions. Select which permissions are required for your widget and wrap it in `<RequirePermissions />`. Component will present user a message requesting missing permissions and will render your widget only if all permissions are acquired.

> `<Icon />`

This component support for icons. We use Iconify under hood and you can see list of available icon sets in [all-sets.ts](/src/components/icons/all-sets.ts) file along with links to details. If you would like to add new set to extension, add it to [generate-icons-assets.ts](/generate-icons-assets.ts) file and run `yarn icons`. Icons are loaded on demand, so there might be quick flash of white semi-transperent square before icons are loaded.

> `<IconPicker />`

This is very useful component to let user choose from all available icons. Recommended to use inside popover like these:

```jsx
<Popover
    component={IconPicker}
    additionalData={{
        onSelected: (icon: string) => console.log('Selected icon', icon),
    }}
>
    <Button><Icon icon="ion:pencil" width={48} /></Button>
</Popover>
```

> `--widget-box-size`
> `--widget-box-size-px`
> `--widget-box-percent`

Those CSS variables set on folder's root element and thus are available for use in widget styles. `--widget-box-size` exposes current box size as number (without unit), `--widget-box-size-px` holds same value, but with `px`, and  `--widget-box-percent` contains value between 0 and 1 (inclusive), where 0 means current box size is smallest possible and 1 is biggest possible.

> `.compact-mode-active`

This class will be added to folder's root element and can be used to apply specific widget styles in compact mode. To make life a bit easier, there is `compact` mixin defined in `base.scss` which makes applying compact styles easier, see example in [datetime widget styles](https://github.com/OlegWock/anori/blob/master/src/plugins/datetime/styles.scss).